export interface Question {
  id: number;
  sessionId: number;
  questionText: string;
  imageUrl: string;
  chapterId: string;
  knowledgePointIds: string;
  keyInsight: string;
  fullSolution: string;
  analysisResult: string;
  difficulty: number;
}
export interface Step {
  stepNo: number;
  title: string;
  question: string;
  ifCorrect: string;
  ifWrong: string;
}
export interface Knowledge {
  id: string;
  name: string;
  definition: string;
  explanation: string;
  workedExample: string;
  chapterId?: string;
  prerequisites?: string[];
  commonMistakes?: string[];
  sourceReferences: { title: string; url: string; scope: string }[];
}
export interface Guide {
  presentationVersion?: string;
  method: string;
  source: string;
  parentExplanation: string;
  prerequisiteLessons: {
    knowledgePointId: string;
    name: string;
    explanation: string;
  }[];
  problemWalkthrough: string;
  steps: Step[];
  context: {
    knowledge: Knowledge[];
    prerequisites: Knowledge[];
    segments: {
      segmentId: number;
      sourceUrl: string;
      startTime: number;
      endTime: number;
    }[];
    missingKnowledgeIds: string[];
    hasTeacherEvidence: boolean;
  };
}
export interface SessionDetail {
  id: number;
  question: Question;
  guide?: Guide;
  status: string;
  stickingPointId: string;
  teachMethod: string;
  stepsCompleted: number;
  teachingCompleted: boolean;
  stepFeedback: Record<number, string>;
  childAnswerAnalysis: string;
  verificationResult: string;
  variationResult: string;
  verificationAudience: "child" | "parent";
  standardExerciseId: number;
  variationExerciseId: number;
  masteryLevel: string;
  createdAt: string;
  updatedAt: string;
}
export interface Segment {
  segmentId: number;
  teacherName: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  platformUrl: string;
  goodFor: string[];
  style: string[];
}

export interface VideoSegment {
  id: number;
  videoId: number;
  teacherId: number;
  startTime: number;
  endTime: number;
  knowledgePointIds: string[];
  goodFor: string[];
  misconceptions: string[];
  style: string[];
  difficulty: number;
  summary: string;
  transcript: string;
  qualityScore: number;
  status: string;
  video: {
    bvid: string;
    title: string;
    page?: number;
    duration: number;
  };
}
export interface Exercise {
  id: number;
  content: string;
  answer: string;
  solutionSteps: string;
  exerciseType: "standard" | "variation";
  audience: "child" | "parent";
  variationReason: string;
}
export interface Mastery {
  masteryLevel: string;
  masteryLabel: string;
  masteredPoints: string[];
  tip: string;
  status: string;
}
export interface StickingPoint {
  id: string;
  description: string;
}
