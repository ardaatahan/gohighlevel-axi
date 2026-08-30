// API layer for Calendars & Appointments. Version header for this group is
// "2021-04-15" (GHL_API_VERSIONS.calendars) - distinct from the "2021-07-28"
// used by contacts/opportunities/payments/workflows.

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

export interface GhlCalendar {
  id?: string;
  name?: string;
  calendarType?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface GhlAppointment {
  id?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  calendarId?: string;
  contactId?: string;
  appointmentStatus?: string;
  [key: string]: unknown;
}

export interface ListCalendarsOptions {
  groupId?: string;
  showDrafted?: boolean;
}

export async function listCalendars(opts: ListCalendarsOptions = {}): Promise<GhlCalendar[]> {
  const res = await ghlRequest<{ calendars?: GhlCalendar[] }>({
    method: "GET",
    path: "/calendars/",
    resource: "calendars",
    query: {
      locationId: requireLocationId(),
      groupId: opts.groupId,
      showDrafted: opts.showDrafted,
    },
  });
  return res?.calendars ?? [];
}

export async function getCalendar(id: string): Promise<GhlCalendar> {
  const res = await ghlRequest<{ calendar?: GhlCalendar } & GhlCalendar>({
    method: "GET",
    path: `/calendars/${encodeURIComponent(id)}`,
    resource: "calendars",
  });
  return (res?.calendar ?? res) as GhlCalendar;
}

export interface ListEventsOptions {
  startTimeMs: string;
  endTimeMs: string;
  calendarId?: string;
  userId?: string;
  groupId?: string;
}

export async function listEvents(opts: ListEventsOptions): Promise<GhlAppointment[]> {
  const res = await ghlRequest<{ events?: GhlAppointment[] }>({
    method: "GET",
    path: "/calendars/events",
    resource: "calendars",
    query: {
      locationId: requireLocationId(),
      startTime: opts.startTimeMs,
      endTime: opts.endTimeMs,
      calendarId: opts.calendarId,
      userId: opts.userId,
      groupId: opts.groupId,
    },
  });
  return res?.events ?? [];
}

export async function getAppointment(id: string): Promise<GhlAppointment> {
  const res = await ghlRequest<{ appointment?: GhlAppointment } & GhlAppointment>({
    method: "GET",
    path: `/calendars/events/appointments/${encodeURIComponent(id)}`,
    resource: "calendars",
  });
  return (res?.appointment ?? res) as GhlAppointment;
}

export interface BookAppointmentFields {
  calendarId: string;
  contactId: string;
  startTimeMs: string;
  endTimeMs?: string;
  title?: string;
  appointmentStatus?: string;
  assignedUserId?: string;
  address?: string;
}

export async function bookAppointment(fields: BookAppointmentFields): Promise<GhlAppointment> {
  const body: Record<string, unknown> = {
    calendarId: fields.calendarId,
    locationId: requireLocationId(),
    contactId: fields.contactId,
    startTime: fields.startTimeMs,
  };
  if (fields.endTimeMs !== undefined) body["endTime"] = fields.endTimeMs;
  if (fields.title !== undefined) body["title"] = fields.title;
  if (fields.appointmentStatus !== undefined) body["appointmentStatus"] = fields.appointmentStatus;
  if (fields.assignedUserId !== undefined) body["assignedUserId"] = fields.assignedUserId;
  if (fields.address !== undefined) body["address"] = fields.address;

  return ghlRequest<GhlAppointment>({
    method: "POST",
    path: "/calendars/events/appointments",
    resource: "calendars",
    body,
  });
}

// GHL has no dedicated "cancel appointment" status endpoint confirmed in the
// documented API surface; DELETE on the event is the verified mechanism, so
// the CLI's "appointment cancel" maps to this HTTP DELETE.
export async function cancelAppointment(id: string): Promise<void> {
  await ghlRequest<void>({
    method: "DELETE",
    path: `/calendars/events/${encodeURIComponent(id)}`,
    resource: "calendars",
  });
}
