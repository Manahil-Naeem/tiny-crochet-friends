/**
 * TINY CROCHET FRIENDS - ADMIN PANEL CONTROLLER
 * Full Supabase Email/Password Authentication & Management Hub
 */

import { db } from './supabaseClient.js';
import { store } from './store.js';
import { CONFIG, updateCredentials } from './config.js';

let currentAdminUser = null;
let editingProductId = null;
let editingGalleryImages = [];
let currentAdminTab = 'products';

export async function setupAdmin() {
    // Check existing session
    currentAdminUser = await db.getCurrentUser();
    updateAdminAuthStateUI();

    // Listen for auth state changes
    db.onAuthStateChange((event, user) => {
        currentAdminUser = user;
        updateAdminAuthStateUI();
    });

    // Navigation button to Admin
    const adminNavBtn = document.getElementById('nav-admin-btn');
    if (adminNavBtn) {
        adminNavBtn.addEventListener('click', () => {
            if (!currentAdminUser) {
                openAdminAuthModal();
            } else {
                loadAdminDashboard();
            }
        });
    }

    // Admin Email/Password Login Form
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    // Admin Logout
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }

    // Admin Tab Switching
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchAdminTab(tab);
        });
    });

    // Product Modal & Form
    const openAddProductBtn = document.getElementById('open-add-product-modal-btn');
    if (openAddProductBtn) {
        openAddProductBtn.addEventListener('click', () => openProductModal(null));
    }

    const closeProductModalBtn = document.getElementById('close-product-modal-btn');
    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', closeProductModal);
    }

    const productForm = document.getElementById('admin-product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleSaveProduct);
    }

    const productImgInput = document.getElementById('admin-product-image-file');
    if (productImgInput) {
        productImgInput.addEventListener('change', handleProductImageFileChange);
    }

    const galleryFilesInput = document.getElementById('admin-product-gallery-files');
    if (galleryFilesInput) {
        galleryFilesInput.addEventListener('change', handleProductGalleryFilesChange);
    }

    const addGalleryUrlBtn = document.getElementById('admin-add-gallery-url-btn');
    if (addGalleryUrlBtn) {
        addGalleryUrlBtn.addEventListener('click', handleAddGalleryUrl);
    }

    // Category Modal & Form
    const openAddCatBtn = document.getElementById('open-add-cat-modal-btn');
    if (openAddCatBtn) {
        openAddCatBtn.addEventListener('click', openCategoryModal);
    }

    const closeCatModalBtn = document.getElementById('close-cat-modal-btn');
    if (closeCatModalBtn) {
        closeCatModalBtn.addEventListener('click', closeCategoryModal);
    }

    const catForm = document.getElementById('admin-cat-form');
    if (catForm) {
        catForm.addEventListener('submit', handleSaveCategory);
    }

    // Settings Form
    const settingsForm = document.getElementById('admin-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }
}

function updateAdminAuthStateUI() {
    const adminEmailBadge = document.getElementById('admin-current-email');
    if (adminEmailBadge) {
        if (currentAdminUser) {
            adminEmailBadge.textContent = currentAdminUser.email || 'Admin User';
            adminEmailBadge.classList.remove('hidden');
        } else {
            adminEmailBadge.classList.add('hidden');
        }
    }
}

function openAdminAuthModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('admin-email-input')?.focus();
    }
}

function closeAdminAuthModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.elements['email']?.value;
    const password = form.elements['password']?.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Authenticating with Supabase... 🔒</span>`;

    try {
        currentAdminUser = await db.signInWithEmail(email, password);
        closeAdminAuthModal();
        store.showToast(`✨ Welcome back, ${currentAdminUser.email}!`);
        window.location.hash = '#admin';
        loadAdminDashboard();
    } catch (err) {
        console.error('Login error:', err);
        store.showToast('Login failed: ' + (err.message || 'Invalid credentials'), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
    }
}

async function handleAdminLogout() {
    await db.signOut();
    currentAdminUser = null;
    store.showToast('Logged out of Admin Studio', 'info');
    window.location.hash = '#shop';
    window.location.reload();
}

export async function loadAdminDashboard() {
    currentAdminUser = await db.getCurrentUser();
    if (!currentAdminUser) {
        openAdminAuthModal();
        return;
    }

    // Update settings tab fields
    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    const waInput = document.getElementById('settings-whatsapp-number');
    const connBadge = document.getElementById('admin-connection-status');

    if (urlInput) urlInput.value = CONFIG.SUPABASE_URL.includes('your-project-id') ? '' : CONFIG.SUPABASE_URL;
    if (keyInput) keyInput.value = CONFIG.SUPABASE_ANON_KEY === 'your-anon-key-here' ? '' : CONFIG.SUPABASE_ANON_KEY;
    if (waInput) waInput.value = CONFIG.WHATSAPP_NUMBER;

    if (connBadge) {
        if (db.isLive()) {
            connBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">● Live Supabase Connected</span>`;
        } else {
            connBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">● Local Mode (Configure Supabase Keys)</span>`;
        }
    }

    switchAdminTab(currentAdminTab);
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(b => {
        const active = b.dataset.tab === tab;
        b.className = `admin-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            active ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
        }`;
    });

    ['products', 'categories', 'orders', 'custom', 'settings'].forEach(t => {
        const el = document.getElementById(`admin-panel-${t}`);
        if (el) el.classList.toggle('hidden', t !== tab);
    });

    if (tab === 'products') renderAdminProducts();
    if (tab === 'categories') renderAdminCategories();
    if (tab === 'orders') renderAdminOrders();
    if (tab === 'custom') renderAdminCustomOrders();
}

// -----------------------------------------------------------------
// 1. PRODUCTS MANAGEMENT
// -----------------------------------------------------------------
async function renderAdminProducts() {
    const container = document.getElementById('admin-products-table-body');
    if (!container) return;

    container.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-stone-400">Loading your creations... 🧶</td></tr>`;

    try {
        const products = await db.getProducts();
        if (products.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12 text-stone-500">
                        <span class="text-3xl block mb-2">🌸</span>
                        <p class="font-bold text-stone-700">Clean Slate: No products created yet</p>
                        <p class="text-xs text-stone-400 mt-1">Click <strong>"+ Add New Product"</strong> above to add your first handmade creation!</p>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = products.map(product => {
            const isVisible = product.is_active !== false;
            const swatches = (product.color_options || []).map(c => 
                `<span class="w-3.5 h-3.5 rounded-full inline-block border border-stone-200 shadow-sm" style="background-color: ${c.hex};" title="${c.name}"></span>`
            ).join(' ');

            return `
                <tr class="border-b border-stone-100 hover:bg-rose-50/30 transition text-xs ${!isVisible ? 'opacity-65 bg-stone-50/70' : ''}">
                    <td class="py-3 px-4">
                        <img src="${product.image_url}" alt="${product.name}" class="w-12 h-12 rounded-xl object-cover border border-stone-200">
                    </td>
                    <td class="py-3 px-4 font-bold text-stone-800">
                        ${product.name}
                        ${product.is_featured ? `<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Featured</span>` : ''}
                        ${!isVisible ? `<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-600 font-semibold">Hidden</span>` : ''}
                    </td>
                    <td class="py-3 px-4 text-stone-600">${product.categories?.name || 'Unassigned'}</td>
                    <td class="py-3 px-4 font-bold text-rose-600">${CONFIG.CURRENCY} ${parseFloat(product.price).toLocaleString()}</td>
                    
                    <td class="py-3 px-4">
                        <button type="button" 
                                class="px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm ${isVisible ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' : 'bg-stone-200 text-stone-600 hover:bg-stone-300 border border-stone-300'}"
                                onclick="window.adminToggleVisibility('${product.id}', ${!isVisible})"
                                title="Click to ${isVisible ? 'Hide from shop' : 'Show in shop'}">
                            <span>${isVisible ? '🟢 Active' : '👁️‍🗨️ Hidden'}</span>
                        </button>
                    </td>
                    <td class="py-3 px-4 text-right space-x-1">
                        <button class="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition" onclick="window.adminEditProduct('${product.id}')">Edit</button>
                        <button class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition" onclick="window.adminDeleteProduct('${product.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error fetching admin products:', err);
    }
}

window.adminToggleVisibility = async (id, newActive) => {
    try {
        await db.toggleProductVisibility(id, newActive);
        store.showToast(`Product is now ${newActive ? 'Active & Visible in shop' : 'Hidden from shop catalog'}! ✨`);
        renderAdminProducts();
    } catch (err) {
        store.showToast('Could not update visibility: ' + err.message, 'error');
    }
};

window.adminEditProduct = async (id) => {
    const product = await db.getProductById(id);
    if (product) openProductModal(product);
};

window.adminDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this crochet product?')) return;
    try {
        await db.deleteProduct(id);
        store.showToast('Product deleted', 'info');
        renderAdminProducts();
    } catch (err) {
        store.showToast('Failed to delete: ' + err.message, 'error');
    }
};

function handleProductImageFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('admin-product-preview-img');
        if (preview) {
            preview.src = ev.target.result;
            preview.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}

function handleProductGalleryFilesChange(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            editingGalleryImages.push(ev.target.result);
            renderAdminGalleryPreviews();
        };
        reader.readAsDataURL(file);
    });
}

function handleAddGalleryUrl() {
    const input = document.getElementById('admin-product-gallery-url-input');
    const url = input?.value?.trim();
    if (url) {
        editingGalleryImages.push(url);
        input.value = '';
        renderAdminGalleryPreviews();
    }
}

function renderAdminGalleryPreviews() {
    const container = document.getElementById('admin-gallery-previews');
    if (!container) return;

    if (!editingGalleryImages || editingGalleryImages.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-stone-400 italic">No additional gallery photos added yet.</span>`;
        return;
    }

    container.innerHTML = editingGalleryImages.map((imgUrl, idx) => `
        <div class="relative group/thumb inline-block">
            <img src="${imgUrl}" alt="Gallery View ${idx + 1}" class="w-14 h-14 object-cover rounded-xl border border-stone-200 shadow-sm">
            <button type="button" 
                    class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center justify-center shadow transition"
                    onclick="window.removeGalleryImage(${idx})"
                    title="Remove this photo">
                ✕
            </button>
        </div>
    `).join('');
}

window.removeGalleryImage = (idx) => {
    editingGalleryImages.splice(idx, 1);
    renderAdminGalleryPreviews();
};

async function openProductModal(product = null) {
    const modal = document.getElementById('admin-product-modal');
    const titleEl = document.getElementById('admin-product-modal-title');
    const form = document.getElementById('admin-product-form');
    const categorySelect = form.elements['category_id'];

    editingProductId = product ? product.id : null;
    editingGalleryImages = product && Array.isArray(product.gallery_images) ? [...product.gallery_images] : [];

    if (titleEl) titleEl.textContent = product ? 'Edit Crochet Product' : 'Add New Crochet Creation';

    // Populate category dropdown from DB
    const categories = await db.getCategories();
    if (categorySelect) {
        if (categories.length === 0) {
            categorySelect.innerHTML = `<option value="">No categories yet (Click 'Categories' tab to add)</option>`;
        } else {
            categorySelect.innerHTML = categories.map(c => 
                `<option value="${c.id}">${c.icon || '🧶'} ${c.name}</option>`
            ).join('');
        }
    }

    if (form) {
        form.reset();
        if (product) {
            form.elements['name'].value = product.name || '';
            if (product.category_id) form.elements['category_id'].value = product.category_id;
            form.elements['price'].value = product.price || '';
            form.elements['craft_days'].value = product.craft_days || CONFIG.STANDARD_CRAFT_DAYS;
            form.elements['image_url'].value = product.image_url || '';
            form.elements['description'].value = product.description || '';
            form.elements['dimensions'].value = product.dimensions || '';
            form.elements['yarn_used'].value = product.yarn_used || '';
            form.elements['is_featured'].checked = !!product.is_featured;
            if (form.elements['is_active']) {
                form.elements['is_active'].checked = product.is_active !== false;
            }

            
            const preview = document.getElementById('admin-product-preview-img');
            if (preview) {
                preview.src = product.image_url;
                preview.classList.remove('hidden');
            }
        } else {
            form.elements['craft_days'].value = CONFIG.STANDARD_CRAFT_DAYS;
            form.elements['yarn_used'].value = 'Milk Cotton Yarn';
            if (form.elements['is_active']) {
                form.elements['is_active'].checked = true;
            }
            document.getElementById('admin-product-preview-img')?.classList.add('hidden');
        }

        // Reset gallery inputs and render current gallery
        const galleryFilesInput = document.getElementById('admin-product-gallery-files');
        if (galleryFilesInput) galleryFilesInput.value = '';
        const galleryUrlInput = document.getElementById('admin-product-gallery-url-input');
        if (galleryUrlInput) galleryUrlInput.value = '';
        renderAdminGalleryPreviews();
    }

    modal?.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('admin-product-modal')?.classList.add('hidden');
    editingProductId = null;
    editingGalleryImages = [];
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving... 🧶';

    try {
        const formData = new FormData(form);
        let finalImageUrl = formData.get('image_url')?.trim();

        // 1. Upload Cover Image if file was selected
        const fileInput = document.getElementById('admin-product-image-file');
        if (fileInput?.files?.length > 0) {
            submitBtn.textContent = 'Uploading Cover Image... 📸';
            finalImageUrl = await db.uploadImage(fileInput.files[0], CONFIG.STORAGE_BUCKETS.PRODUCT_IMAGES);
        }

        // 2. Upload any new Gallery Image files
        const galleryFilesInput = document.getElementById('admin-product-gallery-files');
        if (galleryFilesInput?.files?.length > 0) {
            submitBtn.textContent = 'Uploading Gallery Photos... 📸';
            const uploadedGalleryUrls = await db.uploadMultipleImages(galleryFilesInput.files, CONFIG.STORAGE_BUCKETS.PRODUCT_IMAGES);
            
            // Remove local base64 data URLs that were added from the file input preview and replace with live storage URLs
            const persistentUrls = editingGalleryImages.filter(url => !url.startsWith('data:'));
            editingGalleryImages = [...persistentUrls, ...uploadedGalleryUrls];
        }

        const yarnUsed = formData.get('yarn_used')?.trim() || 'Standard Yarn';
        
        const payload = {
            name: formData.get('name'),
            slug: formData.get('name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            category_id: formData.get('category_id') || null,
            price: parseFloat(formData.get('price')),
            craft_days: parseInt(formData.get('craft_days') || String(CONFIG.STANDARD_CRAFT_DAYS)),
            description: formData.get('description'),
            dimensions: formData.get('dimensions') || '',
            image_url: finalImageUrl || 'assets/favicon.svg',
            gallery_images: editingGalleryImages,
            yarn_used: yarnUsed,
            is_featured: form.elements['is_featured'] ? form.elements['is_featured'].checked : false,
            is_active: form.elements['is_active'] ? form.elements['is_active'].checked : true
        };

        if (editingProductId) {
            await db.updateProduct(editingProductId, payload);
            store.showToast('Product updated successfully! ✨');
        } else {
            await db.createProduct(payload);
            store.showToast('New crochet item added! 🧶');
        }

        closeProductModal();
        renderAdminProducts();
    } catch (err) {
        console.error('Error saving product:', err);
        store.showToast('Failed to save product: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Creation';
    }
}

// -----------------------------------------------------------------
// 2. CATEGORIES MANAGEMENT
// -----------------------------------------------------------------
async function renderAdminCategories() {
    const container = document.getElementById('admin-categories-list');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-8 text-stone-400">Loading categories... 🧶</div>`;

    try {
        const categories = await db.getCategories();
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8 text-stone-500">
                    <span class="text-3xl block mb-2">📂</span>
                    <p class="font-bold text-stone-800">Clean Slate: No categories yet</p>
                    <p class="text-xs text-stone-400 mt-1">Add your categories (e.g. <em>Plushies, Keychains, Bags, Bouquets</em>) to organize your shop!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(cat => `
            <div class="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-stone-200 text-xs">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-base">${cat.icon || '🧶'}</span>
                    <div>
                        <h4 class="font-bold text-stone-800">${cat.name}</h4>
                        <p class="text-[11px] text-stone-400">Slug: ${cat.slug} • Order: ${cat.display_order}</p>
                    </div>
                </div>
                <button type="button" class="text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 font-semibold" onclick="window.adminDeleteCategory('${cat.id}')">
                    Delete
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error rendering categories:', err);
    }
}

function openCategoryModal() {
    document.getElementById('admin-cat-modal')?.classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('admin-cat-modal')?.classList.add('hidden');
}

async function handleSaveCategory(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const formData = new FormData(form);
        await db.createCategory({
            name: formData.get('name'),
            icon: formData.get('icon') || '🧶',
            description: formData.get('description') || '',
            display_order: parseInt(formData.get('display_order') || '0')
        });

        store.showToast('New category added! ✨');
        closeCategoryModal();
        form.reset();
        renderAdminCategories();
    } catch (err) {
        store.showToast('Failed to add category: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Category';
    }
}

window.adminDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        await db.deleteCategory(id);
        store.showToast('Category deleted', 'info');
        renderAdminCategories();
    } catch (err) {
        store.showToast('Failed to delete category: ' + err.message, 'error');
    }
};

// -----------------------------------------------------------------
// 3. REGULAR ORDERS MANAGEMENT
// -----------------------------------------------------------------
async function renderAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-8 text-stone-400">Loading orders... 🧶</div>`;

    try {
        const orders = await db.getAllOrders();
        if (orders.length === 0) {
            container.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-stone-200 text-stone-500">No regular orders placed yet. Customer checkouts will appear here!</div>`;
            return;
        }

        container.innerHTML = orders.map(order => {
            const items = order.items || [];
            return `
                <div class="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm transition hover:border-rose-200 space-y-4 text-xs">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div>
                            <span class="font-mono font-bold text-sm text-stone-900">${order.id}</span>
                            <span class="text-stone-400 ml-2">• ${new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-[11px] font-medium text-stone-500">Status:</label>
                            <select class="px-2.5 py-1 rounded-lg border border-stone-200 font-semibold bg-stone-50 text-stone-800 text-xs focus:ring-1 focus:ring-rose-400" onchange="window.adminUpdateOrderStatus('${order.id}', this.value)">
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                                <option value="Processing" ${order.status === 'Processing' || order.status === 'Crafting' ? 'selected' : ''}>🧶 Processing / Crafting</option>
                                <option value="Packaged" ${order.status === 'Packaged' ? 'selected' : ''}>📦 Packaged</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✨ Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h5 class="font-bold text-stone-700 mb-1">Customer</h5>
                            <p class="font-semibold text-stone-900">${order.customer_name}</p>
                            <p class="text-stone-500">📞 ${order.customer_phone}</p>
                            <p class="text-stone-500">${order.shipping_address}, ${order.city}</p>
                            ${order.notes ? `<p class="mt-1 text-stone-500 italic">"${order.notes}"</p>` : ''}
                        </div>

                        <div class="space-y-1.5 md:col-span-1">
                            <h5 class="font-bold text-stone-700 mb-1">Items (${items.length})</h5>
                            ${items.map(i => `
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${i.color_hex};"></span>
                                    <span class="text-stone-800">${i.name} [${i.color_name}] x${i.quantity}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="flex flex-col justify-between items-start md:items-end">
                            <div>
                                <span class="text-stone-500 block md:text-right">Total Amount</span>
                                <span class="font-bold text-base text-rose-600 md:text-right block">${CONFIG.CURRENCY} ${parseFloat(order.total_amount).toLocaleString()}</span>
                            </div>
                            <a href="https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '') || CONFIG.WHATSAPP_NUMBER}?text=Hi%20${encodeURIComponent(order.customer_name)}!%20🧶%20This%20is%20Tiny%20Crochet%20Friends%20regarding%20your%20order%20(${order.id})." 
                               target="_blank" 
                               class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition text-xs shadow-sm">
                                <span>💬 WhatsApp Customer</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error rendering admin orders:', err);
    }
}

window.adminUpdateOrderStatus = async (orderId, newStatus) => {
    try {
        await db.updateOrderStatus(orderId, newStatus);
        store.showToast(`Order ${orderId} updated to ${newStatus}`);
    } catch (err) {
        store.showToast('Could not update status: ' + err.message, 'error');
    }
};

// -----------------------------------------------------------------
// 4. CUSTOM ORDERS MANAGEMENT
// -----------------------------------------------------------------
async function renderAdminCustomOrders() {
    const container = document.getElementById('admin-custom-orders-list');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-8 text-stone-400">Loading custom requests... 🧶</div>`;

    try {
        const customOrders = await db.getAllCustomOrders();
        if (customOrders.length === 0) {
            container.innerHTML = `<div class="text-center py-10 bg-white rounded-2xl border border-stone-200 text-stone-500">No bespoke custom orders yet. When customers submit requests with inspiration photos, they will appear here!</div>`;
            return;
        }

        container.innerHTML = customOrders.map(co => `
            <div class="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-4 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                        <span class="font-mono font-bold text-sm text-amber-900">${co.id}</span>
                        <span class="text-stone-400 ml-2">• ${new Date(co.created_at).toLocaleDateString()}</span>
                        <span class="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">${co.item_category}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-[11px] font-medium text-stone-500">Status:</label>
                        <select class="px-2.5 py-1 rounded-lg border border-amber-200 font-semibold bg-amber-50 text-stone-800 text-xs focus:ring-1 focus:ring-amber-400" onchange="window.adminUpdateCustomStatus('${co.id}', this.value)">
                            <option value="Pending Review" ${co.status === 'Pending Review' ? 'selected' : ''}>⏳ Pending Review</option>
                            <option value="Quoted" ${co.status === 'Quoted' ? 'selected' : ''}>💬 Quoted</option>
                            <option value="In Progress" ${co.status === 'In Progress' ? 'selected' : ''}>🧶 In Progress</option>
                            <option value="Completed" ${co.status === 'Completed' ? 'selected' : ''}>✨ Completed</option>
                            <option value="Declined" ${co.status === 'Declined' ? 'selected' : ''}>❌ Declined</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-1">
                        ${co.image_url ? `
                            <a href="${co.image_url}" target="_blank" title="Click to view full image">
                                <img src="${co.image_url}" alt="Inspiration" class="w-full h-32 object-cover rounded-xl border border-stone-200 hover:opacity-90 transition">
                            </a>
                        ` : `
                            <div class="w-full h-32 bg-stone-100 rounded-xl border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-center p-2">
                                No inspiration photo attached
                            </div>
                        `}
                    </div>

                    <div class="md:col-span-2 space-y-2">
                        <div>
                            <h5 class="font-bold text-stone-800">Customer: ${co.customer_name}</h5>
                            <p class="text-stone-500">📞 ${co.customer_phone} ${co.customer_email ? `• ${co.customer_email}` : ''}</p>
                        </div>
                        <div class="bg-stone-50 p-3 rounded-xl border border-stone-100">
                            <p class="font-medium text-stone-800">Custom Request:</p>
                            <p class="text-stone-600 italic mt-0.5 leading-relaxed">"${co.description}"</p>
                        </div>
                        <div class="flex flex-wrap gap-3 text-stone-600">
                            <span><strong>Colors:</strong> ${co.color_preferences || 'Open to ideas'}</span>
                            <span><strong>Budget:</strong> ${co.budget_range || 'Flexible'}</span>
                            ${co.date_needed ? `<span><strong>Needed by:</strong> ${co.date_needed}</span>` : ''}
                        </div>
                    </div>

                    <div class="md:col-span-1 flex flex-col justify-between items-start md:items-end space-y-2">
                        <div class="w-full">
                            <label class="block text-[11px] font-bold text-stone-700 mb-1">Studio Note / Quote:</label>
                            <input type="text" 
                                   placeholder="e.g. Quoted Rs. 1500, crafting starts Mon" 
                                   value="${co.admin_notes || ''}" 
                                   class="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs" 
                                   onblur="window.adminSaveCustomNotes('${co.id}', this.value)">
                        </div>
                        <a href="https://wa.me/${co.customer_phone.replace(/[^0-9]/g, '') || CONFIG.WHATSAPP_NUMBER}?text=Hi%20${encodeURIComponent(co.customer_name)}!%20🧶%20This%20is%20Tiny%20Crochet%20Friends%20about%20your%20custom%20request%20(${co.id})%20for%20a%20${encodeURIComponent(co.item_category)}." 
                           target="_blank" 
                           class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition text-xs shadow-sm">
                            <span>💬 Discuss on WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error rendering admin custom orders:', err);
    }
}

window.adminUpdateCustomStatus = async (id, newStatus) => {
    try {
        await db.updateCustomOrderStatus(id, newStatus);
        store.showToast(`Custom order ${id} updated to ${newStatus}`);
    } catch (err) {
        store.showToast('Could not update status: ' + err.message, 'error');
    }
};

window.adminSaveCustomNotes = async (id, notes) => {
    try {
        await db.updateCustomOrderStatus(id, 'Quoted', notes);
        store.showToast('Designer note saved!');
    } catch (err) {
        store.showToast('Failed to save note: ' + err.message, 'error');
    }
};

// -----------------------------------------------------------------
// 5. SETTINGS FORM
// -----------------------------------------------------------------
function handleSaveSettings(e) {
    e.preventDefault();
    const form = e.target;
    const url = form.elements['supabase_url']?.value;
    const key = form.elements['supabase_key']?.value;
    const wa = form.elements['whatsapp_number']?.value;

    updateCredentials(url, key, wa);
    store.showToast('Settings saved! Reloading connection...');
}
