# Zotero AnnotAI

Zotero AnnotAI 是一个面向 Zotero 7 PDF 阅读器的 AI 辅助阅读与批注插件。

当前仓库处于第三阶段：在 Zotero 7 PDF 阅读器中把选区操作接入可拖动、可缩放、可关闭的小浮窗。这个阶段不包含 AI Provider、高亮或批注写入。

## 当前能力

- 提供兼容 Zotero 7.0.x 的 `manifest.json`。
- 提供 `bootstrap.js` 生命周期入口。
- 提供根目录 `prefs.js` 默认偏好。
- 在 Zotero 原生文本选区弹窗内部追加 AnnotAI 操作区，不替换 Zotero 自带按钮或其他插件入口。
- 点击 `翻译`、`解释`、`问答` 时打开对应诊断小浮窗，并将当前选区快照写入 Zotero Debug Output。
- 翻译、解释和问答重复点击会更新同一个浮窗的当前选区诊断，不改变浮窗位置和大小。
- 点击任意 AnnotAI 浮窗的可见区域都会将该浮窗置顶。
- 打开、升级和聚焦提示使用底部中间渐入渐出的 toast，不占用选区弹窗空间。
- AnnotAI 诊断浮窗只管理自身层级，位于 Zotero 阅读器普通内容、侧栏和原生选区弹窗之上；不修改 Zotero 原生弹窗或其祖先节点的层级样式。
- 提供 `npm run package` 打包命令。
- 输出 `dist/zotero-annotai-0.1.12.xpi`。

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
dist/zotero-annotai-0.1.12.xpi
```

打开 Zotero Debug Output 后，应能看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.12
```

打开 PDF 并选中文本后，Zotero 原生文本选区弹窗内部应出现 `AnnotAI | 翻译 | 解释 | 问答`，且 Zotero 自带高亮/注释按钮和其他插件入口仍然保留。点击任一按钮后，应打开可拖动、可缩放、可关闭的诊断小浮窗；底部中间出现短暂 toast，Debug Output 中出现 `[Zotero AnnotAI] Selection snapshot ...`。

更多开发说明见 `docs/dev-setup.md`、`docs/phase-2-reader-selection.md` 和 `docs/phase-3-floating-panel.md`。
