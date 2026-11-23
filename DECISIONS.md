# Step 2 — Decisions

## What I found

### 1. The live API can return non-JSON errors
On the real server, page 2 deliberately returns a delayed 503 HTML response once.

**Decision:** treat any non-2xx response as an error and show a retry action. The API helper does not assume every failed response is JSON.

**Why:** a packer should never see a blank desk or stale-looking success state after an upstream failure.

### 2. The real server is slower and rate-limited
List requests are delayed and more than seven requests in a two-second window return 429.

**Decision:** debounce search, avoid request-per-keystroke behaviour, and keep the current view stable while a request is loading.

**Why:** this reduces accidental request bursts during fast scanning/searching.

### 3. Live data changes while a packer is viewing it
Orders can arrive while the desk is open, and fulfilment uses a version.

**Decision:** refresh the list periodically when no order panel is open, and send the order version with fulfilment.

**Why:** the desk gets new work without interrupting a packer's focused task. Versioning lets the API reject stale writes.

### 4. Fulfilment can conflict
Order `ord_2286` is deliberately changed once during the real-mode test.

**Decision:** surface a conflict instead of pretending fulfilment succeeded, and ask the packer to close/reopen the order to see the current state.

**Why:** showing "fulfilled" when another packer changed the order could cause a duplicate or incorrect packing action.

### 5. Real responses are intentionally untidy
The real API varies name formatting, status casing, date representation and total representation.

**Decision:** keep the UI tolerant of the documented response shape where possible and avoid displaying personal phone numbers in the packer workflow.

**Why:** the desk needs to remain useful when real upstream data is imperfect.

## What I left out

- Automatic retry of 503/429 responses: the operator gets an explicit retry instead. Automatic retries can create additional traffic and are harder to reason about during a busy period.
- Optimistic fulfilment: the UI waits for the server response because fulfilment has a direct operational cost.
- Dark mode and Excel export: useful product work, but not required for this assessment and less important than reliable packing.
- Full cross-user realtime updates: the mock API does not provide a subscription mechanism, so polling is the smallest honest solution for this version.

## Questions for Kerbwise

1. Should the packer role be prevented from receiving phone numbers at the API level as well as hidden in the UI?
2. What is the desired freshness target for new orders: seconds, or is a 30-second refresh acceptable?
3. When a conflict occurs, should the desk automatically reload the latest order or require the packer to confirm?
4. What is the expected operational policy for orders on hold, refunded or partially refunded?
5. Should fulfilment be reversible, and who is allowed to do that?
