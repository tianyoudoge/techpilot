/** 一份笔记就是一个普通 JS 对象；可选字段表示这一阶段可能还没完成。 */
import type { Guide } from "../types";
import type { AnalysisOutput, LocalExercise } from "../teaching/types";

export interface LocalSessionState {
  id: number;
  local: true;
  analysis: AnalysisOutput;
  imageDataUrl: string;
  createdAt: string;
  updatedAt?: string;
  clickedSegmentIds?: number[];
  stickingPointId?: string;
  method?: string;
  guide?: Guide;
  stepsCompleted?: number;
  stepFeedback?: Record<number, string>;
  teachingCompleted?: boolean;
  childAnswerAnalysis?: string;
  standardExercise?: LocalExercise;
  variationExercise?: LocalExercise;
  verificationResult?: string;
  variationResult?: string;
  verificationAudience?: "child" | "parent";
  masteryLevel?: string;
  status?: string;
}
