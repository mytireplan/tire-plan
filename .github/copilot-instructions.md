# Copilot Instructions for tire-plan

**Project**: Multi-location tire shop POS and management system with React + TypeScript + Firebase

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **State Management**: React hooks + Firebase Realtime Listeners
- **Charts**: Recharts
- **Styling**: TailwindCSS + Tailwind Merge

### Project Structure
```
src/
├── components/      # Feature-based components (Dashboard, POS, Inventory, etc)
├── utils/          # Firestore service layer, formatting utilities
├── hooks/          # Custom React hooks (useMenuAccess)
├── types.ts        # Centralized TypeScript interfaces
├── firebase.ts     # Firebase initialization
└── App.tsx         # Main app with role-based routing (~2566 lines)

functions/
├── auth.ts         # Firebase Auth functions
├── index.ts        # Cloud Functions entry
└── subscription.ts # Subscription management
```

## Critical Patterns

### 1. Type Imports vs Value Imports
```typescript
// ✅ Types use 'type' keyword
import type { Sale, Customer, Shift } from './types';

// ✅ Runtime values (enums, constants) don't use 'type'
import { PaymentMethod } from './types';
```
**Why**: PaymentMethod is an object constant used at runtime for checks like `s.paymentMethod === PaymentMethod.CARD`. Other interfaces are pure types for compile-time only.

### 2. Firestore Real-time Data Flow
Most list data (sales, shifts, staff) use `subscribeToQuery()` with `onSnapshot()` listeners:
```typescript
const unsub = subscribeToQuery<Shift>(COLLECTIONS.SHIFTS, constraints, (data) => {
  const sorted = [...data].sort((a, b) => ...);
  setShifts(sorted);
});
// Auto-unsubscribe on cleanup
return () => unsub?.();
```
**Key**: Date range queries in `App.tsx` control which data loads. Calendar and schedule views request different date ranges dynamically.

### 3. Date Handling: Timezone Pitfalls
ISO string dates can cause midnight shifts when converting to Date objects:
```typescript
// ✅ Safe: Extract date part directly from ISO string
const isoToLocalDate = (iso: string) => iso.split('T')[0];  // Returns "2026-01-03"

// ❌ Risky: new Date("2026-01-03") creates midnight UTC, not local
```
**Apply to**: Any date comparison in filters (src/components/ScheduleAndLeave.tsx, Dashboard.tsx)

### 4. Firestore Datetime Fields Store ISO Strings
Sales, shifts, and leave requests store `date: string` in ISO format ("2026-01-03T12:00:00Z").
- Always normalize with `isoToLocalDate()` before comparing
- Use `dateToLocalString()` for creating new dates: `new Date(...).toISOString()`

### 5. Sale Item Calculations
Each `Sale` has `items: SalesItem[]` where each item has `quantity: number`:
```typescript
// Sum tire quantities across all items in a sale
const tireQuantity = sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
```
**Used in**: Dashboard tire count displays, inventory tracking

### 6. Role-Based Access Control
Three roles with distinct permissions:
- `SUPER_ADMIN` (ID: '999999'): Master user, all features
- `STORE_ADMIN` (Owner): Own store's data, staff management
- `STAFF`: View-only, single store assigned

Implemented in `App.tsx` via conditional routing and in components via `useMenuAccess()` hook.

### 7. Multi-Store Context
Each sale, shift, and inventory record has `storeId`. Dashboard and reports filter by `selectedStoreId`. When `selectedStoreId === 'ALL'`, data aggregates across all visible stores.

## Development Workflows

### Start Development
```bash
npm run dev        # Vite server on localhost:5173
```
Hot Module Replacement auto-refreshes on file changes.

### Build & Deploy
```bash
npm run build      # TypeScript + Vite build
npm run lint       # ESLint check
```
Deployment uses GitHub Actions to Lightsail (see `LIGHTSAIL_DEPLOYMENT_GUIDE.md`).

### Testing
End-to-end tests use Playwright:
```bash
scripts/e2e-login-test.js  # Login flow verification
```

## Common Tasks & Patterns

### Adding a Calendar Feature
1. Use `getDaysInMonth()` to get date array (Dashboard.tsx line ~267)
2. Calculate daily stats with helper functions that normalize dates
3. **Must**: Request data for full month with `onShiftRangeChange()` if spanning month boundaries
4. **Template**: Grid cells show date (top-left), amounts (bottom-right), details in tooltip

### Modifying Firestore Queries
- Constraints use Firebase query operators: `where()`, `orderBy()`, `limit()`
- Date ranges must account for timezone: use ISO string comparisons
- Always clean up listeners with `unsubscribe()` on component unmount

### Formatting Numbers
Use utilities from `src/utils/format.ts`:
- `formatCurrency(1000000)` → "₩1,000,000"
- `formatNumber(100)` → "100"

### TailwindCSS Styling
- Color palette: blue-600 (primary), emerald-600 (success), red-500 (danger), violet-600 (alternate)
- Use `clsx()` or ternary for conditional classes
- Responsive: `md:` prefix for tablet+ breakpoints

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/types.ts` | All interfaces: Sale, Staff, Shift, LeaveRequest, etc. |
| `src/firebase.ts` | Firebase init, db instance |
| `src/utils/firestore.ts` | CRUD operations, `subscribeToQuery()`, `COLLECTIONS` constant |
| `src/components/Dashboard.tsx` | Revenue charts, calendar, admin analytics (~1055 lines) |
| `src/components/ScheduleAndLeave.tsx` | Weekly/monthly shift grid (~731 lines) |
| `src/App.tsx` | Main router, auth, Firestore listeners (~2566 lines) |
| `functions/index.ts` | Cloud Functions: auth, subscriptions |

## Common Pitfalls

1. **Forgetting date normalization**: Always use `isoToLocalDate()` for ISO strings before comparing
2. **Unfiltered Firestore queries**: Month-based queries may miss cross-month data (e.g., Jan 1 week includes Dec 29-31). Explicitly request wider date range if needed.
3. **Type vs value imports**: Use `import type {...}` for interfaces, plain import for runtime values
4. **Stale listeners**: Component unmount must call `unsubscribe()` to prevent memory leaks
5. **Missing store context**: Always check `storeId` when filtering sales/shifts; aggregate across stores when `selectedStoreId === 'ALL'`

## Recent Changes to Know

- **Schedule month-boundary fix**: Week view now loads data spanning both months (ScheduleAndLeave.tsx ~line 145)
- **Dashboard tire metrics**: Calendar shows daily tire count and monthly total (Dashboard.tsx ~line 290)
- **ISO date extraction**: Direct string split instead of Date object parsing (Dashboard.tsx line ~125)
