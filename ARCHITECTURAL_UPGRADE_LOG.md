# Architectural Upgrade Log — Insurance CRM Pro
**Session Date:** April 13, 2026
**Focus:** Quote-to-Policy Pipeline, Financial Automation, and Motor-Insurance Optimization

## 1. Executive Summary
This session transformed the application from a collection of isolated CRUD modules into a tightly integrated, automated sales engine. The primary goal was to eliminate manual data entry, ensure 100% financial data integrity, and optimize the workflow for a small team (Owner + Staff) handling confirmed insurance business.

---

## 2. Core Architectural Changes

### A. The "Quote-to-Policy" Pipeline
**Concept:** Leads now serve as "Draft Quotes." Data gathered during the inquiry stage automatically flows into the Policy and Customer records upon confirmation.

*   **Database Evolution:** Updated the `Lead` model in `schema.prisma` to include optional "Quote Draft" fields (IDV, Vehicle Number, Premium components, Dates, and Dealer ID).
*   **Atomic Conversion Engine:** Overhauled `lead.service.ts`. The `convertToCustomer` method now uses a `prisma.$transaction` to perform three actions instantly:
    1.  Create a **Customer** record.
    2.  Mark the **Lead** as `converted` and clear its pending follow-ups.
    3.  Auto-generate an active **Policy** and an initial **Pending Payment** record if quote data exists.
*   **DRY UI Pattern:** Created a reusable `PolicyFormFields.tsx` component used in both the Leads and Policies pages to ensure consistency and single-source logic for insurance inputs.

### B. Motor Insurance Optimization
**Concept:** Terminology and fields were refined to match the specific needs of the Motor Insurance domain.

*   **Redundancy Removal:** In `Policies.tsx`, the "Product Name" and "Sum Insured" fields are now dynamically hidden and sanitized for Motor policies, as they are redundant when "Vehicle Make/Model" and "IDV" are present.
*   **Intelligent UI Fallbacks:** Updated `PolicyDetail.tsx`, `Claims.tsx`, and `Dashboard.tsx` to gracefully handle the absence of a product name by displaying "Make + Model" or "Vehicle Number" as the primary identifier.
*   **Enum Cleanup:** Restricted the `PolicyType` enum in the database and Zod schemas to `motor`, `health`, `life`, and `other`, removing unused legacy types like `fire` or `marine`.

### C. Financial Integrity & Automation
**Concept:** The system now acts as an automated accounting assistant.

*   **Unified Auto-Payment:** Whether a policy is created manually or via lead conversion, the system instantly generates a corresponding `pending` payment record in the database.
*   **Dynamic Premium Sync:** Updated `policy.service.ts` to implement a "Master-Slave" relationship between Policies and Payments. If an agent edits a policy's `premiumAmount` (to fix a typo), the system automatically updates any associated `pending` payment record to match. Paid records are protected from this sync.

### D. Small-Team "Business-First" Filtering
**Concept:** Keeping the workspace clean for high-efficiency operations.

*   **Silent Archive:** Modified the Leads page to exclude `converted` leads from the default view. This keeps the agent's desk as a clean "To-Do List."
*   **Historical Search:** Converted leads remain searchable in the **Global Search Bar**, providing a "Google-style" archive for audits or quote history without cluttering the main list.

---

## 3. Technical Implementation Details

### Database Migrations Applied:
1.  `cleanup_policy_types`: Synchronized database enums with frontend requirements.
2.  `add_lead_quotes`: Added draft fields to the Lead model.
3.  `add_dealer_to_lead`: Ensured dealer attribution is preserved during conversion.

### Critical Logic Files:
*   `server/src/modules/lead/lead.service.ts`: Handles the complex conversion transaction.
*   `server/src/modules/policy/policy.service.ts`: Manages the automated payment creation and premium synchronization.
*   `client/src/components/ui/PolicyFormFields.tsx`: The single source of truth for all policy-related UI inputs.
*   `server/src/modules/search/search.service.ts`: Enhanced to find leads by vehicle identifiers.

---

## 4. Developer Notes for Future Maintenance
*   **Adding New Policy Fields:** If a new field is required (e.g., "Engine Number"), add it to both `Policy` and `Lead` models in Prisma, and then update the shared `PolicyFormFields.tsx` component. The conversion logic will automatically pick it up.
*   **Payment Statuses:** Always check the `payment.status` before modifying financial data. The system currently only auto-syncs `pending` records to protect "Paid" cash data.
*   **Timezone Logic:** All date comparisons should continue to use the `getStartOfTodayIST()` utility to remain consistent with the Indian insurance market's midnight cut-offs.
