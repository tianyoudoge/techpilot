/** 两种看图任务：识别原题、分析孩子的作答。只返回分析结果，不保存笔记。 */
import { localConfig } from "../model-config";
import { ApiError } from "../api";
import { photoDataUrl } from "../platform";
import { loadAssetBundle as loadKnowledgeData } from "../assets";
import { enqueue, llmCall, extractJSON } from "../model/client";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  CHILD_ANSWER_PROMPT,
} from "../model/prompts";
import { taxonomyPromptText, filterValidIDs } from "./knowledge";
import type { AnalysisOutput, ChildAnswerAnalysis } from "./types";

export async function analyzeQuestion(file: File): Promise<AnalysisOutput> {
  const cfg = localConfig.value;
  const data = await loadKnowledgeData();
  const prompt = ANALYSIS_PROMPT_TEMPLATE.replace(
    "%TAXONOMY%",
    taxonomyPromptText(data.taxonomy),
  );
  const dataUrl = await photoDataUrl(file);

  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      cfg.modelVision,
      2000,
    ),
  );

  const parsed = JSON.parse(extractJSON(raw)) as AnalysisOutput;
  parsed.knowledgePointIds = filterValidIDs(
    parsed.knowledgePointIds ?? [],
    data.taxonomy,
  );
  if (
    !parsed.knowledgePointIds.length ||
    !parsed.questionText?.trim() ||
    !parsed.fullSolution?.trim() ||
    !Number.isInteger(parsed.difficulty) ||
    parsed.difficulty < 1 ||
    parsed.difficulty > 5
  )
    throw new ApiError(
      "题目不在当前知识目录中，或识别结果不完整，请重新拍题",
      0,
    );
  parsed.chapterId = data.taxonomy.find(
    (k) => k.id === parsed.knowledgePointIds[0],
  )!.chapterId;
  parsed.possibleStickingPoints = Array.isArray(parsed.possibleStickingPoints)
    ? parsed.possibleStickingPoints
    : [];
  return parsed;
}

export async function analyzeChildAnswer(
  file: File,
  analysis: AnalysisOutput,
): Promise<ChildAnswerAnalysis> {
  const cfg = localConfig.value;
  const dataUrl = await photoDataUrl(file);
  const prompt = CHILD_ANSWER_PROMPT;

  const raw = await enqueue(() =>
    llmCall(
      cfg,
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                prompt +
                "\n" +
                JSON.stringify({
                  questionText: analysis.questionText,
                  fullSolution: analysis.fullSolution,
                }),
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      cfg.modelVision,
      null,
      60000,
    ),
  );

  const out = JSON.parse(extractJSON(raw)) as ChildAnswerAnalysis;
  if (!out.errorAt || !out.recommendation)
    throw new ApiError("孩子作答分析失败，请重试", 0);
  if (!out.masteredSteps) out.masteredSteps = [];
  return out;
}
