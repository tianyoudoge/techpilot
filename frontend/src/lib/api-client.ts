import { api } from "./api";
import type { VideoSegment } from "./types";

export interface CatalogStats {
  totalSegments: number;
  totalVideos: number;
  totalKnowledgePoints: number;
  byKnowledgePoint: Record<string, number>;
}

export interface CatalogKnowledgePoint {
  id: string;
  name: string;
  chapterId: string;
  description?: string;
  grade: number;
}

export function getVideoSegment(id: number): Promise<VideoSegment> {
  return api(`/segments/${id}`);
}

export function getVideoSegments(options: {
  chapter?: string;
  knowledgePoint?: string;
  difficulty?: number;
  limit?: number;
  offset?: number;
  query?: string;
} = {}): Promise<VideoSegment[]> {
  const params = new URLSearchParams();
  if (options.chapter) params.set("chapter", options.chapter);
  if (options.knowledgePoint) params.set("knowledge_point", options.knowledgePoint);
  if (options.difficulty !== undefined) params.set("difficulty", String(options.difficulty));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("q", options.query);
  return api(`/segments?${params}`);
}

export function getSegmentStats(): Promise<CatalogStats> {
  return api("/segments/stats");
}

export function getTaxonomy(): Promise<CatalogKnowledgePoint[]> {
  return api("/taxonomy");
}

export function searchSegments(query: string, limit = 10): Promise<VideoSegment[]> {
  return getVideoSegments({ query, limit });
}

export async function preloadDatabase(): Promise<void> {
  await getSegmentStats();
}
