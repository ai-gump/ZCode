# Markdown 预览本地图片

## 行为

PreviewPane（含文件浏览左侧预览）在 Markdown **渲染模式**下展示正文内嵌本地图片；**源码模式**只显示原始 Markdown 文本，不解析图片。

- 相对路径（`./a.png`、`images/a.png`、同目录裸文件名 `a.png`、`../a.png`）相对**当前 Markdown 文件所在目录**解析。
- 解析结果必须仍落在当前 `workspacePath` 内；逃逸 workspace 的路径不加载。
- 无 `documentPath` 时（如聊天消息）保持既有语义：相对路径相对 workspace 根。
- 图片经 `fileService.readMediaPreview` 转 data URL 显示；失败时显示不可用占位，不抛到会话边界。
- CommonMark/GFM 不规定内嵌图片尺寸；**文档预览**（`imageDisplay=document`）单图与连续图均水平居中，宽度适应容器（不超过正文宽），高度上限约 `min(70vh, 48rem)`，`object-contain` 保比例；**聊天消息**仍用既有缩略图布局。

## 状态所有者

- 预览文档路径：`MarkdownPreviewContent` 的 `sourcePath`，经 `MessageResponse.documentPath` 传给链接改写与 `MarkdownImage`。
- 图片展示形态：`MessageResponse.imageDisplay`（`thumbnail` | `document`），由 PreviewPane 传入 `document`；默认 `thumbnail`。
- 路径解析唯一入口：`resolveMarkdownFileLink`（含 `documentPath` 选项）。
- 图片字节：`fileService.readMediaPreview`；UI 不直读磁盘。

## 失败语义

- 路径无法解析或不在 workspace：不发起预览读取，显示不可用占位。
- 读取失败：占位 + warn 日志，保留 alt/title 信息便于排查。

## 验收

1. 打开子目录下 Markdown，渲染模式下 `![x](./img.png)` / `![x](img.png)` 显示同目录图片，而非空白或永久占位。
2. `![x](../assets/a.png)` 在仍位于 workspace 内时能显示。
3. 切换到源码模式只见 Markdown 原文；切回渲染模式图片仍可用。
4. 聊天消息中未传 `documentPath` 的相对图片路径语义不变（相对 workspace 根）。
5. 文档预览中单张图片水平居中，明显大于聊天缩略图（接近正文可用宽度），比例不失真。
