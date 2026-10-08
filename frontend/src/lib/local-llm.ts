/** 兼容入口：保留原有导入路径，具体实现按职责放进各目录。
 * 新代码可直接导入 teaching、model、sessions 中的对应模块。
 */
export { analyzeQuestion, analyzeChildAnswer } from "./teaching/analysis";
export { generateGuide } from "./teaching/guide";
export { generateExercise } from "./teaching/exercises";
export { cancelModelRequest } from "./model/client";
export {
  readLocalSession,
  listLocalSessions,
  saveLocalSession,
} from "./sessions/storage";
export {
  resetLocalRound,
  computeMastery,
  localSessionDetail,
} from "./sessions/progress";
export {
  loadAssetBundle as loadKnowledgeData,
  invalidateAssets as invalidateKnowledgeCache,
} from "./assets";
export type {
  AnalysisOutput,
  LocalExercise,
  ChildAnswerAnalysis,
} from "./teaching/types";
export type { LocalSessionState } from "./sessions/types";
export type { TaxonomyEntry, KnowledgeAssetRaw } from "./assets/types";
