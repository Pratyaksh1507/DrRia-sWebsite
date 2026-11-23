# 🔐 Administrator Account Recovery & MFA Management Guide

This document outlines the standard recovery protocols for Dr Ria's administrator portal.

---

## 1. Initial Password Setup & Password Reset

The administrator account (`drrias.official@gmail.com`) is provisioned directly in the platform database with single-administrator enforcement.

If the administrator password needs to be set, updated, or recovered:

1. Log in to the **[Supabase Project Dashboard](https://supabase.com/dashboard/project/xhjkczndewkocqwsebry)**.
2. In the left navigation, open **Authentication** → **Users**.
3. Locate the administrator row:
   - **Email**: `drrias.official@gmail.com`
   - **User ID**: `b2f580d5-2c4d-421f-88dc-8f727c5da0d5`
4. Click the **three dots (`...`)** on the right side of the row and select **Edit user**.
5. In the **Password** field, enter the new secure password.
6. Click **Save**.
7. The doctor can now sign in immediately at `/admin/login` using the new password.

> [!NOTE]
> Editing the password in the Supabase Dashboard preserves the account UUID (`b2f580d5-2c4d-421f-88dc-8f727c5da0d5`) and preserves the row in `public.admin_users`. Do not delete or re-create the user.

---

## 2. Lost Authenticator Device / MFA Reset Protocol

Dr Ria's platform enforces **Mandatory Multi-Factor Authentication (AAL2)** for all administrative dashboard routes (`/admin/*`) and administrative APIs (`/api/admin/*`).

If the administrator loses access to their authenticator device (e.g. phone lost, replaced, or app deleted):

1. Log in to the **[Supabase Project Dashboard](https://supabase.com/dashboard/project/xhjkczndewkocqwsebry)** as the project owner.
2. In the left navigation, open **Authentication** → **Users**.
3. Click on the administrator user (`drrias.official@gmail.com`) to view the user detail page.
4. Scroll to the **Multi-Factor Authentication (MFA)** section.
5. Locate the enrolled TOTP factor and click **Remove Factor** (or **Delete Factor**).
6. Confirm the deletion.
7. The doctor can now visit `https://drriauppal.vercel.app/admin/login` (or `https://drrias.in/admin/login`), enter their email and password.
8. Because no active TOTP factor remains, the platform automatically redirects to `/admin/mfa/enroll`, displaying a fresh QR code and setup secret.
9. Scan the new QR code with the new authenticator device, enter the 6-digit verification code, and administrative access is restored at AAL2.

---

## 3. Recommended TOTP Best Practices

To prevent lockout and simplify device transitions:

1. **Dual Device Enrollment**: When enrolling at `/admin/mfa/enroll`, scan the QR code with two separate devices simultaneously (e.g., primary phone and a backup iPad/tablet). Both will generate the identical synchronized 6-digit codes.
2. **Password Manager Vaulting**: Save the alphanumeric **Setup Secret Key** displayed below the QR code into a secure, encrypted password manager (e.g. 1Password, Bitwarden, Apple Keychain, or Google Authenticator Cloud Sync). This allows instant code regeneration if the primary mobile device is misplaced.
