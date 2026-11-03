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

## 📑 Credential Checklist (Follow in Order)

```
[ ] 1. Supabase (Database, User Accounts & Server Cart)
[ ] 2. Google OAuth 2.0 (One-Click Customer Login)
[ ] 3. Transactional Email (Order Confirmation Receipts)
[ ] 4. Razorpay (UPI, Credit/Debit Cards, Netbanking)
[ ] 5. SMS Gateway (+91 Mobile OTP — Optional / TRAI DLT)
```

---

### Step 1: Supabase (Database & Authentication)
**Estimated time:** 5 minutes

Supabase provides the encrypted customer account database, saved addresses, order history, and server-side cart persistence.

1. **Create an account & project:**
   - Go to [https://supabase.com](https://supabase.com) and click **Start your project**.
   - Create a new project (e.g., `dr-rias-store`). Choose the region closest to your customers (**India / Mumbai** or **Singapore**).
2. **Retrieve API credentials:**
   - In your Supabase project dashboard, navigate to **Project Settings** (gear icon at the bottom left) -> **API**.
   - Copy the following three values into your `.env.local` or Vercel dashboard:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
     ```
   > ⚠️ **Security Alert:** `SUPABASE_SERVICE_ROLE_KEY` is a confidential master key used exclusively by server-side payment verifiers. Never share it or expose it in public repositories.
3. **Run the Database Tables Migration:**
   - In your Supabase dashboard, open the **SQL Editor** from the left sidebar.
   - Click **+ New Query**.
   - Copy the entire SQL contents from [`supabase/migrations/20261102_initial_schema.sql`](file:///Users/pratyakshkalsi/Desktop/drria/supabase/migrations/20261102_initial_schema.sql) and paste them into the editor.
   - Click **Run** (green button).
   - This automatically creates the `profiles`, `addresses`, `orders`, `order_items`, and `carts` tables with strict security policies.

---

### Step 2: Google OAuth 2.0 (One-Click Customer Login)
**Estimated time:** 7 minutes

Allows customers to sign in with their existing Google account with a single tap.

1. **Open Google Cloud Console:**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/).
   - Create a project named `Dr Rias Skincare`.
2. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services** -> **OAuth consent screen**.
   - Select **External**, enter your App Name (`Dr Ria's`) and support email.
   - Click **Save and Continue**.
3. **Create Credentials:**
   - Go to **APIs & Services** -> **Credentials** -> click **+ Create Credentials** -> select **OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs (CRITICAL):**
     Add the exact Supabase callback URL:
     `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`
   - Click **Create**. Copy the generated **Client ID** and **Client Secret**.
4. **Enable in Supabase:**
   - In your Supabase Dashboard, go to **Authentication** -> **Providers** -> find **Google**.
   - Toggle **Enable Google provider** to ON.
   - Paste your **Client ID** and **Client Secret**, then click **Save**.
5. **Set Redirect URLs in Supabase:**
   - Under **Authentication** -> **URL Configuration**:
     - **Site URL**: `https://drrias.in` (or `http://localhost:3000` for local testing)
     - **Redirect URLs**: Add:
       - `https://drrias.in/auth/callback`
       - `http://localhost:3000/auth/callback`

---

### Step 3: Transactional Email (Order Confirmation Receipts)
**Estimated time:** 3 minutes

Sends automated email receipts to customers as soon as payment is verified.

1. **Create an account at Resend:**
   - Go to [https://resend.com](https://resend.com) and sign in.
2. **Add & Verify Domain:**
   - Go to **Domains** -> **Add Domain** (`drrias.in`).
   - Add the 3 generated DNS records (DKIM, SPF, MX) into your domain registrar (GoDaddy, Namecheap, or Cloudflare).
3. **Generate API Key:**
   - Go to **API Keys** -> **Create API Key**.
   - Copy the key (starts with `re_...`) and paste it into your environment:
     ```env
     EMAIL_PROVIDER_API_KEY=re_xxxxxxxxxxxxxxxx
     EMAIL_FROM=Dr Ria's Skincare <orders@drrias.in>
     ```

---

### Step 4: Razorpay Payment Gateway (UPI, Cards & Netbanking)
**Estimated time:** 5 minutes

Handles all online checkout transactions with PCI-DSS security.

1. **Log in to Razorpay:**
   - Visit [https://dashboard.razorpay.com](https://dashboard.razorpay.com).
   - Ensure your account is in **Live Mode** (or **Test Mode** for staging).
2. **Generate API Keys:**
   - Navigate to **Settings** (bottom left) -> **API Keys**.
   - Click **Generate Key**.
   - Copy the **Key ID** and **Key Secret**:
     ```env
     NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
     RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
     ```
3. **Configure Webhook (CRITICAL for background order confirmation):**
   - In Razorpay Dashboard, go to **Settings** -> **Webhooks** -> **Add New Webhook**.
   - **Webhook URL:** `https://drrias.in/api/webhooks/razorpay`
   - **Secret:** Create a secure passphrase (e.g. `drria_webhook_secure_pass_2026`) and add it to your `.env.local`:
     ```env
     RAZORPAY_WEBHOOK_SECRET=drria_webhook_secure_pass_2026
     ```
   - **Active Events (Select these 3):**
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
   - Click **Create Webhook**.

---

### Step 5: Indian Mobile OTP (+91) (Optional / When DLT Ready)
**Estimated time:** Variable (dependent on Indian Telecom DLT approval)

Indian regulations (TRAI) require registered business headers and approved DLT message templates before commercial transactional SMS can be transmitted.

1. Register your business on an approved DLT portal (e.g., Vilpower / Jio DLT / Airtel DLT).
2. Obtain an approved 6-character Header (e.g., `DRRIAS`) and Content Template ID for OTP verification:
   * Template sample: `Your Dr Ria's verification code is {#var#}. Valid for 10 minutes.`
3. Choose an SMS gateway (**MSG91** or **Twilio**).
4. In your Supabase Dashboard:
   - Go to **Authentication** -> **Providers** -> **Phone**.
   - Select your provider, enter the API credentials, Sender ID, and Template ID.
5. In your `.env.local`:
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
  "timestamp": "2026-11-03T11:20:00.000Z",
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

## 🔒 Security Best Practices

1. **Never commit `.env.local` to Git**: It contains real production passwords.
2. **Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET`**: Keep them restricted to Vercel Server Environment Variables.
3. **Product Prices**: Set confirmed final prices in [`data/products.ts`](file:///Users/pratyakshkalsi/Desktop/drria/data/products.ts). The server recalculates all totals directly from this file during checkout.
