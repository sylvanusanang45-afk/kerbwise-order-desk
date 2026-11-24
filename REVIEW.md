# Pull Request Review

Hi Kwesi,

I've gone through the changes to the order panel. There are some good ideas here, but I found five things we should address before relying on this in the packing room.

I've ranked them by how much damage they could cause.

## 1. The order total can be incorrect

**Priority: Critical — Blocks the merge**

The total displayed on the order slip doesn't always match what the customer actually paid. Order 2273 is an example: the slip shows £132, but the customer paid £88.

This is the biggest issue because packers could send out an order with the wrong amount recorded.

We should use the confirmed order total from the server rather than calculating a new amount from the items. Please add a test using order 2273 to make sure the displayed and printed totals are correct.

## 2. Packing notes are only saved in localStorage

**Priority: High — Blocks the merge**

The notes are stored in the browser rather than somewhere shared.

This means a note saved by one packer might not be available when another packer opens the same order on a different computer. That's likely why the birthday-card instruction was missed.

These notes need to be saved through the backend and linked to the order so everyone handling it can see them.

## 3. Pressing Enter can trigger printing more than once

**Priority: High — Blocks the merge**

The printing shortcut listens for Enter across the whole page. This means pressing Enter in another part of the application can accidentally trigger printing.

It can also cause repeated prints if the key event fires more than once.

The shortcut should only work in the intended context, and we should prevent repeated print actions. Please test it with the keyboard and with the search field focused.

## 4. Using dangerouslySetInnerHTML creates a security risk

**Priority: High — Blocks the merge**

The panel inserts content directly into the page as HTML. If customer or order data contains malicious HTML or JavaScript, it could be executed in the browser.

We should render this information as normal React text wherever possible. React escapes text by default, which is much safer.

## 5. Customer phone numbers are exposed unnecessarily

**Priority: Medium — Should be addressed before wider rollout**

The panel displays customer phone numbers even though packers may not need them to prepare orders.

Customer information should only be available to people who need it for their work. I'd remove the number from this view unless there's a clear operational reason to show it, and check that access is restricted on the server too.

## Final recommendation

I wouldn't merge this version yet. The incorrect total, missing shared notes, repeated printing and unsafe HTML handling need fixing first.

Once those changes are made and tested, we can review the phone-number access and confirm the panel is suitable for the packing team.

Thanks, Kwesi.
