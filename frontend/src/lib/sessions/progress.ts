/** 笔记的状态规则与页面数据转换。只处理普通对象，不发请求、不读写数据库。 */
import type { SessionDetail } from "../types";
import type { LocalSessionState } from "./types";

export function resetLocalRound(s: LocalSessionState) {
  // 换卡点或讲法时重置本轮讲稿和练习，保留原题与笔记身份。
  s.guide = undefined;
  s.stepsCompleted = 0;
  s.stepFeedback = {};
  s.teachingCompleted = false;
  s.standardExercise = undefined;
  s.variationExercise = undefined;
  s.verificationResult = "";
  s.variationResult = "";
  s.masteryLevel = "NOT_YET";
  s.status = "ANALYZING";
}

export function computeMastery(s: LocalSessionState): string {
  // 类似题做对是 BASIC；变式也做对才是 SOLID。跳过不等于掌握。
  if (s.verificationResult === "CORRECT") {
    return s.variationResult === "CORRECT" ? "SOLID" : "BASIC";
  }
  if (s.verificationResult === "SKIP" && (s.stepsCompleted ?? 0) > 0)
    return "PARTIAL";
  return "NOT_YET";
}

export function localSessionDetail(
  s: LocalSessionState,
): SessionDetail & { local: true } {
  const analysis = s.analysis;
  const stdEx = s.standardExercise;
  const varEx = s.variationExercise;
  return {
    id: s.id,
    local: true,
    question: {
      id: s.id,
      sessionId: s.id,
      questionText: analysis.questionText,
      imageUrl: s.imageDataUrl || "",
      chapterId: analysis.chapterId,
      knowledgePointIds: JSON.stringify(analysis.knowledgePointIds),
      keyInsight: analysis.keyInsight,
      fullSolution: analysis.fullSolution,
      analysisResult: JSON.stringify(analysis),
      difficulty: analysis.difficulty,
    },
    guide: s.guide ?? undefined,
    status: s.status ?? "ANALYZING",
    stickingPointId: s.stickingPointId ?? "",
    teachMethod: s.method ?? "standard",
    stepsCompleted: s.stepsCompleted ?? 0,
    teachingCompleted: s.teachingCompleted ?? false,
    stepFeedback: s.stepFeedback ?? {},
    childAnswerAnalysis: s.childAnswerAnalysis ?? "",
    verificationResult: s.verificationResult ?? "",
    variationResult: s.variationResult ?? "",
    verificationAudience: s.verificationAudience ?? "child",
    standardExerciseId: stdEx ? stdEx.id : 0,
    variationExerciseId: varEx ? varEx.id : 0,
    masteryLevel: s.masteryLevel ?? "NOT_YET",
    createdAt: s.createdAt,
    updatedAt: s.updatedAt ?? s.createdAt,
  };
}
