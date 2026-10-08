# 多端开发

H5 和 Tauri 复用 `frontend/src`。原生壳位于 `frontend/src-tauri`，macOS 使用融入应用风格的标题栏，iOS 保留全屏布局、中文显示名和局域网访问修复。

## 桌面

安装 Node.js 22、Rust 与 Tauri 对应操作系统的构建依赖。在 `frontend` 执行 `npm ci`，然后 `npm run desktop:dev` 或 `npm run desktop:build`。

## iOS

需要 macOS、完整 Xcode、CocoaPods 和 iOS Rust 目标。先执行 `rustup target add aarch64-apple-ios`，在 `frontend` 执行 `npm run ios:xcode`，再在 Xcode 中选择自己的签名 Team 和设备。公开工程没有预设个人签名 Team。

内部产品名 `JiangHui`，手机显示名 `讲会`。不要将内部产品名改为中文；现有配置用于避免此前原生启动问题。仓库保留已有 iOS 工程，不要直接覆盖它的 Info.plist、LaunchScreen 和项目配置。

## Android

需要 JDK 17、Android SDK 与 NDK。`scripts/mobile-env.sh` 提供当前 macOS 工具链配置，可按本机安装位置调整。执行 `rustup target add aarch64-linux-android`，在 `frontend` 执行 `npm run android:build`。Gradle 依赖路径由 Tauri CLI 为本机生成，不提交本机 Cargo 绝对路径。

## 局域网资产服务

当前原生测试服务地址固定为 `http://192.168.0.112:5173`，由 Vite 代理到资产服务的 8080 端口。iOS 资产请求走 WebView，模型请求走原生 HTTP。首次使用允许本地网络访问。

更换测试地址时需一起修改 `src/lib/platform.ts`、`src-tauri/capabilities/default.json`、`src-tauri/Info.ios.plist` 及已有 iOS 工程中的 IP 例外。

GitHub Actions 当前构建 H5 与桌面包；移动端签名构建尚未接入 CI。

## 国内镜像、无代理构建（2026-10-08 验证）

Android 的 Google Maven、Maven Central 与 Gradle 插件仓库已改为阿里云 HTTPS 镜像。项目根构建和 buildSrc 插件解析都已覆盖；不修改其他项目的全局仓库配置。

在仓库根目录执行：

```sh
source frontend/scripts/mobile-env.sh
npm run android:build:cn --prefix frontend -- --debug --target aarch64
```

`android:build:cn` 仅清理本次子进程的 HTTP/HTTPS/ALL_PROXY（含小写）及可能注入 Java 代理的环境变量，将 JVM 的 HTTP、HTTPS、SOCKS 代理主机设为空，并关闭常驻 Gradle daemon 的复用。它不会修改系统代理或用户全局配置。其他平台先配置本机的 JDK、SDK、NDK 和 Rust；mobile-env.sh 是当前 macOS 的环境示例。

本次构建复用已下载的 Gradle 9.6.1 分发包；Gradle wrapper 的下载地址未修改。Maven 依赖使用阿里云的 google、central、gradle-plugin 镜像。

已成功产出：

- `frontend/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
- `frontend/src-tauri/gen/android/app/build/outputs/bundle/universalDebug/app-universal-debug.aab`

文件名中的 universal 是 Gradle 的构建变体，本次实际仅包含 `arm64-v8a`。应用显示名为“讲会”，调试包标识为 `com.teachpilot.app.debug`，最低 API 24。APK 签名和 ZIP 完整性检查通过；本机没有连接安卓设备，因此尚未安装和验证真机流程。调试包包含调试符号，约 166 MiB。

旧 TLS 错误本次没有重现；Java 对原 Maven 地址和阿里云镜像的直连探测都返回 200。能够确认的是国内镜像、无显式代理构建成功，尚不能据此断言旧故障的唯一根因。

## 应用形态

H5 使用 history 路由，Tauri 使用 hash 路由。所有业务页面共用应用外壳；H5 部署需配置子路径回退到 index.html。内部管理页默认关闭，仅维护环境设置 `VITE_INTERNAL_TOOLS=1` 后启用。验证标准、状态保留和真机边界见 [应用形态验收](应用形态验收.md)。

## 资产版本与缓存

每次启动应用或刷新 H5 时，后台检查一次资产包版本：本地有缓存则携带 If-None-Match，无变化返回 304，有变化下载新全量包并保存至 IndexedDB。本次打开期间复用内存快照，没有 60 秒定期失效；页面切换和切后台再回前台不会自动检查资产版本。首次校验不阻塞首页，网络失败时使用旧缓存，无缓存的失败允许后续业务读取重试。修改模型配置不会清空资产快照。没有手动强制刷新入口或接口；本地生成资产和回传状态每次读取时合并。

## iOS 真机回归（2026-10-08）

iPhone 15 / iOS 18.6.2 已覆盖图片输入、裁切、真实 DeepSeek 识题、家长学习、六步讲题、类似题、变式题和结果恢复；学习反馈由测试操作模拟。系统相机与相册选择器未实测。全量自动回归 51 项通过，3 项因专项环境条件跳过。

Vite 开发服务显式允许 Tauri 来源的跨域预检，保证带 If-None-Match 的缓存资产请求可用。官方 DeepSeek 请求关闭 thinking，让有限输出额度用于返回结构化正文，避免思考耗尽额度后正文为空；其他供应商请求不添加这个字段。
