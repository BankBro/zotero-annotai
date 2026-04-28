# 阶段三：浮窗 UI 基础验证

阶段三用于验证 Zotero AnnotAI 能从 PDF 文本选区弹窗打开真正的小浮窗。这个阶段只做 UI 基础，不调用 AI，不创建高亮，也不写入批注。

## 打包

在仓库根目录运行：

```powershell
npm run package
```

生成文件：

```text
dist/zotero-annotai-0.1.12.xpi
```

## 安装

在 Zotero 7 中打开：

```text
Tools -> Add-ons -> 齿轮菜单 -> Install Add-on From File...
```

选择：

```text
dist/zotero-annotai-0.1.12.xpi
```

## 查看日志

打开 Zotero Debug Output：

```text
Help -> Debug Output Logging -> View Output
```

安装、启用或重启 Zotero 后，应看到：

```text
[Zotero AnnotAI] Startup 0.1.12
[Zotero AnnotAI] Floating panel module initialized
[Zotero AnnotAI] Reader selection listener registered
```

## 验证浮窗

1. 在 Zotero 中打开任意 PDF。
2. 鼠标选中一段可复制文本。
3. Zotero 原生文本选区弹窗内部应出现 AnnotAI 操作区，且 Zotero 自带按钮和其他插件入口仍然保留。
4. 在 AnnotAI 操作区中点击 `翻译`、`解释` 或 `问答`。
5. 应出现对应的 `AnnotAI · 翻译/解释/问答` 诊断小浮窗。
6. 小浮窗应支持拖动标题栏、拖动右下角缩放、点击右上角关闭。
7. 点击任意 AnnotAI 小浮窗的可见区域，应能将该浮窗提到其他 AnnotAI 小浮窗上方。
8. 重复点击同一动作时，小浮窗内容应更新为新的选区诊断，但位置和大小保持不变。
9. 点击后的提示应以底部中间 toast 渐入渐出显示，不应写在 Zotero 原生选区弹窗后方。
10. Debug Output 中应看到 `Selection snapshot` 日志。

## 原生弹窗兼容性

- AnnotAI 操作区必须追加到 Zotero 原生文本选区弹窗内部，不使用左上角固定定位的独立工具条。
- AnnotAI 操作区不能替换、清空或隐藏 Zotero 自带高亮/注释按钮。
- AnnotAI 操作区不能替换、清空或隐藏 Translate for Zotero 等其他插件已经注入的入口。
- AnnotAI 不修改 Zotero 原生文本选区弹窗或其祖先节点的 `position` / `z-index`，避免透明覆盖层阻断鼠标和滚轮事件。
- 阶段三选择让 AnnotAI 诊断浮窗处于 Zotero 阅读器普通内容、侧栏和原生选区弹窗之上；不再通过改 Zotero DOM、挖洞或裁切来让原生弹窗压过 AnnotAI 浮窗。

## 重复点击规则

- `翻译`：同一 reader 内只保留一个翻译浮窗。重复点击会更新选区诊断，并让 `upgradeCount + 1`。
- `解释`：同一 reader 内只保留一个解释浮窗。重复点击会更新选区诊断，并让 `upgradeCount + 1`。
- `问答`：同一 reader 内只保留一个问答浮窗。重复点击会更新选区诊断，并让 `upgradeCount + 1`；不新开、不移动已有浮窗。

## Toast 提示

以下提示使用屏幕底部中间短暂 toast：

- `已打开：翻译/解释/问答`
- `已请求升级翻译回答`
- `已请求升级解释回答`
- `已更新问答内容`

## 当前不做的事情

- 不调用任何 AI Provider。
- 不发送网络请求。
- 不创建高亮。
- 不写入 Zotero annotation comment。
- 不保存聊天历史。
- 不读取 API key 或其他敏感配置。
