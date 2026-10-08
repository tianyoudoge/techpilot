# 讲会客户端

Vue 3 + TypeScript + Vite，H5 与 Tauri 共用业务代码。识题、讲稿、验证题和笔记由客户端完成；轻服务端提供知识资产、可复用讲解和老师片段目录。第一版供应商为 DeepSeek 和阿里云百炼，在模型设置中填写用户自己的 Key。

第一次读代码，先看 [前端代码导读](../docs/前端代码导读.md)：包含模块地图、实际流程以及面向 JS 使用者的 TS/Vue 语法说明。

## 本地开发

在旁边的私有服务端仓库启动资产服务：

```sh
cd ../../techpilot-assets
cp config/config.example.yaml config/config.yaml
python3 scripts/restore-assets.py
go run ./cmd/server
```

另开终端启动前端：

```sh
cd frontend
npm ci
npm run dev
```

浏览器打开 `http://localhost:5173/`。开发服务器将 `/api` 转发至 `127.0.0.1:8080`；可通过 `API_PROXY_TARGET` 修改转发目标。

Tauri 局域网测试地址固定为 `http://192.168.0.112:5173`。电脑与手机需能互相访问。iOS 的资产请求使用 WebView，模型请求使用原生 HTTP；更换电脑 IP 后需同步修改平台地址、HTTP 权限和 iOS 的 ATS IP 例外。

## 代码布局

```text
src/
  pages/                     页面模板和页面入口
  components/                裁剪、知识树、公式等展示模块
  composables/
    useTeachingSession.ts    讲题页面状态和用户操作
  lib/
    teaching/                识题、讲稿、练习、知识上下文
    model/                   模型通信与提示词
    assets/                  资产下载、缓存、回传队列
    sessions/                本地笔记存储与进度规则
    model-config.ts          本机模型设置
    model-providers.ts       供应商和模型选项
    client-store.ts          IndexedDB 基础读写
    platform.ts              H5/Tauri 平台差异
    api.ts / api-client.ts   轻服务端请求
    ui-state.ts              全局界面状态
    formatters.ts            纯展示工具
```

`local-llm.ts`、`assets.ts` 保留原有导出路径，具体实现已按职责拆开。类型说明集中在 `types.ts` 文件中；类型不参与运行时的数据验证。

## 流程与存储

拍照/选图 → 旋转裁剪 → 识题与卡点 → 家长讲稿和基础知识 → 分步骤讲题 → 类似题、变式题验证 → 保存历史。已有资产优先复用；缺失资产由客户端生成、独立复核、保存后排队回传。

照片、笔记与进度存入设备 IndexedDB，Key 和供应商配置存入设备 localStorage。正常流程不需要旧版账号登录，也不会把原题照片或 Key 回传到共享资产服务。清除浏览器/应用数据会影响本机历史与配置。

旧版服务端笔记只在兼容模式下读取；相关账号和服务端讲题代码保留用于旧数据，不是新流程的入口。

## 构建与验证

```sh
cd frontend
npm run build
npm run test:e2e
```

构建包含 TypeScript 类型检查。默认回归使用隔离数据，不消耗真实模型额度；涉及隔离服务端或管理员 Token 的专项用例在未配置时跳过。首次使用 Playwright 可运行 `npx playwright install chromium`。

WebKit 回归：

```sh
npx playwright install webkit
UI_BROWSER=webkit npm run test:e2e
```

iOS 的 Xcode 构建前先执行 `npm run build`，确保打包的是最新前端。工具链、签名、启动方式见 [客户端多端说明](../docs/client-platform.md)。

## 更多说明

- [应用形态验收](../docs/应用形态验收.md)
- [前端代码导读](../docs/前端代码导读.md)
- [视觉设计规范](../docs/讲会视觉设计规范.md)

历史验收报告描述当时版本；当前客户端架构与模块位置以本文件和代码导读为准。
