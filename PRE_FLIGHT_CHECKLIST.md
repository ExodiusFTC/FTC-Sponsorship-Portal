# Matchmaker Pre-Flight Validation Checklist

**Objective:** Execute a forced, end-to-end validation of all tri-party workflows, security rules, and database mutations on the production environment before allowing real users onto the platform.

## Environment Requirements
- [ ] **Must be executed on the live production URL** (e.g., Vercel deployment), not localhost.
- [ ] **Must use three distinct, real email addresses** representing the Coach, Admin, and Sponsor.
- [ ] **Must perform the full pipeline at least twice** to test state changes and idempotency.

---

## Phase 1: Email and Dispatch Engine
**Risk Level:** Critical  
**Description:** Verify that all external and internal communications fire correctly without landing in spam.

### Test Cases
- [ ] **1.1 Admin Approves Pitch**
  - **Action:** Admin clicks "Approve & Dispatch" on a pending pitch.
  - **Expected Result:**
    - [ ] Sponsor receives an HTML-formatted email from the official domain (e.g., noreply@yourdomain.com).
    - [ ] Email does not land in the spam folder (Verifies SPF/DKIM records).
    - [ ] Tokenized link inside the email successfully opens the secure web viewer.

- [ ] **1.2 Admin Declines or Requests Edit**
  - **Action:** Admin clicks "Decline" or "Request Edit" on a pitch.
  - **Expected Result:**
    - [ ] Coach receives an external email with the Admin's reasoning.
    - [ ] Coach receives an in-app notification in their `Smart Inbox`.

---

## Phase 2: Authentication and RLS
**Risk Level:** Critical  
**Description:** Ensure strict cross-tenant isolation and role-based access control.

### Test Cases
- [ ] **2.1 Unauthorized Route Access**
  - **Action:** Coach attempts to manually navigate to `/admin/moderation` or `/sponsor/dashboard` via URL.
  - **Expected Result:** Next.js middleware instantly blocks access and redirects to the Coach dashboard or a 401 Unauthorized page.

- [ ] **2.2 Unverified Coach Access**
  - **Action:** A newly registered Coach attempts to access the pitch builder.
  - **Expected Result:** Dashboard remains locked in the "Awaiting Verification" state until the Admin flips the `coach_verified` boolean in the database.

- [ ] **2.3 Cross-Tenant Data Isolation**
  - **Action:** Coach A attempts to load Coach B's specific application UUID in the browser.
  - **Expected Result:** Supabase RLS policies block the read request; page returns empty or throws a permission error.

- [ ] **2.4 Session Persistence**
  - **Action:** User refreshes the page or closes/reopens the browser tab.
  - **Expected Result:** The user session persists seamlessly without forcing a re-login.

---

## Phase 3: Core Workflow Integrity
**Risk Level:** High  
**Description:** Validate the state transitions and database math throughout the pitch lifecycle.

### Test Cases
- [ ] **3.1 Budget Calculation & Cap Enforcement**
  - **Action:** Coach creates a pitch and adds line items to the budget.
  - **Expected Result:**
    - [ ] The UI auto-sums the `budget_line_items` accurately.
    - [ ] The system prevents submission if the "Total Ask" exceeds the targeted sponsor's remaining funding cap.

- [ ] **3.2 Admin Review of Budget Discrepancies**
  - **Action:** Admin reviews a pitch where the total ask does not match the sum of the line items.
  - **Expected Result:** The UI correctly displays the "Ask exceeds line items" warning badge.

- [ ] **3.3 Sponsor Funding Execution**
  - **Action:** Sponsor clicks "Accept & Fund" on the web viewer.
  - **Expected Result:**
    - [ ] A new row is created in `transactions_ledger`.
    - [ ] The granted amount is atomically subtracted from the sponsor's `funding_used_cents` in the `users_sponsor` table.
    - [ ] If the sponsor's remaining capacity hits $0, the boolean `is_active` toggles to `false`.
    - [ ] Both Sponsor and Coach receive the final "Match Made" introduction email.

---

## Phase 4: Edge Cases and Race Conditions
**Risk Level:** High  
**Description:** Stress-test the system against unexpected user behavior and data formatting.

### Test Cases
- [ ] **4.1 Financial Data Rendering**
  - **Action:** Review frontend rendering of financial data.
  - **Expected Result:** Values stored in cents (BigInt) correctly render as formatted dollars (e.g., $1,200.00, not $12.00).

- [ ] **4.2 Media Upload Limits**
  - **Action:** Coach attempts to upload an 11th image or a 20MB PDF to the media gallery.
  - **Expected Result:** Storage bucket rejects the payload gracefully, displaying a user-friendly toast error without crashing the application.

- [ ] **4.3 Double-Click Prevention**
  - **Action:** Sponsor rapidly double-clicks the "Accept & Fund" button.
  - **Expected Result:** Server action/UI disabled states prevent multiple identical ledger entries or double-deductions from the sponsor's cap.

- [ ] **4.4 Token Reuse Prevention**
  - **Action:** Sponsor attempts to reuse an old, tokenized link after already declining or accepting a pitch.
  - **Expected Result:** The system recognizes the token is used/expired and prevents further action.