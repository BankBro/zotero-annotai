# Zotero AI Reader 架构设计

## 1. 架构目标

架构需要把四类职责分开：

```text
Zotero 集成
UI 面板与阅读器交互
AI Provider 与请求处理
上下文、prompt、记忆和批注逻辑
```

这种分层很重要，因为 Zotero 阅读器 API、Provider API 和 UI 行为会独立变化。

## 2. 高层模块

建议源码结构：

```text
src/
  bootstrap/
    startup.ts
    shutdown.ts
  zotero/
    reader.ts
    selection.ts
    annotations.ts
    metadata.ts
    preferences.ts
    tags.ts
  ui/
    selection-toolbar.ts
    floating-panel.ts
    translate-panel.ts
    explain-panel.ts
    qa-panel.ts
    side-chat.ts
    settings.ts
  ai/
    provider-registry.ts
    openai-compatible-client.ts
    request-runner.ts
    errors.ts
    model-capabilities.ts
  context/
    context-builder.ts
    truncation.ts
    paper-context.ts
    reader-context.ts
  prompts/
    template-engine.ts
    built-in-templates.ts
  annotations/
    annotation-formatter.ts
    annotation-service.ts
    overwrite-policy.ts
  memory/
    thread-store.ts
    paper-memory.ts
    history-summarizer.ts
  settings/
    schema.ts
    defaults.ts
    migrations.ts
  diagnostics/
    logger.ts
    redaction.ts
```

实际文件名可以在开始实现插件骨架后根据 Zotero 插件约定调整，但这些模块边界应尽量保持稳定。

## 3. 运行流程

### 3.1 启动流程

```text
Zotero 启动插件
-> bootstrap startup 初始化插件全局命名空间
-> 加载 preferences
-> 初始化 provider registry
-> 注册阅读器集成监听器
-> 注册设置页和工具栏入口
```

### 3.2 选区动作流程

```text
用户在 PDF 阅读器中选中文本
-> selection service 检测选中文本和锚点位置
-> 显示选区工具条
-> 用户点击 翻译 / 解释 / 问答
-> context builder 创建任务上下文
-> 打开悬浮小窗
-> request runner 调用配置好的 provider/model
-> 小浮窗流式显示或一次性显示结果
-> 用户点击批注动作
-> annotation formatter 创建最终 comment
-> annotation service 高亮选中文本并写入 comment
```

### 3.3 侧边聊天流程

```text
用户打开侧边聊天
-> side chat 解析当前活跃论文
-> 加载当前论文 thread
-> 用户提问
-> context builder 加入当前选区和论文上下文
-> request runner 调用配置好的模型
-> 回答加入侧边聊天历史
-> 可选批注动作将回答总结写入选区批注
```

## 4. 数据模型

### 4.1 ProviderProfile

```ts
type ProviderType =
  | "openai-compatible"
  | "ollama"
  | "lm-studio"
  | "azure-openai"
  | "custom";

interface ProviderProfile {
  id: string;
  name: string;
  type: ProviderType;
  baseURL: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  supportsStreaming: boolean;
  supportsReasoningEffort: boolean;
  supportsEmbedding: boolean;
  supportsVision: boolean;
  timeoutMs: number;
}
```

### 4.2 ModelProfile

```ts
type ModelType = "chat" | "reasoning" | "embedding" | "vision";
type ModelStrength = "fast" | "balanced" | "strong";
type ReasoningEffort = "none" | "low" | "medium" | "high";

interface ModelProfile {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  type: ModelType;
  strength: ModelStrength;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportedEffort: ReasoningEffort[];
}
```

### 4.3 TaskModelProfile

```ts
type TaskKind =
  | "translate"
  | "explain"
  | "qa"
  | "annotationSummary"
  | "embedding";

interface TaskModelProfile {
  task: TaskKind;
  providerId: string;
  modelProfileId: string;
  effort?: ReasoningEffort;
  fallbackModelProfileId?: string;
}
```

### 4.4 SelectionContext

```ts
interface SelectionContext {
  selectedText: string;
  beforeContext?: string;
  afterContext?: string;
  pageNumber?: number;
  sectionTitle?: string;
  paperTitle?: string;
  authors?: string[];
  year?: string;
  abstract?: string;
  readerId?: string;
  itemId?: number;
  attachmentItemId?: number;
  selectionAnchor?: {
    x: number;
    y: number;
    page?: number;
  };
}
```

### 4.5 ThreadState

```ts
interface ThreadState {
  threadId: string;
  itemId?: number;
  attachmentItemId?: number;
  kind: "temporary-qa" | "side-chat";
  title?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  summary?: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
}
```

### 4.6 AnnotationRequest

```ts
type AnnotationKind =
  | "word-meaning"
  | "translation"
  | "explain-concise"
  | "explain-detailed"
  | "qa-concise"
  | "qa-detailed";

interface AnnotationRequest {
  kind: AnnotationKind;
  selectedText: string;
  comment: string;
  color: string;
  overwritePolicy: "ai-only" | "confirm-user" | "always";
  itemId?: number;
  attachmentItemId?: number;
}
```

## 5. Provider 请求层

### 5.1 职责

Provider 请求层需要：

- 规范化 Provider 设置。
- 根据任务配置构造请求。
- 应用模型能力检查。
- 忽略不支持的 effort。
- 执行超时和取消。
- 分类 Provider 错误。
- 对瞬时错误进行重试。
- 从日志中移除敏感信息。

### 5.2 请求流程

```text
任务请求
-> 解析 task model profile
-> 解析 provider profile
-> 应用模型能力检查
-> 渲染 prompt 模板
-> 估算并截断上下文
-> 调用 provider client
-> 流式返回或一次性返回结果
-> 归一化响应
```

### 5.3 错误类型

```text
AuthError
InsufficientBalanceError
RateLimitError
ModelNotFoundError
UnsupportedCapabilityError
NetworkError
TimeoutError
InvalidResponseError
UnknownProviderError
```

重试策略：

- 重试 `NetworkError`、`TimeoutError` 和部分 `RateLimitError`。
- 不重试 `AuthError`、`InsufficientBalanceError`、`ModelNotFoundError` 或无效请求错误。

## 6. Context Builder

Context Builder 根据任务类型和选区状态，返回在用户隐私设置和 token 限制下允许发送的上下文。

输入：

- 任务类型。
- 当前活跃 reader。
- 选中文本。
- 论文元数据。
- 隐私模式。
- 上下文长度设置。
- token 限制。
- 适用时传入 thread history。

输出：

- prompt 变量。
- 已包含上下文摘要。
- 估算 token 数或字符数。
- 截断警告。

任务默认值：

```text
翻译：选中文本 + 前后上下文
解释：选中文本 + 前后上下文 + 元数据 + 页面上下文
临时问答：解释上下文 + 当前小浮窗 thread history
侧边聊天：论文上下文 + 当前选区 + 侧边聊天历史
```

## 7. Prompt 模板引擎

职责：

- 存储内置模板。
- 使用任务变量渲染模板。
- 校验缺失的必要变量。
- 为后续用户自定义模板预留能力。
- 将批注总结 prompt 与普通回答生成 prompt 分开。

MVP 可以使用简单变量替换。后续版本可以增加 schema 校验或结构化 JSON 输出解析。

## 8. Annotation Service

职责：

- 根据当前选区创建高亮 annotation。
- 更新 annotation comment。
- 应用设置中的高亮颜色。
- 如果 Zotero 支持 annotation 级 tag，则应用 tag。
- 执行覆盖策略。
- 通过 `[AI-` 前缀识别 AI 批注。

覆盖策略：

```text
ai-only: 只覆盖以 [AI- 开头的 comment
confirm-user: 替换非 AI comment 前询问用户
always: 不确认直接覆盖
```

MVP 默认值：

```text
confirm-user
```

## 9. UI 架构

### 9.1 Selection Toolbar

职责：

- 显示在当前文本选区附近。
- 选区清空时隐藏。
- reader 变化时隐藏。
- 尽量避免遮挡选中文本。
- 打开对应悬浮小窗。

### 9.2 FloatingPanel

通用小浮窗职责：

- 位置。
- 尺寸。
- 最小宽度和最小高度。
- 拖动手柄。
- 调整大小手柄。
- 关闭按钮。
- 内容区域。
- 底部操作区。
- loading 状态。
- 错误状态。
- 停止和重试控制。

具体面板：

- TranslatePanel。
- ExplainPanel。
- QAPanel。

### 9.3 SideChat

职责：

- 挂载到阅读器侧边区域。
- 调整宽度。
- 加载按论文保存的历史。
- 可获得时包含当前选区。
- 从回答生成批注。

将侧边聊天拖出为浮动面板属于后续阶段。

## 10. Preferences 与持久化

Preference 分组：

```text
providers
models
taskModels
ui
privacy
tokenLimits
annotation
memory
diagnostics
```

存储规则：

- API key 不出现在诊断导出中。
- 完整论文文本不写入日志。
- Thread history 按 paper 和 thread id 存储。
- Paper memory 只保存用户确认过的摘要或结构化事实。

## 11. 诊断

诊断信息应提供：

- 插件版本。
- Zotero 版本。
- 当前 Provider 名称。
- 当前模型 id。
- 最近一次请求状态。
- 最近一次错误类型和脱敏消息。
- 是否启用流式输出。
- 当前隐私模式。
- 当前上下文层级。

诊断信息必须脱敏：

- API key。
- Authorization header。
- 完整 PDF 文本。
- 完整 prompt 内容，除非用户明确启用 debug prompt logging。

## 12. 构建与打包说明

具体构建方式应在开始插件骨架实现后遵循 Zotero 7 插件约定。

预期打包输出：

```text
manifest.json
bootstrap.js
content/
prefs.js if needed
```

实现时应避免依赖 Zotero 6 已废弃的 overlay 模式。

## 13. 架构风险

阅读器集成风险：

- Zotero reader 内部 API 可能变化。
- 选区 API 可能无法提供足够的几何信息用于工具条定位。
- Zotero 原生选区 UI 可能与插件工具条冲突。

批注风险：

- 从当前选区创建 annotation 可能需要内部 API。
- 更新 comment 的方式可能不同于普通 item note API。
- annotation 级 tag 可能不实用。

UI 风险：

- 悬浮小窗需要与 Zotero 窗口和 reader iframe 共存。
- 拖动和调整大小行为在不同平台可能需要不同处理。

缓解策略：

- 先做早期技术验证，再做 UI 精修。
- 把 Zotero 集成封装在小型 adapter 层后面。
- 所有 annotation 写入都经过 `AnnotationService`。
- Provider 逻辑独立于 Zotero UI 代码。
