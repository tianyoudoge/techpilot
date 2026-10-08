import { test, expect, type Page } from "@playwright/test";

async function prepare(page: Page, native = false) {
  if (native)
    await page.addInitScript(() => {
      (window as any).isTauri = true;
      (window as any).__openedUrls = [];
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (command: string, args: any) => {
          if (command === "plugin:opener|open_url") {
            (window as any).__openedUrls.push(args.url);
            return;
          }
          throw new Error(`unexpected native command: ${command}`);
        },
      };
    });
  await page.route("**/api/v1/assets/bundle", (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          schemaVersion: 1,
          version: "spa-test",
          taxonomy: [],
          assets: [],
          sharedAssets: [],
          withdrawnIds: [],
        },
      },
    }),
  );
  await page.route("**/api/v1/segments?**", (route) =>
    route.fulfill({ json: { code: 0, data: [] } }),
  );
  await page.goto("/");
}

for (const native of [false, true]) {
  test(`${native ? "native hash" : "H5 history"} navigation preserves the document, shell and saved session at every stage`, async ({
    page,
  }) => {
    await prepare(page, native);
    await page.evaluate(async () => {
      const path = "/src/lib/sessions/storage.ts";
      const { saveLocalSession } = await import(/* @vite-ignore */ path);
      await saveLocalSession({
        id: 89,
        local: true,
        createdAt: new Date().toISOString(),
        imageDataUrl: "",
        status: "TEACHING",
        method: "standard",
        teachingCompleted: true,
        stickingPointId: "sp",
        stepsCompleted: 0,
        analysis: {
          questionText: "1+2=?",
          chapterId: "grade1_upper",
          knowledgePointIds: ["ADD"],
          difficulty: 1,
          keyInsight: "两部分合起来",
          fullSolution: "3",
          possibleStickingPoints: [
            { id: "sp", description: "不知道怎么合起来" },
          ],
        },
        guide: {
          method: "standard",
          source: "generated",
          parentExplanation: "把两部分合起来数。",
          prerequisiteLessons: [],
          problemWalkthrough: "1加2等于3。",
          steps: [
            {
              stepNo: 1,
              title: "一起数数",
              question: "一共几个？",
              ifCorrect: "继续",
              ifWrong: "再数一次",
            },
          ],
          context: {
            knowledge: [],
            prerequisites: [],
            segments: [],
            missingKnowledgeIds: [],
            hasTeacherEvidence: false,
          },
        },
        standardExercise: {
          id: 90,
          content: "2+2=?",
          answer: "4",
          solutionSteps: ["两部分合起来"],
          difficulty: 1,
        },
      });
      (window as any).__shellBefore = document.querySelector(".app-shell");
      (window as any).__documentBefore = document;
    });
    let documents = 0;
    page.on("request", (request) => {
      if (
        request.resourceType() === "document" &&
        request.frame() === page.mainFrame()
      )
        documents++;
    });
    const nav = page.getByRole("navigation", { name: "应用导航" });
    await nav.getByRole("link", { name: "讲题记录", exact: true }).click();
    await page.locator(".history-row").click();
    for (const [stage, name] of [
      ["insight", "看懂题目"],
      ["lesson", "先把你讲会"],
      ["teaching", "讲给孩子"],
      ["exercise", "试一道"],
    ]) {
      await page
        .getByRole("navigation", { name: "讲题进度" })
        .getByRole("button", { name: new RegExp(name) })
        .click();
      await expect(page).toHaveURL(new RegExp(`/session/local:89/${stage}$`));
      await expect(
        page.locator(
          `.${stage === "lesson" ? "knowledge-workspace" : `${stage}-stage`}`,
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            (window as any).__shellBefore ===
              document.querySelector(".app-shell") &&
            (window as any).__documentBefore === document,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.evaluate(async () => {
      const path = "/src/router.ts";
      const { router } = await import(/* @vite-ignore */ path);
      await router.push("/session/local:89/result");
    });
    await expect(page.locator(".result-stage")).toBeVisible();
    expect(
      await page.evaluate(() => (window as any).__documentBefore === document),
    ).toBe(true);
    await page.goBack();
    await expect(page.locator(".exercise-stage")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".teaching-stage")).toBeVisible();
    await page.getByRole("link", { name: "回到首页", exact: true }).click();
    await nav.getByRole("link", { name: "讲题记录", exact: true }).click();
    await expect(page.locator(".history-row")).toHaveCount(1);
    expect(documents).toBe(0);
    if (native) expect(new URL(page.url()).hash).toMatch(/^#\//);
  });
}

test("model settings behaves as an app modal and restores focus and scrolling", async ({
  page,
}) => {
  await prepare(page);
  const trigger = page.getByRole("button", {
    name: "配置 API Key",
    exact: true,
  });
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "配置模型" });
  await expect(modal).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(
    modal.getByRole("tab", { name: "DeepSeek", exact: true }),
  ).toBeFocused();
  await modal.getByRole("button", { name: "取消", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    modal.getByRole("tab", { name: "DeepSeek", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 410 });
  await expect(
    modal.getByRole("button", { name: "取消", exact: true }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("unknown routes, internal tools and invalid session stages never show an empty application", async ({
  page,
}) => {
  await prepare(page);
  for (const path of [
    "/missing",
    "/admin",
    "/debug",
    "/segments",
    "/session/local:89/not-a-stage",
  ]) {
    await page.evaluate(async (path) => {
      const source = "/src/router.ts";
      const { router } = await import(/* @vite-ignore */ source);
      await router.push(path);
    }, path);
    await expect(
      page.getByRole("heading", { name: "这个页面暂时打不开" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "回到拍题", exact: true }).click();
    await expect(page.locator(".home-page")).toBeVisible();
  }
});

test("native external links use the platform opener and keep the app document", async ({
  page,
}) => {
  await prepare(page, true);
  await page.evaluate(() => {
    (window as any).__documentBefore = document;
  });
  await page.getByRole("button", { name: "配置 API Key", exact: true }).click();
  await page.getByRole("link", { name: /获取 API Key/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__openedUrls))
    .toEqual(["https://platform.deepseek.com/api_keys"]);
  expect(
    await page.evaluate(() => (window as any).__documentBefore === document),
  ).toBe(true);
  await expect(page.getByRole("dialog", { name: "配置模型" })).toBeVisible();
});

test("switching app tabs retains the selected photo and crop state", async ({
  page,
}) => {
  await prepare(page);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/assets/regression-question.png");
  await page.getByRole("button", { name: "旋转", exact: true }).click();
  const before = await page
    .locator("canvas")
    .evaluate((el: HTMLCanvasElement) => el.toDataURL());
  const nav = page.getByRole("navigation", { name: "应用导航" });
  await nav.getByRole("link", { name: "讲题记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "讲过的题，都在这里。" }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "拍题讲解", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "取消选择照片" }),
  ).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate((el: HTMLCanvasElement) => el.toDataURL()),
  ).toBe(before);
});

test("leaving capture cancels recognition without redirecting the current app tab", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("jianghui-local-api-key", "test-key");
    localStorage.setItem("jianghui-local-api-base", "https://model.test/v1");
    localStorage.setItem("jianghui-local-model-text", "test-model");
    localStorage.setItem("jianghui-local-model-vision", "test-model");
  });
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/model.test/v1/chat/completions", async (route) => {
    requested();
    await responseGate;
    await route
      .fulfill({
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questionText: "1+2=?",
                  chapterId: "grade1_upper",
                  knowledgePointIds: [],
                  difficulty: 1,
                  keyInsight: "合起来",
                  fullSolution: "3",
                  possibleStickingPoints: [],
                }),
              },
            },
          ],
        },
      })
      .catch(() => {});
  });
  await prepare(page);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/assets/regression-question.png");
  await page.getByRole("button", { name: "就看这一题", exact: true }).click();
  await requestStarted;
  const failedRequest = page.waitForEvent("requestfailed", (request) =>
    request.url().includes("model.test"),
  );
  const nav = page.getByRole("navigation", { name: "应用导航" });
  await nav.getByRole("link", { name: "讲题记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "讲过的题，都在这里。" }),
  ).toBeVisible();
  await failedRequest;
  release();
  await expect(page).toHaveURL(/\/history$/);
  await nav.getByRole("link", { name: "拍题讲解", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "取消选择照片" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "就看这一题", exact: true }),
  ).toBeEnabled();
});
