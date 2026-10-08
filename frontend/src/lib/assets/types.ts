/** 资产的数据形状。interface 只供 TypeScript 检查，运行时不会创建对象。 */
import type { Step } from "../types";

export interface TaxonomyEntry {
  id: string;
  name: string;
  chapterId: string;
  description: string;
}

export interface KnowledgeAssetRaw {
  id: string;
  name: string;
  chapterId: string;
  grade: number;
  description: string;
  definition: string;
  explanation: string;
  workedExample: string;
  prerequisites: string; // JSON array string
  commonMistakes: string;
  sourceReferences: string;
  assetVersion: string;
}

export interface AssetContent {
  steps?: Step[];
  definition?: string;
  explanation?: string;
  workedExample?: string;
  content?: string;
  answer?: string;
  solutionSteps?: string[];
  variationReason?: string;
}
export interface AssetSubmission {
  schemaVersion: 1;
  kind: "knowledge" | "standard" | "variation" | "template";
  method?: "standard" | "simple" | "visual";
  knowledgePointId: string;
  grade: number;
  chapterId: string;
  difficulty: number;
  audience: "" | "child" | "parent";
  generatorModel: string;
  promptVersion: string;
  content: AssetContent;
  review: { correct: boolean; reason: string; independentAnswer: string };
}
export interface SharedAsset extends AssetSubmission {
  id: string;
}
export interface KnowledgeData {
  schemaVersion: number;
  version: string;
  taxonomy: TaxonomyEntry[];
  assets: KnowledgeAssetRaw[];
  sharedAssets: SharedAsset[];
  withdrawnIds: string[];
}
export interface Contribution {
  id: string;
  asset: AssetSubmission;
  server: string;
  attempts: number;
  nextAttempt: number;
}
export interface Receipt {
  id: string;
  localId: string;
  server: string;
  status: string;
}
