// API layer for GoHighLevel conversations and messages. Version "2021-04-15"
// (distinct from contacts/opportunities) - see GHL_API_VERSIONS.

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

export interface SearchConversationsOptions {
  contactId?: string;
  query?: string;
  status?: string;
  limit?: string;
}

export function searchConversations(opts: SearchConversationsOptions = {}): Promise<unknown> {
  return ghlRequest({
    method: "GET",
    path: "/conversations/search",
    resource: "conversations",
    query: {
      locationId: requireLocationId(),
      contactId: opts.contactId,
      query: opts.query,
      status: opts.status,
      limit: opts.limit,
    },
  });
}

export function getConversation(conversationId: string): Promise<unknown> {
  return ghlRequest({
    method: "GET",
    path: `/conversations/${conversationId}`,
    resource: "conversations",
  });
}

export function listMessages(conversationId: string): Promise<unknown> {
  return ghlRequest({
    method: "GET",
    path: `/conversations/${conversationId}/messages`,
    resource: "conversations",
  });
}

export interface SendMessageFields {
  contactId: string;
  type: "SMS" | "Email";
  message: string;
  subject?: string;
}

export function sendMessage(fields: SendMessageFields): Promise<unknown> {
  const body: Record<string, unknown> = {
    contactId: fields.contactId,
    type: fields.type,
    message: fields.message,
  };
  if (fields.subject) body["subject"] = fields.subject;
  return ghlRequest({
    method: "POST",
    path: "/conversations/messages",
    resource: "conversations",
    body,
  });
}
