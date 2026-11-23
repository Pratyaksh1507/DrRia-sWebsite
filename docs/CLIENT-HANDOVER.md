# 📋 Dr Ria's E-Commerce Platform — Client Handover Guide

Welcome to the **Dr Ria's** e-commerce platform. This document is a plain-language, step-by-step handover guide designed to help you connect your own production service credentials (database, payments, emails, and logins).

---

## ⚡ Quick Start Summary

All external services are connected via environment variables. The codebase is designed to run gracefully even before you connect your keys:
- Unconfigured login methods display an amber **"Not configured yet"** badge instead of breaking.
- Checkout automatically offers the **"Order via WhatsApp"** concierge button as an instant fallback.
- You can check which services are live at any time by visiting:
  👉 **`https://drrias.in/api/health`** (or `http://localhost:3000/api/health`)

---

## 🔑 Complete Environment Variables Reference

Below is the complete, authoritative list of environment variables required for production and preview deployments on Vercel:

| Environment Variable | Required / Optional | Scope | Sensitive in Vercel | Purpose & Value Format |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Optional | Production & Preview | No | Canonical website URL (e.g., `https://drrias.in`). Used for metadata, OpenGraph, sitemap, and auth callbacks. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Production & Preview | No | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Required** | Production & Preview | No | Supabase public API key (starts with `sb_publishable_...` or legacy `eyJ...`). Safe for browser, enforces RLS. |
| `SUPABASE_SECRET_KEY` | **Required** | Production & Preview | **YES** | Supabase service-role secret key (starts with `sb_secret_...` or legacy `eyJ...`). Used strictly server-side for webhooks, audit logs, and admin actions. |
| `DATABASE_URL` | **Required** | Production & Preview | **YES** | Supabase Transaction Pooler connection string (`port 6543`). Direct database connection used only after admin authentication. |
| `ADMIN_COOKIE_SECRET` | **Required** | Production & Preview | **YES** | Random cryptographic HMAC signing secret for admin session cookies. Generate per environment using `openssl rand -base64 48`. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **Required** | Production & Preview | No | Razorpay Key ID for customer checkout modal (starts with `rzp_live_` or `rzp_test_`). |
| `RAZORPAY_KEY_ID` | Optional | Production & Preview | **YES** | Server-side Razorpay Key ID fallback (resolved via `getRazorpayKeyId()`). |
| `RAZORPAY_KEY_SECRET` | **Required** | Production & Preview | **YES** | Razorpay API Secret for cryptographic signature verification and server-side payment verification. |
| `RAZORPAY_WEBHOOK_SECRET` | **Required** | Production & Preview | **YES** | Webhook passphrase configured in Razorpay Dashboard for asynchronous order payment confirmations. |
| `RESEND_API_KEY` | Recommended | Production & Preview | **YES** | Resend API key (`re_...`) for automated customer order receipt emails. |
| `EMAIL_FROM` | Optional | Production & Preview | No | Sender address for transaction emails (e.g., `Dr Ria's <orders@drrias.in>`). |
| `GOOGLE_CLIENT_ID` | Optional | Production & Preview | No | Google Cloud OAuth Client ID for one-click customer sign-in. |
| `GOOGLE_CLIENT_SECRET` | Optional | Production & Preview | **YES** | Google Cloud OAuth Client Secret. |
| `SMS_PROVIDER` | Optional | Production & Preview | No | `msg91` or `twilio` (when TRAI DLT registration is complete). |
| `SMS_API_KEY` | Optional | Production & Preview | **YES** | API key from SMS gateway. |
| `SMS_SENDER_ID` | Optional | Production & Preview | No | 6-character approved DLT Header (e.g. `DRRIAS`). |
| `SMS_DLT_TEMPLATE_ID` | Optional | Production & Preview | No | DLT Content Template ID for OTP SMS. |
| `HEALTH_CHECK_SECRET` | Optional | Production & Preview | **YES** | Optional secret bearer token to restrict `/api/health` access. |

---

## 📑 Step-by-Step Configuration Guide

```
[ ] 1. Supabase (Database, Auth, Pooler & Secret Keys)
[ ] 2. Admin Security (ADMIN_COOKIE_SECRET)
[ ] 3. Razorpay (Payment Gateway & Webhook)
[ ] 4. Resend (Order Confirmation Receipts)
[ ] 5. Google OAuth 2.0 (Optional One-Click Login)
[ ] 6. SMS Gateway (Optional TRAI DLT Mobile OTP)
```

---

### Step 1: Supabase (Database, Auth & Pooler)
**Estimated time:** 5 minutes

Supabase provides the encrypted customer account database, saved addresses, order history, server cart persistence, and product catalogue.

1. **Retrieve API credentials:**
   - In your Supabase project dashboard, navigate to **Project Settings** (gear icon) -> **API**.
   - Copy the following values:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://xhjkczndewkocqwsebry.supabase.co
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
     SUPABASE_SECRET_KEY=sb_secret_...
     ```
   > ⚠️ **Security Alert:** `SUPABASE_SECRET_KEY` is a confidential master key. Mark it as **Sensitive** in Vercel and never expose it in client code.

2. **Retrieve the Transaction Pooler Connection String (`DATABASE_URL`):**
   - In Supabase dashboard, navigate to **Project Settings** -> **Database**.
   - Under **Connection string**, select the **Transaction** pooler mode (port `6543`).
   - Copy the URI string:
     ```env
     DATABASE_URL=postgresql://postgres.xhjkczndewkocqwsebry:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require
     ```
   > 💡 **Important:** The transaction pooler is essential for serverless platforms like Vercel to avoid connection pool exhaustion.

---

### Step 2: Admin Security (`ADMIN_COOKIE_SECRET`)
**Estimated time:** 1 minute

The admin dashboard uses signed, tamper-proof session cookies to enforce the 30-minute inactivity timeout and 10-minute MFA step-up freshness.

1. **Generate a random secret for each environment:**
   Run this command in your terminal:
   ```bash
   openssl rand -base64 48
   ```
2. **Set in Vercel:**
   - Add `ADMIN_COOKIE_SECRET` to Vercel Environment Variables.
   - Check **Production** and **Preview** scopes (generate a distinct secret for each).
   - Mark as **Sensitive**.
   - ⚠️ **Never reuse `SUPABASE_SECRET_KEY` as this value.**

---

### Step 3: Razorpay (Payment Gateway & Webhooks)
**Estimated time:** 10 minutes

Handles all online checkout transactions (UPI, RuPay, cards, netbanking) with PCI-DSS compliance.

1. **Log in to Razorpay:**
   - Visit [https://dashboard.razorpay.com](https://dashboard.razorpay.com).
   - Ensure your account is in **Live Mode** (or **Test Mode** for testing).
2. **Generate API Keys:**
   - Navigate to **Settings** -> **API Keys** -> click **Generate Key**.
   - Copy the Key ID and Key Secret into Vercel:
     ```env
     NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
     RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
     ```
3. **Configure Webhook (CRITICAL for background order fulfillment):**
   - In Razorpay Dashboard, go to **Settings** -> **Webhooks** -> **Add New Webhook**.
   - **Webhook URL:** `https://drrias.in/api/webhooks/razorpay`
   - **Secret:** Create a secure passphrase (e.g. generate with `openssl rand -hex 24`) and save it as:
     ```env
     RAZORPAY_WEBHOOK_SECRET=your_generated_webhook_passphrase
     ```
   - **Active Events (Select these 3):**
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
   - Click **Save**.

---

### Step 4: Transactional Email (Resend)
**Estimated time:** 3 minutes

Sends instant HTML order confirmation receipts to customers.

1. Sign up at [https://resend.com](https://resend.com).
2. Add and verify your domain (e.g. `drrias.in`) following the DNS records provided by Resend.
3. In Resend -> **API Keys**, click **Create API Key**.
4. Add to Vercel:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   EMAIL_FROM=Dr Ria's <orders@drrias.in>
   ```

---

### Step 5: Google OAuth 2.0 (Optional One-Click Login)
**Estimated time:** 7 minutes

Allows customers to sign in with their Google account with one tap.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named `Dr Rias Skincare`.
2. Configure **OAuth consent screen** (External, App Name: `Dr Ria's`).
3. Under **Credentials**, create an **OAuth 2.0 Client ID** (Web application).
4. Add **Authorized redirect URI**:
   `https://xhjkczndewkocqwsebry.supabase.co/auth/v1/callback`
5. Paste the Client ID and Client Secret into Supabase Dashboard -> **Authentication** -> **Providers** -> **Google** and toggle it **Enabled**.
6. Set in Vercel:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_GOOGLE_AUTH_CONFIGURED=true
   ```

---

### Step 6: Indian Mobile OTP (+91) (Optional / TRAI DLT)
**Estimated time:** Variable (depends on telecom DLT approval)

Indian telecom regulations (TRAI) require registered business headers and approved DLT message templates before commercial transactional SMS can be transmitted.

1. Register your business on an approved DLT portal (e.g., Vilpower / Jio DLT / Airtel DLT).
2. Obtain an approved 6-character Header (e.g., `DRRIAS`) and Content Template ID for OTP verification:
   * Sample: `Your Dr Ria's verification code is {#var#}. Valid for 10 minutes.`
3. In Supabase Dashboard -> **Authentication** -> **Providers** -> **Phone**, configure your provider (MSG91 or Twilio).
4. Add to Vercel:
   ```env
   SMS_PROVIDER=msg91
   SMS_API_KEY=your_sms_api_key
   SMS_SENDER_ID=DRRIAS
   SMS_DLT_TEMPLATE_ID=1107xxxxxxxxxxx
   NEXT_PUBLIC_SMS_CONFIGURED=true
   ```

---

## 🔍 How to Verify Services with `/api/health`

Once you deploy your environment variables to Vercel (or `.env.local` locally), verify your setup by opening:

👉 **`https://drrias.in/api/health`**

You will receive an instant diagnostic report:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-06T12:00:00.000Z",
  "environment": "production",
  "services": {
    "supabase": true,
    "supabaseServiceRole": true,
    "googleAuth": true,
    "sms": false,
    "email": true,
    "razorpay": true
  }
}
```
* If any service shows `false`, check that the corresponding environment variable has been entered without typos or trailing whitespace in your Vercel project settings.

---

## 📦 Product Catalogue Data Source

- **Authoritative Database Source**: All product specifications (prices, MRP, stock quantities, descriptions, key ingredients, benefits, how-to-use directions, precautions, and image galleries) are stored directly in Supabase PostgreSQL (`public.products`).
- **Dynamic Updates**: Changes made by the doctor via the Admin Dashboard (`/admin/products`) or SQL Editor take effect immediately on the live storefront.
- **Fail-Closed Protection**: In production with Supabase configured, if the database cannot be reached, the order creation and cart endpoints return HTTP 503 instead of falling back to stale or static prices.
- **Local Development Fallback**: `data/products.ts` is used strictly as an offline fallback when Supabase environment variables are completely absent (empty `.env`). Static data is never merged over database records when Supabase is connected.

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` to Git**: It contains production passwords and secret keys.
2. **Mark Server Secrets as Sensitive in Vercel**: Ensure `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `ADMIN_COOKIE_SECRET`, and `RAZORPAY_KEY_SECRET` are never exposed to client bundles.
3. **Keep `ADMIN_COOKIE_SECRET` distinct**: Use different random secrets for Production and Preview environments.
