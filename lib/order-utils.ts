import type { Order, OrderStatus } from "./types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled"
};

export function canFulfill(order: Pick<Order, "status">) {
  return order.status === "paid";
}

export function matchesOrder(order: Pick<Order, "number" | "customerName">, query: string) {
  const term = query.trim().toLowerCase().replace(/^#/, "");
  if (!term) return true;

  return (
    order.customerName.toLowerCase().includes(term) ||
    String(order.number).includes(term)
  );
}

export function compareOrders(
  a: Order,
  b: Order,
  sort: "createdAt" | "total",
  direction: "asc" | "desc"
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const value =
    sort === "total"
      ? a.total - b.total
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  return (value || a.number - b.number) * multiplier;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
