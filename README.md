# Zotero AnnotAI

Zotero AnnotAI 是一个面向 Zotero 7 PDF 阅读器的 AI 辅助阅读与批注插件。

当前仓库处于阶段五第二步：在阶段五第一步真实 Provider 翻译输出基础上，给 `翻译` 浮窗增加手动 `写入批注` 能力。翻译完成仍不会自动写批注、不会自动高亮，`解释` 和 `问答` 仍保持诊断壳。

## 当前能力

- 提供兼容 Zotero 7.0.x 的 `manifest.json`。
- 提供 `bootstrap.js` 生命周期入口。
- 提供根目录 `prefs.js` 默认偏好。
- 提供 Zotero 设置页，用于配置单个 OpenAI-compatible Provider。
- Provider 配置持久化到 `Zotero.Prefs`，支持 base URL、model、API key、超时和流式能力标记。
- 提供连接测试，请求只发送固定 ping prompt，不发送 PDF 选区文本。
- 提供请求 runner、OpenAI-compatible client、超时/取消和 Provider 错误分类。
- 在 Zotero 原生文本选区弹窗内部追加 AnnotAI 操作区，不替换 Zotero 自带按钮或其他插件入口。
- 点击 `翻译` 时打开翻译小浮窗并调用 Provider 返回真实翻译结果。
- 翻译成功后可点击 `写入批注`，把当前翻译结果写入 Zotero annotation comment；如果当前 Zotero selection 事件提供了已有 annotation 的 `id/key`，会覆盖该 annotation comment。
- 重新拖选与已有批注相同的文本范围通常会被 Zotero 视为新的普通文本选区 draft，当前版本不会按位置自动匹配旧批注，点击 `写入批注` 会创建新的 annotation。
- 未保存的普通文本选区只有在点击 `写入批注` 后才会按设置创建 Zotero annotation，默认翻译为洋红色高亮。
- 设置页提供翻译、解释、问答三类动作的新建 annotation 样式和颜色配置；0.1.19 仅翻译实际写入。
- 点击 `解释`、`问答` 时仍打开对应诊断小浮窗，并将当前选区快照写入 Zotero Debug Output。
- 翻译、解释和问答重复点击会复用同一个浮窗，不改变浮窗位置和大小。
- 翻译请求执行中重复点击同一选区不会重发请求；切换到新选区点击翻译会丢弃旧请求结果并立刻请求新文本。
- 点击任意 AnnotAI 浮窗的可见区域都会将该浮窗置顶。
- 打开、升级和聚焦提示使用底部中间渐入渐出的 toast，不占用选区弹窗空间。
- AnnotAI 诊断浮窗只管理自身层级，位于 Zotero 阅读器普通内容、侧栏和原生选区弹窗之上；不修改 Zotero 原生弹窗或其祖先节点的层级样式。
- 提供 `npm run package` 打包命令。
- 输出 `dist/zotero-annotai-0.1.19.xpi`。

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
dist/zotero-annotai-0.1.19.xpi
```

打开 Zotero Debug Output 后，应能看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.19
```

打开 Zotero 设置页，应出现 AnnotAI Provider 配置和批注写入配置。填入 OpenAI-compatible base URL、model 和 API key 后，可以点击连接测试。打开 PDF 并选中文本后，Zotero 原生文本选区弹窗内部仍应出现 `AnnotAI | 翻译 | 解释 | 问答`，且 Zotero 自带高亮/注释按钮和其他插件入口仍然保留。点击 `翻译` 后，应打开可拖动、可缩放、可关闭的小浮窗，并显示真实 Provider 翻译结果；翻译成功后可手动点击 `写入批注`。点击 `解释` 或 `问答` 仍显示诊断小浮窗。

更多开发说明见 `docs/dev-setup.md`、`docs/phase-2-reader-selection.md`、`docs/phase-3-floating-panel.md`、`docs/phase-4-provider-request.md`、`docs/phase-5-translation-provider-output.md` 和 `docs/phase-5-translation-annotation-writeback.md`。
