# 讲会 · TechPilot 客户端

H5 + Tauri 共用的家长讲题客户端，采用 Vue 3、TypeScript 和 Rust。支持 DeepSeek、阿里云百炼；用户在设备端配置自己的 API Key。识题、讲解、练习生成和历史记录在客户端完成，已有共享资产优先复用。

此公开仓库包含 `frontend/`、客户端文档与 GitHub Actions；服务端、课程目录、转录和知识资产在独立私有仓库 `tianyoudoge/techpilot-assets` 中。客户端构建不需要私有仓库。

## 开发

```sh
cd frontend
npm ci
npm run dev
```

开发服务器的 `/api` 默认转发到 `http://127.0.0.1:8080`。运行功能需要另行启动资产服务；构建不依赖该服务。当前原生端保留局域网测试地址 `http://192.168.0.112:5173`。

```sh
npm run build
npm run desktop:build
```

Actions 自动构建 H5 及 macOS、Windows、Linux 桌面包，也可手动运行。iOS/Android 的签名与分发仍需自己的开发者配置，见[多端开发](docs/client-platform.md)。

从[前端代码导读](docs/前端代码导读.md)开始阅读；更多模块和测试说明见[客户端 README](frontend/README.md)。
