import { useEffect, useState, type MouseEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { toast } from "@/components/ui/toast.js";
import { PreviewPane } from "@/PreviewPane.js";
import { OpenTabFileBrowser } from "@/app-shell/OpenTabFileBrowser.js";
import { FileBrowserTextEditor } from "@/app-shell/FileBrowserTextEditor.js";
import { shouldRenderPreviewPaneHeavyContent } from "@/app-shell/animatedSidePanePanelModel.js";
import {
  isFileBrowserTextEditableSource,
  resolveFileBrowserEditableFilePath,
} from "@/app-shell/fileBrowserEditModel.js";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable.js";
import { WorkspaceFileTreeNotice } from "@/workspace-file-tree/WorkspaceFileTreeNotice.js";
import { inferMediaPreview, type CodeViewerSource } from "@/lib/codeViewer.js";
import type { FileBrowserSidePaneTab } from "@/lib/workspaceSidePane.js";

const FILE_BROWSER_PANEL_IDS = ["file-browser-preview", "file-browser-tree"];

export function FileBrowserSidePane({
  tab,
  isActiveTab,
  isSidePaneVisible,
  isWindowResizeSettling,
  sidePaneVisibleInlineSizePx,
  workspacePath,
  workspaceIdentity,
  workspaceRemoteSessionId,
  workspaceKey,
  activeTaskId,
  onSelectSource,
  onOpenBrowserUrl,
  onOpenCodeViewer,
}: {
  tab: FileBrowserSidePaneTab;
  isActiveTab: boolean;
  isSidePaneVisible: boolean;
  isWindowResizeSettling: boolean;
  sidePaneVisibleInlineSizePx: number | null;
  workspacePath: string;
  workspaceIdentity?: string;
  workspaceRemoteSessionId?: string;
  workspaceKey: string;
  activeTaskId: string | null;
  onSelectSource: (source: CodeViewerSource | null) => void;
  onOpenBrowserUrl: (url: string) => void;
  onOpenCodeViewer: (source: CodeViewerSource) => void;
}) {
  const { intl } = useZCodeIntl();
  const source = tab.source ?? null;
  const [editing, setEditing] = useState(false);
  const [previewEpoch, setPreviewEpoch] = useState(0);
  const editablePath = source ? resolveFileBrowserEditableFilePath(source) : null;
  const canEdit = isFileBrowserTextEditableSource(source) && Boolean(editablePath);
  const renderHeavyContent = shouldRenderPreviewPaneHeavyContent({
    isActiveTab,
    isMediaPreview:
      source?.type === "media" ||
      (source?.type === "file" && inferMediaPreview(source.path) !== null),
    isResizeSettling: isWindowResizeSettling,
    isSidePaneVisible,
    // 分栏内预览宽度约为侧栏一半，不能用整侧栏宽度阈值，否则会长期裁掉正文。
    visibleInlineSizePx:
      sidePaneVisibleInlineSizePx === null ? null : Math.floor(sidePaneVisibleInlineSizePx * 0.55),
  });

  useEffect(() => {
    // 切换预览文件时退出编辑，避免草稿串到另一个 path。
    setEditing(false);
  }, [editablePath]);

  const handlePreviewDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!canEdit || !editablePath) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    // 顶栏按钮 / 菜单不进入编辑，只响应正文区双击。
    if (target.closest("button, a, [role='menuitem'], input, textarea, select")) {
      return;
    }
    setEditing(true);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <ResizablePanelGroup
        orientation="horizontal"
        layoutId="side-pane-file-browser-layout"
        panelIds={FILE_BROWSER_PANEL_IDS}
        className="h-full min-h-0 min-w-0"
      >
        <ResizablePanel
          id="file-browser-preview"
          defaultSize="62%"
          minSize="35%"
          className="min-h-0 min-w-0"
        >
          {source && editing && editablePath ? (
            <FileBrowserTextEditor
              path={editablePath}
              workspacePath={source.workspacePath ?? workspacePath}
              workspaceIdentity={source.workspaceIdentity ?? workspaceIdentity}
              workspaceRemoteSessionId={
                source.workspaceRemoteSessionId ?? workspaceRemoteSessionId
              }
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                setPreviewEpoch((current) => current + 1);
              }}
            />
          ) : source ? (
            <div className="h-full min-h-0" onDoubleClick={handlePreviewDoubleClick}>
              <PreviewPane
                key={`${editablePath ?? "preview"}:${previewEpoch}`}
                markdownSelectionTarget={{ sessionId: activeTaskId, workspaceKey }}
                source={source}
                onClose={() => onSelectSource(null)}
                workspacePath={workspacePath}
                onOpenBrowserUrl={onOpenBrowserUrl}
                onOpenCodeViewer={onOpenCodeViewer}
                renderHeavyContent={renderHeavyContent}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center px-4">
              <WorkspaceFileTreeNotice
                icon={<FolderOpen className="size-4" />}
                title={intl.formatMessage({ id: "sidePane.fileBrowser.emptyPreview" })}
              />
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle className="bg-border" />
        <ResizablePanel
          id="file-browser-tree"
          defaultSize="38%"
          minSize="24%"
          className="min-h-0 min-w-0"
        >
          <div className="flex h-full min-h-0 flex-col p-2">
            <OpenTabFileBrowser
              workspacePath={workspacePath}
              workspaceIdentity={workspaceIdentity}
              workspaceRemoteSessionId={workspaceRemoteSessionId}
              onOpenPreview={(nextSource) => {
                if (editing) {
                  toast(intl.formatMessage({ id: "sidePane.fileBrowser.editDiscarded" }));
                }
                setEditing(false);
                onSelectSource(nextSource);
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
