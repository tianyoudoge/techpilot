<div align="center">
  <img src="frontend/src-tauri/icons/icon.png" width="128" alt="讲会：对话框、白色对号与青柠光点">
  <h1>讲会 · TechPilot</h1>
  <p><strong>从看懂，到讲会。</strong></p>
  <p>先帮家长弄明白，再一步一步讲给孩子听。</p>
  <p>
    <a href="https://github.com/tianyoudoge/techpilot/actions/workflows/clients.yml"><img src="https://github.com/tianyoudoge/techpilot/actions/workflows/clients.yml/badge.svg?branch=main" alt="客户端构建"></a>
    <a href="https://github.com/tianyoudoge/techpilot/stargazers"><img src="https://img.shields.io/github/stars/tianyoudoge/techpilot?label=Stars&logo=github" alt="GitHub Stars"></a>
    <img src="https://img.shields.io/badge/阶段-早期测试版-365AE8" alt="早期测试版">
  </p>
  <p>
    <a href="#讲题时真正需要的帮助">产品特色</a> ·
    <a href="#一次讲题怎么进行">使用流程</a> ·
    <a href="#平台与获取方式">平台与获取方式</a> ·
    <a href="#developer-guide">开发者接入</a>
  </p>
</div>

---

## 一道题，家长也能讲得明白

孩子拿着一道数学题来问，家长可能记得答案，却想不起该从哪里讲起。讲会把题目、需要补的基础和讲解步骤放在一起：先让你理解这道题，再给出可以问孩子的问题，最后用另一道题检查理解。

现在从初中数学开始，帮助家长陪孩子完成一次有头有尾的讲题。

<div align="center">
  <img src="docs/images/home-desktop.png" width="960" alt="讲会首页：拍一道题、补基础、分步骤讲解、做题验证">
</div>

## 讲题时真正需要的帮助

| 讲题遇到的事 | 讲会怎么帮你 |
| --- | --- |
| 题目在纸上，输入公式太麻烦 | 拍照或选图，旋转、裁剪后识别题目 |
| 看得懂答案，讲起来还是乱 | 先看面向家长的讲解，再按步骤提问 |
| 孩子不会，是前面的基础没懂 | 沿知识树查看前置知识、例子和数学图示 |
| 讲到一半卡住了 | 选择卡点，尝试标准、简化或直观的讲法 |
| 孩子说“会了”，还想确认一下 | 用类似题检查理解，再用变式题换个条件试试 |
| 昨天讲过，今天想接着看 | 在“最近讲过”和历史记录里继续，笔记和进度保存在本机 |

### 讲解之外，再多走一步

- **先补基础。** 知识点和本题解法分开阅读，公式、例子和图示各有位置。
- **问孩子，而不只是念答案。** 分步骤的问题与提示，让家长有具体的话可以接着问。
- **用练习检查理解。** 类似题和变式题帮助区分“刚刚听懂”与“换个条件也能做”。
- **积累能复用的讲解。** 优先使用已有知识与练习；缺失内容由模型生成并独立复核，再保存、排队回传。
- **自己的模型，自己的记录。** 首版支持 DeepSeek 和阿里云百炼，供应商与模型通过选项选择；API Key 保存在设备上。

## 一次讲题怎么进行

1. **放进题目。** 拍照或选择图片，裁掉无关内容。
2. **先让自己明白。** 看题目分析，选出孩子卡住的地方，阅读基础知识与家长讲稿。
3. **一步一步讲。** 跟着问题和提示往下走，需要时换一种讲法。
4. **做一道，再检查。** 试试类似题和变式题，记录这次的理解情况。
5. **下次接着看。** 返回首页或历史记录，回顾已经讲过的题。

第一次使用时，在“配置模型”中选择 **DeepSeek** 或 **阿里云百炼**，选择模型并填写对应的 API Key；弹窗里提供获取密钥的入口。模型调用使用该供应商的账户额度。

## 平台与获取方式

讲会处于早期测试阶段。H5 与原生应用使用同一套讲题流程，手机为主要使用入口。

| 平台 | 当前状态 |
| --- | --- |
| H5 | 可在浏览器运行；需要连接资产服务 |
| macOS / Windows / Linux | 已配置自动构建，可在 [Actions](https://github.com/tianyoudoge/techpilot/actions/workflows/clients.yml) 下载成功任务的产物；平台体验仍在完善 |
| iOS | 已在 iPhone 完成讲题流程测试，当前通过开发签名安装 |
| Android | 已有原生工程，完整安装包构建与真机验证仍待完成 |

目前没有正式商店上架版本或公共在线体验地址。当前原生测试包连接开发环境的局域网资产服务；下载构建产物后仍需配置对应环境。

## 关于题目、笔记和模型

照片、讲题笔记与进度保存在当前设备上，清除应用或浏览器数据会影响这些记录。识题和讲解时，相关题目内容会发送到你选择的模型供应商。共享资产服务接收可复用的知识与练习，不接收用户的 API Key 或原题照片。

模型生成的数学内容可能有误；家长可以对照步骤、例题和孩子的实际作答进行复核。讲会提供的是讲题辅助，掌握情况还需要结合实际练习判断。

---

<a id="developer-guide"></a>

## 开发者接入

公开仓库包含 H5、Tauri 原生壳、客户端文档与构建配置。Go 轻资产服务、生产管线、课程目录、转录和知识资产在独立私有仓库中；客户端构建不需要读取私有仓库。

### 运行 H5

需要 Node.js 22。在仓库根目录执行：

```sh
cd frontend
npm ci
npm run dev
```

浏览器打开 `http://localhost:5173/`。Vite 默认将 `/api` 转发至 `http://127.0.0.1:8080`，可通过 `API_PROXY_TARGET` 更换资产服务地址。完整讲题流程需要兼容的资产服务，当前仓库不附带私有知识库。

### 构建和验证

```sh
cd frontend
npm run build
npm run test:e2e
npm run desktop:build
```

`npm run build` 包含 TypeScript 类型检查。端到端测试使用隔离数据，默认不消耗真实模型额度；首次运行需执行 `npx playwright install chromium`。桌面构建还需要 Rust 和对应平台的 Tauri 系统依赖。

### 图标与多端配置

页面标志的源文件为 [`brand-mark.svg`](frontend/src/assets/brand-mark.svg)。修改后在 `frontend` 执行 `npm run icons`，同步生成网页图标、桌面图标与已有 iOS/Android 工程的应用图标。

当前原生测试地址固定为 `http://192.168.0.112:5173`。更换环境时需同步修改平台地址、HTTP 权限和 iOS 的 ATS IP 例外，具体见[多端开发](docs/client-platform.md)。

### 阅读代码

- [前端代码导读](docs/前端代码导读.md)：面向有 JavaScript 基础的读者，说明 TypeScript、Vue 与模块分工。
- [客户端 README](frontend/README.md)：模块布局、存储与测试命令。
- [多端开发](docs/client-platform.md)：桌面、iOS、Android 的工具链和签名说明。
- [视觉设计规范](docs/讲会视觉设计规范.md)：标志、配色与页面排版。
