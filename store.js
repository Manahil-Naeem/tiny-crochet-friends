/**
 * TINY CROCHET FRIENDS - REACTIVE STORE & CART STATE
 */

import { CONFIG } from './config.js';
import { db } from './supabaseClient.js';

class Store {
    constructor() {
        this.cart = this.loadCart();
        this.currentView = 'home';
        this.listeners = [];
    }

    loadCart() {
        try {
            const data = localStorage.getItem('crochet_cart');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    saveCart() {
        localStorage.setItem('crochet_cart', JSON.stringify(this.cart));
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    // Cart Operations
    addToCart(product, selectedColor = null, quantity = 1) {
        const colorName = selectedColor ? selectedColor.name : (product.color_options?.[0]?.name || 'Standard');
        const colorHex = selectedColor ? selectedColor.hex : (product.color_options?.[0]?.hex || '#E0839B');

        const existingIndex = this.cart.findIndex(item => 
            item.product_id === product.id && item.color_name === colorName
        );

        if (existingIndex > -1) {
            this.cart[existingIndex].quantity += quantity;
        } else {
            this.cart.push({
                product_id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                image_url: product.image_url,
                color_name: colorName,
                color_hex: colorHex,
                quantity: quantity,
                craft_days: product.craft_days || CONFIG.STANDARD_CRAFT_DAYS
            });
        }

        this.saveCart();
        this.showToast(`✨ Added "${product.name}" (${colorName}) to your bag!`);
    }

    removeFromCart(index) {
        if (index >= 0 && index < this.cart.length) {
            const removed = this.cart.splice(index, 1);
            this.saveCart();
            this.showToast(`Removed "${removed[0].name}" from your bag`, 'info');
        }
    }

    updateQuantity(index, quantity) {
        if (index >= 0 && index < this.cart.length) {
            if (quantity <= 0) {
                this.removeFromCart(index);
            } else {
                this.cart[index].quantity = quantity;
                this.saveCart();
            }
        }
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    // Real-time Cart Validation against live/cached catalog status
    async validateCart() {
        if (!this.cart || this.cart.length === 0) return { changed: false, removed: [] };

        try {
            const { validItems, removedItems } = await db.validateCartItems(this.cart);
            if (removedItems && removedItems.length > 0) {
                this.cart = validItems;
                this.saveCart();

                removedItems.forEach(item => {
                    this.showToast(`🌸 Notice: "${item.name}" is no longer available in our studio catalog and was removed from your bag.`, 'info');
                });

                return { changed: true, removed: removedItems };
            }
        } catch (err) {
            console.warn('Cart validation check failed:', err);
        }
        return { changed: false, removed: [] };
    }

    getCartCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    getSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getShippingFee() {
        const subtotal = this.getSubtotal();
        if (subtotal === 0 || subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD) {
            return 0;
        }
        return CONFIG.SHIPPING_FEE;
    }

    getTotal() {
        return this.getSubtotal() + this.getShippingFee();
    }

    // Cozy Toast Notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-up flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl font-medium text-xs sm:text-sm transition-all`;
        
        let icon = '🧶';
        if (type === 'error') icon = '⚠️';
        if (type === 'info') icon = '🌸';

        toast.innerHTML = `
            <span class="text-lg">${icon}</span>
            <span class="flex-1">${message}</span>
            <button class="text-xs opacity-60 hover:opacity-100 ml-2" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 400);
        }, 3600);
    }
}

export const store = new Store();
