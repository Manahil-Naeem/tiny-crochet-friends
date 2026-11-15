const fs = require('fs');

const configContent = `export const CONFIG = {
  SUPABASE_URL: localStorage.getItem('SUPABASE_URL') || "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: localStorage.getItem('SUPABASE_ANON_KEY') || "${process.env.SUPABASE_ANON_KEY || ''}",
  STORE_NAME: "${process.env.STORE_NAME || 'Tiny Crochet Friends'}",
  TAGLINE: "${process.env.TAGLINE || 'Handmade Crochet Cuties, Stitched with Love 🧶'}",
  SUPPORT_EMAIL: "${process.env.SUPPORT_EMAIL || 'tiny.crochetfriendzz@gmail.com'}",
  INSTAGRAM_URL: "${process.env.INSTAGRAM_URL || 'https://www.instagram.com/tiny.crochetfriends'}",
  INSTAGRAM_HANDLE: "${process.env.INSTAGRAM_HANDLE || '@tiny.crochetfriends'}",
  WHATSAPP_NUMBER: "${process.env.WHATSAPP_NUMBER || ''}",
  WHATSAPP_DEFAULT_MSG: "${process.env.WHATSAPP_DEFAULT_MSG || 'Hi Tiny Crochet Friends! 🧶 I have a question about your handmade crochet cuties.'}",
  CURRENCY: "${process.env.CURRENCY || 'Rs.'}",
  STANDARD_LEAD_TIME: "${process.env.STANDARD_LEAD_TIME || '5 to 8 working days'}",
  STANDARD_CRAFT_DAYS: ${process.env.STANDARD_CRAFT_DAYS || 7},
  SHIPPING_FEE: ${process.env.SHIPPING_FEE || 250},
  FREE_SHIPPING_THRESHOLD: ${process.env.FREE_SHIPPING_THRESHOLD || 3000},
  STORAGE_BUCKETS: {
    CUSTOM_ORDERS: "${process.env.BUCKET_CUSTOM_ORDERS || 'custom-orders'}",
    PRODUCT_IMAGES: "${process.env.BUCKET_PRODUCT_IMAGES || 'product-images'}"
  }
};

export function updateCredentials(url, key) {
  if (url) localStorage.setItem('SUPABASE_URL', url);
  if (key) localStorage.setItem('SUPABASE_ANON_KEY', key);
  console.log('Credentials updated successfully');
}
`;

fs.writeFileSync('./config.js', configContent);
console.log('config.js generated successfully with CONFIG and updateCredentials!');