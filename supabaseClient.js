import { CONFIG } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Check if credentials are set to actual project
const isConfigured = Boolean(
    CONFIG.SUPABASE_URL && 
    CONFIG.SUPABASE_ANON_KEY && 
    !CONFIG.SUPABASE_URL.includes('your-project-id') &&
    CONFIG.SUPABASE_ANON_KEY !== 'your-anon-key-here'
);

let supabase = null;
if (isConfigured) {
    try {
        supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
    } catch (e) {
        console.warn('Could not initialize Supabase client:', e);
    }
}

// -------------------------------------------------------------
// LOCAL FALLBACK STORAGE (Clean Slate - Empty arrays)
// -------------------------------------------------------------
function getLocal(key, defaultValue = []) {
    const raw = localStorage.getItem('crochet_db_' + key);
    if (!raw) {
        localStorage.setItem('crochet_db_' + key, JSON.stringify(defaultValue));
        return defaultValue;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return defaultValue;
    }
}

function setLocal(key, value) {
    localStorage.setItem('crochet_db_' + key, JSON.stringify(value));
}

// -------------------------------------------------------------
// PUBLIC API & SUPABASE METHODS
// -------------------------------------------------------------

export const db = {
    isLive: () => isConfigured && !!supabase,
    client: () => supabase,

    // ==========================================
    // SUPABASE AUTHENTICATION
    // ==========================================
    async signInWithEmail(email, password) {
        if (db.isLive()) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });
            if (error) throw error;
            return data.user;
        }

        // Offline / Demo fallback: Allow local admin testing if no live Supabase yet
        if (email.toLowerCase() === 'admin@tinycrochet.com' && password === 'admin123') {
            const fakeUser = { id: 'local-admin', email: 'admin@tinycrochet.com' };
            localStorage.setItem('crochet_local_admin_session', JSON.stringify(fakeUser));
            return fakeUser;
        }
        throw new Error('Supabase project not connected yet, or invalid credentials. (Offline demo login: admin@tinycrochet.com / admin123)');
    },

    async signOut() {
        localStorage.removeItem('crochet_local_admin_session');
        if (db.isLive()) {
            const { error } = await supabase.auth.signOut();
            if (error) console.error('Sign out error:', error);
        }
        return true;
    },

    async getCurrentUser() {
        if (db.isLive()) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) return session.user;
            } catch (err) {
                console.warn('Get session error:', err);
            }
        }
        const local = localStorage.getItem('crochet_local_admin_session');
        return local ? JSON.parse(local) : null;
    },

    onAuthStateChange(callback) {
        if (db.isLive()) {
            return supabase.auth.onAuthStateChange((event, session) => {
                callback(event, session ? session.user : null);
            });
        }
        return { data: { subscription: { unsubscribe: () => {} } } };
    },

    // ==========================================
    // CATEGORIES (Clean Slate)
    // ==========================================
    async getCategories() {
        if (db.isLive()) {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .order('display_order', { ascending: true });
                if (!error && data) return data;
            } catch (err) {
                console.warn('Supabase categories fetch error:', err);
            }
        }
        return getLocal('categories', []);
    },

    async createCategory(categoryData) {
        const payload = {
            name: categoryData.name.trim(),
            slug: categoryData.slug || categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            icon: categoryData.icon || '🧶',
            description: categoryData.description || '',
            display_order: parseInt(categoryData.display_order || '0')
        };

        if (db.isLive()) {
            const { data, error } = await supabase.from('categories').insert([payload]).select().single();
            if (error) throw error;
            return data;
        }

        const categories = getLocal('categories', []);
        const newCat = { id: 'cat_' + Date.now(), ...payload, created_at: new Date().toISOString() };
        categories.push(newCat);
        setLocal('categories', categories);
        return newCat;
    },

    async deleteCategory(id) {
        if (db.isLive()) {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
        let categories = getLocal('categories', []);
        categories = categories.filter(c => c.id !== id);
        setLocal('categories', categories);
        return true;
    },

    // ==========================================
    // PRODUCTS (Clean Slate)
    // ==========================================
    async getProducts(categorySlug = null, searchTerm = '', activeOnly = false) {
        if (db.isLive()) {
            try {
                let query = supabase.from('products').select('*, categories(slug, name)').order('created_at', { ascending: false });
                if (activeOnly) {
                    query = query.eq('is_active', true);
                }
                if (searchTerm) {
                    query = query.ilike('name', `%${searchTerm}%`);
                }
                const { data, error } = await query;
                if (!error && data) {
                    let result = data;
                    if (categorySlug && categorySlug !== 'all') {
                        result = result.filter(p => p.categories?.slug === categorySlug);
                    }
                    return result;
                }
            } catch (err) {
                console.warn('Supabase products fetch error:', err);
            }
        }

        let list = getLocal('products', []);
        const categories = getLocal('categories', []);
        list = list.map(p => {
            const cat = categories.find(c => c.id === p.category_id);
            return { 
                ...p, 
                is_active: p.is_active !== undefined ? p.is_active : true,
                gallery_images: Array.isArray(p.gallery_images) ? p.gallery_images : [],
                categories: cat ? { slug: cat.slug, name: cat.name } : null 
            };
        });

        if (activeOnly) {
            list = list.filter(p => p.is_active !== false);
        }
        if (categorySlug && categorySlug !== 'all') {
            list = list.filter(p => p.categories?.slug === categorySlug);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term)));
        }
        return list;
    },

    async getProductById(id) {
        if (db.isLive()) {
            try {
                const { data, error } = await supabase.from('products').select('*, categories(slug, name)').eq('id', id).single();
                if (!error && data) {
                    return {
                        ...data,
                        gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : []
                    };
                }
            } catch (err) {
                console.warn('Supabase getProductById error:', err);
            }
        }
        const list = await db.getProducts();
        return list.find(p => p.id === id) || null;
    },

    async createProduct(productData) {
        const payload = {
            ...productData,
            is_active: productData.is_active !== undefined ? productData.is_active : true,
            gallery_images: Array.isArray(productData.gallery_images) ? productData.gallery_images : []
        };

        if (db.isLive()) {
            const { data, error } = await supabase.from('products').insert([payload]).select().single();
            if (error) throw error;
            return data;
        }
        const products = getLocal('products', []);
        const newProduct = {
            id: 'prod_' + Date.now(),
            ...payload,
            created_at: new Date().toISOString()
        };
        products.unshift(newProduct);
        setLocal('products', products);
        return newProduct;
    },

    async updateProduct(id, productData) {
        if (db.isLive()) {
            const { data, error } = await supabase.from('products').update(productData).eq('id', id).select().single();
            if (error) throw error;
            return data;
        }
        const products = getLocal('products', []);
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData };
            setLocal('products', products);
            return products[index];
        }
        throw new Error('Product not found');
    },

    async toggleProductVisibility(id, isActive) {
        return db.updateProduct(id, { is_active: isActive });
    },

    async validateCartItems(cartItems) {
        if (!cartItems || cartItems.length === 0) return { validItems: [], removedItems: [] };
        const productIds = [...new Set(cartItems.map(item => item.product_id))];

        let catalogProducts = [];
        if (db.isLive()) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, price, is_active')
                    .in('id', productIds);
                if (!error && data) {
                    catalogProducts = data;
                }
            } catch (err) {
                console.warn('Cart validation query error:', err);
            }
        } else {
            const localList = getLocal('products', []);
            catalogProducts = localList.filter(p => productIds.includes(p.id));
        }

        const validItems = [];
        const removedItems = [];

        cartItems.forEach(item => {
            const product = catalogProducts.find(p => p.id === item.product_id);
            // If product was deleted or is_active is false:
            if (!product || product.is_active === false) {
                removedItems.push(item);
            } else {
                validItems.push(item);
            }
        });

        return { validItems, removedItems };
    },

    async deleteProduct(id) {
        if (db.isLive()) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
        let products = getLocal('products', []);
        products = products.filter(p => p.id !== id);
        setLocal('products', products);
        return true;
    },

    // ==========================================
    // IMAGE UPLOAD TO SUPABASE STORAGE
    // ==========================================
    async uploadImage(file, bucket = CONFIG.STORAGE_BUCKETS.CUSTOM_ORDERS) {
        if (db.isLive()) {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file, { cacheControl: '3600', upsert: false });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                return data.publicUrl;
            } catch (err) {
                console.error('Storage upload failed, falling back to data URL:', err);
            }
        }

        // Fallback Base64 for offline test
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    async uploadMultipleImages(files, bucket = CONFIG.STORAGE_BUCKETS.PRODUCT_IMAGES) {
        if (!files || files.length === 0) return [];
        const uploadPromises = Array.from(files).map(file => db.uploadImage(file, bucket));
        return Promise.all(uploadPromises);
    },

    // ==========================================
    // ORDERS
    // ==========================================
    async createOrder(orderData) {
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const payload = {
            id: orderId,
            ...orderData,
            status: 'Pending',
            created_at: new Date().toISOString()
        };

        if (db.isLive()) {
            const { data, error } = await supabase.from('orders').insert([payload]).select().single();
            if (error) throw error;
            return data;
        }

        const orders = getLocal('orders', []);
        orders.unshift(payload);
        setLocal('orders', orders);
        return payload;
    },

    async getOrderById(orderId) {
        if (!orderId) return null;
        const cleanId = orderId.trim();

        if (db.isLive()) {
            try {
                const { data, error } = await supabase.from('orders').select('*').ilike('id', cleanId).single();
                if (!error && data) return data;
            } catch (err) {
                console.warn('Supabase getOrderById error:', err);
            }
        }

        const orders = getLocal('orders', []);
        return orders.find(o => o.id.toLowerCase() === cleanId.toLowerCase()) || null;
    },

    async getAllOrders(statusFilter = 'All') {
        if (db.isLive()) {
            try {
                let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
                if (statusFilter && statusFilter !== 'All') {
                    query = query.eq('status', statusFilter);
                }
                const { data, error } = await query;
                if (!error && data) return data;
            } catch (err) {
                console.warn('Supabase getAllOrders error:', err);
            }
        }

        let orders = getLocal('orders', []);
        if (statusFilter && statusFilter !== 'All') {
            orders = orders.filter(o => o.status === statusFilter);
        }
        return orders;
    },

    async updateOrderStatus(orderId, newStatus) {
        if (db.isLive()) {
            const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId).select().single();
            if (error) throw error;
            return data;
        }

        const orders = getLocal('orders', []);
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders[index].status = newStatus;
            setLocal('orders', orders);
            return orders[index];
        }
        throw new Error('Order not found');
    },

    // ==========================================
    // CUSTOM ORDERS
    // ==========================================
    async createCustomOrder(customOrderData) {
        const customOrderId = 'CUST-' + Math.floor(100000 + Math.random() * 900000);
        const payload = {
            id: customOrderId,
            ...customOrderData,
            status: 'Pending Review',
            created_at: new Date().toISOString()
        };

        if (db.isLive()) {
            const { data, error } = await supabase.from('custom_orders').insert([payload]).select().single();
            if (error) throw error;
            return data;
        }

        const customOrders = getLocal('custom_orders', []);
        customOrders.unshift(payload);
        setLocal('custom_orders', customOrders);
        return payload;
    },

    async getCustomOrderById(id) {
        if (!id) return null;
        const cleanId = id.trim();

        if (db.isLive()) {
            try {
                const { data, error } = await supabase.from('custom_orders').select('*').ilike('id', cleanId).single();
                if (!error && data) return data;
            } catch (err) {
                console.warn('Supabase getCustomOrderById error:', err);
            }
        }

        const customOrders = getLocal('custom_orders', []);
        return customOrders.find(c => c.id.toLowerCase() === cleanId.toLowerCase()) || null;
    },

    async getAllCustomOrders(statusFilter = 'All') {
        if (db.isLive()) {
            try {
                let query = supabase.from('custom_orders').select('*').order('created_at', { ascending: false });
                if (statusFilter && statusFilter !== 'All') {
                    query = query.eq('status', statusFilter);
                }
                const { data, error } = await query;
                if (!error && data) return data;
            } catch (err) {
                console.warn('Supabase getAllCustomOrders error:', err);
            }
        }

        let customOrders = getLocal('custom_orders', []);
        if (statusFilter && statusFilter !== 'All') {
            customOrders = customOrders.filter(c => c.status === statusFilter);
        }
        return customOrders;
    },

    async updateCustomOrderStatus(id, newStatus, adminNotes = null, quoteAmount = null) {
        const updatePayload = { status: newStatus };
        if (adminNotes !== null) updatePayload.admin_notes = adminNotes;
        if (quoteAmount !== null) updatePayload.quote_amount = quoteAmount;

        if (db.isLive()) {
            const { data, error } = await supabase.from('custom_orders').update(updatePayload).eq('id', id).select().single();
            if (error) throw error;
            return data;
        }

        const customOrders = getLocal('custom_orders', []);
        const index = customOrders.findIndex(c => c.id === id);
        if (index !== -1) {
            customOrders[index] = { ...customOrders[index], ...updatePayload };
            setLocal('custom_orders', customOrders);
            return customOrders[index];
        }
        throw new Error('Custom order not found');
    }
};
