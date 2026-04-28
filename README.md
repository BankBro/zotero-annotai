# Zotero AnnotAI

Zotero AnnotAI 是一个面向 Zotero 7 PDF 阅读器的 AI 辅助阅读与批注插件。

当前仓库处于第一阶段：先建立 Zotero 7 插件最小骨架，验证插件可以被 Zotero 安装、启动和关闭。这个阶段不包含 AI Provider、PDF 选区、悬浮窗或批注功能。

## 当前能力

- 提供兼容 Zotero 7.0.x 的 `manifest.json`。
- 提供 `bootstrap.js` 生命周期入口。
- 提供根目录 `prefs.js` 默认偏好。
- 提供 `npm run package` 打包命令。
- 输出 `dist/zotero-annotai-0.1.1.xpi`。

## 快速验证

```powershell
npm run package
```

然后在 Zotero 7 中安装：

```text
Tools -> Add-ons -> 齿轮菜单 -> Install Add-on From File...
```

选择：

```text
dist/zotero-annotai-0.1.1.xpi
```

打开 Zotero Debug Output 后，应能看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.1
```

更多开发说明见 `docs/dev-setup.md`。
