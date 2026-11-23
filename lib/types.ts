export type OrderStatus = "new" | "paid" | "fulfilled" | "cancelled";

export interface Order {
  id: string;
  number: number;
  customerName: string;
  phone?: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
  channel: "web" | "whatsapp" | "pos";
  version: number;
}

export interface OrderLine {
  name: string;
  qty: number;
  lineTotal: number;
}

export interface OrderDetail extends Order {
  currency: "GBP";
  lines: OrderLine[];
  address: { line1: string; area: string } | null;
  notes: string;
  fulfilledAt: string | null;
}

export interface OrdersResponse {
  orders: Order[];
  page: number;
  pageSize: number;
  total: number;
}
