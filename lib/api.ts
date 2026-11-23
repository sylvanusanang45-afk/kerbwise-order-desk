
import type { Order, OrderDetail, OrdersResponse, OrderStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "desk-demo-key";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  retries = 0
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } catch {
    throw new ApiError(
      "The order service could not be reached.",
      0,
      "network"
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    if (
      (response.status === 503 || response.status === 429) &&
      retries < 1
    ) {
      const retryAfter = Number(
        response.headers.get("retry-after") ?? "1"
      );

      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(500, retryAfter * 1000))
      );

      return request<T>(path, init, retries + 1);
    }

    const message =
      body?.message ??
      (response.status === 429
        ? "The service is busy. Please wait a moment and try again."
        : response.status === 401
          ? "The order desk is not authorised to use the service."
          : response.status === 503
            ? "The order service is temporarily unavailable."
            : "Something went wrong while loading the order service.");

    throw new ApiError(message, response.status, body?.code);
  }

  return body as T;
}

function normalizeStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "on_hold") return "new";

  if (
    normalized === "refunded" ||
    normalized === "part_refunded"
  ) {
    return "cancelled";
  }

  if (
    normalized === "new" ||
    normalized === "paid" ||
    normalized === "fulfilled" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "new";
}

function normalizeOrder(raw: Record<string, unknown>): Order {
  const createdAt =
    typeof raw.createdAt === "number"
      ? new Date(raw.createdAt * 1000).toISOString()
      : String(raw.createdAt);

  const rawTotal =
    typeof raw.total === "string"
      ? Number(raw.total.replace(/[^0-9.-]+/g, ""))
      : Number(raw.total);

  return {
    id: String(raw.id),
    number: Number(raw.number),
    customerName: String(raw.customerName ?? "").trim(),
    status: normalizeStatus(raw.status),
    total: rawTotal,
    itemCount: Number(raw.itemCount ?? 0),
    createdAt,
    channel: raw.channel as Order["channel"],
    version: Number(raw.version ?? 1)
  };
}

function normalizeOrdersResponse(
  raw: Record<string, unknown>
): OrdersResponse {
  return {
    orders: (raw.orders as Record<string, unknown>[]).map(normalizeOrder),
    page: Number(raw.page),
    pageSize: Number(raw.pageSize),
    total: Number(raw.total)
  };
}

export async function getOrders(params: {
  page: number;
  query: string;
  status: OrderStatus | "all";
  sort: "createdAt" | "total";
  direction: "asc" | "desc";
}) {
  const makeSearch = (page: number) => {
    const search = new URLSearchParams({
      page: String(page),
      pageSize: "50",
      dir: params.direction,
      sort: params.sort
    });

    if (params.query.trim()) {
      search.set("q", params.query.trim());
    }

    if (params.status !== "all") {
      search.set("status", params.status);
    }

    return search;
  };

  // The real API may ignore total sorting.
  // Fetch all matching pages and sort locally to ensure accuracy.
  if (params.sort === "total") {
    const first = normalizeOrdersResponse(
      await request<Record<string, unknown>>(
        `/orders?${makeSearch(1).toString()}`
      )
    );

    const pageCount = Math.max(
      1,
      Math.ceil(first.total / first.pageSize)
    );

    const remaining = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        request<Record<string, unknown>>(
          `/orders?${makeSearch(index + 2).toString()}`
        )
      )
    );

    const allOrders = [
      ...first.orders,
      ...remaining.flatMap((raw) =>
        normalizeOrdersResponse(raw).orders
      )
    ].sort((a, b) => {
      const value = a.total - b.total || a.number - b.number;

      return params.direction === "asc" ? value : -value;
    });

    const start = (params.page - 1) * 50;

    return {
      orders: allOrders.slice(start, start + 50),
      page: params.page,
      pageSize: 50,
      total: first.total
    };
  }

  const raw = await request<Record<string, unknown>>(
    `/orders?${makeSearch(params.page).toString()}`
  );

  return normalizeOrdersResponse(raw);
}

function normalizeDetail(
  raw: Record<string, unknown>
): OrderDetail {
  return {
    ...normalizeOrder(raw),
    currency: "GBP",
    lines: (raw.lines as Record<string, unknown>[]).map((line) => ({
      name: String(line.name),
      qty: Number(line.qty),
      lineTotal: Number(line.lineTotal)
    })),
    address: raw.address
      ? {
          line1: String(
            (raw.address as Record<string, unknown>).line1
          ),
          area: String(
            (raw.address as Record<string, unknown>).area
          )
        }
      : null,
    notes: String(raw.notes ?? ""),
    fulfilledAt: raw.fulfilledAt
      ? String(raw.fulfilledAt)
      : null
  };
}

export async function getOrder(id: string) {
  const raw = await request<Record<string, unknown>>(
    `/orders/${encodeURIComponent(id)}`
  );

  return normalizeDetail(raw);
}

export async function fulfillOrder(
  id: string,
  version: number
) {
  const raw = await request<Record<string, unknown>>(
    `/orders/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "fulfilled", version })
    }
  );

  return normalizeDetail(raw);
}
