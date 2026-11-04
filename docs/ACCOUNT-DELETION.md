# Customer Account Deletion & Data Retention Specification

**Document Version:** 1.0.0  
**Status:** Architecture Proposal / Specification (Not Implemented)  
**Target Platform:** Dr Ria's E-Commerce Platform  

---

## 1. Executive Summary

Under consumer privacy frameworks (including the Digital Personal Data Protection Act, 2023 - DPDP), customers have the right to request deletion of their personal accounts and personal data.

However, commercial e-commerce businesses in India are also subject to statutory fiscal obligations (such as the Consumer Protection (E-Commerce) Rules 2020 and GST/Income Tax retention rules) which require sales transaction ledgers, tax invoices, and financial audit logs to be preserved.

To balance customer privacy rights with fiscal compliance, the database schema implements `ON DELETE RESTRICT` on `orders.user_id`. Direct deletion of an auth user who has placed orders is intentionally blocked at the database level.

This document describes the recommended **Profile Anonymization (Pseudonymization)** pattern to fulfill account deletion requests safely.

---

## 2. Recommended Account Deletion Pattern: Soft Deletion & Anonymization

Rather than executing a hard cascading delete (`CASCADE`), which destroys financial order trails, the system should scrub all Personally Identifiable Information (PII) while keeping anonymized order ledgers intact.

### 2.1 PII Scrubbing Across Tables

| Table | Action | Details |
| :--- | :--- | :--- |
| `public.profiles` | **Anonymize** | Set `full_name = 'Deleted Customer'`, `phone = null`, `avatar_url = null`. Re-assign email to a salted synthetic hash (e.g. `anon_[uuid]@anonymized.drrias.in`). |
| `public.addresses` | **Hard Delete** | Permanently remove all saved delivery addresses from `public.addresses` for this `user_id`. (Historical orders retain their own frozen copy in `orders.address_snapshot`). |
| `public.carts` | **Hard Delete** | Purge any active session cart rows for this `user_id`. |
| `auth.users` | **Scramble & Revoke** | Invalidate all refresh tokens and active user sessions. Scramble password / OTP factors and mark the user disabled or banned in Supabase Auth. |
| `public.orders` | **Preserve** | Retain row unmodified. Financial amounts (`subtotal`, `shipping`, `total`), payment references (`razorpay_order_id`, `razorpay_payment_id`), line items (`order_items`), and timestamps remain intact. |
| `orders.address_snapshot` | **Redact PII** | Optionally scrub the customer's phone number and exact street address from `orders.address_snapshot`, while preserving state and PIN code for state-level GST tax reconciliation. *(Exact retention period and field scrubbing to be confirmed by the business's accountant).* |

---

## 3. Step-by-Step Deletion Workflow (Blueprint)

When an authenticated customer clicks "Delete My Account" in their account settings:

1. **Step 1: Re-Authentication Challenge**
   - User must verify their identity via a fresh OTP or confirmation password.

2. **Step 2: Check for In-Flight Orders**
   - Query `public.orders`:
     ```sql
     SELECT id FROM public.orders
     WHERE user_id = :userId AND status IN ('pending', 'processing', 'shipped');
     ```
   - If active orders exist, the deletion request is blocked:
     `"Your account cannot be deleted while an order is in transit or pending dispatch. Please contact support or await delivery."`

3. **Step 3: Atomic Anonymization Transaction**
   - Run as a privileged server-side transaction (`adminSupabase`):
     ```sql
     BEGIN;
       -- 1. Scrub profile
       UPDATE public.profiles
       SET full_name = 'Deleted Customer',
           phone = NULL,
           updated_at = NOW()
       WHERE id = :userId;

       -- 2. Clear saved address cards
       DELETE FROM public.addresses WHERE user_id = :userId;

       -- 3. Clear active carts
       DELETE FROM public.carts WHERE user_id = :userId;

       -- 4. Mark account status
       INSERT INTO public.account_deletion_logs (user_id, deleted_at, status)
       VALUES (:userId, NOW(), 'anonymized');
     COMMIT;
     ```

4. **Step 4: Auth Session Revocation**
   - Revoke all Supabase Auth refresh tokens:
     ```ts
     await adminSupabase.auth.admin.signOut(userId);
     await adminSupabase.auth.admin.updateUserById(userId, {
       ban_duration: '876000h', // 100 years
       user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
     });
     ```

5. **Step 5: Client Logout & Confirmation**
   - Clear client cookies and local storage.
   - Redirect to `/?account_deleted=true` with a clear confirmation banner.

---

## 4. Alternative Option: Orphaned Order Re-assignment

If the legal counsel and accountant advise that `auth.users` records must be physically removed from Supabase:

1. Create a permanent system auditor user:
   `system_audit_user (UUID: 00000000-0000-0000-0000-000000000000)`.
2. Re-assign order foreign keys:
   ```sql
   UPDATE public.orders
   SET user_id = '00000000-0000-0000-0000-000000000000'
   WHERE user_id = :targetUserId;
   ```
3. Hard-delete the user from `auth.users`.
4. *Trade-off*: Historical order lookups can no longer link back to any user record.

---

## 5. Summary & Recommendation

**Recommended Path:** **Section 2 (Profile Anonymization + Order Retention)**.  
It provides 100% compliance with privacy requests by removing all accessible PII and access tokens, while protecting the business's legal and accounting books without data loss.

