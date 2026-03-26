Insurance CRM & Renewal App — Implementation Plan
A production-ready insurance CRM web application for an agent who works with multiple insurance companies. Built with React + Vite + TypeScript + Tailwind CSS + Firebase.

User Review Required
IMPORTANT

Firebase Configuration: You will need to create a Firebase project and provide your Firebase config (API key, auth domain, project ID, etc.) in a .env file. The app will include a placeholder .env.example.

IMPORTANT

Phone Auth: Firebase Phone Auth requires a billing account (Blaze plan) for production. The app will also support email/password auth as fallback for development.

WARNING

No backend server: All logic runs client-side with Firestore security rules. This is suitable for single-agent or small-team use. For multi-tenant SaaS, a backend (Cloud Functions) would be needed later.

Proposed Changes
1. Project Initialization
[NEW] Project scaffold via npx create-vite
Initialize Vite + React + TypeScript in g:\Godivatech\Prakash\Analyzer\tech\Insurance
Install deps: firebase, @tanstack/react-query, zod, react-router-dom, react-hot-toast, lucide-react, date-fns
Configure Tailwind CSS v3
Create folder structure:
src/
  components/   — Reusable UI components
  pages/        — Route-level pages
  hooks/        — Custom React hooks
  services/     — Firebase service layer
  utils/        — Date helpers, formatters
  types/        — TypeScript interfaces
  contexts/     — Auth context
2. Core Types & Validation
[NEW] 
types.ts
TypeScript interfaces for Company, Customer, Policy, FollowUp, with all fields from the spec (userId, companyId, policyType, vehicleNumber, expiryDate, parentPolicyId, isDeleted, etc.)

[NEW] 
schemas.ts
Zod schemas mirroring every type for input validation.

[NEW] 
dateUtils.ts
daysUntilExpiry(expiryDate) — timezone-safe using UTC
getRenewalCategory(daysLeft) — today / 7d / 30d / expired
getStatusColor(category) — red / yellow / green
3. Firebase Setup
[NEW] 
firebase.ts
Initialize Firebase app, Auth, Firestore from env vars.

[NEW] 
.env.example
Template with VITE_FIREBASE_* variables.

4. Authentication
[NEW] 
AuthContext.tsx
React context providing user, loading, login, logout. Wraps Firebase Auth state.

[NEW] 
LoginPage.tsx
Phone OTP login with email/password fallback. Mobile-first card UI.

[NEW] 
ProtectedRoute.tsx
Redirect to login if unauthenticated.

5. Service Layer (Firestore CRUD)
[NEW] 
companyService.ts
getCompanies(userId), addCompany(), seedDefaults() — CRUD with userId isolation.

[NEW] 
customerService.ts
getCustomers(), addCustomer(), updateCustomer(), softDeleteCustomer() — with duplicate phone warning.

[NEW] 
policyService.ts
getPolicies(), addPolicy(), renewPolicy() (creates new record linking parentPolicyId), markAsLost(), plus filtered queries by company/status/expiry.

[NEW] 
followUpService.ts
getFollowUps(), addFollowUp(), updateFollowUp(), getOverdue(), getToday().

6. React Query Hooks
[NEW] 
useCompanies.ts
[NEW] 
useCustomers.ts
[NEW] 
usePolicies.ts
[NEW] 
useFollowUps.ts
[NEW] 
useDashboard.ts
Each hook uses @tanstack/react-query for caching, invalidation, and optimistic updates. useDashboard aggregates expiring policies + follow-ups.

7. UI Components
[NEW] Shared Components
Modal.tsx — Reusable modal wrapper
FloatingActionButton.tsx
StatusBadge.tsx — Color-coded status pills
EmptyState.tsx — Illustrated empty states
SearchBar.tsx — Global search input
CompanyFilter.tsx — Tab/dropdown filter
PolicyCard.tsx — Card showing policy with quick actions
FollowUpCard.tsx — Card for follow-up items
StatCard.tsx — Dashboard summary card
Sidebar.tsx / BottomNav.tsx — Navigation
8. Pages
[NEW] 
DashboardPage.tsx
Summary stats (total customers, active policies, expiring soon)
Company analytics cards (clickable → filtered view)
Expiring today / 7d / 30d sections
Today's and overdue follow-ups
Company filter tabs at top
[NEW] 
CustomersPage.tsx
Customer list with search
Add/Edit modal
Shows policy count per customer
[NEW] 
PoliciesPage.tsx
Policy list with company + status filters
Add/Edit/Renew modals
Renewal history view (parentPolicyId chain)
[NEW] 
CompaniesPage.tsx
Company list
Add company modal
[NEW] 
SearchPage.tsx
Search results by vehicle number / phone / name
9. Routing & Layout
[NEW] 
App.tsx
React Router with:

/login → LoginPage
/ → DashboardPage (protected)
/customers → CustomersPage (protected)
/policies → PoliciesPage (protected)
/companies → CompaniesPage (protected)
/search → SearchPage (protected)
10. Styling
[NEW] 
index.css
Tailwind base + custom design tokens. Dark mode support. Premium gradients, glassmorphism cards, micro-animations.

Verification Plan
Automated Browser Tests
After building, I will:

Start the dev server with npm run dev
Use the browser tool to:
Verify the login page renders correctly
Verify the dashboard loads with empty states
Test adding a company
Test adding a customer
Test adding a policy
Test the renewal flow (mark as renewed → verify new policy created)
Test company filter tabs
Test search functionality
Verify mobile responsiveness by resizing the browser
Check color coding on expiring policies
Manual Verification (User)
NOTE

After implementation, the user should:

Create a Firebase project at console.firebase.google.com
Enable Firestore and Authentication (Phone + Email/Password)
Copy Firebase config to .env
Run npm run dev and test the full flow:
Login → Dashboard → Add Company → Add Customer → Add Policy → See renewal alerts → Add Follow-up → Mark as renewed
Deploy to Vercel and test on mobile