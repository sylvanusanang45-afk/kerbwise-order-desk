# Pull request review — OrderPanel

## 1. Blocker — The order total is calculated incorrectly

`lineTotal` is already the price of the whole line, including quantity, according to the API contract. The PR multiplies it by `qty` again.

The browser log shows the result clearly: order 2273 is £88.00 from the API but the panel renders £132.00. This is a money-critical defect and can put the wrong amount on a packing slip.

**Please fix before merge:** use `lineTotal` directly.

---

## 2. Blocker — Enter prints every keypress and can print repeatedly

The global `keydown` listener calls `window.print()` for every Enter key and is never removed. The effect also adds another listener whenever the component mounts.

The scanner sends Enter, and the log shows the same slip being printed repeatedly. This is a direct operational problem and can waste slips or put duplicate slips in bags.

**Please fix before merge:** scope the scanner shortcut to the intended workflow, clean up the listener, and ensure one scan produces one print.

---

## 3. Blocker — Notes are stored only in one browser's localStorage

The note is saved to `localStorage`, so another packer's device cannot see it. The log confirms this: a note entered on one device is empty on another.

That contradicts the purpose of a shared packing note and can cause packers to miss important instructions.

**Please fix before merge:** persist notes through the server/shared data model. If the API does not support that yet, don't present localStorage as shared notes.

---

## 4. High — The packing slip exposes a customer's phone number to every packer

The brief says phone numbers are personal data and should only be visible to the owner and customer care. The PR prints `order.phone` directly onto a slip that goes into a bag.

Even if the phone number is useful somewhere else, putting it on a physical packing slip expands who can see it.

**Please fix before merge:** remove the phone number from the packing slip unless Kerbwise explicitly establishes that packers are authorised to receive it.

---

## 5. High — `dangerouslySetInnerHTML` renders order notes as HTML

`order.notes` is inserted into the DOM without sanitisation. The API contract describes notes as text, so there is no reason for the panel to interpret them as HTML.

This creates an avoidable injection risk and also makes note rendering harder to predict.

**Please fix before merge:** render notes as text. If rich text is a real product requirement, sanitise it with a narrowly defined allow-list.

---

## Merge decision

**Block the merge.** The first three issues can directly cause wrong money, duplicate slips, or lost packing instructions. The phone-number exposure and unsafe HTML are also serious enough that I would not ship this panel unchanged.
