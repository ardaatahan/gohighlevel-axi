// API layer for the Workflows resource group. Only a list endpoint exists
// under /workflows/*; triggering a workflow for a contact is a
// contacts-namespaced call (see src/ghl/contacts.ts enrollContactInWorkflow).

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

export interface GhlWorkflow {
  id: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ListWorkflowsResult {
  workflows: GhlWorkflow[];
}

export function listWorkflows(): Promise<ListWorkflowsResult> {
  return ghlRequest<ListWorkflowsResult>({
    method: "GET",
    path: "/workflows/",
    resource: "workflows",
    query: { locationId: requireLocationId() },
  });
}
