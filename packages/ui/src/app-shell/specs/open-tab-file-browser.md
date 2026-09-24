# Open Tab 文件浏览器

## 行为

「打开标签页」空态提供与其它入口同风格的「文件浏览」卡片，位置在「辅助对话」之前（列表首位；有辅助对话时紧挨其前）。

- 单击卡片打开（或激活）侧边面板 `file-browser` 标签；同一 workspace 内单例复用。
- 标签为左右分栏：左侧预览当前选中文件内容，右侧展示当前项目根下的文件树（原空态大卡片能力）。
- 根路径是当前 workspace 的 `workspacePath`（面板里的 `workspaceAbsPath`）。
- 右侧单击目录展开或折叠，展开后懒加载子项。
- 右侧单击文件：仅更新本标签左侧预览 source，不另开 `code-viewer` 标签。
- 预览 source 必须带上当前 workspace 作用域；远程文件走对应 Host。
- 身份隔离使用 `workspaceIdentity?.trim() || workspacePath`；目录列举、watch 和文件读取使用 `workspacePath`。
- 「打开标签页」空态不再内嵌文件树大卡片。
- 左侧对可编辑文本文件：双击内容区进入编辑态；可改文本、保存写回磁盘，或取消丢弃草稿。图片 / PDF / Office / 二进制 / 超大截断文件不进入编辑态。
- 编辑态保持预览态的语法高亮与显示效果（行号、主题、字号、换行），草稿在高亮层上实时更新；输入走透明编辑层，不换成无高亮的纯文本框，便于对照代码。

## 状态所有者

- 展开集、目录子项、加载/失败态：复用 `useWorkspaceFileTreeData`，不另建文件树状态。
- 当前预览文件：由 `file-browser` side pane tab 的 `source` 持有；打开/更新只走 `activateFileBrowserSidePane` / `setFileBrowserSidePaneSource`。
- 编辑草稿：由 `FileBrowserSidePane` 局部持有（`editing` + draft 文本）；保存唯一写路径是 `fileService.writeTextFile`。
- tab 注册与激活：唯一入口是现有 side pane tab registry（`useAppPanels` → `workspaceSidePane`），不另建队列。

## 失败语义

- 根目录读取失败：右侧展示错误，不伪造空目录；左侧保持空态或上一份 source。
- 子目录读取失败：该行保留，并可再次展开重试。
- Git deleted 行不进入预览。
- workspace 路径为空时不发起列举；仍可打开标签，右侧显示空态。
- 进入编辑前若文件为二进制、已被截断或读取失败：保持预览态并提示，不进入编辑。
- 保存失败：保留编辑态与草稿，展示错误，不静默丢改动。

## 验收

1. 「打开标签页」在「辅助对话」前有「文件浏览」卡片，样式与其它入口一致。
2. 单击卡片后出现 `file-browser` 标签；空态关闭。
3. 标签左侧可预览文件，右侧为项目文件树；可展开文件夹、单击文件更新左侧预览。
4. 本地与远程 workspace 都按当前项目根列举，不串到其他 workspace。
5. 文本文件左侧双击进入编辑；编辑态仍见语法高亮与行号等预览效果；可保存写回或取消退出；非文本预览不可编辑。
