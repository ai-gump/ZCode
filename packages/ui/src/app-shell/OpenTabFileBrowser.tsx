import { useCallback, useState, type KeyboardEvent } from "react";
import { AlertCircle, ChevronRight, Folder, LoaderCircle } from "lucide-react";
import { testId, TID_SIDE_PANE_OPEN_TAB_FILE_BROWSER, TID_SIDE_PANE_OPEN_TAB_FILE_ROW } from "@zcode/shared";
import { cn } from "@/components/lib/utils.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { FileDisplayIcon, resolveFileDisplayDescriptor } from "@/lib/fileDisplay.js";
import type { CodeViewerSource } from "@/lib/codeViewer.js";
import { getPathLeaf } from "@/lib/path.js";
import {
  createCodeViewerSourceForWorkspaceFile,
  getWorkspaceFileDirectoryChildDepth,
  getWorkspaceFileGitStatus,
  isWorkspaceFileTreeDeletedFile,
  toggleWorkspaceFileTreeDirectoryExpansion,
  type WorkspaceFileTreeRow,
} from "@/workspace-file-tree/model.js";
import { getWorkspaceFileTreeHierarchyGuideStyle } from "@/workspace-file-tree/hierarchyGuides.js";
import { useWorkspaceFileTreeData } from "@/workspace-file-tree/useWorkspaceFileTreeData.js";
import { WorkspaceFileTreeNotice } from "@/workspace-file-tree/WorkspaceFileTreeNotice.js";
import { WorkspaceFileTreeRowName } from "@/workspace-file-tree/WorkspaceFileTreeRowName.js";

export function OpenTabFileBrowser({
  workspacePath,
  workspaceIdentity,
  workspaceRemoteSessionId,
  onOpenPreview,
}: {
  workspacePath: string;
  workspaceIdentity?: string;
  workspaceRemoteSessionId?: string;
  onOpenPreview: (source: CodeViewerSource) => void;
}) {
  const { intl } = useZCodeIntl();
  const treeData = useWorkspaceFileTreeData({
    workspacePath,
    workspaceIdentity,
    workspaceRemoteSessionId,
  });
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const rootError = treeData.errorByDirectory.get(workspacePath) ?? null;
  const rootLoading = treeData.loadingDirectoryPaths.has(workspacePath);
  const rootLoaded = treeData.loadedDirectoryPaths.has(workspacePath);
  const workspaceTitle =
    getPathLeaf(workspacePath) || intl.formatMessage({ id: "sidePane.fileBrowser.title" });

  const handleToggleDirectory = useCallback(
    (row: WorkspaceFileTreeRow) => {
      if (row.type !== "directory") {
        return;
      }
      treeData.setExpandedPaths((current) => toggleWorkspaceFileTreeDirectoryExpansion(current, row));
      if (!row.expanded) {
        void treeData.loadDirectory(row.path, getWorkspaceFileDirectoryChildDepth(workspacePath, row.path));
      }
    },
    [treeData, workspacePath],
  );

  const handleOpenPreview = useCallback(
    (row: WorkspaceFileTreeRow) => {
      if (row.type === "directory") {
        handleToggleDirectory(row);
        return;
      }
      if (isWorkspaceFileTreeDeletedFile(row, getWorkspaceFileGitStatus(treeData.gitStatusByPath, row.path))) {
        return;
      }
      onOpenPreview({
        ...createCodeViewerSourceForWorkspaceFile(row.path),
        workspacePath,
        workspaceIdentity,
        workspaceRemoteSessionId,
      });
    },
    [
      handleToggleDirectory,
      onOpenPreview,
      treeData.gitStatusByPath,
      workspaceIdentity,
      workspacePath,
      workspaceRemoteSessionId,
    ],
  );

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, row: WorkspaceFileTreeRow) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleOpenPreview(row);
        return;
      }
      if (event.key === "ArrowRight" && row.type === "directory" && !row.expanded) {
        event.preventDefault();
        handleToggleDirectory(row);
        return;
      }
      if (event.key === "ArrowLeft" && row.type === "directory" && row.expanded) {
        event.preventDefault();
        handleToggleDirectory(row);
      }
    },
    [handleOpenPreview, handleToggleDirectory],
  );

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-surface"
      data-testid={TID_SIDE_PANE_OPEN_TAB_FILE_BROWSER}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <h3 className="min-w-0 truncate text-ui-base font-medium text-foreground">
          {intl.formatMessage({ id: "sidePane.fileBrowser.title" })}
        </h3>
        <span className="min-w-0 truncate text-ui-caption text-foreground-subtle" title={workspacePath}>
          {workspaceTitle}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {rootError ? (
          <WorkspaceFileTreeNotice
            icon={<AlertCircle className="size-4" />}
            title={intl.formatMessage({ id: "workspaceFileTree.readFailed" })}
            description={rootError.message}
          />
        ) : rootLoading && !rootLoaded ? (
          <WorkspaceFileTreeNotice
            icon={<LoaderCircle className="size-4 animate-spin" />}
            title={intl.formatMessage({ id: "common.loading" })}
          />
        ) : treeData.rows.length === 0 ? (
          <WorkspaceFileTreeNotice
            icon={<Folder className="size-4" />}
            title={intl.formatMessage({ id: "workspaceFileTree.empty" })}
          />
        ) : (
          <div role="tree" aria-label={intl.formatMessage({ id: "sidePane.fileBrowser.title" })}>
            {treeData.rows.map((row) => {
              const isDirectory = row.type === "directory";
              const fileIconSrc = resolveFileDisplayDescriptor(row.path).fileIconSrc;
              const hierarchyGuideStyle = getWorkspaceFileTreeHierarchyGuideStyle(row.depth);
              return (
                <button
                  key={row.path}
                  type="button"
                  role="treeitem"
                  aria-expanded={isDirectory ? row.expanded : undefined}
                  aria-selected={selectedPath === row.path}
                  data-testid={testId(TID_SIDE_PANE_OPEN_TAB_FILE_ROW, row.path)}
                  className={cn(
                    "flex h-7 w-full min-w-0 items-center gap-1 rounded-md px-1.5 text-left text-ui-base text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedPath === row.path && "bg-selected",
                  )}
                  onClick={() => {
                    setSelectedPath(row.path);
                    handleOpenPreview(row);
                  }}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                >
                  <span
                    aria-hidden="true"
                    className="h-full shrink-0"
                    style={hierarchyGuideStyle ?? undefined}
                  />
                  <span className="flex size-4 shrink-0 items-center justify-center text-foreground-subtle">
                    {isDirectory ? (
                      <ChevronRight className={cn("size-3.5 transition-transform", row.expanded && "rotate-90")} />
                    ) : null}
                  </span>
                  {isDirectory ? (
                    <Folder className="size-4 shrink-0 text-foreground-subtle" />
                  ) : (
                    <FileDisplayIcon src={fileIconSrc} size={16} className="size-4 shrink-0" />
                  )}
                  <WorkspaceFileTreeRowName
                    name={row.name}
                    className="min-w-0 flex-1 truncate"
                    slashClassName="text-foreground-subtlest"
                  />
                  {row.loading ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-foreground-subtle" /> : null}
                  {row.error ? <AlertCircle className="size-3.5 shrink-0 text-destructive" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
