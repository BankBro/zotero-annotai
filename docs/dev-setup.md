# 开发环境与打包说明

本文档记录 Zotero AnnotAI 当前阶段的开发、打包和手动验证方式。

## 环境要求

- Zotero 7.0.x。
- Node.js 20 或更高版本。
- npm。
- PowerShell。
- Git。

当前阶段没有第三方 npm 依赖，不需要执行 `npm install`。

## 打包

在仓库根目录运行：

```powershell
npm run package
```

打包完成后会生成：

```text
dist/zotero-annotai-0.1.14.xpi
```

这个 `.xpi` 目前包含 Zotero 插件最小文件、阶段二选区验证脚本、阶段三浮窗脚本、阶段四 Provider 请求层壳和阶段五翻译请求接入：

```text
manifest.json
bootstrap.js
prefs.js
preferences.xhtml
preferences.css
preferences.js
src/provider-errors.js
src/settings.js
src/openai-compatible-client.js
src/request-runner.js
src/translation-task.js
src/floating-panel.js
src/reader-selection.js
```

当前插件 ID：

```text
zotero-annotai@example.com
```

当前更新地址是开发期占位值：

```text
https://example.com/zotero-annotai/updates.json
```

发布前需要替换为真实更新清单地址。

## 安装到 Zotero

在 Zotero 7 中：

```text
Tools -> Add-ons -> 齿轮菜单 -> Install Add-on From File...
```

选择：

```text
dist/zotero-annotai-0.1.14.xpi
```

## 查看启动日志

在 Zotero 中打开 Debug Output：

```text
Help -> Debug Output Logging -> View Output
```

安装、启用或重启 Zotero 后，应看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.14
[Zotero AnnotAI] Provider request runner initialized
[Zotero AnnotAI] Preference pane registered
[Zotero AnnotAI] Floating panel module initialized
[Zotero AnnotAI] Reader selection listener registered
```

禁用或卸载插件时，应看到类似：

```text
[Zotero AnnotAI] Shutdown 0.1.14
[Zotero AnnotAI] Uninstall 0.1.14
```

## 阶段二选区验证

在 Zotero 7 中打开任意 PDF，鼠标选中一段文字。Zotero 原生文本选区弹窗内部应出现：

```text
AnnotAI | 翻译 | 解释 | 问答
```

点击任意按钮后，Debug Output 中应看到类似日志：

```text
[Zotero AnnotAI] Selection snapshot {"action":"translate","charCount":42,...}
```

这个日志表示插件已经拿到了当前选区文本、长度、reader 类型和可获得的条目元数据。

更完整的阶段二验收说明见 `docs/phase-2-reader-selection.md`。

## 阶段三浮窗验证

在 Zotero 7 中打开任意 PDF，鼠标选中一段文字。点击 `翻译`、`解释` 或 `问答` 后，应打开对应诊断小浮窗。

阶段三浮窗应支持：

- 拖动标题栏改变位置。
- 拖动右下角调整大小。
- 点击右上角关闭。
- 点击浮窗任意可见区域将该浮窗置顶。
- 显示当前选区和条目元数据的详细诊断。
- 初始打开使用固定可见位置；重复点击同一动作时保留已有浮窗位置和大小。
- 打开、升级和聚焦提示通过底部中间渐入渐出的 toast 显示，不写在 Zotero 原生选区弹窗里。
- AnnotAI 操作区应追加在 Zotero 原生文本选区弹窗内部，不能让 Zotero 自带按钮或其他插件入口消失。
- AnnotAI 浮窗位于 Zotero 阅读器普通内容、侧栏和原生选区弹窗之上；插件不修改 Zotero 原生选区弹窗或其祖先节点的层级样式，避免阻断浮窗拖拽、关闭、缩放和 PDF 滚轮滚动。

重复点击规则：

- `翻译`：更新同一个翻译浮窗的当前选区诊断，并增加升级次数。
- `解释`：更新同一个解释浮窗的当前选区诊断，并增加升级次数。
- `问答`：更新同一个问答浮窗的当前选区诊断，并增加升级次数；不新开、不移动已有浮窗。

更完整的阶段三验收说明见 `docs/phase-3-floating-panel.md`。

## 阶段四 Provider 请求层验证

打开 Zotero 设置页中的 AnnotAI Provider 配置，填入：

- OpenAI-compatible base URL，例如包含 `/v1` 的 API root。
- 模型 ID。
- API key。
- 请求超时时间。

点击 `保存配置` 后，配置会写入 `Zotero.Prefs`。点击 `连接测试` 后，插件只发送固定 ping prompt，不发送 PDF 选区文本。

阶段四应支持：

- 配置完整且 Provider 可用时显示连接测试成功。
- 空 base URL 或空 model 时显示配置不完整。
- 错误 API key 显示认证失败，不在日志或状态里输出 key。
- 错误 endpoint、网络失败、超时和限流错误有可理解提示。
- `取消测试` 可以中断正在进行的连接测试。

更完整的阶段四验收说明见 `docs/phase-4-provider-request.md`。

## 阶段五第一步翻译验证

在 Provider 配置可用后，打开 PDF，选中文本并点击 `翻译`。翻译浮窗应显示 `正在翻译...`，请求返回后显示真实 Provider 翻译结果、模型和耗时。

阶段五第一步应支持：

- `翻译` 浮窗真实调用 Provider。
- 默认输出中文。
- 请求只发送选中文本和论文标题、作者、日期等元数据。
- 同一文本请求未返回时重复点击 `翻译` 不发送第二个请求。
- 新文本请求会替换当前翻译浮窗内容，并丢弃旧请求结果。
- `解释` 和 `问答` 仍为诊断壳。
- 不创建高亮，不写入批注。

更完整的阶段五验收说明见 `docs/phase-5-translation-provider-output.md`。

## 当前阶段边界

当前阶段验证插件骨架、PDF 阅读器选区接入、浮窗 UI 基础、Provider 请求层壳和翻译浮窗真实 Provider 输出：

- 能被 Zotero 7 安装。
- 能执行 bootstrap 生命周期。
- 能加载根目录 `prefs.js` 默认偏好。
- 能通过脚本打包为 `.xpi`。
- 能在 PDF 文本选区弹窗内部接入 AnnotAI 操作区。
- 能把选区快照写入 Debug Output。
- 能打开、拖动、缩放和关闭翻译/解释/问答诊断小浮窗。
- 能在 Zotero 设置页配置单个 OpenAI-compatible Provider。
- 能保存 Provider 配置并执行连接测试。
- 能分类认证、限流、模型、网络、超时和响应格式错误。
- 能让 `翻译` 浮窗调用 Provider 并显示结果。
- 能用 requestID 防止旧翻译结果覆盖新选区。

当前阶段不包含：

- 真实解释、问答请求。
- 高亮和批注写入。
