/**
 * TINY CROCHET FRIENDS - CHECKOUT & CART DRAWER
 */

import { store } from './store.js';
import { db } from './supabaseClient.js';
import { CONFIG } from './config.js';

export function setupCheckout() {
    store.subscribe(() => renderCartDrawer());
    
    // Bind toggle buttons
    const cartToggleBtns = document.querySelectorAll('.cart-toggle-btn');
    cartToggleBtns.forEach(btn => btn.addEventListener('click', () => toggleCartDrawer(true)));

    const closeCartBtn = document.getElementById('close-cart-btn');
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));

    const cartBackdrop = document.getElementById('cart-backdrop');
    if (cartBackdrop) cartBackdrop.addEventListener('click', () => toggleCartDrawer(false));

    // Open checkout modal button with real-time validation
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    if (proceedCheckoutBtn) {
        proceedCheckoutBtn.addEventListener('click', async () => {
            if (store.cart.length === 0) {
                store.showToast('Your bag is empty! Pick some cute crochet friends first.', 'info');
                return;
            }

            const origText = proceedCheckoutBtn.innerHTML;
            proceedCheckoutBtn.disabled = true;
            proceedCheckoutBtn.innerHTML = `<span>Checking Availability... 🌸</span>`;

            try {
                const valResult = await store.validateCart();
                if (valResult.changed) {
                    renderCartDrawer();
                }

                if (store.cart.length === 0) {
                    store.showToast('The items in your bag are no longer available in the studio catalog.', 'info');
                    return;
                }

                toggleCartDrawer(false);
                openCheckoutModal();
            } finally {
                proceedCheckoutBtn.disabled = false;
                proceedCheckoutBtn.innerHTML = origText;
            }
        });
    }

    // Checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }

    // Close checkout modal
    const closeCheckoutBtn = document.getElementById('close-checkout-modal-btn');
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', () => closeCheckoutModal());
    }

    renderCartDrawer();
}

export function toggleCartDrawer(open) {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (!drawer || !backdrop) return;

    if (open) {
        renderCartDrawer();
        backdrop.classList.remove('hidden');
        drawer.classList.remove('translate-x-full');
        document.body.classList.add('overflow-hidden');

        // Real-time catalog validation when customer opens the bag drawer
        store.validateCart().then(res => {
            if (res.changed) {
                renderCartDrawer();
            }
        });
    } else {
        drawer.classList.add('translate-x-full');
        backdrop.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

function renderCartDrawer() {
    const listContainer = document.getElementById('cart-items-list');
    const badgeElements = document.querySelectorAll('.cart-count-badge');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl = document.getElementById('cart-total');
    const emptyState = document.getElementById('cart-empty-state');
    const checkoutFooter = document.getElementById('cart-checkout-footer');

    const count = store.getCartCount();
    badgeElements.forEach(badge => {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    });

    if (!listContainer) return;

    if (store.cart.length === 0) {
        listContainer.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (checkoutFooter) checkoutFooter.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (checkoutFooter) checkoutFooter.classList.remove('hidden');

    const subtotal = store.getSubtotal();
    const shipping = store.getShippingFee();
    const total = store.getTotal();

    if (subtotalEl) subtotalEl.textContent = `${CONFIG.CURRENCY} ${subtotal.toLocaleString()}`;
    if (shippingEl) {
        shippingEl.textContent = shipping === 0 ? 'FREE ✨' : `${CONFIG.CURRENCY} ${shipping.toLocaleString()}`;
        shippingEl.className = shipping === 0 ? 'font-semibold text-emerald-600' : 'font-medium';
    }
    if (totalEl) totalEl.textContent = `${CONFIG.CURRENCY} ${total.toLocaleString()}`;

    listContainer.innerHTML = store.cart.map((item, idx) => `
        <div class="flex items-center gap-3 p-3 bg-white/80 rounded-2xl border border-rose-100 shadow-sm transition hover:border-rose-200">
            <img src="${item.image_url}" alt="${item.name}" class="w-16 h-16 rounded-xl object-cover border border-rose-100 flex-shrink-0">
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-xs sm:text-sm text-stone-800 truncate">${item.name}</h4>
                <div class="flex items-center gap-1.5 mt-0.5 text-xs text-stone-500">
                    <span class="w-3 h-3 rounded-full border border-stone-300 inline-block flex-shrink-0" style="background-color: ${item.color_hex};"></span>
                    <span class="truncate">${item.color_name}</span>
                </div>
                <div class="flex items-center justify-between mt-2">
                    <span class="font-bold text-xs sm:text-sm text-rose-700">${CONFIG.CURRENCY} ${(item.price * item.quantity).toLocaleString()}</span>
                    <div class="flex items-center border border-stone-200 rounded-lg bg-stone-50 overflow-hidden text-xs">
                        <button type="button" class="px-2 py-0.5 hover:bg-stone-200 text-stone-600 transition" onclick="window.updateCartItem(${idx}, ${item.quantity - 1})">-</button>
                        <span class="px-2 py-0.5 font-medium text-stone-800">${item.quantity}</span>
                        <button type="button" class="px-2 py-0.5 hover:bg-stone-200 text-stone-600 transition" onclick="window.updateCartItem(${idx}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
            </div>
            <button type="button" class="text-stone-400 hover:text-rose-500 p-1 rounded transition" onclick="window.removeCartItem(${idx})" title="Remove item">
                ✕
            </button>
        </div>
    `).join('');
}

window.updateCartItem = (idx, qty) => store.updateQuantity(idx, qty);
window.removeCartItem = (idx) => store.removeFromCart(idx);

function openCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    const summaryList = document.getElementById('checkout-summary-items');
    const totalDisplay = document.getElementById('checkout-final-total');

    if (summaryList) {
        summaryList.innerHTML = store.cart.map(item => `
            <div class="flex justify-between items-center text-xs py-1.5 border-b border-rose-50">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color: ${item.color_hex};"></span>
                    <span class="text-stone-700">${item.name} (${item.color_name}) × ${item.quantity}</span>
                </div>
                <span class="font-semibold text-stone-800">${CONFIG.CURRENCY} ${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `).join('');
    }

    if (totalDisplay) {
        totalDisplay.textContent = `${CONFIG.CURRENCY} ${store.getTotal().toLocaleString()}`;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving Your Order... 🧶</span>`;

    // Final real-time validation check before submitting order
    const valRes = await store.validateCart();
    if (valRes.changed) {
        if (store.cart.length === 0) {
            closeCheckoutModal();
            store.showToast('All items in your bag have become unavailable and were removed.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }
        openCheckoutModal(); // Refresh modal with updated valid items and total
        store.showToast('Some unavailable items were removed. Please review your updated order total.', 'info');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
    }

    const formData = new FormData(form);
    const orderData = {
        customer_name: formData.get('customer_name'),
        customer_phone: formData.get('customer_phone'),
        customer_email: formData.get('customer_email') || '',
        shipping_address: formData.get('shipping_address'),
        city: formData.get('city'),
        postal_code: formData.get('postal_code') || '',
        notes: formData.get('notes') || '',
        items: store.cart,
        total_amount: store.getTotal()
    };


   try {
            const created = await db.createOrder(orderData);


        store.clearCart();
        closeCheckoutModal();
        form.reset();

        showOrderSuccess(created);
    } catch (err) {
        console.error('Checkout error:', err);
        store.showToast('Could not place order: ' + (err.message || 'Please check your connection'), 'error');
    }
   
}

function showOrderSuccess(order) {
    const modal = document.getElementById('order-success-modal');
    if (!modal) return;

    const idEl = document.getElementById('success-order-id');
    const detailsEl = document.getElementById('success-order-details');
    const waBtn = document.getElementById('success-whatsapp-btn');

    if (idEl) idEl.textContent = order.id;

    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="text-xs space-y-1.5 text-stone-600 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100">
                <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_phone})</p>
                <p><strong>Delivery Address:</strong> ${order.shipping_address}, ${order.city}</p>
                <p><strong>Total:</strong> ${CONFIG.CURRENCY} ${parseFloat(order.total_amount).toLocaleString()}</p>
                <div class="pt-1 text-rose-700 font-semibold flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>Making & Dispatch Time: <strong>${CONFIG.STANDARD_LEAD_TIME}</strong></span>
                </div>
            </div>
        `;
    }

    if (waBtn) {
        const itemSummary = order.items.map(i => `• ${i.name} [${i.color_name}] x${i.quantity}`).join('%0A');
        const text = `Hi Tiny Crochet Friends! 🧶 I just placed an order!%0A*Order ID:* ${order.id}%0A*Name:* ${order.customer_name}%0A*Items:*%0A${itemSummary}%0A*Total:* ${CONFIG.CURRENCY} ${parseFloat(order.total_amount).toLocaleString()}%0A*Estimated Making Time:* ${CONFIG.STANDARD_LEAD_TIME}%0A%0ACould you please confirm my order? Thank you! 💕`;
        waBtn.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${text}`;
    }

    modal.classList.remove('hidden');
}
