// API layer for the Payments resource group. Every function wraps
// ghlRequest with resource: "payments". altType is hardcoded to "location"
// (not exposed as a CLI flag) since this CLI operates against a single
// sub-account Private Integration Token. Response shapes are handled
// defensively: GHL's payments API sometimes uses `_id` instead of `id` and
// wraps lists in `data` instead of a resource-named key.

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

const ALT_TYPE = "location";

export interface Order {
  id?: string;
  _id?: string;
  contactId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Best-effort id accessor: prefers `id`, falls back to the API's `_id`. */
export function orderId(order: Order): string {
  return order.id ?? order._id ?? "(unknown)";
}

export interface ListOrdersOptions {
  status?: string;
  paymentStatus?: string;
  contactId?: string;
  limit?: number;
}

export interface ListOrdersResult {
  data?: Order[];
  orders?: Order[];
  totalCount?: number;
}

/** Normalizes the list response's data/orders inconsistency into one array. */
export function ordersOf(result: ListOrdersResult): Order[] {
  return result.data ?? result.orders ?? [];
}

export function listOrders(opts: ListOrdersOptions = {}): Promise<ListOrdersResult> {
  return ghlRequest<ListOrdersResult>({
    method: "GET",
    path: "/payments/orders",
    resource: "payments",
    query: {
      altId: requireLocationId(),
      altType: ALT_TYPE,
      status: opts.status,
      paymentStatus: opts.paymentStatus,
      contactId: opts.contactId,
      limit: opts.limit,
    },
  });
}

export interface GetOrderResult {
  data?: Order;
  order?: Order;
  [key: string]: unknown;
}

/** Normalizes the get-one response's data/order inconsistency into one object. */
export function orderOf(result: GetOrderResult): Order {
  return result.data ?? result.order ?? (result as Order);
}

export function getOrder(id: string): Promise<GetOrderResult> {
  return ghlRequest<GetOrderResult>({
    method: "GET",
    path: `/payments/orders/${encodeURIComponent(id)}`,
    resource: "payments",
  });
}

export interface Subscription {
  id?: string;
  _id?: string;
  contactId?: string;
  status?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface ListSubscriptionsResult {
  data?: Subscription[];
  subscriptions?: Subscription[];
  totalCount?: number;
}

export function subscriptionsOf(result: ListSubscriptionsResult): Subscription[] {
  return result.data ?? result.subscriptions ?? [];
}

export function listSubscriptions(opts: { limit?: number } = {}): Promise<ListSubscriptionsResult> {
  return ghlRequest<ListSubscriptionsResult>({
    method: "GET",
    path: "/payments/subscriptions",
    resource: "payments",
    query: { altId: requireLocationId(), altType: ALT_TYPE, limit: opts.limit },
  });
}

export interface RecordPaymentFields {
  mode: "cash" | "cheque" | "card" | "custom";
  amount: number;
  notes?: string;
}

export interface RecordPaymentResult {
  succeeded?: boolean;
  [key: string]: unknown;
}

/**
 * Records a payment against an EXISTING order - the single highest-stakes
 * write endpoint in the whole API surface, since it logs real money moved.
 * Callers MUST gate this at least as strictly as message-send.
 */
export function recordPayment(orderId: string, fields: RecordPaymentFields): Promise<RecordPaymentResult> {
  return ghlRequest<RecordPaymentResult>({
    method: "POST",
    path: `/payments/orders/${encodeURIComponent(orderId)}/record-payment`,
    resource: "payments",
    body: {
      altId: requireLocationId(),
      altType: ALT_TYPE,
      mode: fields.mode,
      amount: fields.amount,
      notes: fields.notes,
    },
  });
}
