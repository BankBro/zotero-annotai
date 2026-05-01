# 阶段二：PDF 阅读器选区验证

阶段二用于验证 Zotero AnnotAI 能接入 Zotero 7 PDF 阅读器的文本选区弹窗，并能读取当前选中的文本。

## 打包

在仓库根目录运行：

```powershell
npm run package
```

生成文件：

```text
dist/zotero-annotai-0.1.2.xpi
```

## 安装

在 Zotero 7 中打开：

```text
Tools -> Add-ons -> 齿轮菜单 -> Install Add-on From File...
```

选择：

```text
dist/zotero-annotai-0.1.2.xpi
```

## 查看日志

打开 Zotero Debug Output：

```text
Help -> Debug Output Logging -> View Output
```

安装、启用或重启 Zotero 后，应看到：

```text
[Zotero AnnotAI] Startup 0.1.2
[Zotero AnnotAI] Reader selection listener registered
```

## 验证选区

1. 在 Zotero 中打开任意 PDF。
2. 鼠标选中一段可复制文本。
3. 在 Zotero 原生文本选区弹窗中确认出现：

```text
AnnotAI | 翻译 | 解释 | 问答
```

4. 点击 `翻译`、`解释` 或 `问答`。
5. Debug Output 中应出现类似日志：

```text
[Zotero AnnotAI] Selection snapshot {"action":"translate","charCount":42,"annotationDraftAvailable":true}
```

日志只记录选区长度、条目 ID、annotation key 数量和 draft 是否可用等脱敏字段，不输出完整或预览版选中文本。

## 当前不做的事情

- 不调用任何 AI Provider。
- 不发送网络请求。
- 不创建高亮。
- 不写入 Zotero annotation comment。
- 不保存聊天历史。
- 不读取 API key 或其他敏感配置。

## 如果没有出现 AnnotAI 操作区

优先检查：

- 是否安装了 `dist/zotero-annotai-0.1.2.xpi`。
- Debug Output 是否出现 `Reader selection listener registered`。
- 当前 PDF 是否是可选中文本的 PDF，而不是扫描图片。
- Browser Console 是否出现与 `Zotero AnnotAI` 相关的红色错误。

