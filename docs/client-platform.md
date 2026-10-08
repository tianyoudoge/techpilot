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
