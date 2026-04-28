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
dist/zotero-annotai-0.1.2.xpi
```

这个 `.xpi` 目前包含 Zotero 插件最小文件和阶段二选区验证脚本：

```text
manifest.json
bootstrap.js
prefs.js
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
dist/zotero-annotai-0.1.2.xpi
```

## 查看启动日志

在 Zotero 中打开 Debug Output：

```text
Help -> Debug Output Logging -> View Output
```

安装、启用或重启 Zotero 后，应看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.2
[Zotero AnnotAI] Reader selection listener registered
```

禁用或卸载插件时，应看到类似：

```text
[Zotero AnnotAI] Shutdown 0.1.2
[Zotero AnnotAI] Uninstall 0.1.2
```

## 阶段二选区验证

在 Zotero 7 中打开任意 PDF，鼠标选中一段文字。Zotero 原生文本选区弹窗中应出现：

```text
AnnotAI | 翻译 | 解释 | 问答
```

点击任意按钮后，Debug Output 中应看到类似日志：

```text
[Zotero AnnotAI] Selection snapshot {"action":"translate","charCount":42,...}
```

这个日志表示插件已经拿到了当前选区文本、长度、reader 类型和可获得的条目元数据。

更完整的阶段二验收说明见 `docs/phase-2-reader-selection.md`。

## 当前阶段边界

当前阶段只验证插件骨架和 PDF 阅读器选区接入：

- 能被 Zotero 7 安装。
- 能执行 bootstrap 生命周期。
- 能加载根目录 `prefs.js` 默认偏好。
- 能通过脚本打包为 `.xpi`。
- 能在 PDF 文本选区弹窗中追加临时 AnnotAI 操作区。
- 能把选区快照写入 Debug Output。

当前阶段不包含：

- AI Provider 配置。
- 真实翻译、解释、问答请求。
- 翻译、解释、问答浮窗。
- 高亮和批注写入。
- 设置页。
