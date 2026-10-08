import { test, expect, type Page } from "@playwright/test";
async function snapshot(
  page: Page,
  options: { path: string; fullPage?: boolean },
) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("#main > *").first()).toHaveCSS("opacity", "1");
  await page.screenshot({ ...options, animations: "disabled" });
}
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jianghui-legacy-server', '1'));
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
const guide = {
  method: "standard",
  source: "generated",
  parentExplanation:
    "二次函数是一条抛物线。对于 $y=(x-2)^2-1$，平方项非负，因此顶点是最低点。",
  prerequisiteLessons: [
    {
      knowledgePointId: "BASE",
      name: "平方为什么非负",
      explanation: "一个数乘以它自己，结果不会小于零。",
    },
  ],
  problemWalkthrough: "比较两个端点和范围内的顶点，得到最大值和最小值。",
  steps: [
    {
      stepNo: 1,
      title: "先找顶点",
      question: "顶点在哪里？",
      ifCorrect: "再看看题目给的范围。",
      ifWrong: "先把函数写成顶点式。",
    },
    {
      stepNo: 2,
      title: "看看端点",
      question: "两个端点的函数值是多少？",
      ifCorrect: "把三个值比一比。",
      ifWrong: "分别把两个端点代入。",
    },
  ],
  context: {
    knowledge: [
      { id: "MATH_09_QUADRATIC_INTERVAL_EXTREME", name: "闭区间最值" },
    ],
    prerequisites: [],
    segments: [],
    missingKnowledgeIds: [],
    hasTeacherEvidence: false,
  },
};
function session() {
  return {
    id: 1,
    question: {
      id: 1,
      sessionId: 1,
      questionText: "已知 $y=(x-2)^2-1$，在 $1≤x≤5$ 时求最值。",
      imageUrl: "",
      chapterId: "quadratic_function",
      knowledgePointIds: '["MATH_09_QUADRATIC_INTERVAL_EXTREME"]',
      keyInsight: "顶点之外，别忘了比较两个端点。",
      fullSolution: "最大值8，最小值-1",
      analysisResult: JSON.stringify({
        possibleStickingPoints: [
          { id: "sp_1", description: "知道顶点，但忘了比较端点" },
        ],
      }),
      difficulty: 3,
    },
    guide: null as typeof guide | null,
    status: "TEACHING",
    stickingPointId: "",
    stepsCompleted: 0,
    teachingCompleted: false,
    stepFeedback: {} as Record<string, string>,
    childAnswerAnalysis: "",
    verificationResult: "",
    variationResult: "",
    verificationAudience: "child",
    standardExerciseId: 0,
    variationExerciseId: 0,
    masteryLevel: "",
    createdAt: new Date().toISOString(),
  };
}
async function mock(page: Page, historyCount = 1) {
  const state = session();
  let generated = 0;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace("/api/v1", ""),
      body = route
        .request()
        .headers()
        ["content-type"]?.includes("application/json")
        ? route.request().postDataJSON() || {}
        : {};
    let data: unknown = {};
    if (path === "/history") data = { sessions: Array.from({ length: historyCount }, (_, i) => ({ ...state, id: i + 1 })) };
    else if (path === "/questions/analyze")
      data = { sessionId: 1, questionId: 1 };
    else if (path === "/auth/verify") data = { token: "test-token" };
    else if (path === "/auth/send-code") data = {};
    else if (path === "/sessions/1") data = state;
    else if (path.endsWith("/sticking-point")) {
      state.stickingPointId = body.stickingPointId;
      data = state;
    } else if (path.endsWith("/teaching-guide")) {
      generated++;
      state.guide = guide;
      data = guide;
    } else if (path.endsWith("/segments/recommend")) data = { segments: [] };
    else if (path.includes("/steps/")) {
      const step = Number(path.split("/")[4]);
      if (body.result !== "CANNOT_ANSWER") state.stepsCompleted = step;
      state.teachingCompleted = state.stepsCompleted === 2;
      data = {
        nextStepNo: state.teachingCompleted ? 0 : state.stepsCompleted + 1,
        branchPrompt:
          body.result === "CANNOT_ANSWER" ? "先把函数写成顶点式。" : "",
      };
    } else if (path.endsWith("/teaching-complete")) {
      state.teachingCompleted = true;
      data = state;
    } else if (path.endsWith("/exercise")) {
      const variant = url.searchParams.get("type") === "variation";
      state.verificationAudience = url.searchParams.get("audience") || "child";
      if (variant) state.variationExerciseId = 2;
      else state.standardExerciseId = 1;
      data = {
        id: variant ? 2 : 1,
        exerciseType: variant ? "variation" : "standard",
        audience: state.verificationAudience,
        content: variant
          ? "已知 $y=(x-1)^2-2$，在 $0≤x≤4$ 时求最值。"
          : "已知 $y=x^2-6x+5$，在 $0≤x≤6$ 时求最值。",
        answer: variant ? "最大值7，最小值-2" : "最大值5，最小值-4",
        solutionSteps: '["求顶点","比较端点"]',
      };
    } else if (path.endsWith("/result")) {
      const variant = path.includes("/exercise/2/");
      if (variant) state.variationResult = body.result;
      else state.verificationResult = body.result;
      state.status = "DONE";
      state.masteryLevel =
        state.verificationResult === "CORRECT"
          ? state.variationResult === "CORRECT"
            ? "SOLID"
            : "BASIC"
          : "NOT_YET";
      data = {
        masteryLevel: state.masteryLevel,
        masteryLabel:
          state.verificationAudience === "parent"
            ? "你基本理解了这个知识点"
            : "这部分基本讲会了",
        tip: "隔一段时间再试一道",
        status: "DONE",
        masteredPoints: [],
      };
    } else
      return route.fulfill({
        status: 404,
        json: { code: 1004, message: "not found" },
      });
    await route.fulfill({ json: { code: 0, message: "ok", data } });
  });
  await page.addInitScript(() =>
    localStorage.setItem("jianghui-token", "test-token"),
  );
  return {
    state,
    get generated() {
      return generated;
    },
  };
}
test("mobile full journey, hints, saved guide, verification and variation", async ({
  page,
}) => {
  const f = await mock(page);
  await page.goto("/session/1/insight");
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).toBeVisible();
  await snapshot(page, {
    path: "test-results/insight-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "知道顶点，但忘了比较端点" }).click();
  await page.getByRole("button", { name: "题目没问题，看看怎么讲" }).click();
  await expect(
    page.getByRole("heading", { name: "知识点与解法" }),
  ).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "知识点与解法" }),
  ).toBeVisible();
  expect(f.generated).toBe(1);
  await snapshot(page, {
    path: "test-results/lesson-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "我明白了，开始给孩子讲" }).click();
  await snapshot(page, {
    path: "test-results/teaching-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "还是不会", exact: true }).click();
  await expect(page.locator(".step-hint")).toContainText("先把函数写成顶点式");
  await page.getByRole("button", { name: "自己说出来了" }).click();
  await expect(page.locator(".teaching-card")).toContainText(
    "两个端点的函数值是多少",
  );
  await page.getByRole("button", { name: "提醒后会了" }).click();
  await expect(
    page.getByRole("heading", { name: "试一道，看看会没会。" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "独立做对了" })).toBeDisabled();
  await snapshot(page, {
    path: "test-results/exercise-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "做完了，对照答案" }).click();
  await page.getByRole("button", { name: "独立做对了" }).click();
  await expect(page.locator(".result-stage")).toContainText("这部分基本讲会了");
  await page
    .getByRole("button", { name: "再做一道变式，看看理解稳不稳" })
    .click();
  await expect(
    page.getByRole("heading", { name: "换个条件，再试试。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "做完了，对照答案" }).click();
  await page.getByRole("button", { name: "独立做对了" }).click();
  await expect(page.locator(".result-stage")).toBeVisible();
  expect(f.state.masteryLevel).toBe("SOLID");
  await page.reload();
  await expect(page.locator(".result-stage")).toContainText(
    "这部分讲得比较稳了",
  );
  await snapshot(page, {
    path: "test-results/result-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("parent can verify without inventing child step feedback", async ({
  page,
}) => {
  const f = await mock(page);
  await page.goto("/session/1/lesson");
  await page.getByRole("button", { name: "先考考我自己" }).click();
  await expect(page.locator(".exercise-meta")).toContainText("家长自己试");
  expect(f.state.stepsCompleted).toBe(0);
  await page.getByRole("button", { name: "做完了，对照答案" }).click();
  await page.getByRole("button", { name: "独立做对了" }).click();
  await expect(page.locator(".result-stage")).toContainText("家长理解检查");
});
test("logout removes previously displayed private session content", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/session/1/insight");
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).not.toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("home mobile and desktop layout", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /今天，讲会一道题/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "拍题，开始讲" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await snapshot(page, {
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await snapshot(page, {
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
});
test("photo upload supports rotation and crop before submitting", async ({
  page,
}) => {
  await mock(page);
  await page.addInitScript(() => { localStorage.setItem('jianghui-local-api-key', 'test-key'); localStorage.setItem('jianghui-local-api-base', 'https://model.test/v1'); });
  const knowledgePointId = 'MATH_09_QUADRATIC_INTERVAL_EXTREME';
  await page.route('**/api/v1/assets/bundle', route => route.fulfill({ json: { code: 0, data: { schemaVersion: 1, version: 'crop-v1', taxonomy: [{ id: knowledgePointId, name: '闭区间最值', chapterId: 'quadratic_function' }], assets: [], sharedAssets: [], withdrawnIds: [] } } }));
  await page.route('**/model.test/v1/chat/completions', async route => {
    const body = route.request().postDataJSON();
    const image = body.messages[0].content.find((m: { type: string }) => m.type === 'image_url');
    expect(image.image_url.url).toMatch(/^data:image\//);
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ questionText: 'y=x²+2x+1', knowledgePointIds: [knowledgePointId], fullSolution: '顶点为(-1,0)', difficulty: 1, keyInsight: '配方找顶点', possibleStickingPoints: [] }) } }] } });
  });
  await page.goto("/");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = "black";
    ctx.font = "16px sans-serif";
    ctx.fillText("y = x² + 2x + 1", 15, 45);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[aria-label="从相册选择题目"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(
    page.getByRole("heading", { name: "把题目框出来" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".crop-area canvas")
        .evaluate((c: HTMLCanvasElement) => c.width),
    )
    .toBe(200);
  await page.getByRole("button", { name: "旋转", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".crop-area canvas")
        .evaluate((c: HTMLCanvasElement) => c.width),
    )
    .toBe(100);
  const crop = page.locator(".crop-area");
  await crop.scrollIntoViewIfNeeded();
  const box = (await crop.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.9);
  await page.mouse.up();
  await expect
    .poll(() =>
      page
        .locator(".crop-selection")
        .evaluate((el) => parseFloat((el as HTMLElement).style.width)),
    )
    .toBeCloseTo(75, 0);
  await snapshot(page, {
    path: "test-results/crop-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "就看这一题" }).click();
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).toBeVisible();
});

test("teacher segment links and retry distinguish missing evidence from network errors", async ({
  page,
}) => {
  await mock(page);
  let attempts = 0;
  await page.route("**/sessions/1/segments/recommend", async (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        json: { code: 1005, message: "temporary failure" },
      });
    await route.fulfill({
      json: {
        code: 0,
        data: {
          segments: [
            {
              segmentId: 1,
              teacherName: "验收老师",
              title: "二次函数顶点与区间",
              startTime: 125,
              endTime: 245,
              durationSeconds: 120,
              platformUrl: "https://www.bilibili.com/video/BV1test?t=125",
              goodFor: ["理解顶点"],
              style: [],
            },
          ],
        },
      },
    });
  });
  await page.goto("/session/1/lesson");
  await expect(page.getByText("老师片段暂时没有加载成功。")).toBeVisible();
  await page.getByRole("button", { name: "再加载一次" }).click();
  const link = page.locator(".teacher-card");
  await expect(link).toContainText("02:05 — 04:05");
  await expect(link).toHaveAttribute("href", /t=125/);
  await expect(link).toHaveAttribute("target", "_blank");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await snapshot(page, {
    path: "test-results/lesson-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("login validation, focus trap and saved history navigation", async ({
  page,
}) => {
  const f = await mock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "退出", exact: true }).click();
  // Photo selection can precede authentication; use the explicit login entry.
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "登录并继续", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("手机号码");
  await page.locator("#phone").fill("13800000000");
  await page.getByRole("button", { name: "获取验证码" }).click();
  await expect(
    page.getByText("当前为内测，验证码请使用 888888。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "登录并继续", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "关闭登录" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "登录并继续", exact: true }),
  ).toBeFocused();
  await snapshot(page, {
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  await page.locator("#code").fill("888888");
  await page.getByRole("button", { name: "登录并继续", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/history");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await snapshot(page, {
    path: "test-results/history-mobile.png",
    fullPage: true,
  });
  await page.locator(".history-row").click();
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).toBeVisible();
  expect(f.state.status).toBe("TEACHING");
});
test("session load failures are recoverable", async ({ page }) => {
  await mock(page);
  let fail = true;
  await page.route("**/api/v1/sessions/1", async (route) => {
    if (fail) {
      fail = false;
      return route.fulfill({
        status: 503,
        json: { code: 1005, message: "服务暂时不可用" },
      });
    }
    await route.fallback();
  });
  await page.goto("/session/1/insight");
  await expect(page.getByRole("alert")).toContainText("服务暂时不可用");
  await snapshot(page, {
    path: "test-results/error-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "这题，关键在哪里？" }),
  ).toBeVisible();
});

test("production light Go server serves built UI and assets without teaching services", async ({
  page,
  request,
}) => {
  test.skip(
    !process.env.UI_PRODUCTION_URL,
    "Set UI_PRODUCTION_URL to test a running Go server",
  );
  const productionURL = process.env.UI_PRODUCTION_URL!;
  await page.goto(`${productionURL}/`);
  await expect(
    page.getByRole("heading", { name: /今天，讲会一道题/ }),
  ).toBeVisible();
  await snapshot(page, {
    path: "test-results/production-home-mobile.png",
    fullPage: true,
  });
  await page.goto(`${productionURL}/history`);
  await expect(page.getByRole("heading", { name: "讲过的题，都在这里。" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "讲过的题，都在这里。" })).toBeVisible();
  const bundle = await request.get(`${productionURL}/api/v1/assets/bundle`);
  expect(bundle.status()).toBe(200);
  expect((await bundle.json()).data.schemaVersion).toBe(1);
  expect((await request.get(`${productionURL}/api/v1/history`)).status()).toBe(404);
  expect((await request.post(`${productionURL}/api/v1/questions/analyze`)).status()).toBe(404);
  const missing = await request.get(`${productionURL}/api/v1/not-real`);
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("application/json");
});

for (const size of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`mobile primary layout ${size.width}px: reachable actions and long formulas`, async ({
    page,
  }) => {
    const f = await mock(page);
    await page.setViewportSize(size);
    await page.goto("/");
    const camera = page.getByRole("button", { name: "拍题，开始讲" });
    await expect(camera).toBeInViewport();
    const cameraBox = (await camera.boundingBox())!;
    expect(cameraBox.y + cameraBox.height).toBeLessThanOrEqual(size.height);
    expect(cameraBox.height).toBeGreaterThanOrEqual(44);
    if (size.width === 320)
      await snapshot(page, { path: "test-results/mobile-320-home.png" });
    await page.goto("/session/1/insight");
    const insight = page.locator(".mobile-flow-actions .button");
    await expect(insight).toBeInViewport();
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await expect(insight).toBeInViewport();
    await insight.click();
    await expect(
      page.getByRole("heading", { name: "知识点与解法" }),
    ).toBeVisible();
    for (const button of await page.locator(".flow-progress button").all())
      expect(
        await button.evaluate((el) => getComputedStyle(el).whiteSpace),
      ).toBe("nowrap");
    const action = page.locator(".mobile-flow-actions .button");
    await expect(action).toBeInViewport();
    if (size.width === 320)
      await snapshot(page, { path: "test-results/mobile-320-lesson.png" });
    await action.click();
    await expect(page.locator(".teaching-feedback")).toBeInViewport();
    for (const name of ["自己说出来了", "提醒后会了", "还是不会"]) {
      const button = page.getByRole("button", { name, exact: true });
      await expect(button).toBeInViewport();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    if (size.width === 390)
      await snapshot(page, { path: "test-results/mobile-390-teaching.png" });
    f.state.teachingCompleted = true;
    f.state.guide = {
      ...f.state.guide!,
      parentExplanation:
        "完整公式：$y=\\frac{(x-2)^2+(x-3)^2+(x-4)^2+(x-5)^2}{x^2+1}$。基础讲解。",
    };
    await page.goto("/session/1/lesson");
    await expect(page.locator(".katex").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    await expect(page.locator(".mfrac").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/session/1/exercise");
    await expect(
      page.getByRole("heading", { name: "试一道，看看会没会。" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "做完了，对照答案" }).click();
    await page.getByRole("button", { name: "这次先跳过" }).click();
    await expect(page.locator(".result-stage")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("mobile login survives keyboard-sized viewport and restores scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  await page.setViewportSize({ width: 360, height: 360 });
  await page.locator("#phone").fill("13800000000");
  await page.locator("#code").fill("888888");
  const dialog = await page.getByRole("dialog").boundingBox();
  expect(dialog!.height).toBeLessThanOrEqual(360);
  await page
    .getByRole("button", { name: "登录并继续", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "登录并继续", exact: true }),
  ).toBeInViewport();
  await snapshot(page, { path: "test-results/mobile-keyboard-login.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await page.setViewportSize({ width: 360, height: 640 });
});

test("app navigation keeps the shell and document while switching views", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "接着上次，继续讲会。" }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).__shell = document.querySelector(".site-header");
    (window as any).__spaMarker = "present";
  });
  let documentLoads = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documentLoads++;
  });
  const nav = page.getByRole("navigation", { name: "应用导航" });
  await nav.getByRole("link", { name: "讲题记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "讲过的题，都在这里。" }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "讲题记录", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "拍题讲解", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "接着上次，继续讲会。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).__spaMarker === "present" &&
        (window as any).__shell === document.querySelector(".site-header"),
    ),
  ).toBe(true);
  expect(documentLoads).toBe(0);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "讲过的题，都在这里。" }),
  ).toBeVisible();
  expect(documentLoads).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(nav).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "拍题讲解", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "接着上次，继续讲会。" }),
  ).toBeVisible();
  expect(documentLoads).toBe(0);
});
test("fixed app navigation leaves room for capture and switches to teaching controls", async ({
  page,
}) => {
  await mock(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const camera = (await page
    .getByRole("button", { name: "拍题，开始讲" })
    .boundingBox())!;
  const nav = (await page
    .getByRole("navigation", { name: "应用导航" })
    .boundingBox())!;
  expect(camera.y + camera.height).toBeLessThanOrEqual(nav.y);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(
    page.getByRole("navigation", { name: "应用导航" }),
  ).toBeVisible();
  await snapshot(page, { path: "test-results/home-tablet.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/session/1/lesson");
  await expect(
    page.getByRole("heading", { name: "知识点与解法" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "应用导航" }),
  ).not.toBeVisible();
  await expect(page.locator(".mobile-flow-actions")).toBeInViewport();
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const lastText = (await page.locator(".teacher-empty .small").boundingBox())!;
  const action = (await page.locator(".mobile-flow-actions").boundingBox())!;
  expect(lastText.y + lastText.height).toBeLessThanOrEqual(action.y);
  await page.locator(".mobile-flow-actions .button").click();
  await expect(page.locator(".teaching-feedback")).toBeInViewport();
  await expect(page.locator(".mobile-flow-actions")).not.toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "应用导航" }),
  ).not.toBeVisible();
});
test("brand mark renders in app shell and favicon is a scalable SVG", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const mark = page.locator(".mobile-brand .brand-mark");
  await expect(mark).toBeVisible();
  await expect
    .poll(() => mark.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  const icon = await request.get("/favicon.svg");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("svg");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.locator(".login-brand")).toBeVisible();
  await snapshot(page, { path: "test-results/brand-login.png" });
});

for (const records of [0, 3]) {
  test(`home ${records ? "returning" : "initial"} state stays on one screen`, async ({ page }) => {
    await mock(page, records);
    for (const size of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: records ? "接着上次，继续讲会。" : "今天，讲会一道题。" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "从看懂，到讲会" })).toHaveCount(records ? 0 : 1);
      await expect(page.locator(".recent-section .history-row")).toHaveCount(records);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(size.height + 1);
      const camera = page.getByRole("button", { name: "拍题，开始讲" });
      await expect(camera).toBeInViewport();
      const end = records ? page.locator(".recent-section .history-row").last() : page.locator(".workspace-guide");
      const box = (await end.boundingBox())!;
      const appNav = page.getByRole("navigation", { name: "应用导航" });
      const nav = await appNav.isVisible() ? await appNav.boundingBox() : null;
      expect(box.y + box.height).toBeLessThanOrEqual(nav ? nav.y : size.height);
      await snapshot(page, { path: `test-results/home-${records ? "returning" : "initial"}-${size.width}.png` });
    }
    if (records) {
      await page.locator(".recent-section .history-row").first().click();
      await expect(page).toHaveURL(/session\/1\/insight/);
    }
  });
}

test("private local question photos authenticate, retry and survive refresh", async ({ page }) => {
  const f = await mock(page);
  f.state.question.imageUrl = "/api/v1/images/questions/1/2026-10-04/12345678-1234-1234-1234-123456789abc";
  let fail = true;
  let requests = 0;
  await page.route("**/api/v1/images/**", async route => {
    requests++;
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    if (fail) return route.fulfill({ status: 404, json: { code: 1004, message: "资源不存在" } });
    await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64") });
  });
  await page.goto("/session/1/insight");
  await page.getByText("对照原照片", { exact: true }).click();
  await expect(page.getByRole("button", { name: "重试照片" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "重试照片" }).click();
  const original = page.getByAltText("上传的原题照片");
  await expect(original).toBeVisible();
  await expect.poll(() => original.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.reload();
  await page.getByText("对照原照片", { exact: true }).click();
  await expect(original).toBeVisible();
  await expect.poll(() => original.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(requests).toBe(3);
  await snapshot(page, { path: "test-results/local-photo-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await expect(original).toHaveCount(0);
});

test('knowledge tree follows prerequisites and preserves navigation on reload', async ({ page }) => {
  let sessionLoads = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/v1/sessions/1') sessionLoads++; });
  const f = await mock(page);
  f.state.guide = { ...guide, context: { ...guide.context,
    knowledge: [{ id: 'MATH_09_QUADRATIC_INTERVAL_EXTREME', name: '闭区间最值', prerequisites: ['BASE'], chapterId: 'quadratic_function' }],
    prerequisites: [
      { id: 'BASE', name: '平方为什么非负', prerequisites: ['SUB'], chapterId: 'foundation', definition: '任何实数的平方都不小于零。' },
      { id: 'SUB', name: '代入与运算', prerequisites: [], chapterId: 'foundation', explanation: '把字母换成数字，再按运算顺序计算。' }
    ]
  }, parentExplanation: '先理解平方为什么非负，再判断顶点和端点。' } as typeof guide;
  await page.goto('/session/1/lesson');
  const reader = page.getByRole('article', { name: '知识点讲解' });
  await expect(page.getByRole('navigation', { name: '知识树', exact: true })).toBeVisible();
  const tree = page.getByRole('navigation', { name: '知识树', exact: true });
  await tree.locator('.knowledge-map-heading').click();
  await tree.getByRole('button', { name: '平方为什么非负', exact: true }).click();
  await expect(reader.getByRole('heading', { name: '平方为什么非负', exact: true })).toBeVisible();
  await reader.getByRole('button', { name: '返回本题：闭区间最值' }).click();
  await reader.locator('.knowledge-inline').getByText('平方为什么非负', { exact: true }).click();
  await expect(page).toHaveURL(/knowledge=BASE/);
  await expect(reader.getByRole('heading', { name: '平方为什么非负', exact: true })).toBeVisible();
  await reader.getByRole('button', { name: '代入与运算', exact: true }).click();
  await expect(page).toHaveURL(/knowledge=SUB/);
  expect(sessionLoads).toBe(1);
  await page.reload();
  await expect(reader.getByText('把字母换成数字，再按运算顺序计算。')).toBeVisible();
  await page.goBack();
  await expect(reader.getByRole('heading', { name: '平方为什么非负', exact: true })).toBeVisible();
  await reader.getByRole('button', { name: '返回本题：闭区间最值' }).click();
  await expect(page).toHaveURL(/\/lesson$/);
  await expect(page.getByText('给今晚的你')).toHaveCount(0);
  expect(sessionLoads).toBe(2);
});

test('lesson formats legacy equations and multiline TeX as readable steps', async ({ page }) => {
  const f = await mock(page);
  f.state.guide = { ...guide, problemWalkthrough: String.raw`第一步：写出 y=(x-2)²-1。第二步：比较端点。

$$
\begin{aligned}
f(1)&=(1-2)^2-1=0\\
f(5)&=(5-2)^2-1=8
\end{aligned}
$$

因此 $0\neq8$，最大值是8。<img src=x onerror=alert(1)>` };
  await page.goto('/session/1/lesson');
  await page.getByRole('button', { name: '本题解法', exact: true }).click();
  const reader = page.getByRole('article', { name: '知识点讲解' });
  await expect(reader.getByRole('heading', { name: '第一步', exact: true })).toBeVisible();
  await expect(reader.getByRole('heading', { name: '第二步', exact: true })).toBeVisible();
  await expect(reader.locator('.math-block .katex-display')).toHaveCount(1);
  await expect(reader.locator('.math-inline .katex')).toHaveCount(2);
  await expect(reader.locator('.math-fallback, .katex-error, img')).toHaveCount(0);
  await expect(reader.locator('p .math-block')).toHaveCount(0);
  await expect(reader.getByText('<img src=x onerror=alert(1)>', { exact: false })).toBeVisible();
});

test('legacy powers, fractions, coordinates and embedded display formulas render', async ({ page }) => {
  const f = await mock(page);
  f.state.guide = { ...guide, parentExplanation: String.raw`平方：(-2)²=4；-2²=-4。配方：x²-4x+3=(x-2)²-1。平方项：(x-2)²。条件：a≠0。位置：(2,-1)。通式：h=-\frac{b}{2a}。单个分数：\frac{1}{2}。带标记：\(y=x²\)。角度：∠ABC=60°。三角形：△ABC。推导在句中$$\begin{aligned}x&=2\\y&=-1\end{aligned}$$继续说明。` };
  await page.goto('/session/1/lesson');
  const prose = page.locator('.knowledge-explanation');
  await expect(prose.locator('.math-fallback, .katex-error')).toHaveCount(0);
  await expect(prose.locator('.math-block .katex-display')).toHaveCount(1);
  await expect(prose.locator('.math-inline .katex')).toHaveCount(11);
  const raw = await prose.evaluate(el => [...el.querySelectorAll('p')].map(p => [...p.childNodes].filter(n => n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('')).join(''));
  expect(raw).not.toMatch(/²|\\frac|\\\(|a≠0|∠ABC|△ABC/);
});

test('parent lesson starts in plain language and SVG diagrams work on narrow phones', async ({ page }) => {
  const f = await mock(page);
  // A private service provides lesson text; the public client does not bundle knowledge assets.
  await page.route('**/api/v1/assets/bundle', route => route.fulfill({
    json: { code: 0, data: {
      schemaVersion: 1, version: 'lesson-test', taxonomy: [], sharedAssets: [], withdrawnIds: [],
      assets: [{ id: 'MATH_09_QUADRATIC_INTERVAL_EXTREME', explanation: '来自资产服务：比较最高有多高、最低有多低。', workedExample: '服务端例子' }],
    } },
  }));
  f.state.guide = { ...guide, context: { ...guide.context, knowledge: [{ id:'MATH_09_QUADRATIC_INTERVAL_EXTREME', name:'闭区间最值', definition:'在闭区间比较端点及顶点。', workedExample:'正式例子' }] } as typeof guide.context };
  await page.setViewportSize({width:320,height:720});
  await page.goto('/session/1/lesson');
  await expect(page.locator('.knowledge-explanation')).toContainText('来自资产服务：比较最高有多高、最低有多低');
  await expect(page.locator('.formal-knowledge')).not.toHaveAttribute('open', '');
  await page.getByRole('button',{name:'看对称轴',exact:true}).click();
  await expect(page.locator('.diagram-caption')).toContainText('左右离它一样远');
  await page.getByRole('button',{name:'看最低点',exact:true}).click();
  await expect(page.locator('.diagram-caption')).toContainText('开口向上');
  await page.locator('.formal-knowledge summary').click();
  await expect(page.locator('.formal-knowledge')).toContainText('在闭区间比较端点及顶点');
  for (const [id,name] of [['MATH_FOUNDATION_FUNCTION','函数'],['MATH_FOUNDATION_COORDINATES','坐标'],['MATH_FOUNDATION_COMPLETING_SQUARE','平方'],['MATH_09_SIMILAR_PROPERTY','相似三角形'],['MATH_09_CIRCLE_BASIC_PROPERTY','圆'],['MATH_09_QUADRATIC_AREA_EXTREME','面积最值']]) {
    f.state.question.knowledgePointIds = JSON.stringify([id]);
    f.state.guide.context.knowledge = [{id,name,definition:'用于图示验收。'}] as typeof guide.context.knowledge;
    await page.reload();
    await expect(page.locator('.math-illustration svg')).toBeVisible();
    await expect(page.locator('.math-fallback')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test('knowledge labels stay Chinese for legacy English names and missing assets', async ({ page }) => {
  const f = await mock(page);
  f.state.guide = { ...guide, context: { ...guide.context,
    knowledge: [{ id: 'MATH_09_QUADRATIC_INTERVAL_EXTREME', name: 'QUADRATIC_INTERVAL_EXTREME', chapterId: 'quadratic_function', prerequisites: ['MATH_FOUNDATION_FUNCTION', 'UNMAPPED_TOPIC'] }],
    prerequisites: [
      { id: 'MATH_FOUNDATION_FUNCTION', name: 'Function domain', chapterId: 'foundation', prerequisites: [] },
      { id: 'UNMAPPED_TOPIC', name: 'UNKNOWN_LABEL', chapterId: 'unknown', prerequisites: [] }
    ]
  } } as typeof guide;
  await page.goto('/session/1/lesson');
  const tree = page.getByRole('navigation', { name: '知识树', exact: true });
  await tree.locator('.knowledge-map-heading').click();
  await expect(tree.getByRole('button', { name: /闭区间最值.*本题/ })).toBeVisible();
  await tree.getByRole('button', { name: '函数与自变量范围', exact: true }).click();
  const reader = page.getByRole('article', { name: '知识点讲解' });
  await expect(reader.getByRole('heading', { name: '函数与自变量范围', exact: true })).toBeVisible();
  await expect(reader.locator('.knowledge-location')).toContainText('数学基础');
  await snapshot(page, { path: 'test-results/knowledge-chinese-mobile.png', fullPage: true });
  await tree.getByRole('button', { name: '相关数学知识', exact: true }).click();
  await expect(reader.getByRole('heading', { name: '相关数学知识', exact: true })).toBeVisible();
  await expect(tree).not.toContainText(/MATH_|Function domain|UNKNOWN_LABEL|QUADRATIC_INTERVAL_EXTREME/);
  await page.reload();
  await expect(reader.getByRole('heading', { name: '相关数学知识', exact: true })).toBeVisible();
});

test('content tree hides internal IDs and translates legacy chapter and topic labels', async ({ page }) => {
  test.skip(process.env.VITE_INTERNAL_TOOLS !== '1', '内部目录工具仅在显式开启时验收');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/api/v1/taxonomy', route => route.fulfill({ json: { code: 0, data: [
    { id: 'MATH_FOUNDATION_FUNCTION', name: 'Function domain', chapterId: 'foundation', grade: 9 },
    { id: 'MATH_09_QUADRATIC_INTERVAL_EXTREME', name: 'QUADRATIC_INTERVAL_EXTREME', chapterId: 'quadratic_function', grade: 9 }
  ] } }));
  await page.route('**/api/v1/segments/stats', route => route.fulfill({ json: { code: 0, data: {
    totalKnowledgePoints: 2, totalSegments: 0, totalVideos: 0, byKnowledgePoint: {}
  } } }));
  await page.goto('/admin');
  const tree = page.locator('.knowledge-tree-panel');
  await expect(tree.getByText('数学基础', { exact: true }).first()).toBeVisible();
  await tree.locator('.chapter-header').filter({ hasText: '数学基础' }).click();
  await expect(tree.getByText('函数与自变量范围', { exact: true })).toBeVisible();
  await tree.locator('.chapter-header').filter({ hasText: '二次函数' }).click();
  await expect(tree.getByText('闭区间最值', { exact: true })).toBeVisible();
  await expect(tree).not.toContainText(/MATH_|Function domain|QUADRATIC_INTERVAL_EXTREME|foundation/);
  await snapshot(page, { path: 'test-results/knowledge-chinese-admin.png', fullPage: true });
});


test("completed lesson keeps its matched teacher video cards on review", async ({ page }) => {
  const f = await mock(page);
  f.state.guide = guide;
  await page.route("**/sessions/1/segments/recommend", route => route.fulfill({ json: {
    code: 0, data: { segments: [{ segmentId: 1205, teacherName: "老师讲解",
      title: "区间最值：比较顶点和端点", startTime: 594, endTime: 786,
      durationSeconds: 192, platformUrl: "https://www.bilibili.com/video/BV13aC9BVEcR/?p=38&t=594",
      goodFor: ["判断顶点是否在区间内"], style: [] }] },
  } }));
  await page.goto("/session/1/lesson");
  await expect(page.locator(".teacher-card")).toContainText("区间最值");
  f.state.status = "DONE";
  f.state.teachingCompleted = true;
  await page.reload();
  await expect(page.locator(".teacher-card")).toContainText("区间最值");
  await expect(page.getByText("暂时没有找到合适的老师片段。")).toHaveCount(0);
});


test("completed local lesson retrieves teacher videos again after reload", async ({ page }) => {
  await mock(page);
  await page.route("**/api/v1/segments?**", route => route.fulfill({ json: {
    code: 0, data: [{ id: 1205, startTime: 594, endTime: 786,
      video: { bvid: "BV13aC9BVEcR", title: "区间最值：比较顶点和端点", page: 38 },
      goodFor: ["判断顶点是否在区间内"], style: [] }],
  } }));
  await page.goto("/");
  await page.evaluate(async ({ guide, question }) => {
    const path = "/src/lib/sessions/storage.ts";
    const { saveLocalSession } = await import(/* @vite-ignore */ path);
    await saveLocalSession({ id: 100, local: true, status: "DONE", teachingCompleted: true,
      imageDataUrl: "", createdAt: new Date().toISOString(), guide,
      analysis: { ...question, knowledgePointIds: JSON.parse(question.knowledgePointIds) } });
  }, { guide, question: session().question });
  await page.goto("/session/local:100/lesson");
  await expect(page.locator(".teacher-card")).toContainText("区间最值");
  await page.reload();
  await expect(page.locator(".teacher-card")).toHaveAttribute("href", /p=38&t=594/);
});
