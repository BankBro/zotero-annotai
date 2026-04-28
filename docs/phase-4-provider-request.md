# 阶段四：Provider 请求层壳

阶段四用于验证 Zotero AnnotAI 可以配置并测试一个默认 OpenAI-compatible Provider。这个阶段只打通设置页、配置持久化、连接测试、请求超时/取消和错误分类；不把翻译、解释、问答浮窗正式接入 AI 输出，不创建高亮，也不写入批注。

## 测试包

```text
dist/zotero-annotai-0.1.13.xpi
```

## 安装

在 Zotero 7 中：

```text
Tools -> Add-ons -> 齿轮菜单 -> Install Add-on From File...
```

选择：

```text
dist/zotero-annotai-0.1.13.xpi
```

## Provider 配置验证

1. 打开 Zotero 设置页中的 AnnotAI Provider 配置。
2. 填入 OpenAI-compatible base URL、model、API key 和 timeout。
3. 点击 `保存配置`。
4. 点击 `连接测试`。

连接测试只发送固定 ping prompt，不发送 PDF 选区文本。成功时应显示模型和耗时；失败时应显示可理解的错误提示。

流式输出选项当前禁用，后续版本由插件自动检测，不要求用户手动判断。

## 错误场景

- base URL 为空：显示配置不完整。
- model 为空：显示配置不完整。
- API key 错误：显示认证失败。
- Provider 返回 429：显示限流提示。
- Provider 返回模型错误：显示模型不可用。
- endpoint 不可达：显示网络请求失败。
- 请求超过 timeout：显示请求超时。
- 点击 `取消测试`：显示请求已取消。

## 隐私与日志

- API key 阶段四先明文存储在 `Zotero.Prefs`。
- 设置页使用 password input 显示 API key。
- Debug Output 不输出 API key、Authorization header 或完整请求体。
- 连接测试不读取 PDF 选区、不发送论文文本。

## 阶段三回归

Provider 请求层不应改变阶段三 PDF 阅读器行为：

- Zotero 原生按钮正常显示。
- Translate for Zotero 等其他插件入口正常显示。
- AnnotAI 三个按钮仍在 Zotero 原生文本选区弹窗内部。
- 三个 AnnotAI 浮窗可打开、拖动、缩放、关闭。
- 重复选不同文本再点按钮，浮窗内容更新但位置不跳。
- 多个 AnnotAI 浮窗重叠时，点击内容区可以置顶。
- PDF 鼠标滚轮正常滚动。
