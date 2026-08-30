// API layer for the Contacts resource group. Every function here wraps
// ghlRequest with resource: "contacts" and resolves locationId itself so
// command code stays thin. See GHL /contacts/* endpoints, Version 2021-07-28.

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

export interface GhlContact {
  id: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  country?: string;
  source?: string;
  dateAdded?: string;
  companyName?: string;
  tags?: string[];
  businessId?: string;
  [key: string]: unknown;
}

export interface ListContactsResult {
  contacts: GhlContact[];
  count: number;
}

export interface ListContactsOptions {
  query?: string;
  limit?: number;
  startAfterId?: string;
}

export function listContacts(opts: ListContactsOptions = {}): Promise<ListContactsResult> {
  return ghlRequest<ListContactsResult>({
    method: "GET",
    path: "/contacts/",
    resource: "contacts",
    query: {
      locationId: requireLocationId(),
      query: opts.query,
      limit: opts.limit,
      startAfterId: opts.startAfterId,
    },
  });
}

export interface GetContactResult {
  contact: GhlContact;
}

export function getContact(contactId: string): Promise<GetContactResult> {
  return ghlRequest<GetContactResult>({
    method: "GET",
    path: `/contacts/${encodeURIComponent(contactId)}`,
    resource: "contacts",
  });
}

export interface ContactFields {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  tags?: string[];
  source?: string;
  companyName?: string;
}

export function createContact(fields: ContactFields): Promise<GetContactResult> {
  return ghlRequest<GetContactResult>({
    method: "POST",
    path: "/contacts/",
    resource: "contacts",
    body: { locationId: requireLocationId(), ...fields },
  });
}

export function updateContact(contactId: string, fields: ContactFields): Promise<GetContactResult> {
  return ghlRequest<GetContactResult>({
    method: "PUT",
    path: `/contacts/${encodeURIComponent(contactId)}`,
    resource: "contacts",
    body: fields,
  });
}

export interface DeleteContactResult {
  succeded: boolean;
}

export function deleteContact(contactId: string): Promise<DeleteContactResult> {
  return ghlRequest<DeleteContactResult>({
    method: "DELETE",
    path: `/contacts/${encodeURIComponent(contactId)}`,
    resource: "contacts",
  });
}

export interface EnrollWorkflowResult {
  succeded: boolean;
}

export function enrollContactInWorkflow(
  contactId: string,
  workflowId: string,
  eventStartTime?: string,
): Promise<EnrollWorkflowResult> {
  return ghlRequest<EnrollWorkflowResult>({
    method: "POST",
    path: `/contacts/${encodeURIComponent(contactId)}/workflow/${encodeURIComponent(workflowId)}`,
    resource: "contacts",
    body: eventStartTime ? { eventStartTime } : {},
  });
}

/** Best-effort display name: prefers `name`, falls back to first+last, then email. */
export function contactDisplayName(contact: GhlContact): string {
  if (contact.name) return contact.name;
  const combined = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (contact.email) return contact.email;
  return "(unnamed)";
}
