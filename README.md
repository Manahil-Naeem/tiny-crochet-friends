# 🧶 Tiny Crochet Friends — Full-Stack E-Commerce & Custom Order Platform

A handmade-focused, made-to-order e-commerce web application for **Tiny Crochet Friends**, backed by **Supabase** (PostgreSQL, Supabase Auth, Storage, and RLS) and designed with an aesthetic, cozy pastel theme.

Every cutie is **100% made-to-order** with a standard **5 to 8 working days** handcrafted making turnaround. Customers choose custom **yarn color swatches**, place orders in **Rs.** (PKR), upload **bespoke inspiration photos**, and track their handcrafted pieces step-by-step.

📸 **Official Instagram:** [instagram.com/tiny.crochetfriends](https://www.instagram.com/tiny.crochetfriends?stkn=cjZxODZleGNzZTVv)

---

## ✨ Features Overview

### 1. Brand & Aesthetic
- **Cozy Pastel Theme:** Warm ivory, blush pinks (`#FDF2F5`, `#E05A80`), sage greens, playful yarn stitch accents (`stitch-border-pink`), and rounded UI cards.
- **Instagram Integration:** Direct link to `@tiny.crochetfriends` in the header, footer, hero, and WhatsApp floating widget.
- **Currency:** Set to **Rs.** (PKR) across product catalog, bag drawer, checkout, tracking, and admin studio.
- **5 to 8 Working Days Lead Time:** Prominently featured across announcement ribbons, product pages, order summary, and tracking timelines.

### 2. Clean Slate Setup
- The store and database start **completely empty / clean slate** with zero dummy products or mock categories.
- The Admin Panel allows you to create your own custom categories (e.g. *Plushies, Keychains, Bags & Totes, Flower Bouquets, Wearables*) and publish your handmade creations with photos and custom yarn color palettes!

### 3. Customer Experience
- **Shop Catalog & Category Filtering:** Instant category filtering and search with zero layout shifts.
- **Dynamic Color Swatches:** Customers can select from custom yarn colors (e.g. *Pastel Pink, Sage Green, Buttercream, Soft Lilac*) directly on product cards and in the product detail view.
- **Product Detail View & Interactive Image Gallery:** Detailed measurements, 100% milk cotton yarn specifications, 5 to 8 working days lead time badge, "Ask on WhatsApp" button, and an **interactive image gallery** with thumbnail previews allowing customers to inspect multiple angles and close-up handcrafted stitches.
- **Floating WhatsApp Widget:** Fixed animated WhatsApp button on all pages with prefilled message options for general questions, custom requests, and order inquiries.
- **Cart & Checkout:** Slide-over cart drawer showing selected yarn colors, quantities, live subtotal in Rs., and free delivery calculation (over Rs. 3,000). Regular orders are saved to the Supabase `orders` table.
- **Bespoke Custom Orders:** Dedicated form where customers describe their dream crochet friend AND drag-and-drop or upload inspiration photos (stored in Supabase Storage bucket `custom-orders`, saved in `custom_orders` table).
- **Smart Cart & Checkout Validation:** Automatically verifies all items in real time against Supabase when the bag drawer is opened or at checkout. If an item was deleted or hidden (`is_active = false`), it is immediately removed, a gentle notice toast is displayed, and order totals are recalculated.
- **Live Order Tracking:** Customers enter their Order ID (`ORD-XXXXXX` or `CUST-XXXXXX`) to view a visual 4-step progress stepper (*Order Received → Hand-Crafting → Packaged with Care → Delivered*).

### 4. Secure Admin Panel (Supabase Auth)
- **Supabase Email/Password Authentication:** Secured via Supabase Auth (`supabase.auth.signInWithPassword`). No simple PINs!
- **Categories Manager:** Add and manage custom shop categories.
- **Product Visibility (Hide / Show Toggle):** Instant 1-click toggle for every product between "Active (Visible)" and "Hidden" without needing to delete it. Hidden products vanish from customer storefronts immediately.
- **Multiple Image Gallery Upload:** Upload or add multiple secondary photos (different angles, close-ups) alongside the main cover image, with live preview thumbnails and remove controls.
- **Products Manager:** Create, edit, and delete items with image upload (to Supabase Storage bucket `product-images`), visibility status, and custom color palette tags (`Name:#hex`).
- **Orders Manager:** View customer orders and update status (*Pending → Processing → Packaged → Delivered*). Includes 1-click WhatsApp messaging to the customer.
- **Custom Requests Hub:** Review custom requests with high-resolution inspiration images, add designer notes & price quotes, and chat with customers on WhatsApp.

---

## 📁 Project Structure

```
tiny-crochet-store/
├── index.html                 # Main Single-Page Application (Home, Shop, Custom, Track, Admin)
├── style.css                  # Cozy pastel theme, stitch borders, swatches, animations
├── serve.py                   # One-click local Python development server
├── README.md                  # Complete setup and deployment documentation
├── assets/
│   └── favicon.svg            # Cute yarn ball & crochet hook vector icon
├── js/
│   ├── config.js              # Brand configuration, Instagram link, WhatsApp number, Rs. currency
│   ├── supabaseClient.js      # Supabase JS SDK client with Auth & Storage helpers
│   ├── store.js               # Reactive shopping cart & toast notification state
│   ├── app.js                 # Catalog rendering, color swatch controller, routing
│   ├── checkout.js            # Bag drawer, checkout validation & order placement
│   ├── customOrder.js         # Custom order form & Supabase Storage photo uploader
│   ├── tracking.js            # Visual 4-step order tracking timeline lookup
│   └── admin.js               # Studio Admin Panel (Supabase Auth, Products, Categories, Orders)
└── supabase/
    └── schema.sql             # Clean-slate SQL schema, RLS policies & Storage buckets
```

---

## 🚀 Quick Start Guide

### Step 1: Run Locally

Run the development server with Python:

```powershell
python serve.py
```

This serves the store at **`http://localhost:8080`** and opens your default browser.

---

### Step 2: Supabase Setup (Database & Admin Auth)

1. **Create a Free Project:**
   - Go to [supabase.com](https://supabase.com) and create a project.

2. **Run the Clean-Slate Schema:**
   - Open **SQL Editor** in your Supabase dashboard.
   - Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - This creates `categories`, `products`, `orders`, and `custom_orders` tables with Row Level Security (RLS) policies and sets up the `custom-orders` and `product-images` storage buckets.

3. **Create Your Admin User in Supabase Auth:**
   - In Supabase Dashboard, go to **Authentication** (left sidebar) → **Users**.
   - Click **Add User** → **Create User**.
   - Enter your admin email (e.g., `admin@tinycrochet.com`) and choose a strong password.
   - Toggle **Auto-confirm user** to true so you can sign in immediately without email confirmation.

4. **Copy API Credentials:**
   - Go to **Project Settings** → **API**.
   - Copy your **Project URL** and **`anon` public key**.

5. **Connect the App:**
   - Navigate to `#admin` in your browser.
   - Click the **⚙️ Settings** tab, paste your Supabase Project URL and Anon Key, set your WhatsApp number, and click **Save & Reload Configuration**.
   - Or paste them into [`js/config.js`](js/config.js):
     ```javascript
     export const CONFIG = {
         SUPABASE_URL: "https://your-project-id.supabase.co",
         SUPABASE_ANON_KEY: "your-anon-key-here",
         WHATSAPP_NUMBER: "923001234567", // WhatsApp Business number
         // ...
     };
     ```

6. **Log in to Admin Studio:**
   - Click **Admin Studio 🔒** in the header.
   - Enter the email and password you created in Supabase Authentication.
   - Go to **📂 Categories** and add your first categories (e.g. *Plushies, Keychains, Bags*).
   - Go to **🧶 Products** and add your first handmade items!

---

## 💬 WhatsApp & Instagram Configuration

In [`js/config.js`](js/config.js):
- **`WHATSAPP_NUMBER`**: Set your phone number with country code without `+` (e.g. `"923001234567"` for Pakistan).
- **`INSTAGRAM_URL`**: Linked to `https://www.instagram.com/tiny.crochetfriends?stkn=cjZxODZleGNzZTVv`.

---

## 🚢 Free Web Deployment

Since this is a client-side static web application backed by Supabase:
- **Netlify:** Drag and drop the `tiny-crochet-store` folder into the Netlify dashboard for instant live hosting with custom domains and SSL.
- **Vercel / GitHub Pages:** Push to a GitHub repository and deploy in seconds.
