/** 识题、练习题与作答分析的返回数据；不包含网络或存储逻辑。 */

export interface AnalysisOutput {
  questionText: string;
  chapterId: string;
  knowledgePointIds: string[];
  problemType: string;
  difficulty: number;
  keyInsight: string;
  possibleStickingPoints: { id: string; description: string }[];
  fullSolution: string;
}

export interface LocalExercise {
  id: number; // local id, negative to avoid collision with server ids
  content: string;
  answer: string;
  solutionSteps: string; // JSON array string
  exerciseType: "standard" | "variation";
  audience: "child" | "parent";
  variationReason: string;
}

export interface ChildAnswerAnalysis {
  masteredSteps: string[];
  errorAt: string;
  recommendation: string;
}
