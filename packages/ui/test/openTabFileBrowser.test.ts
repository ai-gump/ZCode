import assert from "node:assert/strict";
import test from "node:test";
import { resolveOpenTabLauncherItemIds } from "../src/app-shell/animatedSidePanePanelModel.js";
import { toggleWorkspaceFileTreeDirectoryExpansion } from "../src/workspace-file-tree/model.js";
import {
  activateFileBrowserSidePane,
  setFileBrowserSidePaneSource,
} from "../src/lib/workspaceSidePane.js";

test("toggleWorkspaceFileTreeDirectoryExpansion expands a collapsed directory", () => {
  const next = toggleWorkspaceFileTreeDirectoryExpansion(new Set(), {
    path: "/project/src",
    type: "directory",
  });

  assert.deepEqual([...next], ["/project/src"]);
});

test("toggleWorkspaceFileTreeDirectoryExpansion collapses a compacted directory chain", () => {
  const next = toggleWorkspaceFileTreeDirectoryExpansion(new Set(["/project/src", "/project/src/app"]), {
    path: "/project/src",
    type: "directory",
    compactedPaths: ["/project/src", "/project/src/app"],
  });

  assert.equal(next.size, 0);
});

test("toggleWorkspaceFileTreeDirectoryExpansion ignores files", () => {
  const current = new Set(["/project/src"]);
  const next = toggleWorkspaceFileTreeDirectoryExpansion(current, {
    path: "/project/README.md",
    type: "file",
  });

  assert.deepEqual([...next], ["/project/src"]);
});

test("resolveOpenTabLauncherItemIds puts file-browser before selection-side-conversation", () => {
  const itemIds = resolveOpenTabLauncherItemIds({
    canOpenSelectionSideConversation: true,
    developerToolsEnabled: false,
    hasReviewTab: true,
    supportsEmbeddedBrowser: false,
  });

  assert.deepEqual(itemIds, ["file-browser", "selection-side-conversation", "terminal"]);
});

test("activateFileBrowserSidePane creates a singleton tab", () => {
  const first = activateFileBrowserSidePane(null);
  const second = activateFileBrowserSidePane(first);

  assert.equal(first.tabs.length, 1);
  assert.equal(first.tabs[0]?.type, "file-browser");
  assert.equal(second.tabs.length, 1);
  assert.equal(second.activeTabId, "file-browser");
});

test("setFileBrowserSidePaneSource updates preview without opening a second tab", () => {
  const opened = activateFileBrowserSidePane(null);
  const withSource = setFileBrowserSidePaneSource(opened, {
    type: "file",
    path: "/project/README.md",
    workspacePath: "/project",
  });

  assert.equal(withSource.tabs.length, 1);
  assert.equal(withSource.tabs[0]?.type, "file-browser");
  assert.equal(withSource.tabs[0]?.type === "file-browser" ? withSource.tabs[0].source?.type : null, "file");
});
