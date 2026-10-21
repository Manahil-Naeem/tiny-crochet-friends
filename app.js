/**
 * TINY CROCHET FRIENDS - MAIN CLIENT APPLICATION
 */

import { db } from './supabaseClient.js';
import { store } from './store.js';
import { CONFIG } from './config.js';
import { setupCheckout } from './checkout.js';
import { setupCustomOrder } from './customOrder.js';
import { setupTracking } from './tracking.js';
import { setupAdmin, loadAdminDashboard } from './admin.js';

let activeCategory = 'all';
let currentSearchTerm = '';
let selectedProductForModal = null;
let modalSelectedColor = null;

const cardColorSelections = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Setup sub-modules
    setupNavigation();
    setupCheckout();
    setupCustomOrder();
    setupTracking();
    await setupAdmin();
    setupWhatsAppFloat();
    setupProductModal();

    // Initial load
    await loadCategories();
    await loadProducts();
    await loadFeaturedProducts();

    // Handle hash routing
    handleRoute(window.location.hash || '#home');
    window.addEventListener('hashchange', () => handleRoute(window.location.hash));
});

// -------------------------------------------------------------
// NAVIGATION & ROUTING
// -------------------------------------------------------------
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetHash = link.getAttribute('href');
            if (targetHash && targetHash.startsWith('#')) {
                handleRoute(targetHash);
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        });
    }

    // Search bar listener
    const searchInput = document.getElementById('shop-search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearchTerm = e.target.value.trim();
                loadProducts();
            }, 250);
        });
    }
}

function handleRoute(hash) {
    const cleanHash = (hash || '#home').replace('#', '').toLowerCase();
    const views = ['home', 'shop', 'custom', 'track', 'admin'];
    const activeView = views.includes(cleanHash) ? cleanHash : 'home';

    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle('hidden', v !== activeView);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = href === `#${activeView}`;
        link.classList.toggle('text-rose-600', isActive);
        link.classList.toggle('font-bold', isActive);
        link.classList.toggle('text-stone-600', !isActive);
    });

    if (activeView === 'shop') {
        loadProducts();
    } else if (activeView === 'admin') {
        loadAdminDashboard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------
// CATEGORIES & PRODUCT CATALOG (Clean Slate Aware)
// -------------------------------------------------------------
async function loadCategories() {
    const container = document.getElementById('category-filter-pills');
    if (!container) return;

    try {
        const categories = await db.getCategories();
        
        if (categories.length === 0) {
            container.innerHTML = `
                <button class="cat-pill active px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap bg-rose-500 text-white shadow-sm" data-slug="all">
                    ✨ All Goodies
                </button>
            `;
            return;
        }

        container.innerHTML = `
            <button class="cat-pill active px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap bg-rose-500 text-white shadow-sm" data-slug="all">
                ✨ All Goodies
            </button>
            ${categories.map(c => `
                <button class="cat-pill px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap bg-white text-stone-600 hover:bg-rose-50 border border-stone-200" data-slug="${c.slug}">
                    ${c.icon || '🧶'} ${c.name}
                </button>
            `).join('')}
        `;

        container.querySelectorAll('.cat-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.cat-pill').forEach(b => {
                    b.className = 'cat-pill px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap bg-white text-stone-600 hover:bg-rose-50 border border-stone-200';
                });
                btn.className = 'cat-pill active px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap bg-rose-500 text-white shadow-sm';
                activeCategory = btn.dataset.slug;
                loadProducts();
            });
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

async function loadProducts() {
    const container = document.getElementById('shop-product-grid');
    if (!container) return;

    container.innerHTML = `
        <div class="col-span-full text-center py-16">
            <span class="text-3xl animate-bounce inline-block mb-3">🧶</span>
            <p class="text-stone-500 font-medium text-xs">Gathering our cozy handmade creations...</p>
        </div>
    `;

    try {
        const products = await db.getProducts(activeCategory, currentSearchTerm, true);

        if (products.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white/70 rounded-3xl border border-rose-100 p-8">
                    <span class="text-4xl block mb-2">🌸</span>
                    <h3 class="font-bold text-base sm:text-lg text-stone-800">Clean Slate: Catalog is Ready!</h3>
                    <p class="text-stone-500 text-xs mt-1 mb-5 max-w-md mx-auto">
                        No crochet products added yet. Log in to the <strong>Admin Studio</strong> to publish your handmade plushies, bags, and keychains, or request a custom order!
                    </p>
                    <div class="flex flex-wrap justify-center gap-3">
                        <a href="#custom" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-md hover:bg-rose-600 transition">
                            Request a Custom Order ✨
                        </a>
                        <a href="#admin" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition">
                            🔒 Open Admin Panel to Add Products
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => renderProductCard(product)).join('');

        // Bind color swatches on card
        container.querySelectorAll('.product-card-swatch').forEach(swatchBtn => {
            swatchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = swatchBtn.dataset.productId;
                const colorName = swatchBtn.dataset.colorName;
                const colorHex = swatchBtn.dataset.colorHex;

                cardColorSelections[productId] = { name: colorName, hex: colorHex };

                const card = swatchBtn.closest('.crochet-card');
                card.querySelectorAll('.product-card-swatch').forEach(sb => sb.classList.remove('active'));
                swatchBtn.classList.add('active');

                const label = card.querySelector('.selected-color-label');
                if (label) label.textContent = colorName;
            });
        });

        // Quick add to cart
        container.querySelectorAll('.add-to-cart-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                const product = products.find(p => p.id === productId);
                if (product) {
                    const selectedColor = cardColorSelections[productId] || product.color_options?.[0] || { name: 'Standard', hex: '#E0839B' };
                    store.addToCart(product, selectedColor, 1);
                }
            });
        });

        // Open modal
        container.querySelectorAll('.crochet-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.product-card-swatch') || e.target.closest('.add-to-cart-quick-btn')) return;
                const productId = card.dataset.productId;
                const product = products.find(p => p.id === productId);
                if (product) openProductDetailModal(product);
            });
        });

    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products-grid');
    if (!container) return;

    try {
        const products = await db.getProducts(null, '', true);
        const featured = products.filter(p => p.is_featured).slice(0, 4);

        if (featured.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 bg-white/60 rounded-3xl border border-rose-100 p-6">
                    <p class="text-xs text-stone-500">Your featured creations will appear here once added in the Admin panel! 🧶</p>
                    <a href="#admin" class="mt-3 inline-block text-xs font-bold text-rose-600 hover:text-rose-700">Add First Product in Admin →</a>
                </div>
            `;
            return;
        }

        container.innerHTML = featured.map(p => renderProductCard(p)).join('');

        container.querySelectorAll('.crochet-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                const product = products.find(p => p.id === productId);
                if (product) openProductDetailModal(product);
            });
        });
    } catch (err) {
        console.error('Failed to load featured products:', err);
    }
}

function renderProductCard(product) {
    const colors = product.color_options || [];
    const initialColor = colors[0] || { name: 'Custom Yarn', hex: '#E0839B' };

    return `
        <div class="crochet-card bg-white overflow-hidden shadow-sm flex flex-col justify-between cursor-pointer group" data-product-id="${product.id}">
            <div class="relative overflow-hidden aspect-square bg-rose-50/50">
                <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                
                <div class="absolute top-3 left-3">
                    <span class="badge-handmade px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-sm flex items-center gap-1">
                        <span>✨</span> Made-to-Order
                    </span>
                </div>

                <div class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-stone-600 shadow-sm">
                    ⏱️ ~${CONFIG.STANDARD_LEAD_TIME}
                </div>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                    <span class="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">${product.categories?.name || 'Crochet'}</span>
                    <h3 class="font-bold text-stone-900 text-sm mt-0.5 group-hover:text-rose-600 transition truncate">${product.name}</h3>
                    <p class="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">${product.description}</p>
                </div>

                <div class="mt-3 pt-3 border-t border-stone-100">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Yarn Color:</span>
                        <span class="selected-color-label text-[11px] font-semibold text-stone-700 truncate max-w-[120px]">${initialColor.name}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${colors.map((c, idx) => `
                            <button type="button" 
                                    class="color-swatch-btn product-card-swatch w-5 h-5 rounded-full flex-shrink-0 ${idx === 0 ? 'active' : ''}" 
                                    style="background-color: ${c.hex};" 
                                    title="${c.name}"
                                    data-product-id="${product.id}"
                                    data-color-index="${idx}"
                                    data-color-name="${c.name}"
                                    data-color-hex="${c.hex}">
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-between mt-4 pt-2">
                    <span class="font-extrabold text-sm sm:text-base text-stone-900">${CONFIG.CURRENCY} ${parseFloat(product.price).toLocaleString()}</span>
                    <button type="button" 
                            class="add-to-cart-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm hover:shadow transition"
                            data-product-id="${product.id}">
                        <span>+ Bag</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// PRODUCT DETAIL MODAL
// -------------------------------------------------------------
function setupProductModal() {
    const modal = document.getElementById('product-detail-modal');
    const closeBtn = document.getElementById('close-product-modal-btn-top');
    const backdrop = document.getElementById('product-detail-backdrop');

    if (closeBtn) closeBtn.addEventListener('click', closeProductDetailModal);
    if (backdrop) backdrop.addEventListener('click', closeProductDetailModal);

    const qtyMinus = document.getElementById('modal-qty-minus');
    const qtyPlus = document.getElementById('modal-qty-plus');
    const qtyInput = document.getElementById('modal-qty-input');

    if (qtyMinus && qtyInput) {
        qtyMinus.addEventListener('click', () => {
            const current = parseInt(qtyInput.value) || 1;
            if (current > 1) qtyInput.value = current - 1;
        });
    }

    if (qtyPlus && qtyInput) {
        qtyPlus.addEventListener('click', () => {
            const current = parseInt(qtyInput.value) || 1;
            qtyInput.value = current + 1;
        });
    }

    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', () => {
            if (!selectedProductForModal) return;
            const qty = parseInt(qtyInput.value) || 1;
            const chosenColor = modalSelectedColor || selectedProductForModal.color_options?.[0] || { name: 'Standard', hex: '#E0839B' };
            store.addToCart(selectedProductForModal, chosenColor, qty);
            closeProductDetailModal();
        });
    }
}

export function openProductDetailModal(product) {
    selectedProductForModal = product;
    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    modalSelectedColor = product.color_options?.[0] || { name: 'Standard', hex: '#E0839B' };

    // Setup Gallery Images (Main + Secondary views)
    const gallery = [product.image_url, ...(product.gallery_images || [])].filter(Boolean);
    const mainImg = document.getElementById('modal-product-img');
    if (mainImg) {
        mainImg.src = gallery[0] || 'assets/favicon.svg';
        mainImg.style.opacity = '1';
    }
    renderModalGalleryThumbnails(gallery);

    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-category').textContent = product.categories?.name || 'Handmade Crochet';
    document.getElementById('modal-product-price').textContent = `${CONFIG.CURRENCY} ${parseFloat(product.price).toLocaleString()}`;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-craft-days').textContent = `⏱️ Lead time: ${CONFIG.STANDARD_LEAD_TIME} (Made-to-order)`;
    document.getElementById('modal-product-materials').textContent = product.materials || '100% Premium Milk Cotton Yarn & Hypoallergenic Fiberfill';
    document.getElementById('modal-product-dimensions').textContent = product.dimensions || 'Handcrafted size';
    document.getElementById('modal-qty-input').value = '1';

    renderModalSwatches(product);
    updateModalWhatsAppButton(product, modalSelectedColor);

    // Yahan par reviews load karne ka function call add kar diya hai 🌟
    loadProductReviews(product.id);

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function renderModalGalleryThumbnails(images) {
    const thumbnailsContainer = document.getElementById('modal-gallery-thumbnails');
    const galleryWrapper = document.getElementById('modal-gallery-wrapper');
    const galleryCount = document.getElementById('modal-gallery-count');
    const mainImgEl = document.getElementById('modal-product-img');

    if (!thumbnailsContainer) return;

    if (!images || images.length <= 1) {
        if (galleryWrapper) galleryWrapper.classList.add('hidden');
        thumbnailsContainer.innerHTML = '';
        return;
    }

    if (galleryWrapper) galleryWrapper.classList.remove('hidden');
    if (galleryCount) galleryCount.textContent = `${images.length} views`;

    thumbnailsContainer.innerHTML = images.map((imgUrl, idx) => `
        <button type="button" 
                class="modal-gallery-thumb-btn w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${idx === 0 ? 'border-rose-500 scale-105 shadow-md' : 'border-stone-200 hover:border-rose-300 opacity-75 hover:opacity-100'}"
                data-index="${idx}"
                data-src="${imgUrl}"
                title="View photo ${idx + 1}">
            <img src="${imgUrl}" alt="Thumbnail ${idx + 1}" class="w-full h-full object-cover">
        </button>
    `).join('');

    thumbnailsContainer.querySelectorAll('.modal-gallery-thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            thumbnailsContainer.querySelectorAll('.modal-gallery-thumb-btn').forEach(b => {
                b.className = 'modal-gallery-thumb-btn w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all border-stone-200 hover:border-rose-300 opacity-75 hover:opacity-100';
            });
            btn.className = 'modal-gallery-thumb-btn w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all border-rose-500 scale-105 shadow-md';

            if (mainImgEl) {
                mainImgEl.style.opacity = '0.3';
                setTimeout(() => {
                    mainImgEl.src = btn.dataset.src;
                    mainImgEl.style.opacity = '1';
                }, 100);
            }
        });
    });
}

function renderModalSwatches(product) {
    const swatchesContainer = document.getElementById('modal-color-swatches');
    const colorNameSpan = document.getElementById('modal-selected-color-name');

    if (colorNameSpan) colorNameSpan.textContent = modalSelectedColor.name;

    if (!swatchesContainer) return;
    const colors = product.color_options || [];

    swatchesContainer.innerHTML = colors.map((c, idx) => `
        <button type="button" 
                class="color-swatch-btn modal-swatch w-7 h-7 rounded-full transition relative ${idx === 0 ? 'active' : ''}" 
                style="background-color: ${c.hex};" 
                title="${c.name}"
                data-name="${c.name}"
                data-hex="${c.hex}">
        </button>
    `).join('');

    swatchesContainer.querySelectorAll('.modal-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            swatchesContainer.querySelectorAll('.modal-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            modalSelectedColor = {
                name: btn.dataset.name,
                hex: btn.dataset.hex
            };

            if (colorNameSpan) colorNameSpan.textContent = modalSelectedColor.name;
            updateModalWhatsAppButton(product, modalSelectedColor);
        });
    });
}

function updateModalWhatsAppButton(product, color) {
    const btn = document.getElementById('modal-whatsapp-inquiry-btn');
    if (!btn) return;
    const text = `Hi Tiny Crochet Friends! 🧶 I have a question about the "${product.name}" in "${color?.name || 'custom'}" color (${CONFIG.CURRENCY} ${parseFloat(product.price).toLocaleString()}). 💕`;
    btn.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    selectedProductForModal = null;
}

// -------------------------------------------------------------
// WHATSAPP FLOATING BUTTON & INSTAGRAM LINK
// -------------------------------------------------------------
function setupWhatsAppFloat() {
    const floatBtn = document.getElementById('whatsapp-floating-btn');
    const popup = document.getElementById('whatsapp-popup-menu');
    const closePopupBtn = document.getElementById('close-wa-popup-btn');

    if (!floatBtn || !popup) return;

    floatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        popup.classList.toggle('hidden');
    });

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => popup.classList.add('hidden'));
    }

    const genChat = document.getElementById('wa-option-general');
    const customChat = document.getElementById('wa-option-custom');
    const trackChat = document.getElementById('wa-option-track');
    const instaLink = document.getElementById('wa-option-instagram');

    if (genChat) genChat.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(CONFIG.WHATSAPP_DEFAULT_MSG)}`;
    if (customChat) customChat.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Tiny Crochet Friends! 🧶 I'd love to discuss making a custom crochet piece with you.")}`;
    if (trackChat) trackChat.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Tiny Crochet Friends! 🧶 I'd like to check the status of my order.")}`;
    if (instaLink) instaLink.href = CONFIG.INSTAGRAM_URL;
}


// -------------------------------------------------------------
// PRODUCT REVIEWS LOGIC
// -------------------------------------------------------------
let currentOpenProductId = null;

// Is function ko openProductDetailModal ke andar call karna hai (neeche bataya gaya hai)
async function loadProductReviews(productId) {
    currentOpenProductId = productId;
    
    // Supabase se reviews fetch karna
    const { data: reviews, error } = await supabaseClient
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

    const listContainer = document.getElementById('modal-reviews-list');
    const countSpan = document.getElementById('modal-review-count');
    const avgSpan = document.getElementById('modal-avg-rating');

    if (!listContainer || !countSpan || !avgSpan) return;

    if (error || !reviews || reviews.length === 0) {
        listContainer.innerHTML = `<p class="text-[11px] text-stone-400 italic">No reviews yet. Be the first to review this cutie!</p>`;
        countSpan.textContent = '0';
        avgSpan.textContent = '★ New';
        return;
    }

    countSpan.textContent = reviews.length;
    
    // Average rating calculate karna
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / reviews.length).toFixed(1);
    avgSpan.textContent = `★ ${avgRating} / 5.0`;

    // Reviews render karna
    listContainer.innerHTML = reviews.map(r => `
        <div class="p-2.5 rounded-xl bg-white border border-stone-100 text-[11px] space-y-1">
            <div class="flex items-center justify-between font-bold text-stone-800">
                <span>${r.customer_name}</span>
                <span class="text-amber-500">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            <p class="text-stone-600 leading-relaxed">${r.comment}</p>
        </div>
    `).join('');
}

// Review submit form listener (DOMContentLoaded ke baad execute ho ga)
document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('product-review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentOpenProductId) return;

            const formData = new FormData(e.target);
            
            const newReview = {
                product_id: currentOpenProductId,
                customer_name: formData.get('customer_name'),
                rating: parseInt(formData.get('rating')),
                comment: formData.get('comment')
            };

            const { error } = await supabaseClient.from('reviews').insert([newReview]);

            if (!error) {
                showToast('Thank you! Your review has been added ✨', 'success');
                e.target.reset();
                loadProductReviews(currentOpenProductId); // List refresh karein
            } else {
                showToast('Failed to submit review. Try again.', 'error');
            }
        });
    }
});