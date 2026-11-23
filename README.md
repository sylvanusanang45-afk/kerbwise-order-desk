# Kerbwise Order Desk

A small order desk for shop packers, built with Next.js and React against the supplied Kerbwise mock Orders API.

## Run in minutes

Requirements:
- Node.js 18+
- The supplied `orders-server.js`

Terminal 1:

```bash
node orders-server.js
```

Terminal 2:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app defaults to the challenge API at `http://localhost:4000` and uses the supplied demo key. To use another API URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

## Test

```bash
npm test
```

The test suite covers customer/order-number search, sorting, and the paid-only fulfilment rule.

## What is implemented

- 148 orders with 50-per-page server pagination
- Customer and order-number search
- Status filtering
- Total/date sorting
- Order detail panel with lines, totals, address and notes
- Paid-only fulfilment with API version passed to protect against stale updates
- Loading, empty and error states
- Keyboard-accessible controls and scanner-friendly order-number search
- Responsive layout for 390px screens
- Periodic refresh when the detail panel is closed

## Deliberate choices

Customer phone numbers are not displayed in the desk because the brief says they should only be visible to the owner and customer care, not packers.

I did not build the accountant Excel export or dark mode because neither is part of the Step 1 must-have list. They are product requests for a later iteration.

## Scope

The supplied API remains the source of truth for filtering, sorting, pagination and fulfilment. The UI does not duplicate server-side order data or assume that a fulfilment request succeeded before the API confirms it.
