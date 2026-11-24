# Kerbwise Order Desk

A simple order management dashboard built with Next.js, React and TypeScript. It helps packing staff find orders, check order details and mark paid orders as fulfilled.

## Features
- View all 148 orders with pagination.
- Search by customer name or order number.
- Filter orders by status.
- Sort orders by total and date.
- Open an order to see its details.
- Mark paid orders as fulfilled.
- Loading, error and empty states.
- Keyboard support and mobile-friendly layout.

### 1. Install dependencies
Clone the repository, open the project folder in your terminal and run:
```bash
npm install
```
### 2. Add the API files
Copy the challenge-provided `orders-server.js` and its required data files into the project root folder.
These files are supplied separately and are not included in this GitHub repository.

### 3. Start the API
Open a terminal in the project folder and run:
```bash
node orders-server.js
```
The API runs on port `4000`.

### 4. Start the application
Open a second terminal in the same project folder and run:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the real API
Stop the API using `Ctrl + C`, then start it again with:
```bash
node orders-server.js --real
```

The real mode simulates slower responses, request limits and order updates.

## Running tests
Run the automated tests with:
```bash
npm test
```

## Production build
To check the production build, run:
```bash
npm run build
```

## Tech stack
- Next.js
- React
- TypeScript
- CSS
- Vitest

## Project structure
```text
app/          Application pages and styles
components/   Order desk interface
lib/          API functions, types and order helpers
tests/        Automated tests
```

## Notes
The application waits for the server to confirm fulfilment before showing an order as fulfilled. It also handles API errors and order updates to reduce the risk of displaying incorrect information.

Built as part of the Kerbwise frontend engineering challenge.
