/** 资产模块的稳定入口：读取和同步的内部状态彼此独立。 */
export {
  loadAssetBundle,
  invalidateAssets,
  hasKnowledgeAsset,
} from "./assets/bundle";
export {
  rememberAsset,
  flushAssetOutbox,
  startAssetSync,
  assetSync,
} from "./assets/sync";
export type {
  AssetContent,
  AssetSubmission,
  SharedAsset,
  KnowledgeData,
} from "./assets/types";
