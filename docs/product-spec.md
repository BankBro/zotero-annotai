# Zotero AI Reader 产品规格

## 1. 产品定位

本插件是一个面向 Zotero 7 PDF 阅读器的 AI 辅助阅读工具。

核心流程是：

```text
在论文 PDF 中选中文本
-> 点击 翻译 / 解释 / 问答
-> 在悬浮小窗中查看 AI 结果
-> 将选中文本高亮，并写入 AI 生成的批注
```

这个产品应该像是嵌入论文阅读流程里的阅读助手，而不是一个简单外挂到 Zotero 上的聊天框。

## 2. 主要目标

- 在 Zotero PDF 阅读器中直接对选中文本进行 AI 翻译、解释和问答。
- 将 AI 输出转换为 Zotero PDF 高亮批注。
- 通过可配置 API 连接多个 AI Provider。
- 让 AI 批注具备统一格式，便于搜索、识别和后续管理。
- 提供适合学术阅读场景的隐私、上下文、token 和费用控制。

## 3. MVP 暂不包含

- 全文 RAG。
- 跨论文或文献库级别检索。
- 扫描版 PDF 的 OCR。
- 图、表、截图或多模态理解。
- 完整的可视化 prompt 模板编辑器。
- 高级费用统计面板。
- 完全独立的系统级窗口。

除非这些功能对验证核心流程变得必要，否则应放在第二阶段。

## 4. 用户功能

### 4.1 选区工具条

当用户在 Zotero PDF 阅读器中选中文本后，在选区附近显示一个紧凑的悬浮工具条：

```text
翻译
解释
问答
```

备用入口：

- PDF 阅读器右键菜单。
- Zotero 工具栏按钮，用于打开或关闭 AI 侧边聊天。
- 后续版本增加快捷键。

### 4.2 悬浮小窗

三个选区动作分别打开对应的悬浮小窗：

- 翻译：打开翻译小浮窗。
- 解释：打开解释小浮窗。
- 问答：打开围绕当前选区的临时多轮问答小浮窗。

重复点击规则：

- 翻译：同一 reader 内只保留一个翻译浮窗；重复点击表示用户想升级回答。
- 解释：同一 reader 内只保留一个解释浮窗；重复点击表示用户想升级回答。
- 问答：同一 reader 内只保留一个问答浮窗；重复点击复用已有窗口，切换到当前选区上下文，不新开、不清空当前会话。
- 打开、升级和聚焦等短状态提示使用屏幕底部中间渐入渐出的 toast，不占用 Zotero 原生选区弹窗空间。
- 重复点击同一动作不改变已有小浮窗的位置和大小。
- AnnotAI 选区工具条接入 Zotero 原生选区弹窗内部，和 Zotero 选区操作一起出现。
- AnnotAI 选区工具条只追加自身操作区，不替换、清空或隐藏 Zotero 自带按钮和其他插件入口。
- 不修改 Zotero 原生选区弹窗的层级样式；AnnotAI 小浮窗只管理自身层级，避免破坏鼠标、滚轮和其他插件交互。

所有悬浮小窗都需要支持：

- 拖动改变位置。
- 拖动边缘或调整手柄改变大小。
- 手动关闭。
- 点击小浮窗任意可见区域即可置顶。
- loading、错误、重试、停止生成、复制和批注操作。
- 不阻塞 Zotero PDF 阅读器的正常使用。

### 4.3 翻译

翻译不只发送选中文本，还会发送附近上下文：

- 选中文本。
- 选区前方的一小段文本。
- 选区后方的一小段文本。
- 可获得时发送论文标题。
- 可获得时发送页码或章节标题。

AI 需要自动判断选区类型：

- 单词。
- 短语。
- 句子。

单词批注格式：

```text
[AI-词义]
本文义：...
常用义：...
音标：...
```

短语或句子批注格式：

```text
[AI-翻译]
...
```

翻译小浮窗提供一个批注动作：

```text
加入批注
```

点击后：

- 高亮选中文本。
- 使用设置中的翻译高亮颜色。
- 将格式化后的批注文本写入 Zotero annotation comment。
- 不保留原始 AI 回答。
- 默认覆盖已有 AI 批注。
- 覆盖用户手写批注前需要确认。

### 4.4 解释

解释使用更丰富的论文局部上下文：

- 选中文本。
- 选区前后的附近文本。
- 论文标题。
- 可获得时发送摘要。
- 可获得时发送页码和章节标题。
- 可获得时发送当前页相关文本。
- 可获得时发送附近图注或表注。

解释小浮窗提供两个批注动作：

```text
简洁批注
详细批注
```

批注格式：

```text
[AI-解释-简洁]
...
```

```text
[AI-解释-详细]
...
```

点击任一动作后：

- 高亮选中文本。
- 使用设置中的解释高亮颜色。
- 写入简洁或详细批注。
- 默认覆盖已有 AI 批注。
- 覆盖用户手写批注前需要确认。

### 4.5 临时问答小浮窗

问答会打开一个围绕当前选区的临时多轮对话窗口。

需求：

- 同一 reader 内只有一个临时问答小浮窗。
- 问答小浮窗拥有独立 thread id。
- 重复点击“问答”复用已有窗口，切换到当前选区上下文，不清空当前会话。
- 问答小浮窗可以基于选中文本、附近上下文和当前窗口历史回答追问。
- 小浮窗需要由用户手动关闭。

问答小浮窗提供两个批注动作：

```text
总结为简洁批注
总结为详细批注
```

批注格式：

```text
[AI-问答批注-简洁]
...
```

```text
[AI-问答批注-详细]
...
```

点击后：

- 将当前对话总结成适合写入批注的内容。
- 高亮原始选中文本。
- 将总结写入 annotation comment。

### 4.6 AI 侧边聊天

侧边聊天是更长期的论文阅读助手。

MVP 需求：

- 通过 Zotero 工具栏按钮打开和关闭。
- 支持任意发问。
- 可获得时识别当前选中文本。
- 可获得时使用当前论文上下文。
- 可从回答生成简洁或详细批注。
- 支持拖动调整侧边栏宽度。
- 按论文保存侧边聊天历史。

第二阶段需求：

- 将侧边聊天拖出为浮动面板。
- 全文 RAG。
- 跨论文或文献库级别检索。

## 5. AI Provider 与模型配置

插件支持多个 Provider Profile。

Provider Profile 字段：

```text
name
type: openai-compatible / ollama / lm-studio / azure-openai / custom
baseURL
apiKey
defaultHeaders
supportsStreaming
supportsReasoningEffort
supportsEmbedding
supportsVision
timeoutMs
```

Model Profile 字段：

```text
providerId
modelId
displayName
type: chat / reasoning / embedding / vision
strength: fast / balanced / strong
contextWindow
maxOutputTokens
supportedEffort: none / low / medium / high
```

任务配置：

```text
translate: provider + model + optional effort
explain: provider + model + optional effort
qa: provider + model + optional effort
annotationSummary: provider + model + optional effort
embedding: provider + embedding model
```

effort 处理规则：

- 设置界面可以暴露 effort 选项。
- 请求层必须先检查模型能力，再决定是否发送 effort。
- 如果模型不支持所选 effort，自动忽略并显示非阻塞提示。

Provider 错误处理：

- 提供连接测试，用于检查 base URL、API key 和模型可用性。
- 网络类瞬时错误可以重试。
- 认证失败、余额不足、模型不存在、请求参数错误不盲目重试。
- 每个任务可配置备用模型。
- 关键错误类型需要给出用户可理解的提示。

## 6. 上下文策略

上下文分层：

```text
L0: 只发送选中文本
L1: 选中文本 + 附近段落
L2: L1 + 标题/作者/年份/摘要/章节/页码
L3: L2 + 当前页相关文本 + 附近图注/表注
L4: 全文 RAG
L5: 跨论文或文献库检索
```

默认任务上下文：

```text
翻译：L1
解释：L2 或 L3
临时问答小浮窗：L2 + 当前选区 + 当前窗口会话历史
侧边聊天：MVP 使用 L3，后续版本升级到 L4
```

截断规则：

- 永远保留选中文本。
- 优先保留离选区最近的上下文。
- 可获得时保留论文标题、摘要、章节和页码信息。
- 聊天历史过长时，先摘要旧历史，再丢弃旧轮次。
- 默认不把整篇 PDF 文本直接塞进 prompt。

## 7. Prompt 模板系统

模板应支持变量：

```text
{{selectedText}}
{{beforeContext}}
{{afterContext}}
{{paperTitle}}
{{authors}}
{{year}}
{{abstract}}
{{sectionTitle}}
{{pageNumber}}
{{retrievedContext}}
{{chatHistory}}
{{userQuestion}}
{{targetLanguage}}
{{annotationStyle}}
{{aiAnswer}}
```

内置模板：

- 单词翻译。
- 短语或句子翻译。
- 解释。
- 临时问答。
- 侧边聊天。
- 简洁批注总结。
- 详细批注总结。

模板输出要求：

- 紧贴论文内容。
- 上下文不足时明确说明不确定。
- 不编造定义、实验结果、引用或页码。
- 批注输出中不保留原始聊天格式。
- 输出内容适合直接写入 Zotero annotation comment。

## 8. 内置 Prompt 模板 v1

### 8.1 翻译

```text
你是学术论文阅读助手。请根据论文上下文翻译用户选中的文本。

论文标题：{{paperTitle}}
页码：{{pageNumber}}
章节：{{sectionTitle}}

上文：
{{beforeContext}}

选中文本：
{{selectedText}}

下文：
{{afterContext}}

要求：
1. 判断选中文本是单词、短语还是句子。
2. 如果是单词，输出音标、本文义、常用义和一个很短的语境说明。
3. 单词输出中必须把“本文义”放在“常用义”上面。
4. 如果是短语或句子，直接给出准确、自然的{{targetLanguage}}翻译。
5. 翻译必须贴合本文语境，不要扩展解释。
```

### 8.2 解释

```text
你是学术论文阅读助手。请解释用户选中的文本在当前论文中的含义。

论文标题：{{paperTitle}}
作者：{{authors}}
年份：{{year}}
摘要：{{abstract}}
章节：{{sectionTitle}}
页码：{{pageNumber}}

上文：
{{beforeContext}}

选中文本：
{{selectedText}}

下文：
{{afterContext}}

相关上下文：
{{retrievedContext}}

要求：
1. 解释这段文本在当前论文语境中的意思。
2. 如果涉及术语、方法、变量、结论、实验设置或隐含假设，请指出。
3. 不要泛泛科普，要紧贴论文内容。
4. 如果上下文不足，请明确说明不足之处。
5. 输出包括“核心意思”和“补充说明”。
```

### 8.3 临时问答

```text
你是嵌入 Zotero PDF 阅读器的论文阅读助手。请基于当前论文、用户选区、上下文和当前窗口的聊天历史回答问题。

论文标题：{{paperTitle}}
摘要：{{abstract}}
当前选区：{{selectedText}}
相关上下文：{{retrievedContext}}
聊天历史：{{chatHistory}}

用户问题：
{{userQuestion}}

规则：
1. 优先基于论文内容回答。
2. 如果论文中没有足够依据，明确说明“不确定”或“当前上下文不足”。
3. 不要编造页码、实验结果、定义或引用。
4. 回答要适合正在阅读论文的人，重点解释概念、逻辑、方法和结论。
```

### 8.4 侧边聊天

```text
你是 Zotero 中的论文阅读助手。请帮助用户理解当前论文。

论文标题：{{paperTitle}}
作者：{{authors}}
年份：{{year}}
摘要：{{abstract}}
当前选区：{{selectedText}}
相关上下文：{{retrievedContext}}
聊天历史：{{chatHistory}}

用户问题：
{{userQuestion}}

要求：
1. 优先使用当前论文内容回答。
2. 当前选区存在时，优先解释当前选区。
3. 如果用户问题需要全文信息但当前上下文不足，请说明需要更多上下文。
4. 不要虚构论文没有提供的信息。
```

### 8.5 批注总结

```text
请把下面的 AI 回答转换成适合 Zotero 高亮批注的内容。

选中文本：
{{selectedText}}

AI 回答：
{{aiAnswer}}

批注类型：
{{annotationStyle}}

要求：
1. 如果批注类型是 concise，控制在 1-3 句话。
2. 如果批注类型是 detailed，可以包含要点列表，但不要太长。
3. 不保留原始对话格式。
4. 不添加无关内容。
5. 输出可以直接写入 Zotero annotation comment。
```

## 9. 批注规则

批注前缀：

```text
[AI-词义]
[AI-翻译]
[AI-解释-简洁]
[AI-解释-详细]
[AI-问答批注-简洁]
[AI-问答批注-详细]
```

覆盖策略：

- 0.1.19 当前实现只在 Zotero selection 事件提供已有 annotation 的 `id/key` 时覆盖该 annotation comment；重新拖选相同文本范围不会自动匹配旧批注。
- 如果已有 annotation comment 以 `[AI-` 开头，默认覆盖。
- 如果已有 annotation comment 看起来是用户手写内容，覆盖前需要确认。
- 高级设置可以允许始终覆盖已有批注。

标签策略：

```text
AI
AI-translation
AI-explanation
AI-chat
AI-generated-annotation
```

实现说明：

- 需要验证 Zotero PDF annotation 是否可以直接打 tag。
- 如果 annotation 级 tag 不实用，就给父 Zotero item 打 tag，并依靠批注前缀识别 AI 批注。

## 10. 隐私控制

隐私模式：

```text
最小模式：只发送选中文本
上下文模式：发送选中文本 + 附近文本 + 标题/摘要
增强模式：发送选中文本 + 当前页或全文检索片段
```

默认设置：

- 使用上下文模式。
- 默认不发送全文文本。

设置项：

- 第一次向云端 Provider 发送内容前显示提示。
- 可开启每次请求前确认。
- 可关闭论文元数据发送。
- 可关闭全文检索上下文。
- 支持本地模型优先模式。
- 不记录 API key。
- 不记录完整论文文本。
- 可清除某篇论文的 AI 记忆和聊天历史。

## 11. Token 与费用控制

全局设置：

```text
maxInputTokens
maxOutputTokens
requestTimeoutMs
streamingEnabled
dailySoftBudget
monthlySoftBudget
blockWhenBudgetExceeded
```

任务级设置：

```text
translateContextLength
explainContextLength
qaContextLength
historyTurnsToKeep
historySummaryThreshold
ragTopK
```

请求前预览应显示：

- Provider。
- 模型。
- 是否包含论文上下文。
- 是否包含聊天历史。
- 估算字符数或 token 数。

每个请求都需要支持：

- loading 状态。
- 停止生成。
- 重试。
- 复制结果。
- 插入批注。
- 清除错误显示。

## 12. 记忆与历史

记忆类型：

```text
窗口会话记忆：当前 reader 的问答小浮窗独立保存
论文级记忆：某篇论文中用户确认过的摘要或结构化事实
批注记忆：已经写入 Zotero annotation 的内容
```

规则：

- 同一 reader 内只保留一个问答小浮窗。
- 问答小浮窗有独立 thread id。
- 重复点击“问答”不清空已有会话。
- 临时问答小浮窗关闭时，可以询问用户保存或丢弃历史。
- 侧边聊天历史默认按论文保存。
- 不自动把每一轮聊天都合并进论文级记忆。
- 只有用户确认过的摘要或结构化事实进入论文级记忆。

## 13. 设置页

设置区块：

- Provider 管理。
- 模型管理。
- 任务模型选择。
- 默认目标语言。
- 翻译高亮颜色。
- 解释高亮颜色。
- 问答高亮颜色。
- 批注覆盖策略。
- 隐私模式。
- 上下文长度。
- token 限制。
- 预算提醒。
- prompt 模板。
- 日志与诊断。

## 14. 待验证的技术问题

- Zotero 7 阅读器有哪些稳定 API 可用于选区监听？
- 如何把 PDF 选区坐标映射到工具条位置？
- 应使用哪个 Zotero API 从当前选区创建高亮 annotation？
- 是否可以不重建 annotation 而直接更新 annotation comment？
- Zotero PDF annotation 是否能直接打 tag？
- 向 PDF 阅读器注入可调整大小的侧边栏，最佳实现方式是什么？
- 如何处理插件选区工具条与 Zotero 原生选区 UI 的冲突？
