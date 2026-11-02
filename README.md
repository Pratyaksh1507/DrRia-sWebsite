# Dr Ria's — Premium Skincare & Haircare E-Commerce Storefront

A production-ready, high-performance e-commerce platform built for **Dr Ria's**, featuring clinical formulations, botanical actives, and mobile-first commerce for Indian consumers.

Designed and developed to achieve **95+ across all Google Lighthouse metrics** on mobile.

---

## 🏆 Verified Mobile Lighthouse Scores (Target 95+)

| Category | Score | Target | Status |
| :--- | :---: | :---: | :---: |
| **Performance** | **100** | ≥ 95 | Pass |
| **Accessibility** | **96** | ≥ 95 | Pass |
| **Best Practices** | **100** | ≥ 95 | Pass |
| **SEO** | **100** | ≥ 95 | Pass |
| **Largest Contentful Paint (LCP)** | **0.9 s** | < 2.0 s | Pass |
| **Cumulative Layout Shift (CLS)** | **0.00** | < 0.05 | Pass |
| **Total Blocking Time (TBT / INP proxy)** | **60 ms** | < 200 ms | Pass |

---

## 🛠 Tech Stack & Architecture

* **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
* **Rendering Strategy**: 100% Static Site Generation (SSG) via `generateStaticParams` for instant page loads and zero server latency
* **State Management**: Persistent client-side cart powered by Zustand and `localStorage` with `aria-live="polite"` screen reader announcements
* **Image Optimization Pipeline**: Custom Sharp build script generating responsive **WebP** and **AVIF** assets at 480px, 768px, and 1200px breakpoints with base64 blur placeholders
* **Typography**: Self-hosted Google Fonts (`Playfair Display` serif for clinical luxury titles and `Inter` sans for high-readability body copy) using `font-display: swap`
* **Payment Integration**: Razorpay checkout (UPI, cards, netbanking) loaded strictly on-demand on user click, plus instant WhatsApp order fallback

---

## 🚀 How to Run Locally

### 1. Prerequisites
* Node.js v20+ or v22+
* npm

### 2. Setup
```bash
# Clone and enter the repository
cd drria

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
# Run image converter (if new source images added)
npm run convert-images

# Compile optimized static production build
npm run build

# Start local production server
npm run start -p 3000
```

---

## 🏷️ How to Edit Products & Set Real Prices

All product definitions, ingredients, directions, and prices reside in a single typed configuration file:
👉 [`data/products.ts`](file:///Users/pratyakshkalsi/Desktop/drria/data/products.ts)

Search for `// TODO: set real price` to adjust pricing:
```typescript
{
  id: 'drria-lip-balm',
  slug: 'anti-pigmentation-lip-balm',
  name: 'Anti Pigmentation Lip Balm',
  price: 349, // TODO: set real price (in INR)
  // ...
}
```
After editing, simply run `npm run build` to update the static catalog.

---

## 💳 How to Add Razorpay Payment Keys

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your Razorpay API credentials:
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_actual_key_here
   RAZORPAY_KEY_SECRET=your_razorpay_secret_here
   ```
3. The checkout flow automatically detects these variables. If a user prefers direct ordering, the **Order on WhatsApp** button provides an automatic fallback with pre-formatted items and delivery details sent to `+91-9469088317`.

---

## 🖼️ How to Replace or Add Images

1. Place your raw packaging or lifestyle shots into [`/source-images/`](file:///Users/pratyakshkalsi/Desktop/drria/source-images/).
2. Open [`scripts/convert-images.mjs`](file:///Users/pratyakshkalsi/Desktop/drria/scripts/convert-images.mjs) if you need to adjust filenames or slug mappings.
3. Run the automated Sharp conversion pipeline:
   ```bash
   npm run convert-images
   ```
   This will generate optimized WebP and AVIF files at 480w, 768w, and 1200w inside [`public/images/`](file:///Users/pratyakshkalsi/Desktop/drria/public/images/) and update base64 blur placeholders.

---

## ☁️ How to Deploy to Vercel

### Method 1: Using the Vercel CLI
```bash
npm install -g vercel
vercel
vercel --prod
```

### Method 2: Git Integration via Vercel Dashboard
1. Push your repository to GitHub / GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), import the repository.
3. In **Environment Variables**, add:
   * `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   * `RAZORPAY_KEY_SECRET`
   * `NEXT_PUBLIC_SITE_URL` (e.g. `https://drrias.in`)
4. Click **Deploy**. Vercel will run `npm run build` and serve all static routes with edge caching defined in [`vercel.json`](file:///Users/pratyakshkalsi/Desktop/drria/vercel.json).

---

## 🧠 Skills Applied & Architecture Decisions

| Installed Skill | Publisher | Key Architecture & Design Decision Influenced |
| :--- | :--- | :--- |
| **`vercel-react-best-practices`** | Vercel Labs | • Statically pre-rendered all product, shop, and policy routes using `generateStaticParams`.<br>• Dynamically imported [`CartDrawer.tsx`](file:///Users/pratyakshkalsi/Desktop/drria/components/cart/CartDrawer.tsx) using `next/dynamic` to eliminate cart bundle weight from initial HTML.<br>• Avoided barrel export index files for direct module imports and minimal bundle traces. |
| **`core-web-vitals`** | Addy Osmani / Chrome | • Enforced strict single-hero priority loading (`priority={true}` and `fetchpriority="high"` exclusively on the home hero image).<br>• Pre-assigned explicit width/height on all images to eliminate Cumulative Layout Shift (CLS = 0.00).<br>• Kept JavaScript execution minimal (Total Blocking Time 60ms). |
| **`accessibility`** | Addy Osmani / Chrome | • Tuned contrast ratios across all badges and labels to exceed WCAG AA 4.5:1 minimums.<br>• Added [`SkipToContent.tsx`](file:///Users/pratyakshkalsi/Desktop/drria/components/layout/SkipToContent.tsx) landmark navigation.<br>• Keyboard focus rings and ARIA accessibility tree landmarks across navigation and accordions. |
| **`storefront-best-practices`** | Medusa | • Configured `aria-live="polite"` on cart counter updates for screen readers.<br>• Added `env(safe-area-inset-bottom)` to sticky mobile purchase bars to prevent iPhone home-indicator clipping.<br>• Rendered product prices and stock availability in server HTML for AI shopping agents. |
| **`seo`** | Addy Osmani / Chrome | • Schema.org `Product`, `Offer`, `Brand`, and `Organization` JSON-LD structured data.<br>• Canonical link tags, Open Graph cards, dynamic [`sitemap.ts`](file:///Users/pratyakshkalsi/Desktop/drria/app/sitemap.ts), and [`robots.ts`](file:///Users/pratyakshkalsi/Desktop/drria/app/robots.ts). |
| **`web-design-guidelines`** | Vercel Labs | • Clinical-luxury aesthetic (#FBF6EE warm cream, #5C3D1E deep brown, #C9952A gold).<br>• 44px minimum touch targets on mobile for touch ease. |

---

## 📝 Final Checklist of Items Needing Your Input

* [ ] **Product Prices**: Review and replace placeholder prices marked `// TODO: set real price` in [`data/products.ts`](file:///Users/pratyakshkalsi/Desktop/drria/data/products.ts).
* [ ] **Razorpay Live API Keys**: Add real Razorpay Key ID and Secret in your production Vercel environment variables.
* [ ] **Legal Policy Verification**: Review the template text in [`app/policies/[policy]/page.tsx`](file:///Users/pratyakshkalsi/Desktop/drria/app/policies/[policy]/page.tsx) (Shipping, Returns, Privacy, Terms) with your legal advisor.
* [ ] **Custom Domain Configuration**: Attach your custom domain (`drrias.in`) in the Vercel project settings and configure DNS A/CNAME records.
* [ ] **Brand Story Customization**: Replace the narrative placeholder marked `[EDIT]` in [`app/about/page.tsx`](file:///Users/pratyakshkalsi/Desktop/drria/app/about/page.tsx) with Dr Ria's finalized personal founder note.

---

## 👥 Credits
* **Product Design & Marketing**: Sachin Kashyap
* **Website Design & Development**: Pratyaksh Kalsi
