/**
 * TINY CROCHET FRIENDS - ORDER TRACKING MODULE
 * Allows customers to track both Regular Orders (ORD-*) and Custom Orders (CUST-*)
 */

import { db } from './supabaseClient.js';
import { CONFIG } from './config.js';
import { store } from './store.js';

export function setupTracking() {
    const form = document.getElementById('tracking-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('tracking-input');
        const query = input?.value?.trim();

        if (!query) {
            store.showToast('Please enter an Order ID or Custom Request ID', 'info');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Searching Stitches... 🧶</span>`;

        try {
            await trackOrder(query);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
        }
    });
}

export async function trackOrder(orderId) {
    const container = document.getElementById('tracking-result-container');
    const emptyState = document.getElementById('tracking-not-found');

    if (!container) return;

    const isCustom = orderId.toUpperCase().startsWith('CUST');

    let order = null;
    if (isCustom) {
        order = await db.getCustomOrderById(orderId);
    } else {
        order = await db.getOrderById(orderId);
        if (!order) order = await db.getCustomOrderById(orderId);
    }

    if (!order) {
        container.classList.add('hidden');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            const searchIdSpan = document.getElementById('not-found-id');
            if (searchIdSpan) searchIdSpan.textContent = orderId;
        }
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    if (order.id.startsWith('CUST')) {
        renderCustomOrderTracking(order, container);
    } else {
        renderRegularOrderTracking(order, container);
    }
}

function renderRegularOrderTracking(order, container) {
    const statuses = ['Pending', 'Processing', 'Packaged', 'Delivered'];
    // Map 'Crafting' to 'Processing' if present
    const normalizedStatus = order.status === 'Crafting' ? 'Processing' : order.status;
    const currentIdx = Math.max(0, statuses.indexOf(normalizedStatus));

    const steps = [
        { title: 'Order Received', desc: 'Colors & details queued', icon: '📝' },
        { title: 'Hand-Crafting', desc: `Handmade (${CONFIG.STANDARD_LEAD_TIME})`, icon: '🧶' },
        { title: 'Packaged with Care', desc: 'Quality checked & ribboned', icon: '📦' },
        { title: 'Dispatched / Delivered', desc: 'Heading to its cozy home', icon: '✨' }
    ];

    const isCancelled = order.status === 'Cancelled';

    container.innerHTML = `
        <div class="bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-rose-100 shadow-xl stitch-border-pink">
            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-rose-100">
                <div>
                    <span class="text-xs uppercase tracking-wider font-bold text-rose-500">Regular Order</span>
                    <h3 class="text-2xl font-extrabold text-stone-900">${order.id}</h3>
                    <p class="text-xs text-stone-500 mt-1">Placed on ${new Date(order.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    
                </div>
                <div>
                    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm ${
                        isCancelled ? 'bg-red-100 text-red-700' :
                        order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                        (order.status === 'Processing' || order.status === 'Crafting') ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        'bg-rose-100 text-rose-800'
                    }">
                        ${isCancelled ? '❌ Cancelled' : `🧶 Status: ${order.status}`}
                    </span>
                </div>
            </div>

            <!-- Lead Time Reminder -->
            <div class="my-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <span class="text-lg">⏱️</span>
                <span><strong>Handmade Notice:</strong> Every cutie is made-to-order. Standard making and dispatch turnaround is <strong>${CONFIG.STANDARD_LEAD_TIME}</strong>.</span>
            </div>

            ${isCancelled ? `
                <div class="my-6 p-4 rounded-2xl bg-red-50 text-red-700 text-sm">
                    This order was cancelled. If you have questions, please reach out via WhatsApp below.
                </div>
            ` : `
                <!-- Stepper Progress Timeline -->
                <div class="my-8">
                    <div class="relative flex justify-between items-center max-w-2xl mx-auto">
                        <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-rose-100 -z-0 rounded-full">
                            <div class="h-full bg-rose-400 rounded-full transition-all duration-700" style="width: ${(currentIdx / (steps.length - 1)) * 100}%"></div>
                        </div>

                        ${steps.map((step, idx) => {
                            const isCompleted = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;
                            return `
                                <div class="relative z-10 flex flex-col items-center text-center max-w-[100px]">
                                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                                        isCompleted ? 'bg-rose-500 text-white ring-4 ring-rose-100' : 'bg-white text-stone-400 border border-stone-200'
                                    } ${isCurrent ? 'scale-110' : ''}">
                                        ${step.icon}
                                    </div>
                                    <span class="mt-3 font-semibold text-xs text-stone-800 leading-tight">${step.title}</span>
                                    <span class="text-[10px] text-stone-500 mt-0.5 hidden sm:block">${step.desc}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `}

            <!-- Order Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-rose-100 mt-6">
                <!-- Items Ordered -->
                <div>
                    <h4 class="font-bold text-sm text-stone-800 mb-3 flex items-center gap-2">
                        <span>Items in this Order</span>
                        <span class="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">${order.items?.length || 0} items</span>
                    </h4>
                    <div class="space-y-2">
                        ${(order.items || []).map(item => `
                            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                                <img src="${item.image_url}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover">
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-xs text-stone-800 truncate">${item.name}</p>
                                    <div class="flex items-center gap-1.5 text-[11px] text-stone-500">
                                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${item.color_hex};"></span>
                                        <span>${item.color_name} × ${item.quantity}</span>
                                    </div>
                                </div>
                                <span class="font-bold text-xs text-stone-700">${CONFIG.CURRENCY} ${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Customer & Delivery -->
                <div class="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 text-xs space-y-2">
                    <h4 class="font-bold text-stone-800 text-sm mb-2">Delivery & Customer</h4>
                    <p><strong class="text-stone-700">Name:</strong> ${order.customer_name}</p>
                    <p><strong class="text-stone-700">Phone:</strong> ${order.customer_phone}</p>
                    <p><strong class="text-stone-700">Address:</strong> ${order.shipping_address}, ${order.city} ${order.postal_code || ''}</p>
                    ${order.notes ? `<p><strong class="text-stone-700">Special Notes:</strong> "${order.notes}"</p>` : ''}
                    <div class="pt-2 border-t border-rose-200/60 flex justify-between font-bold text-stone-800 text-sm">
                        <span>Total:</span>
                        <span class="text-rose-600">${CONFIG.CURRENCY} ${parseFloat(order.total_amount).toLocaleString()}</span>
                    </div>

                    <div class="pt-3">
                        <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=Hi! 🧶 Inquiring about Order ${order.id} for ${encodeURIComponent(order.customer_name)}" 
                           target="_blank" 
                           class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition shadow-sm text-xs">
                            <span>💬 Chat on WhatsApp about this order</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCustomOrderTracking(customOrder, container) {
    const statuses = ['Pending Review', 'Quoted', 'In Progress', 'Completed'];
    const currentIdx = Math.max(0, statuses.indexOf(customOrder.status));

    const steps = [
        { title: 'Request Received', desc: 'Inspiration under review', icon: '💡' },
        { title: 'Pattern & Quote', desc: 'Yarn palette chosen', icon: '🎨' },
        { title: 'Hand-Crafting', desc: `Handmade (${CONFIG.STANDARD_LEAD_TIME})`, icon: '🧶' },
        { title: 'Ready & Sent', desc: 'Dispatched with care!', icon: '✨' }
    ];

    container.innerHTML = `
        <div class="bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-amber-100 shadow-xl stitch-border">
            <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-amber-100">
                <div>
                    <span class="text-xs uppercase tracking-wider font-bold text-amber-600">Bespoke Custom Order</span>
                    <h3 class="text-2xl font-bold text-stone-800">${customOrder.id}</h3>
                    <p class="text-xs text-stone-500 mt-1">Submitted on ${new Date(customOrder.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm bg-amber-100 text-amber-800">
                        ✨ Status: ${customOrder.status}
                    </span>
                </div>
            </div>

            <!-- Lead time reminder -->
            <div class="my-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <span>⏱️</span>
                <span>Standard bespoke lead time: <strong>${CONFIG.STANDARD_LEAD_TIME}</strong> from pattern confirmation.</span>
            </div>

            <!-- Stepper Progress -->
            <div class="my-8">
                <div class="relative flex justify-between items-center max-w-2xl mx-auto">
                    <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-amber-100 -z-0 rounded-full">
                        <div class="h-full bg-amber-400 rounded-full transition-all duration-700" style="width: ${(currentIdx / (steps.length - 1)) * 100}%"></div>
                    </div>

                    ${steps.map((step, idx) => {
                        const isCompleted = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        return `
                            <div class="relative z-10 flex flex-col items-center text-center max-w-[100px]">
                                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-md ${
                                    isCompleted ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-white text-stone-400 border border-stone-200'
                                } ${isCurrent ? 'scale-110' : ''}">
                                    ${step.icon}
                                </div>
                                <span class="mt-3 font-semibold text-xs text-stone-800 leading-tight">${step.title}</span>
                                <span class="text-[10px] text-stone-500 mt-0.5 hidden sm:block">${step.desc}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Custom Order Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-amber-100 mt-6">
                <div>
                    <h4 class="font-bold text-sm text-stone-800 mb-2">Custom Request Details</h4>
                    <p class="text-xs text-stone-600 mb-3 bg-stone-50 p-3 rounded-xl border border-stone-100 italic leading-relaxed">
                        "${customOrder.description}"
                    </p>
                    <div class="space-y-1 text-xs text-stone-600">
                        <p><strong>Item Category:</strong> ${customOrder.item_category}</p>
                        <p><strong>Color Preferences:</strong> ${customOrder.color_preferences || 'Not specified'}</p>
                        <p><strong>Budget Range:</strong> ${customOrder.budget_range || 'Flexible'}</p>
                        ${customOrder.admin_notes ? `
                            <div class="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 font-medium">
                                💬 <strong>Studio Note:</strong> ${customOrder.admin_notes}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="space-y-3">
                    ${customOrder.image_url ? `
                        <div>
                            <h4 class="font-bold text-xs text-stone-700 mb-1">Inspiration Photo</h4>
                            <img src="${customOrder.image_url}" alt="Inspiration" class="w-full h-44 object-cover rounded-2xl border border-stone-200 shadow-sm">
                        </div>
                    ` : ''}
                    <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=Hi! 🧶 Following up on Custom Request ${customOrder.id} (${encodeURIComponent(customOrder.customer_name)})" 
                       target="_blank" 
                       class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition shadow-sm text-xs">
                        <span>💬 Chat on WhatsApp about this piece</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}
