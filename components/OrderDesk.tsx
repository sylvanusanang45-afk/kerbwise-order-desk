
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ApiError, getOrder, getOrders, fulfillOrder } from "../lib/api";
import {
  canFulfill,
  formatDate,
  formatMoney,
  STATUS_LABELS
} from "../lib/order-utils";
import type { Order, OrderDetail, OrderStatus } from "../lib/types";

type SortKey = "createdAt" | "total";
type Direction = "asc" | "desc";

const PAGE_SIZE = 50;

export default function OrderDesk() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [direction, setDirection] = useState<Direction>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getOrders({
        page,
        query,
        status,
        sort,
        direction
      });

      setOrders(result.orders);
      setTotal(result.total);
    } catch (err) {
      setOrders([]);
      setError(
        err instanceof ApiError
          ? err.message
          : "We could not load the orders."
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, status, sort, direction]);

  useEffect(() => {
    const timer = window.setTimeout(loadOrders, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders, query]);

  // Refresh the order list periodically without interrupting an open detail.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!selectedId) loadOrders();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadOrders, selectedId]);

  // Close the order panel with Escape.
  useEffect(() => {
    if (!selectedId) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  // Load the selected order's latest details.
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError("");
      setActionError("");
      return;
    }

    let cancelled = false;

    setDetailLoading(true);
    setDetailError("");
    setActionError("");

    getOrder(selectedId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(
            err instanceof ApiError
              ? err.message
              : "We could not load this order."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  const handleSort = (nextSort: SortKey) => {
    if (sort === nextSort) {
      setDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSort(nextSort);
      setDirection(nextSort === "total" ? "asc" : "desc");
    }

    setPage(1);
  };

  const handleQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleSearchKeyDown = async (
    event: ReactKeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") return;

    const scanned = event.currentTarget.value.trim().replace(/^#/, "");
    if (!/^\d+$/.test(scanned)) return;

    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await getOrders({
        page: 1,
        query: scanned,
        status: "all",
        sort: "createdAt",
        direction: "desc"
      });

      if (
        result.orders.length === 1 &&
        String(result.orders[0].number) === scanned
      ) {
        setSelectedId(result.orders[0].id);
      } else if (result.orders.length === 0) {
        setError(`Order #${scanned} was not found.`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We could not search for that order."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = (value: OrderStatus | "all") => {
    setStatus(value);
    setPage(1);
  };

  const handleFulfill = async () => {
    if (!detail || !canFulfill(detail) || fulfilling) return;

    setFulfilling(true);
    setActionError("");

    try {
      const updated = await fulfillOrder(detail.id, detail.version);

      setDetail(updated);

      setOrders((current) =>
        current.map((order) =>
          order.id === updated.id
            ? {
                ...order,
                status: updated.status,
                version: updated.version
              }
            : order
        )
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const latest = await getOrder(detail.id);

          setDetail(latest);

          setOrders((current) =>
            current.map((order) =>
              order.id === latest.id
                ? {
                    ...order,
                    status: latest.status,
                    version: latest.version
                  }
                : order
            )
          );

          setActionError(
            "This order was updated elsewhere. We've refreshed its details. Please review the latest order note before trying again."
          );
        } catch {
          setActionError(
            "This order changed elsewhere, but we couldn't refresh its details. Close and reopen the order to try again."
          );
        }
      } else {
        setActionError(
          err instanceof ApiError
            ? err.message
            : "We could not fulfil this order."
        );
      }
    } finally {
      setFulfilling(false);
    }
  };

  const statusOptions = useMemo(
    () => Object.entries(STATUS_LABELS) as [OrderStatus, string][],
    []
  );

  return (
    <main className="desk-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KERBWISE · PACKING DESK</p>
          <h1>Orders</h1>
          <p className="subtitle">
            Find, check and fulfil today's orders.
          </p>
        </div>

        <div className="order-count" aria-label={`${total} orders`}>
          <strong>{total}</strong>
          <span>orders</span>
        </div>
      </header>

      <section className="toolbar" aria-label="Order controls">
        <label className="search">
          <span className="sr-only">Search orders</span>
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => handleQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search customer or order #"
            type="search"
            autoComplete="off"
            autoFocus
          />
        </label>

        <label className="control">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              handleStatus(event.target.value as OrderStatus | "all")
            }
          >
            <option value="all">All statuses</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="sort-controls" aria-label="Sort orders">
          <span className="sort-label">Sort</span>

          <button
            className={`sort-button ${sort === "total" ? "active" : ""}`}
            onClick={() => handleSort("total")}
            type="button"
            aria-label={`Sort by total, currently ${sort === "total" ? direction : "inactive"}`}
          >
            Total {sort === "total" ? (direction === "asc" ? "↑" : "↓") : ""}
          </button>

          <button
            className={`sort-button ${sort === "createdAt" ? "active" : ""}`}
            onClick={() => handleSort("createdAt")}
            type="button"
            aria-label={`Sort by date, currently ${sort === "createdAt" ? direction : "inactive"}`}
          >
            Date {sort === "createdAt" ? (direction === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
      </section>

      <section className="table-card" aria-label="Orders list">
        {loading ? (
          <div className="state loading-state" role="status">
            <span className="spinner" aria-hidden="true" />
            <div>
              <strong>Loading orders</strong>
              <p>Getting the latest order list…</p>
            </div>
          </div>
        ) : error ? (
          <div className="state error-state" role="alert">
            <div className="state-icon">!</div>
            <div>
              <strong>Orders could not be loaded</strong>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={loadOrders}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="state empty-state">
            <div className="state-icon">⌕</div>
            <strong>No orders found</strong>
            <p>Try a different search or status filter.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Kerbwise orders</caption>
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                    <th scope="col">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <button
                          className="order-link"
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          aria-label={`Open order ${order.number}`}
                        >
                          #{order.number}
                        </button>
                      </td>

                      <td className="customer-cell">
                        {order.customerName}
                      </td>

                      <td className="money">
                        {formatMoney(order.total)}
                      </td>

                      <td>
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="date-cell">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="open-cell">
                        <button
                          className="open-button"
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          aria-label={`Open order ${order.number}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-order-list">
              {orders.map((order) => (
                <article className="mobile-order-card" key={order.id}>
                  <div className="mobile-order-top">
                    <button
                      className="order-link"
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      aria-label={`Open order ${order.number}`}
                    >
                      #{order.number}
                    </button>

                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mobile-order-main">
                    <strong>{order.customerName}</strong>
                    <strong>{formatMoney(order.total)}</strong>
                  </div>

                  <div className="mobile-order-bottom">
                    <span>{formatDate(order.createdAt)}</span>
                    <button
                      className="open-button"
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      aria-label={`Open order ${order.number}`}
                    >
                      View order
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <footer className="pagination">
              <span>
                Showing <strong>{showingFrom}–{showingTo}</strong> of{" "}
                <strong>{total}</strong>
              </span>

              <div className="page-buttons">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>

                <span aria-live="polite">
                  Page {page} of {pageCount}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pageCount, current + 1)
                    )
                  }
                  disabled={page === pageCount}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {selectedId && (
        <OrderPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          actionError={actionError}
          fulfilling={fulfilling}
          onClose={() => setSelectedId(null)}
          onFulfill={handleFulfill}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function OrderPanel({
  detail,
  loading,
  error,
  actionError,
  fulfilling,
  onClose,
  onFulfill
}: {
  detail: OrderDetail | null;
  loading: boolean;
  error: string;
  actionError: string;
  fulfilling: boolean;
  onClose: () => void;
  onFulfill: () => void;
}) {
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-panel-title"
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">ORDER DETAILS</p>
            <h2 id="order-panel-title">
              {detail ? `#${detail.number}` : "Order"}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close order"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="panel-state" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Loading order details…</p>
          </div>
        ) : error ? (
          <div className="panel-state error-state" role="alert">
            <strong>Could not open this order</strong>
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : detail ? (
          <div className="panel-content">
            <div className="detail-summary">
              <div>
                <span>Customer</span>
                <strong>{detail.customerName}</strong>
              </div>

              <div>
                <span>Status</span>
                <StatusBadge status={detail.status} />
              </div>

              <div>
                <span>Placed</span>
                <strong>{formatDate(detail.createdAt)}</strong>
              </div>
            </div>

            <section className="items-section">
              <div className="section-heading">
                <h3>Items</h3>
                <span>
                  {detail.itemCount}{" "}
                  {detail.itemCount === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="line-list">
                {detail.lines.map((line, index) => (
                  <li key={`${line.name}-${index}`}>
                    <div>
                      <strong>{line.name}</strong>
                      <span>Qty {line.qty}</span>
                    </div>
                    <span>{formatMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="detail-total">
                <span>Total</span>
                <strong>{formatMoney(detail.total)}</strong>
              </div>
            </section>

            {detail.address && (
              <section className="info-card">
                <span className="section-label">Delivery</span>
                <p>
                  {detail.address.line1}
                  <br />
                  {detail.address.area}
                </p>
              </section>
            )}

            {detail.notes && (
              <section className="info-card">
                <span className="section-label">Order note</span>
                <p>{detail.notes}</p>
              </section>
            )}

            {actionError && (
              <div className="action-error" role="alert">
                {actionError}
              </div>
            )}

            <div className="panel-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={onClose}
              >
                Close
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={onFulfill}
                disabled={!canFulfill(detail) || fulfilling}
              >
                {fulfilling
                  ? "Marking fulfilled…"
                  : detail.status === "fulfilled"
                    ? "Fulfilled"
                    : detail.status === "paid"
                      ? "Mark as fulfilled"
                      : "Not paid — cannot fulfil"}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
