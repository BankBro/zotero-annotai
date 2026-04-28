# Zotero AnnotAI

Zotero AnnotAI 是一个面向 Zotero 7 PDF 阅读器的 AI 辅助阅读与批注插件。

当前仓库处于第二阶段：在 Zotero 7 PDF 阅读器中验证文本选区接入。这个阶段不包含 AI Provider、真实悬浮窗、高亮或批注写入。

## 当前能力

- 提供兼容 Zotero 7.0.x 的 `manifest.json`。
- 提供 `bootstrap.js` 生命周期入口。
- 提供根目录 `prefs.js` 默认偏好。
- 在 Zotero 原生文本选区弹窗中追加临时 AnnotAI 操作区。
- 点击 `翻译`、`解释`、`问答` 时，将当前选区快照写入 Zotero Debug Output。
- 提供 `npm run package` 打包命令。
- 输出 `dist/zotero-annotai-0.1.2.xpi`。

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
dist/zotero-annotai-0.1.2.xpi
```

打开 Zotero Debug Output 后，应能看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.2
```

打开 PDF 并选中文本后，Zotero 原生文本选区弹窗中应出现 `AnnotAI | 翻译 | 解释 | 问答`。点击任一按钮后，Debug Output 中应出现 `[Zotero AnnotAI] Selection snapshot ...`。

更多开发说明见 `docs/dev-setup.md` 和 `docs/phase-2-reader-selection.md`。
