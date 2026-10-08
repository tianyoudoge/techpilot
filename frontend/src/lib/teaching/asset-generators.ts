/** 缺失资产的补齐流程：已有资产优先，生成后独立复核，再本地保存并加入回传队列。 */
import { localConfig } from "../model-config";
import { ApiError } from "../api";
import type { Step } from "../types";
import { serviceBase } from "../platform";
import {
  loadAssetBundle as loadKnowledgeData,
  rememberAsset,
  hasKnowledgeAsset,
  type SharedAsset,
} from "../assets";
import { collectKnowledgeChain } from "./knowledge";
import { enqueue, llmCall, extractJSON } from "../model/client";
import {
  KNOWLEDGE_PROMPT,
  KNOWLEDGE_REVIEW_PROMPT,
  TEMPLATE_PROMPT,
  TEMPLATE_REVIEW_PROMPT,
} from "../model/prompts";

const knowledgeRequests = new Map<string, Promise<void>>();
export async function ensureKnowledge(ids: string[]): Promise<void> {
  const initial = await loadKnowledgeData();
  const chain = collectKnowledgeChain(
    ids,
    new Map(initial.assets.map((a) => [a.id, a])),
  );
  for (const id of chain.missing) {
    const key = `${serviceBase()}:${id}`;
    if (!knowledgeRequests.has(key))
      knowledgeRequests.set(
        key,
        generateKnowledgeAsset(id).finally(() => knowledgeRequests.delete(key)),
      );
    await knowledgeRequests.get(key);
  }
}
async function generateKnowledgeAsset(id: string): Promise<void> {
  const server = serviceBase();
  const data = await loadKnowledgeData();
  const base = data.assets.find((a) => a.id === id);
  if (!base) throw new ApiError("知识点不在服务端目录中", 0);
  if (hasKnowledgeAsset(base)) return;
  const cfg = { ...localConfig.value };
  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: KNOWLEDGE_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            knowledgePointId: id,
            name: base.name,
            grade: base.grade,
            chapterId: base.chapterId,
            definition: base.definition,
            explanation: base.explanation,
            workedExample: base.workedExample,
          }),
        },
      ],
      cfg.modelText,
      4500,
    ),
  );
  const generated = JSON.parse(extractJSON(raw));
  const content = {
    definition: base.definition?.trim()
      ? base.definition
      : generated.definition,
    explanation: base.explanation?.trim()
      ? base.explanation
      : generated.explanation,
    workedExample: base.workedExample?.trim()
      ? base.workedExample
      : generated.workedExample,
  };
  if (!Object.values(content).every((v) => typeof v === "string" && v.trim()))
    throw new ApiError("知识资产生成不完整，请重试", 0);
  const reviewRaw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: KNOWLEDGE_REVIEW_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            knowledgePointId: id,
            grade: base.grade,
            name: base.name,
            content,
          }),
        },
      ],
      cfg.modelText,
      2500,
    ),
  );
  const review = JSON.parse(extractJSON(reviewRaw));
  if (
    review.correct !== true ||
    !review.reason?.trim() ||
    !review.independentAnswer?.trim()
  )
    throw new ApiError("知识例题复核未通过，请重试", 0);
  await rememberAsset(
    {
      schemaVersion: 1,
      kind: "knowledge",
      knowledgePointId: id,
      grade: base.grade,
      chapterId: base.chapterId,
      difficulty: 0,
      audience: "",
      generatorModel: cfg.modelText,
      promptVersion: "knowledge-v1",
      content,
      review,
    },
    server,
  );
}

function validSteps(steps: unknown): steps is Step[] {
  return (
    Array.isArray(steps) &&
    steps.length >= 3 &&
    steps.length <= 8 &&
    steps.every(
      (s, i) =>
        s &&
        s.stepNo === i + 1 &&
        [s.title, s.question, s.ifCorrect, s.ifWrong].every(
          (v) => typeof v === "string" && v.trim(),
        ),
    )
  );
}
export async function ensureTemplate(
  id: string,
  method: "standard" | "simple" | "visual",
): Promise<SharedAsset> {
  const server = serviceBase();
  const data = await loadKnowledgeData();
  const point = data.assets.find((a) => a.id === id);
  if (!point) throw new ApiError("知识点不在目录中", 0);
  const existing = data.sharedAssets.find(
    (a) =>
      a.kind === "template" &&
      a.knowledgePointId === id &&
      a.grade === point.grade &&
      a.method === method &&
      a.review.correct === true &&
      a.content.explanation?.trim() &&
      validSteps(a.content.steps),
  );
  if (existing) return existing;
  const cfg = { ...localConfig.value };
  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: TEMPLATE_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            knowledgePointId: id,
            grade: point.grade,
            method,
            definition: point.definition,
            explanation: point.explanation,
            workedExample: point.workedExample,
          }),
        },
      ],
      cfg.modelText,
      4500,
    ),
  );
  const generated = JSON.parse(extractJSON(raw));
  if (
    typeof generated.explanation !== "string" ||
    !generated.explanation.trim() ||
    !validSteps(generated.steps)
  )
    throw new ApiError("讲法模板不完整，请重试", 0);
  const reviewRaw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: TEMPLATE_REVIEW_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            knowledgePointId: id,
            grade: point.grade,
            method,
            content: generated,
          }),
        },
      ],
      cfg.modelText,
      2000,
    ),
  );
  const review = JSON.parse(extractJSON(reviewRaw));
  if (
    review.correct !== true ||
    !review.reason?.trim() ||
    !review.independentAnswer?.trim()
  )
    throw new ApiError("讲法模板复核未通过，请重试", 0);
  return rememberAsset(
    {
      schemaVersion: 1,
      kind: "template",
      method,
      knowledgePointId: id,
      grade: point.grade,
      chapterId: point.chapterId,
      difficulty: 0,
      audience: "",
      generatorModel: cfg.modelText,
      promptVersion: "template-v1",
      content: { explanation: generated.explanation, steps: generated.steps },
      review,
    },
    server,
  );
}
