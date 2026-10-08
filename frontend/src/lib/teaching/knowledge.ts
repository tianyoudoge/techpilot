/** 把资产转换为讲题上下文，按依赖顺序整理前置知识。这里不调用模型。 */
import type { Knowledge } from "../types";
import type { KnowledgeAssetRaw, TaxonomyEntry } from "../assets/types";
import { hasKnowledgeAsset } from "../assets";

export function taxonomyPromptText(taxonomy: TaxonomyEntry[]): string {
  const chapters = [...new Set(taxonomy.map((t) => t.chapterId))];
  return chapters
    .map((ch) => {
      const entries = taxonomy.filter((t) => t.chapterId === ch);
      if (!entries.length) return "";
      return (
        `章节 ${ch}:\n` +
        entries
          .map((t) => `  - ${t.id}: ${t.name}（${t.description}）`)
          .join("\n")
      );
    })
    .filter(Boolean)
    .join("\n");
}

function isValidKnowledgePointID(
  id: string,
  taxonomy: TaxonomyEntry[],
): boolean {
  return taxonomy.some((t) => t.id === id);
}

export function filterValidIDs(
  ids: string[],
  taxonomy: TaxonomyEntry[],
): string[] {
  return ids.filter((id) => isValidKnowledgePointID(id, taxonomy));
}

function safeParseArray<T>(s: string | undefined): T[] {
  try {
    const a = JSON.parse(s || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function assetToKnowledge(a: KnowledgeAssetRaw): Knowledge {
  return {
    id: a.id,
    name: a.name,
    chapterId: a.chapterId,
    definition: a.definition,
    explanation: a.explanation,
    workedExample: a.workedExample,
    prerequisites: safeParseArray<string>(a.prerequisites),
    commonMistakes: safeParseArray<string>(a.commonMistakes),
    sourceReferences: safeParseArray<{
      title: string;
      url: string;
      scope: string;
    }>(a.sourceReferences),
  };
}

export function collectKnowledgeChain(
  ids: string[],
  assetMap: Map<string, KnowledgeAssetRaw>,
): { main: Knowledge[]; prerequisites: Knowledge[]; missing: string[] } {
  const main: Knowledge[] = [];
  const prerequisites: Knowledge[] = [];
  const missing: string[] = [];
  const visited = new Set<string>();
  const mainSet = new Set(ids);

  function visit(id: string, depth: number) {
    // 先递归基础知识，再加入当前知识点；visited 和深度限制防止依赖循环。
    if (depth > 20 || visited.has(id)) return;
    visited.add(id);
    const raw = assetMap.get(id);
    if (raw)
      for (const dep of safeParseArray<string>(raw.prerequisites))
        visit(dep, depth + 1);
    if (!raw || !hasKnowledgeAsset(raw)) {
      missing.push(id);
      if (raw) {
        const k = assetToKnowledge(raw);
        if (mainSet.has(id)) main.push(k);
        else prerequisites.push(k);
      }
      return;
    }
    const k = assetToKnowledge(raw);
    if (mainSet.has(id)) main.push(k);
    else prerequisites.push(k);
  }
  for (const id of ids) visit(id, 0);
  return { main, prerequisites, missing };
}
