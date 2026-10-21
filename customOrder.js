/**
 * TINY CROCHET FRIENDS - CUSTOM ORDER MODULE
 * Bespoke handmade orders with customer inspiration photos and custom colors.
 */

import { db } from './supabaseClient.js';
import { store } from './store.js';
import { CONFIG } from './config.js';

let selectedImageFile = null;

export function setupCustomOrder() {
    const form = document.getElementById('custom-order-form');
    const fileInput = document.getElementById('custom-order-file');
    const dropzone = document.getElementById('custom-dropzone');
    const previewContainer = document.getElementById('custom-preview-container');
    const removeImgBtn = document.getElementById('remove-custom-img-btn');

    if (!form) return;

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageSelected(file);
        });
    }

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('border-rose-400', 'bg-rose-50/60');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('border-rose-400', 'bg-rose-50/60');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageSelected(file);
            } else {
                store.showToast('Please upload an image file (PNG, JPG, WEBP)', 'error');
            }
        });
    }

    if (removeImgBtn) {
        removeImgBtn.addEventListener('click', () => {
            selectedImageFile = null;
            if (fileInput) fileInput.value = '';
            if (previewContainer) previewContainer.classList.add('hidden');
            if (dropzone) dropzone.classList.remove('hidden');
        });
    }

    form.addEventListener('submit', handleCustomOrderSubmit);
}

function handleImageSelected(file) {
    if (file.size > 5 * 1024 * 1024) {
        store.showToast('Image size should be under 5MB', 'error');
        return;
    }

    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('custom-preview-img');
        const previewContainer = document.getElementById('custom-preview-container');
        const dropzone = document.getElementById('custom-dropzone');

        if (previewImg) previewImg.src = e.target.result;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (dropzone) dropzone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

async function handleCustomOrderSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Uploading Inspiration & Submitting... 🧶</span>`;

    const formData = new FormData(form);

    try {
        let imageUrl = '';
        if (selectedImageFile) {
            submitBtn.innerHTML = `<span>Uploading Inspiration Photo... 📸</span>`;
            imageUrl = await db.uploadImage(selectedImageFile, CONFIG.STORAGE_BUCKETS.CUSTOM_ORDERS);
        }

        const payload = {
            customer_name: formData.get('customer_name'),
            customer_phone: formData.get('customer_phone'),
            customer_email: formData.get('customer_email') || '',
            item_category: formData.get('item_category'),
            description: formData.get('description'),
            color_preferences: formData.get('color_preferences') || '',
            budget_range: formData.get('budget_range') || 'Flexible',
            date_needed: formData.get('date_needed') || null,
            image_url: imageUrl
        };

        const result = await db.createCustomOrder(payload);
        
        form.reset();
        selectedImageFile = null;
        document.getElementById('custom-preview-container')?.classList.add('hidden');
        document.getElementById('custom-dropzone')?.classList.remove('hidden');

        showCustomOrderSuccess(result);
    } catch (err) {
        console.error('Custom order submission error:', err);
        store.showToast('Failed to submit request: ' + (err.message || 'Error occurred'), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showCustomOrderSuccess(customOrder) {
    const modal = document.getElementById('custom-order-success-modal');
    if (!modal) return;

    const idEl = document.getElementById('custom-success-id');
    const detailsEl = document.getElementById('custom-success-details');
    const waBtn = document.getElementById('custom-success-whatsapp-btn');

    if (idEl) idEl.textContent = customOrder.id;

    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="text-xs space-y-1.5 text-stone-600 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100">
                <p><strong>Item Category:</strong> ${customOrder.item_category}</p>
                <p><strong>Color Preferences:</strong> ${customOrder.color_preferences || 'Custom palette'}</p>
                <p><strong>Description:</strong> "${customOrder.description.substring(0, 100)}..."</p>
                <p class="text-rose-700 font-semibold pt-1">⏱️ Making Lead Time: <strong>${CONFIG.STANDARD_LEAD_TIME}</strong></p>
                ${customOrder.image_url ? `<p class="text-emerald-700 font-medium">✓ Inspiration photo attached!</p>` : ''}
            </div>
        `;
    }

    if (waBtn) {
        const text = `Hi Tiny Crochet Friends! 🧶 I submitted a custom crochet request!%0A*Request ID:* ${customOrder.id}%0A*Name:* ${customOrder.customer_name}%0A*Category:* ${customOrder.item_category}%0A*Details:* ${encodeURIComponent(customOrder.description.substring(0, 100))}%0A%0ACan we discuss the details and color choices? Thank you! 💕`;
        waBtn.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${text}`;
    }

    modal.classList.remove('hidden');
}