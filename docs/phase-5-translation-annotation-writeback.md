# 阶段五第二步：翻译批注手动写入

阶段五第二步在真实 Provider 翻译输出基础上，为 `翻译` 浮窗增加手动 `写入批注` 能力。翻译请求返回时仍不自动创建 annotation、不自动写入 comment、不自动高亮。

## 测试包

```text
dist/zotero-annotai-0.1.19.xpi
```

## 行为说明

- `写入批注` 只在翻译成功后显示。
- 点击 `写入批注` 后，当前翻译结果会写入 Zotero annotation comment。
- 如果当前 Zotero selection 事件提供了已有可编辑 annotation 的 `id/key`，优先更新该 annotation comment，并用当前翻译结果覆盖原 comment。
- 重新拖选与已有批注相同的文本范围通常只是新的文本选区 draft；当前版本不会按文本范围或 position 自动匹配旧批注，因此点击 `写入批注` 会创建新的 annotation。
- 如果当前只是普通文本选区 draft，则只在点击 `写入批注` 后按设置创建 annotation，并写入 comment。
- 新建 annotation 默认配置为：翻译洋红色高亮、解释绿色高亮、问答橙色高亮；0.1.19 只启用翻译写入。
- `解释` 和 `问答` 继续保持诊断壳，不接 AI、不写批注。

## 隐私和诊断

- 日志不输出完整 selectedText。
- 日志不输出完整 annotation position。
- 日志不输出完整 prompt 或翻译结果。
- 写入失败时显示脱敏后的错误信息，不泄露 Provider key。

## 手动验收

1. 安装 `dist/zotero-annotai-0.1.19.xpi` 并重启 Zotero。
2. Debug Output 中确认出现 `Startup 0.1.19`。
3. Provider 设置页和连接测试仍正常。
4. 批注写入设置可保存并在重新打开设置页后保持。
5. 打开 PDF，选择文本并点击 `翻译`。
6. 翻译完成前不自动创建 annotation、不高亮、不写 comment。
7. 翻译成功后点击 `写入批注`。
8. Zotero annotation comment 中出现当前翻译结果。
9. 若要验证覆盖已有批注，前提是当前 selection snapshot 中有已有 annotation key；单纯重新拖选同一段文本会创建新 annotation，不应当作为覆盖测试。
10. 写入失败时 UI 显示可理解错误。
11. Zotero 原生按钮、Translate for Zotero 和 AnnotAI 三个按钮都正常。
12. 翻译浮窗拖动、缩放、关闭、置顶正常。
13. 同选区重复点击、新选区替换旧请求和 stale request 丢弃逻辑保持不变。
14. PDF 鼠标滚轮正常。
