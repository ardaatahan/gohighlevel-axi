// API layer for the Opportunities/Pipelines resource group. Every function
// wraps ghlRequest with resource: "opportunities". Note the real API is
// inconsistent about casing: /opportunities/pipelines uses camelCase
// `locationId` while /opportunities/search uses snake_case `location_id` and
// friends - this is a verified quirk of the live API, not a typo here.

import { ghlRequest } from "./client.js";
import { requireLocationId } from "./config.js";

export interface PipelineStage {
  id: string;
  name: string;
  position?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

export interface ListPipelinesResult {
  pipelines: Pipeline[];
}

export function listPipelines(): Promise<ListPipelinesResult> {
  return ghlRequest<ListPipelinesResult>({
    method: "GET",
    path: "/opportunities/pipelines",
    resource: "opportunities",
    query: { locationId: requireLocationId() },
  });
}

export interface Opportunity {
  id: string;
  name: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  monetaryValue?: number;
  contactId?: string;
  assignedTo?: string;
  [key: string]: unknown;
}

export interface SearchOpportunitiesOptions {
  pipelineId?: string;
  pipelineStageId?: string;
  contactId?: string;
  status?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface SearchOpportunitiesResult {
  opportunities: Opportunity[];
  meta?: { total?: number };
}

export function searchOpportunities(opts: SearchOpportunitiesOptions = {}): Promise<SearchOpportunitiesResult> {
  return ghlRequest<SearchOpportunitiesResult>({
    method: "GET",
    path: "/opportunities/search",
    resource: "opportunities",
    // snake_case query params - verified quirk of this specific endpoint.
    query: {
      location_id: requireLocationId(),
      pipeline_id: opts.pipelineId,
      pipeline_stage_id: opts.pipelineStageId,
      contact_id: opts.contactId,
      status: opts.status,
      assigned_to: opts.assignedTo,
      page: opts.page,
      limit: opts.limit,
    },
  });
}

export interface GetOpportunityResult {
  opportunity: Opportunity;
}

export function getOpportunity(id: string): Promise<GetOpportunityResult> {
  return ghlRequest<GetOpportunityResult>({
    method: "GET",
    path: `/opportunities/${encodeURIComponent(id)}`,
    resource: "opportunities",
  });
}

export function moveOpportunityStage(id: string, pipelineStageId: string): Promise<GetOpportunityResult> {
  return ghlRequest<GetOpportunityResult>({
    method: "PUT",
    path: `/opportunities/${encodeURIComponent(id)}`,
    resource: "opportunities",
    body: { pipelineStageId },
  });
}
