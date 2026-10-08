<script setup lang="ts">
// 页面只负责展示；状态、路由响应和保存操作在 useTeachingSession 中。
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Play,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  ImagePlus,
  ExternalLink,
  PenLine,
  HelpCircle,
} from "lucide-vue-next";
import QuestionPhoto from "../components/QuestionPhoto.vue";
import RichText from "../components/RichText.vue";
import KnowledgeLesson from "../components/KnowledgeLesson.vue";
import LoadingState from "../components/LoadingState.vue";
import { token, chapterNames, safeUrl, timeLabel } from "../lib/api";
import { choosePhoto } from "../lib/platform";
import { cancelModelRequest } from "../lib/model/client";
import { useTeachingSession } from "../composables/useTeachingSession";
const {
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
} = useTeachingSession();
</script>
<template>
  <div
    class="flow-page session-page"
    :class="{ 'has-mobile-actions': showMobileAction }"
  >
    <div class="flow-top">
      <RouterLink to="/" class="back-link"
        ><ArrowLeft :size="17" />回到首页</RouterLink
      ><span class="small muted">{{
        detail
          ? chapterNames[detail.question.chapterId] || "数学讲题"
          : "讲会笔记"
      }}</span>
    </div>
    <nav class="flow-progress" aria-label="讲题进度">
      <button
        v-for="(item, index) in sequence"
        :key="item.key"
        :aria-current="stage === item.key ? 'step' : undefined"
        :class="{
          current: stage === item.key,
          passed:
            sequence.findIndex((x) => x.key === stage) > index ||
            stage === 'result',
        }"
        :disabled="
          loading ||
          !!working ||
          (!detail?.guide && index > 1) ||
          (index === 3 && !detail?.teachingCompleted)
        "
        @click="goto(item.key)"
      >
        <span>{{ index + 1 }}</span
        >{{ item.label }}
      </button>
    </nav>
    <LoadingState
      v-if="loading"
      :title="working || '正在打开这份讲会笔记'"
      :description="
        stage === 'lesson'
          ? '把这道题和需要的基础知识，整理成你能读懂的讲解。'
          : stage === 'exercise'
            ? '换个条件，看看是不是真的理解了。'
            : '上次的进度也会一起找回来。'
      "
    />
    <div
      v-else-if="!detail || (!isLocalSession() && !token)"
      class="empty-card"
    >
      <BookOpen :size="32" />
      <h2>
        {{
          isLocalSession() || token
            ? "这份笔记暂时没有打开"
            : "登录后继续这次讲题"
        }}
      </h2>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <button class="button primary" @click="load">
        {{ isLocalSession() || token ? "重新加载" : "登录并继续" }}
      </button>
    </div>
    <template v-else
      ><div v-if="error" class="error-card" role="alert">
        <p>{{ error }}</p>
        <button class="text-button" @click="error = ''">收起提示</button>
      </div>
      <div v-if="working" class="working-banner" role="status">
        {{ working }}…
        <button class="text-button" @click="cancelModelRequest">
          取消模型请求
        </button>
      </div>
      <section v-if="stage === 'insight'" class="insight-stage">
        <span class="eyebrow">先别急着看答案</span>
        <h1 class="page-title">这题，关键在哪里？</h1>
        <div class="two-column">
          <div>
            <article class="paper-card">
              <div class="card-label">
                <PenLine :size="18" />先确认，这是孩子不会的题
              </div>
              <RichText :text="detail.question.questionText" />
              <details class="photo-details">
                <summary>对照原照片</summary>
                <QuestionPhoto :url="detail.question.imageUrl" />
              </details>
              <RouterLink to="/" class="text-link small"
                >识别不对？重新拍一张<RotateCcw :size="14"
              /></RouterLink>
            </article>
            <article class="insight-callout">
              <Lightbulb :size="25" />
              <div>
                <span class="eyebrow">真正关键的一步</span
                ><RichText :text="detail.question.keyInsight" />
              </div>
            </article>
            <div class="action-stack stage-actions">
              <button
                class="button primary full"
                :disabled="!!working"
                @click="goto('lesson')"
              >
                题目没问题，看看怎么讲<ArrowRight :size="19" /></button
              ><button
                class="button subtle full"
                :disabled="!!working || detail.status === 'DONE'"
                @click="choosePhoto(childPhoto)"
              >
                <ImagePlus :size="18" />也看看孩子写的过程
              </button>
            </div>
            <article v-if="childAnalysis" class="paper-card">
              <h3>孩子已经做到哪一步</h3>
              <ul class="check-list">
                <li v-for="text in childAnalysis.masteredSteps" :key="text">
                  <Check :size="16" />{{ text }}
                </li>
              </ul>
              <RichText :text="childAnalysis.errorAt" /><RichText
                :text="childAnalysis.recommendation"
              />
            </article>
          </div>
          <aside class="paper-card sticking-card">
            <span class="eyebrow">如果孩子卡住了</span>
            <h2>他可能卡在这里</h2>
            <p class="muted">选一个最像的。不确定也没关系。</p>
            <button
              v-for="p in points"
              :key="p.id"
              class="choice-card"
              :class="{ selected: detail.stickingPointId === p.id }"
              :aria-pressed="detail.stickingPointId === p.id"
              :disabled="!!working || detail.status === 'DONE'"
              @click="choosePoint(p.id)"
            >
              <span class="choice-circle"
                ><Check
                  v-if="detail.stickingPointId === p.id"
                  :size="14" /></span
              >{{ p.description }}</button
            ><button
              class="choice-card"
              :class="{ selected: detail.stickingPointId === 'unknown' }"
              :disabled="!!working || detail.status === 'DONE'"
              @click="choosePoint('unknown')"
            >
              <HelpCircle :size="19" />我也不确定，先讲讲看
            </button>
          </aside>
        </div>
      </section>
      <section v-else-if="stage === 'lesson'">
        <div class="section-heading lesson-title">
          <div>
            <h1 class="page-title">知识点与解法</h1>
          </div>
        </div>
        <div class="method-switch" aria-label="选择讲法">
          <button
            v-for="m in [
              { key: 'standard', name: '一步步讲明白' },
              { key: 'simple', name: '说得再简单点' },
              { key: 'visual', name: '画着讲' },
            ]"
            :key="m.key"
            :class="{ selected: method === m.key }"
            :aria-pressed="method === m.key"
            :disabled="!!working || detail.status === 'DONE'"
            @click="changeMethod(m.key)"
          >
            {{ m.name }}
          </button>
        </div>
        <div v-if="guide" class="lesson-columns">
          <div>
            <KnowledgeLesson :guide="guide" :question="detail.question" />
            <div
              v-if="detail.status !== 'DONE'"
              class="action-stack stage-actions"
            >
              <button
                class="button primary full"
                :disabled="!!working"
                @click="goto('teaching')"
              >
                我明白了，开始给孩子讲<ArrowRight :size="18" /></button
              ><button
                class="button subtle full"
                :disabled="!!working"
                @click="startExercise('parent')"
              >
                先考考我自己
              </button>
            </div>
            <button v-else class="button primary full" @click="goto('result')">
              看看这次的结果<ArrowRight :size="18" />
            </button>
          </div>
          <aside class="teacher-aside">
            <h2>相关老师片段</h2>
            <div v-if="segments.length" class="teacher-list">
              <a
                v-for="s in segments"
                :key="s.segmentId"
                :href="safeUrl(s.platformUrl) || undefined"
                target="_blank"
                rel="noopener noreferrer"
                class="teacher-card"
                @click="recordClick(s)"
                ><div class="video-art">
                  <Play :size="24" /><span
                    >{{ timeLabel(s.startTime) }} —
                    {{ timeLabel(s.endTime) }}</span
                  >
                </div>
                <div class="teacher-card-body">
                  <span class="small muted">{{ s.teacherName }}</span>
                  <h3>{{ s.title }}</h3>
                  <p>{{ s.goodFor[0] }}</p>
                  <span class="text-link"
                    >去听这一段<ExternalLink :size="14"
                  /></span></div
              ></a>
            </div>
            <div v-else-if="segmentError" class="teacher-empty">
              <p>老师片段暂时没有加载成功。</p>
              <button
                class="text-link"
                :disabled="!!working"
                @click="loadSegments()"
              >
                再加载一次<RotateCcw :size="14" />
              </button>
            </div>
            <div v-else class="teacher-empty">
              <BookOpen :size="26" />
              <p>暂时没有找到合适的老师片段。</p>
              <span class="small muted"
                >先看知识点讲解，也可以继续给孩子讲。</span
              >
            </div>
          </aside>
        </div>
        <div v-else class="empty-card">
          <p>讲解暂时没有准备好。</p>
          <button class="button primary" @click="load">再准备一次</button>
        </div>
      </section>
      <section v-else-if="stage === 'teaching'" class="teaching-stage">
        <span class="eyebrow">把手机放在自己这一边</span>
        <h1 class="page-title">一句一句，带着他想。</h1>
        <div v-if="guide && step" class="teaching-layout">
          <article class="teaching-card">
            <div class="teaching-card-top">
              <span
                >第 {{ step.stepNo }} 步 / 共 {{ guide.steps.length }} 步</span
              ><span>{{ step.title }}</span>
            </div>
            <span class="eyebrow">你可以先问他</span
            ><RichText :text="step.question" />
            <div class="step-hint">
              <Lightbulb :size="19" /><RichText
                :text="hint || step.ifCorrect"
              />
            </div>
            <span class="small muted">这一步，孩子的反应是：</span>
            <div
              class="feedback-buttons teaching-feedback"
              aria-label="这一步，孩子的反应是"
            >
              <button
                class="button primary"
                :disabled="!!working || detail.status === 'DONE'"
                @click="feedback('SELF_ANSWER')"
              >
                <Check :size="18" />自己说出来了</button
              ><button
                class="button subtle"
                :disabled="!!working || detail.status === 'DONE'"
                @click="feedback('HINT_THEN_ANSWER')"
              >
                提醒后会了</button
              ><button
                class="button subtle"
                :disabled="!!working || detail.status === 'DONE'"
                @click="feedback('CANNOT_ANSWER')"
              >
                还是不会
              </button>
            </div>
            <div class="step-dots" aria-hidden="true">
              <span
                v-for="s in guide.steps"
                :key="s.stepNo"
                :class="{
                  done: s.stepNo <= detail.stepsCompleted,
                  current: s.stepNo === step.stepNo,
                }"
              ></span>
            </div>
          </article>
          <aside class="teaching-note">
            <PenLine :size="25" />
            <h3>留一点时间，让他自己想。</h3>
            <p>
              把问题说完，等一等。让孩子在纸上画一画、写一写，比马上告诉答案更有帮助。
            </p>
            <button
              class="text-link"
              :disabled="!!working"
              @click="goto('lesson')"
            >
              回去看看讲法<ArrowLeft :size="16" />
            </button>
          </aside>
        </div>
        <div v-else class="empty-card">
          <CheckCircle2 :size="36" />
          <h2>
            {{
              detail.teachingCompleted
                ? "这几步，已经讲完了。"
                : "先看看该怎么讲。"
            }}
          </h2>
          <button
            v-if="detail.teachingCompleted"
            class="button primary"
            :disabled="!!working"
            @click="
              detail.status === 'DONE'
                ? goto('result')
                : startExercise(audience)
            "
          >
            {{ detail.status === "DONE" ? "查看结果" : "让孩子试一道"
            }}<ArrowRight :size="18" /></button
          ><button v-else class="button primary" @click="goto('lesson')">
            先看讲稿
          </button>
        </div>
      </section>
      <section v-else-if="stage === 'exercise'" class="exercise-stage">
        <span class="eyebrow">别问「听懂了吗」，做一道才知道</span>
        <h1 class="page-title">
          {{
            exerciseKind === "variation"
              ? "换个条件，再试试。"
              : "试一道，看看会没会。"
          }}
        </h1>
        <div v-if="!detail.teachingCompleted" class="empty-card">
          <BookOpen :size="32" />
          <h2>先把这道题讲明白。</h2>
          <button class="button primary" @click="goto('lesson')">
            回去看讲法
          </button>
        </div>
        <template v-else-if="exercise"
          ><div class="exercise-meta">
            <span class="pill"
              >{{
                exercise.audience === "parent" ? "家长自己试" : "孩子独立做"
              }}
              ·
              {{
                exercise.exerciseType === "variation" ? "变式题" : "类似题"
              }}</span
            ><span class="small muted">拿一张草稿纸，不着急。</span>
          </div>
          <article class="paper-card exercise-paper">
            <span class="card-label">{{
              exercise.audience === "parent"
                ? "这一次，检验自己的理解。"
                : "让孩子自己想，先不要提示。"
            }}</span
            ><RichText :text="exercise.content" />
          </article>
          <button
            class="button subtle full answer-toggle"
            :aria-expanded="answerOpen"
            @click="answerOpen = !answerOpen"
          >
            {{ answerOpen ? "收起答案和解法" : "做完了，对照答案"
            }}<ChevronRight :size="18" />
          </button>
          <article v-if="answerOpen" class="paper-card answer-card">
            <h3>参考答案</h3>
            <RichText :text="exercise.answer" />
            <h3>一步一步看解法</h3>
            <ol>
              <li v-for="(s, index) in answerSteps" :key="index">
                <RichText :text="s" />
              </li>
            </ol>
          </article>
          <div
            v-if="
              detail.status !== 'DONE' ||
              (exercise.exerciseType === 'variation' && !detail.variationResult)
            "
            class="result-feedback"
          >
            <h3>对照之后，结果怎么样？</h3>
            <div class="feedback-buttons">
              <button
                class="button primary"
                :disabled="!!working || !answerOpen"
                @click="submit('CORRECT')"
              >
                <Check :size="18" />独立做对了</button
              ><button
                class="button subtle"
                :disabled="!!working || !answerOpen"
                @click="submit('WRONG')"
              >
                还没做对</button
              ><button
                class="button subtle"
                :disabled="!!working"
                @click="submit('SKIP')"
              >
                这次先跳过
              </button>
            </div>
            <p v-if="!answerOpen" class="small muted">
              做完后展开参考答案，再记录结果。
            </p>
          </div>
          <button v-else class="button primary full" @click="goto('result')">
            这道题的结果已保存，查看结果
          </button></template
        >
        <div v-else class="empty-card">
          <p>这道题还没有准备好。</p>
          <button class="button primary" @click="load">重新准备一道题</button>
        </div>
      </section>
      <section v-else-if="stage === 'result'" class="result-stage">
        <div v-if="detail.status !== 'DONE'" class="empty-card">
          <h2>还没有完成验证。</h2>
          <p class="muted">试一道类似题，再看看是不是真的理解了。</p>
          <button
            class="button primary"
            @click="goto(detail.teachingCompleted ? 'exercise' : 'lesson')"
          >
            接着讲<ArrowRight :size="18" />
          </button>
        </div>
        <template v-else
          ><div
            class="result-mark"
            :class="{ achieved: ['BASIC', 'SOLID'].includes(level) }"
          >
            <CheckCircle2
              v-if="['BASIC', 'SOLID'].includes(level)"
              :size="44"
            /><BookOpen v-else :size="44" />
          </div>
          <span class="eyebrow">这一份努力，已经记下来了</span>
          <h1 class="page-title">{{ resultLabel }}。</h1>
          <p class="result-subtitle">
            {{ chapterNames[detail.question.chapterId] }} ·
            {{
              detail.verificationAudience === "parent"
                ? "家长理解检查"
                : "孩子学习验证"
            }}
          </p>
          <article class="paper-card result-summary">
            <div>
              <span>类似题</span
              ><strong>{{
                { CORRECT: "独立做对了", WRONG: "还没做对", SKIP: "这次跳过" }[
                  detail.verificationResult
                ] || "未完成"
              }}</strong>
            </div>
            <div>
              <span>变式题</span
              ><strong>{{
                { CORRECT: "独立做对了", WRONG: "还没做对", SKIP: "这次跳过" }[
                  detail.variationResult
                ] || "还没有做"
              }}</strong>
            </div>
            <RichText
              :text="
                mastery?.tip ||
                (detail.verificationResult === 'SKIP'
                  ? '这次没有完成验证，下次再独立试一道。'
                  : '隔一段时间再独立做一道类似题，看看是否还能做出来。')
              "
            />
          </article>
          <button
            v-if="
              detail.verificationResult === 'CORRECT' && !detail.variationResult
            "
            class="button primary full"
            :disabled="!!working"
            @click="goVariation"
          >
            再做一道变式，看看理解稳不稳<ArrowRight :size="18" /></button
          ><button class="button subtle full" @click="goto('lesson')">
            回顾这道题的讲法</button
          ><RouterLink to="/" class="text-link result-home"
            >再拍一道题<ArrowUpRight :size="18" /></RouterLink
        ></template>
      </section>
      <div v-else class="empty-card">
        <h2>这里暂时没有内容</h2>
        <button class="button primary" @click="goto('insight')">
          回到这道题
        </button>
      </div>
      <input
        ref="childPhoto"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden-input"
        aria-label="拍摄孩子的作答"
        @change="analyzeChild"
    /></template>
    <div
      v-if="showMobileAction"
      class="mobile-flow-actions"
      aria-label="继续讲题"
    >
      <button
        class="button primary full"
        :disabled="!!working"
        @click="goto(stage === 'insight' ? 'lesson' : 'teaching')"
      >
        {{
          working
            ? `${working}…`
            : stage === "insight"
              ? "题目没问题，看看怎么讲"
              : "我明白了，开始给孩子讲"
        }}<ArrowRight :size="18" />
      </button>
    </div>
  </div>
</template>
