/** 讲题页面的状态与动作。Vue composable 就是一个使用 ref/watch 的普通函数。 */
import { computed, ref, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  api,
  post,
  upload,
  token,
  requireLogin,
  safeObject,
  safeArray,
  tell,
  legacyServerMode,
} from "../lib/api";
import { generateGuide } from "../lib/teaching/guide";
import { generateExercise } from "../lib/teaching/exercises";
import { analyzeChildAnswer } from "../lib/teaching/analysis";
import { readLocalSession, saveLocalSession } from "../lib/sessions/storage";
import {
  computeMastery,
  localSessionDetail,
  resetLocalRound,
} from "../lib/sessions/progress";
import type { LocalSessionState } from "../lib/sessions/types";
import { getVideoSegments } from "../lib/api-client";
import type {
  SessionDetail,
  Segment,
  Exercise,
  Mastery,
  StickingPoint,
} from "../lib/types";

export function useTeachingSession() {
  const route = useRoute();
  const router = useRouter();
  const detail = ref<SessionDetail>();
  const segments = ref<Segment[]>([]);
  const segmentError = ref("");
  const exercise = ref<Exercise>();
  const mastery = ref<Mastery>();
  const loading = ref(false);
  const working = ref("");
  const error = ref("");
  const answerOpen = ref(false);
  const hint = ref("");
  const method = ref("standard");
  const audience = ref<"child" | "parent">("child");
  const childPhoto = ref<HTMLInputElement>();
  const exerciseKind = ref<"standard" | "variation">("standard");
  // 每次加载递增版本号；旧请求晚返回时不能覆盖新页面的数据。
  let version = 0;
  const stage = computed(() => String(route.params.stage || "insight"));
  const id = computed(() => String(route.params.id));
  const guide = computed(() => detail.value?.guide);
  const step = computed(
    () => guide.value?.steps[detail.value?.stepsCompleted || 0],
  );
  const points = computed(
    () =>
      safeObject<{ possibleStickingPoints: StickingPoint[] }>(
        detail.value?.question.analysisResult,
      )?.possibleStickingPoints || [],
  );
  const childAnalysis = computed(() =>
    safeObject<{
      masteredSteps: string[];
      errorAt: string;
      recommendation: string;
    }>(detail.value?.childAnswerAnalysis),
  );
  const answerSteps = computed(() =>
    safeArray<string>(exercise.value?.solutionSteps),
  );
  const showMobileAction = computed(
    () =>
      (isLocalSession() || !!token.value) &&
      !loading.value &&
      !!detail.value &&
      (stage.value === "insight" ||
        (stage.value === "lesson" &&
          !!guide.value &&
          detail.value.status !== "DONE")),
  );
  const level = computed(
    () =>
      mastery.value?.masteryLevel || detail.value?.masteryLevel || "NOT_YET",
  );
  const resultLabel = computed(
    () =>
      mastery.value?.masteryLabel ||
      (detail.value?.verificationAudience === "parent"
        ? {
            SOLID: "你对这个知识点的理解比较稳",
            BASIC: "你基本理解了这个知识点",
            PARTIAL: "看过讲稿，下次再试一道",
            NOT_YET: "再回顾一下，慢慢来",
          }
        : {
            SOLID: "这部分讲得比较稳了",
            BASIC: "这部分基本讲会了",
            PARTIAL: "有点进步，再试一次",
            NOT_YET: "找到了卡点，下次从这里开始",
          })[level.value as "SOLID"],
  );
  const sequence = [
    { key: "insight", label: "看懂题目" },
    { key: "lesson", label: "先把你讲会" },
    { key: "teaching", label: "讲给孩子" },
    { key: "exercise", label: "试一道" },
  ];
  function goto(target: string) {
    router.push(`/session/${id.value}/${target}`);
  }
  async function refresh() {
    if (isLocalSession()) return; // local sessions are immutable from the server side
    detail.value = await api<SessionDetail>(`/sessions/${id.value}`);
    if (detail.value.standardExerciseId || detail.value.variationExerciseId)
      audience.value = detail.value.verificationAudience;
  }

  function isLocalSession(): boolean {
    return String(id.value).startsWith("local:");
  }

  async function getLocalState(): Promise<LocalSessionState | null> {
    return readLocalSession(id.value);
  }

  // 路由切换时恢复笔记；本地模式是主流程，旧服务端笔记只走兼容分支。
  async function load() {
    const current = ++version;
    error.value = "";
    hint.value = "";
    segments.value = [];
    exercise.value = undefined;
    if (isLocalSession()) {
      loading.value = true;
      let s: LocalSessionState | null;
      try {
        s = await getLocalState();
      } catch (e) {
        error.value = (e as Error).message;
        loading.value = false;
        return;
      }
      if (current !== version) return;
      if (!s) {
        error.value = "本地会话已过期，请重新拍题";
        loading.value = false;
        return;
      }
      detail.value = localSessionDetail(s);
      method.value = s.method ?? "standard";
      if (s.verificationAudience) audience.value = s.verificationAudience;
      if (stage.value === "lesson" && !s.guide) {
        working.value = "正在用你的模型生成讲稿";
        try {
          const g = await generateGuide(
            s.analysis,
            (s.method ?? "standard") as "standard" | "simple" | "visual",
            s.stickingPointId,
          );
          if (current !== version) return;
          s.guide = g;
          await saveLocalSession(s);
          detail.value!.guide = g;
        } catch (e) {
          if (current === version) error.value = (e as Error).message;
        } finally {
          working.value = "";
        }
      }
      if (stage.value === "exercise" && s.teachingCompleted) {
        const kind: "standard" | "variation" =
          (s.verificationResult === "CORRECT" && !s.variationResult) ||
          s.variationResult
            ? "variation"
            : "standard";
        exerciseKind.value = kind;
        const cached =
          kind === "variation" ? s.variationExercise : s.standardExercise;
        if (cached) {
          exercise.value = {
            ...cached,
            solutionSteps: cached.solutionSteps,
          } as Exercise;
        } else {
          working.value = "正在准备一道新题";
          try {
            const e = await generateExercise(
              s.analysis,
              kind,
              s.verificationAudience ?? "child",
              kind === "variation" ? s.standardExercise : undefined,
            );
            if (current !== version) return;
            if (kind === "variation") s.variationExercise = e;
            else s.standardExercise = e;
            await saveLocalSession(s);
            detail.value = localSessionDetail(s);
            exercise.value = {
              ...e,
              solutionSteps: e.solutionSteps,
            } as Exercise;
            answerOpen.value = false;
          } catch (e) {
            if (current === version) error.value = (e as Error).message;
          } finally {
            working.value = "";
          }
        }
      }
      if (stage.value === "lesson" && current === version)
        await loadSegments(current);
      if (current === version) loading.value = false;
      return;
    }
    if (!legacyServerMode()) {
      error.value =
        "这是旧版服务端笔记，请开启兼容模式查看，或返回首页开始新的本地讲题";
      detail.value = undefined;
      loading.value = false;
      working.value = "";
      return;
    }
    if (!requireLogin()) {
      detail.value = undefined;
      exercise.value = undefined;
      segments.value = [];
      loading.value = false;
      working.value = "";
      return;
    }
    loading.value = true;
    error.value = "";
    hint.value = "";
    try {
      const data = await api<SessionDetail>(`/sessions/${id.value}`);
      if (current !== version) return;
      detail.value = data;
      method.value = data.guide?.method || "standard";
      if (data.standardExerciseId || data.variationExerciseId)
        audience.value = data.verificationAudience;
      localStorage.setItem("jianghui-last-session", String(id.value));
      if (stage.value === "lesson" && !data.guide) {
        working.value = "正在准备你的讲会笔记";
        const g = await api<NonNullable<SessionDetail["guide"]>>(
          `/sessions/${id.value}/teaching-guide?method=${method.value}`,
        );
        if (current !== version) return;
        detail.value.guide = g;
      }
      if (stage.value === "lesson") {
        await loadSegments(current);
      }
      if (stage.value === "exercise" && data.teachingCompleted) {
        exerciseKind.value =
          data.status === "DONE" &&
          data.verificationResult === "CORRECT" &&
          !data.variationResult
            ? "variation"
            : data.variationResult
              ? "variation"
              : "standard";
        working.value = "正在准备一道新题";
        const e = await api<Exercise>(
          `/sessions/${id.value}/exercise?type=${exerciseKind.value}&audience=${audience.value}`,
        );
        if (current !== version) return;
        exercise.value = e;
        answerOpen.value = false;
      }
    } catch (e) {
      if (current === version) error.value = (e as Error).message;
    } finally {
      if (current === version) {
        loading.value = false;
        working.value = "";
      }
    }
  }
  async function loadSegments(current?: number) {
    segmentError.value = "";
    if (detail.value?.status === "DONE") {
      segments.value = [];
      return;
    }
    try {
      let out: { segments: Segment[] };
      if (isLocalSession()) {
        const ids = safeArray<string>(detail.value?.question.knowledgePointIds);
        const rows = await Promise.all(
          ids.map((knowledgePoint) =>
            getVideoSegments({ knowledgePoint, limit: 3 }),
          ),
        );
        const unique = [
          ...new Map(rows.flat().map((row) => [row.id, row])).values(),
        ];
        out = {
          segments: unique.slice(0, 6).map((row) => ({
            segmentId: row.id,
            teacherName: "老师讲解",
            title: row.video.title,
            startTime: row.startTime,
            endTime: row.endTime,
            durationSeconds: row.endTime - row.startTime,
            platformUrl: `https://www.bilibili.com/video/${row.video.bvid}/?p=${row.video.page || 1}&t=${row.startTime}`,
            goodFor: row.goodFor,
            style: row.style,
          })),
        };
      } else
        out = await post<{ segments: Segment[] }>(
          `/sessions/${id.value}/segments/recommend`,
        );
      if (current === undefined || current === version)
        segments.value = out.segments;
    } catch (e) {
      segments.value = [];
      segmentError.value = (e as Error).message;
    }
  }
  watch(
    [() => route.params.id, () => route.params.stage, () => token.value],
    load,
    {
      immediate: true,
    },
  );
  onUnmounted(() => version++);
  // 统一控制按钮忙碌状态和错误显示，避免重复点击触发并发操作。
  async function run(label: string, fn: () => Promise<void>) {
    if (working.value) return;
    working.value = label;
    error.value = "";
    try {
      await fn();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      working.value = "";
    }
  }
  async function choosePoint(point: string) {
    await run("保存卡点", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        s.stickingPointId = point;
        resetLocalRound(s);
        exercise.value = undefined;
        mastery.value = undefined;
        await saveLocalSession(s);
        detail.value = localSessionDetail(s);
        hint.value = "";
        return;
      }
      detail.value = await post<SessionDetail>(
        `/sessions/${id.value}/sticking-point`,
        { stickingPointId: point },
      );
      hint.value = "";
    });
  }
  async function changeMethod(value: string) {
    await run("正在换个讲法", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        const g = await generateGuide(
          s.analysis,
          value as "standard" | "simple" | "visual",
          s.stickingPointId,
        );
        resetLocalRound(s);
        exercise.value = undefined;
        mastery.value = undefined;
        s.method = value;
        s.guide = g;
        await saveLocalSession(s);
        method.value = value;
        detail.value!.guide = g;
        return;
      }
      const g = await api<NonNullable<SessionDetail["guide"]>>(
        `/sessions/${id.value}/teaching-guide?method=${value}`,
      );
      await refresh();
      detail.value!.guide = g;
      method.value = value;
    });
  }
  async function feedback(result: string) {
    if (!step.value) return;
    await run("保存这一步", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        const steps = s.guide?.steps ?? [];
        const stepNo = step.value!.stepNo;
        if (!s.stepFeedback) s.stepFeedback = {};
        s.stepFeedback[stepNo] = result;
        if (
          result !== "CANNOT_ANSWER" &&
          stepNo === (s.stepsCompleted ?? 0) + 1
        ) {
          s.stepsCompleted = stepNo;
        }
        if (s.stepsCompleted === steps.length) s.teachingCompleted = true;
        await saveLocalSession(s);
        detail.value = localSessionDetail(s);
        hint.value =
          result === "CANNOT_ANSWER" ? (step.value!.ifWrong ?? "") : "";
        if (s.teachingCompleted) goto("exercise");
        return;
      }
      const out = await post<{ nextStepNo: number; branchPrompt: string }>(
        `/sessions/${id.value}/steps/${step.value!.stepNo}/feedback`,
        { result },
      );
      hint.value = out.branchPrompt || "";
      await refresh();
      if (!out.nextStepNo) goto("exercise");
    });
  }
  async function startExercise(target: "child" | "parent") {
    await run("准备试一题", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        s.teachingCompleted = true;
        if (s.verificationAudience && s.verificationAudience !== target) {
          s.standardExercise = undefined;
          s.variationExercise = undefined;
          s.verificationResult = "";
          s.variationResult = "";
          s.masteryLevel = "NOT_YET";
          s.status = "TEACHING";
        }
        s.verificationAudience = target;
        audience.value = target;
        exerciseKind.value = "standard";
        if (!s.standardExercise) {
          working.value = "正在准备一道新题";
          s.standardExercise = await generateExercise(
            s.analysis,
            "standard",
            target,
          );
        }
        await saveLocalSession(s);
        detail.value = localSessionDetail(s);
        exercise.value = {
          ...s.standardExercise,
          solutionSteps: s.standardExercise.solutionSteps,
        } as Exercise;
        goto("exercise");
        return;
      }
      audience.value = target;
      const value = await post<SessionDetail>(
        `/sessions/${id.value}/teaching-complete`,
      );
      detail.value = value;
      exerciseKind.value = "standard";
      exercise.value = await api<Exercise>(
        `/sessions/${id.value}/exercise?type=standard&audience=${target}`,
      );
      goto("exercise");
    });
  }
  async function submit(result: string) {
    if (!exercise.value) return;
    await run("保存结果", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        const isVariation = exerciseKind.value === "variation";
        if (isVariation) {
          s.variationResult = result;
        } else {
          s.verificationResult = result;
        }
        s.masteryLevel = computeMastery(s);
        s.status = "DONE";
        const labels: Record<string, string> =
          s.verificationAudience === "parent"
            ? {
                NOT_YET: "这个知识点还需要再理解一下",
                PARTIAL: "讲稿已看完，还没有验证理解",
                BASIC: "你基本理解了这个知识点",
                SOLID: "你对这个知识点的理解比较稳",
              }
            : {
                NOT_YET: "还不会",
                PARTIAL: "有点会了",
                BASIC: "这部分基本讲会了",
                SOLID: "这部分比较稳",
              };
        mastery.value = {
          masteryLevel: s.masteryLevel,
          masteryLabel: labels[s.masteryLevel] ?? "",
          masteredPoints:
            s.masteryLevel === "BASIC" || s.masteryLevel === "SOLID"
              ? [s.analysis.knowledgePointIds[0] ?? ""]
              : [],
          tip:
            result === "SKIP"
              ? "本次未完成这道验证题，暂不能据此确认掌握情况"
              : s.masteryLevel === "SOLID" || s.masteryLevel === "BASIC"
                ? "隔一段时间再独立做一道类似题，看看是否还能做出来"
                : "下次可以先回顾卡住的那一步，再试一道类似题",
          status: "DONE",
        };
        await saveLocalSession(s);
        detail.value = localSessionDetail(s);
        goto("result");
        return;
      }
      mastery.value = await post<Mastery>(
        `/sessions/${id.value}/exercise/${exercise.value!.id}/result`,
        { result },
      );
      await refresh();
      goto("result");
    });
  }
  async function analyzeChild(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      tell("请选择孩子作答的照片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      tell("照片超过10MB，请压缩后再上传");
      return;
    }
    await run("看看孩子写到了哪一步", async () => {
      if (isLocalSession()) {
        const s = await getLocalState();
        if (!s) throw new Error("本地会话已过期，请重新拍题");
        const result = await analyzeChildAnswer(file, s.analysis);
        s.childAnswerAnalysis = JSON.stringify(result);
        await saveLocalSession(s);
        detail.value = localSessionDetail(s);
        return;
      }
      await upload(`/sessions/${id.value}/child-answer`, file);
      await refresh();
    });
  }
  function recordClick(segment: Segment) {
    if (isLocalSession()) {
      void getLocalState()
        .then(async (s) => {
          if (s) {
            s.clickedSegmentIds = [
              ...new Set([...(s.clickedSegmentIds ?? []), segment.segmentId]),
            ];
            await saveLocalSession(s);
          }
        })
        .catch((e) => tell((e as Error).message));
      return;
    }
    post(`/sessions/${id.value}/segments/${segment.segmentId}/click`).catch(
      () => {},
    );
  }
  function goVariation() {
    exerciseKind.value = "variation";
    goto("exercise");
  }

  return {
    detail,
    segments,
    segmentError,
    exercise,
    mastery,
    loading,
    working,
    error,
    answerOpen,
    hint,
    method,
    audience,
    childPhoto,
    exerciseKind,
    stage,
    guide,
    step,
    points,
    childAnalysis,
    answerSteps,
    showMobileAction,
    level,
    resultLabel,
    sequence,
    goto,
    isLocalSession,
    load,
    loadSegments,
    choosePoint,
    changeMethod,
    feedback,
    startExercise,
    submit,
    analyzeChild,
    recordClick,
    goVariation,
  };
}
