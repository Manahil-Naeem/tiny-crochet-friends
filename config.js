/**
 * TINY CROCHET FRIENDS - APP CONFIGURATION
 */

export const CONFIG = {
    // Supabase Credentials (Direct updated here)
    SUPABASE_URL: "https://fchzfrmvetmikknsjboy.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_0sKTZufhFiazKT-fLPnbjA_ESv9cfcu",

    // Brand Details
    STORE_NAME: "Tiny Crochet Friends",
    TAGLINE: "Handmade Crochet Cuties, Stitched with Love 🧶",

    SUPPORT_EMAIL: "tiny.crochetfriendzz@gmail.com",
    
    // Official Instagram Integration
    INSTAGRAM_URL: "https://www.instagram.com/tiny.crochetfriends?stkn=cjZxODZleGNzZTVv",
    INSTAGRAM_HANDLE: "@tiny.crochetfriends",

    // WhatsApp Floating Button & Direct Inquiries
    // Enter number in international format without spaces or '+' (e.g., '923001234567')
    WHATSAPP_NUMBER: "923343331240",
    WHATSAPP_DEFAULT_MSG: "Hi Tiny Crochet Friends! 🧶 I have a question about your handmade crochet cuties.",

    // Currency & Store Policies (PKR / Made to Order)
    CURRENCY: "Rs.",
    STANDARD_LEAD_TIME: "5 to 8 working days",
    STANDARD_CRAFT_DAYS: 7, // Days estimate
    SHIPPING_FEE: 250,
    FREE_SHIPPING_THRESHOLD: 3000,
    
    // Storage Buckets in Supabase
    STORAGE_BUCKETS: {
        CUSTOM_ORDERS: "custom-orders",
        PRODUCT_IMAGES: "product-images"
    }
};

/**
 * Update Supabase credentials dynamically in localStorage
 */
export function updateCredentials(url, key, whatsappNumber = null) {
    if (url) localStorage.setItem('crochet_supabase_url', url.trim());
    if (key) localStorage.setItem('crochet_supabase_anon_key', key.trim());
    if (whatsappNumber) localStorage.setItem('crochet_whatsapp_number', whatsappNumber.trim());
    window.location.reload();
}