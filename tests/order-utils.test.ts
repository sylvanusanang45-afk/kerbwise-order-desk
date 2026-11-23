import { describe, expect, it } from "vitest";
import { canFulfill, compareOrders, matchesOrder } from "../lib/order-utils";
import type { Order } from "../lib/types";

const base: Order = {
  id: "ord_1",
  number: 2273,
  customerName: "Ben Wright",
  status: "paid",
  total: 88,
  itemCount: 3,
  createdAt: "2026-11-12T13:09:31.000Z",
  channel: "web",
  version: 1
};

describe("order desk rules", () => {
  it("finds orders by customer or order number", () => {
    expect(matchesOrder(base, "ben")).toBe(true);
    expect(matchesOrder(base, "#2273")).toBe(true);
    expect(matchesOrder(base, "9999")).toBe(false);
  });

  it("sorts totals in ascending and descending order", () => {
    const cheaper = { ...base, id: "ord_2", number: 2274, total: 40 };
    expect(compareOrders(cheaper, base, "total", "asc")).toBeLessThan(0);
    expect(compareOrders(cheaper, base, "total", "desc")).toBeGreaterThan(0);
  });

  it("only allows paid orders to be fulfilled", () => {
    expect(canFulfill({ status: "paid" })).toBe(true);
    expect(canFulfill({ status: "new" })).toBe(false);
    expect(canFulfill({ status: "fulfilled" })).toBe(false);
    expect(canFulfill({ status: "cancelled" })).toBe(false);
  });
});
