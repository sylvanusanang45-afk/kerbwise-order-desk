# Decisions and Trade-offs

While testing the order desk against the real API, I found a few behaviours that needed special attention. I focused mainly on situations where a packer could see incorrect information, lose work, or accidentally make the wrong fulfilment decision.

## What I found and what I did

### 1. The API doesn't always return a normal response

The real API deliberately returns a delayed 503 error on page 2, and the response is HTML rather than JSON.

I made the API helper handle unsuccessful responses without assuming they always contain JSON. It retries temporary 503 and 429 errors once, then reports the error so the user can try again.

I wanted to avoid situations where a failed request looks like a successful one or leaves the packer unsure whether the information on screen is current.

### 2. The API is slower and has request limits

The real server introduces delays and can return 429 errors if too many requests are made in a short period.

I avoided sending a request for every search keystroke by debouncing search. I also kept the existing view stable while new data loads.

This helps reduce unnecessary requests, especially when someone is quickly scanning or searching for orders.

### 3. Orders can change while someone is using the desk

New orders can arrive while the application is open, and order data can change before a packer finishes an action.

I used periodic list refreshing when an order isn't open and included the order version when sending fulfilment requests.

This helps keep the list up to date without constantly interrupting someone who is working on a particular order.

### 4. Fulfilment can fail because an order has changed

The real API deliberately creates a conflict for order `ord_2286`. This simulates another person changing the order while the current packer is viewing it.

Rather than treating the action as successful, I updated the conflict handling to fetch the latest order details and update the desk. The packer can then review the current information before trying again.

This matters because showing an order as fulfilled when the server rejected the update could lead to mistakes during packing.

### 5. Real order data isn't always consistent

The API returns different formats for names, statuses, dates and totals. I made the frontend normalise these values before displaying them.

I also left personal phone numbers out of the packer's order view because they aren't needed for the main packing workflow.

The aim was to make the desk handle imperfect data without confusing the person using it.

## What I left out

I deliberately kept the scope focused on the main order-management workflow.

- I didn't add repeated automatic retries. The helper makes one retry for temporary 503/429 errors, then surfaces the problem instead of repeatedly sending requests.
- I avoided optimistic fulfilment. The interface waits for the server to confirm the change before showing it as successful.
- I left out dark mode and Excel export because they weren't essential to the assessment.
- I didn't implement full realtime updates between packers. The supplied API doesn't offer subscriptions, so periodic refreshing was a simpler approach.

## Questions I'd ask the Kerbwise team

1. Should packers be prevented from accessing customer phone numbers at the API level too, rather than only hiding them in the interface?
2. How quickly should new orders appear? Is a 30-second refresh acceptable, or does the shop need something faster?
3. When two packers try to update the same order, is refreshing the latest information the expected behaviour?
4. How should orders on hold, refunded or partially refunded be handled?
5. Should a fulfilment action ever be reversible, and who should have permission to reverse it?
