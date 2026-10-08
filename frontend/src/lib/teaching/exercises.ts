/** 验证题：先找匹配的共享资产，找不到才生成；必须通过独立复核。 */
import { localConfig } from "../model-config";
import { ApiError } from "../api";
import { serviceBase } from "../platform";
import {
  loadAssetBundle as loadKnowledgeData,
  rememberAsset,
  type SharedAsset,
} from "../assets";
import { collectKnowledgeChain } from "./knowledge";
import { ensureKnowledge } from "./asset-generators";
import { enqueue, llmCall, extractJSON } from "../model/client";
import { EXERCISE_PROMPT, EXERCISE_REVIEW_PROMPT } from "../model/prompts";
import type { AnalysisOutput, LocalExercise } from "./types";

export async function generateExercise(
  analysis: AnalysisOutput,
  kind: "standard" | "variation",
  audience: "child" | "parent",
  previousExercise?: LocalExercise,
): Promise<LocalExercise> {
  const server = serviceBase();
  const bundle = await loadKnowledgeData();
  const point = bundle.assets.find(
    (a) => a.id === analysis.knowledgePointIds[0],
  );
  if (!point) throw new ApiError("知识点不在当前目录中", 0);
  const previousContent = previousExercise?.content?.trim();
  const suitable = bundle.sharedAssets.find(
    (a) =>
      a.kind === kind &&
      a.knowledgePointId === point.id &&
      a.grade === point.grade &&
      a.chapterId === point.chapterId &&
      a.audience === audience &&
      a.difficulty === analysis.difficulty &&
      a.review.correct === true &&
      a.content.content?.trim() &&
      a.content.answer?.trim() &&
      Array.isArray(a.content.solutionSteps) &&
      a.content.solutionSteps.every((s) => typeof s === "string" && s.trim()) &&
      a.content.solutionSteps.length &&
      a.content.content.trim() !== previousContent &&
      (kind !== "variation" || !!a.content.variationReason?.trim()),
  );
  if (suitable) return exerciseFromAsset(suitable);
  const cfg = localConfig.value;
  await ensureKnowledge(analysis.knowledgePointIds);
  const data = await loadKnowledgeData();
  const assetMap = new Map(data.assets.map((a) => [a.id, a]));
  const { main, prerequisites } = collectKnowledgeChain(
    analysis.knowledgePointIds,
    assetMap,
  );

  const knowledgePointId = analysis.knowledgePointIds[0] ?? "";
  const context = { knowledge: main, prerequisites };

  const payload = JSON.stringify({
    knowledgePointId,
    exerciseType: kind,
    audience,
    context,
    difficulty: analysis.difficulty,
    previousContent: previousExercise?.content ?? null,
  });

  const prompt = EXERCISE_PROMPT;

  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: prompt },
        { role: "user", content: payload },
      ],
      cfg.modelText,
      null,
      90000,
    ),
  );

  const generated = JSON.parse(extractJSON(raw));
  if (
    typeof generated.content !== "string" ||
    !generated.content.trim() ||
    generated.content.trim() === previousContent ||
    typeof generated.answer !== "string" ||
    !generated.answer.trim() ||
    !Array.isArray(generated.solutionSteps) ||
    !generated.solutionSteps.length ||
    generated.solutionSteps.some(
      (s: unknown) => typeof s !== "string" || !s.trim(),
    ) ||
    (kind === "variation" && !generated.variationReason?.trim())
  ) {
    throw new ApiError("题目生成不完整，请重试", 0);
  }

  // 第二次模型调用独立验算；生成成功不代表答案正确，复核通过才保存。
  const reviewPayload = `知识点=${knowledgePointId}，type=${kind}，audience=${audience}\n${JSON.stringify(generated)}`;
  const reviewPrompt = EXERCISE_REVIEW_PROMPT;

  const reviewRaw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: reviewPrompt },
        { role: "user", content: reviewPayload },
      ],
      cfg.modelText,
      null,
      60000,
    ),
  );

  const review = JSON.parse(extractJSON(reviewRaw));
  if (
    review.correct !== true ||
    !review.reason?.trim() ||
    !review.independentAnswer?.trim()
  ) {
    throw new ApiError(`题目复核未通过：${review.reason || "请重试"}`, 0);
  }

  const asset = await rememberAsset(
    {
      schemaVersion: 1,
      kind,
      knowledgePointId: point.id,
      grade: point.grade,
      chapterId: point.chapterId,
      difficulty: analysis.difficulty,
      audience,
      generatorModel: cfg.modelText,
      promptVersion: "exercise-v1",
      content: {
        content: generated.content,
        answer: generated.answer,
        solutionSteps: generated.solutionSteps,
        variationReason: generated.variationReason ?? "",
      },
      review,
    },
    server,
  );
  return exerciseFromAsset(asset);
}
function exerciseFromAsset(asset: SharedAsset): LocalExercise {
  return {
    id: -Date.now(),
    content: asset.content.content!,
    answer: asset.content.answer!,
    solutionSteps: JSON.stringify(asset.content.solutionSteps),
    exerciseType: asset.kind as "standard" | "variation",
    audience: asset.audience as "child" | "parent",
    variationReason: asset.content.variationReason ?? "",
  };
}
