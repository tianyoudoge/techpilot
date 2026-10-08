/** 家长讲稿：补齐知识资产 → 复用讲法模板 → 组装上下文 → 生成并检查讲稿。 */
import { localConfig } from "../model-config";
import { ApiError } from "../api";
import type { Question, Guide, Knowledge } from "../types";
import type { AnalysisOutput } from "./types";
import { getVideoSegments } from "../api-client";
import { loadAssetBundle as loadKnowledgeData } from "../assets";
import { collectKnowledgeChain } from "./knowledge";
import { ensureKnowledge, ensureTemplate } from "./asset-generators";
import { enqueue, llmCall, extractJSON } from "../model/client";
import { GUIDE_PROMPT } from "../model/prompts";

interface GuidePayload {
  question: Partial<Question>;
  stickingPointId?: string;
  method: string;
  context: {
    knowledge: Knowledge[];
    prerequisites: Knowledge[];
    missingKnowledgeIds: string[];
    hasTeacherEvidence: boolean;
    teacherFragments?: {
      segmentId: number;
      sourceUrl: string;
      startTime: number;
      endTime: number;
      transcript: string;
    }[];
  };
  requiredPrerequisiteIds: string[];
}

export async function generateGuide(
  analysis: AnalysisOutput,
  method: "standard" | "simple" | "visual",
  stickingPointId?: string,
): Promise<Guide> {
  const cfg = localConfig.value;
  await ensureKnowledge(analysis.knowledgePointIds);
  const data = await loadKnowledgeData();
  const template = await ensureTemplate(analysis.knowledgePointIds[0], method);
  const assetMap = new Map(data.assets.map((a) => [a.id, a]));

  const { main, prerequisites, missing } = collectKnowledgeChain(
    analysis.knowledgePointIds,
    assetMap,
  );

  const prereqIds = prerequisites.map((p) => p.id);

  // Published video material is optional; do not invent teacher evidence if the catalog is unavailable.
  const teacherFragments: NonNullable<
    GuidePayload["context"]["teacherFragments"]
  > = [];
  try {
    const lists = await Promise.all(
      analysis.knowledgePointIds.map((knowledgePoint) =>
        getVideoSegments({ knowledgePoint, limit: 2 }),
      ),
    );
    const unique = [
      ...new Map(lists.flat().map((row) => [row.id, row])).values(),
    ];
    for (const row of unique
      .filter((row) => row.transcript?.trim())
      .slice(0, 3))
      teacherFragments.push({
        segmentId: row.id,
        sourceUrl: `https://www.bilibili.com/video/${row.video.bvid}/?p=${row.video.page || 1}&t=${row.startTime}`,
        startTime: row.startTime,
        endTime: row.endTime,
        transcript: row.transcript.slice(0, 8000),
      });
  } catch {
    /* The knowledge assets still support a guide without video evidence. */
  }

  const payload: GuidePayload = {
    question: {
      questionText: analysis.questionText,
      chapterId: analysis.chapterId,
      knowledgePointIds: JSON.stringify(analysis.knowledgePointIds),
      keyInsight: analysis.keyInsight,
      fullSolution: analysis.fullSolution,
    },
    stickingPointId,
    method,
    context: {
      knowledge: main,
      prerequisites,
      missingKnowledgeIds: missing,
      hasTeacherEvidence: teacherFragments.length > 0,
      teacherFragments,
    },
    requiredPrerequisiteIds: prereqIds,
  };

  const systemPrompt =
    GUIDE_PROMPT +
    `\n下面是通用讲法模板，请结合原题调整，不能照抄模板例题为原题解法：${JSON.stringify(template.content)}` +
    `\nprerequisiteLessons 的知识点ID必须严格等于这个完整列表：${JSON.stringify(prereqIds)}。` +
    `若列表为空，prerequisiteLessons必须是空数组。`;

  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
      cfg.modelText,
      6500,
      120000,
    ),
  );

  const parsed = JSON.parse(extractJSON(raw));
  const fields = ["title", "question", "ifCorrect", "ifWrong"] as const;
  if (
    typeof parsed.parentExplanation !== "string" ||
    !parsed.parentExplanation.trim() ||
    typeof parsed.problemWalkthrough !== "string" ||
    !parsed.problemWalkthrough.trim() ||
    !Array.isArray(parsed.steps) ||
    parsed.steps.length < 3 ||
    parsed.steps.length > 8 ||
    parsed.steps.some(
      (step: Record<string, unknown>, i: number) =>
        step.stepNo !== i + 1 ||
        fields.some(
          (f) => typeof step[f] !== "string" || !(step[f] as string).trim(),
        ),
    )
  )
    throw new ApiError("讲稿步骤不完整，请重试", 0);
  if (
    !Array.isArray(parsed.prerequisiteLessons) ||
    parsed.prerequisiteLessons.length !== prereqIds.length ||
    prereqIds.some(
      (id) =>
        parsed.prerequisiteLessons.filter(
          (p: { knowledgePointId: string; explanation: string }) =>
            p.knowledgePointId === id &&
            typeof p.explanation === "string" &&
            p.explanation.trim(),
        ).length !== 1,
    )
  )
    throw new ApiError("讲稿前置知识不完整，请重试", 0);
  return {
    method,
    source: "local-generated",
    presentationVersion: "parent-friendly-v1",
    parentExplanation: parsed.parentExplanation ?? "",
    prerequisiteLessons: parsed.prerequisiteLessons ?? [],
    problemWalkthrough: parsed.problemWalkthrough ?? "",
    steps: parsed.steps ?? [],
    context: {
      knowledge: main,
      prerequisites,
      segments: teacherFragments.map(({ transcript, ...source }) => source),
      missingKnowledgeIds: missing,
      hasTeacherEvidence: teacherFragments.length > 0,
    },
  };
}
