# 开发环境与打包说明

本文档记录 Zotero AnnotAI 第一阶段的开发、打包和手动验证方式。

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
dist/zotero-annotai-0.1.1.xpi
```

这个 `.xpi` 目前只包含 Zotero 插件最小文件：

```text
manifest.json
bootstrap.js
prefs.js
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
dist/zotero-annotai-0.1.0.xpi
```

## 查看启动日志

在 Zotero 中打开 Debug Output：

```text
Help -> Debug Output Logging -> View Output
```

安装、启用或重启 Zotero 后，应看到类似日志：

```text
[Zotero AnnotAI] Startup 0.1.1
```

禁用或卸载插件时，应看到类似：

```text
[Zotero AnnotAI] Shutdown 0.1.1
[Zotero AnnotAI] Uninstall 0.1.1
```

## 当前阶段边界

第一阶段只验证插件骨架：

- 能被 Zotero 7 安装。
- 能执行 bootstrap 生命周期。
- 能加载根目录 `prefs.js` 默认偏好。
- 能通过脚本打包为 `.xpi`。

当前阶段不包含：

- AI Provider 配置。
- PDF 选区检测。
- 翻译、解释、问答浮窗。
- 高亮和批注写入。
- 设置页。
