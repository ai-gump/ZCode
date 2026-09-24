import {
  FILE_VIEWER_MAX_TEXT_BYTES,
  inferImageMediaType,
  inferMediaPreview,
  isPdfPreviewPath,
  isPptxPreviewPath,
  type CodeViewerSource,
} from "@/lib/codeViewer.js";
import { getOfficeFilePreviewKind } from "@/lib/officeFilePreview.js";

/** 文件浏览左侧是否允许双击进入文本编辑（媒体 / Office / 非文本 source 排除）。 */
export function isFileBrowserTextEditableSource(source: CodeViewerSource | null): boolean {
  if (!source) {
    return false;
  }
  if (source.type === "text") {
    return Boolean(source.path);
  }
  if (source.type !== "file") {
    return false;
  }
  if (inferImageMediaType(source.path) !== null) {
    return false;
  }
  if (inferMediaPreview(source.path) !== null) {
    return false;
  }
  if (isPdfPreviewPath(source.path) || isPptxPreviewPath(source.path)) {
    return false;
  }
  if (getOfficeFilePreviewKind(source.path) !== null) {
    return false;
  }
  return true;
}

export function resolveFileBrowserEditableFilePath(source: CodeViewerSource): string | null {
  if (source.type === "file") {
    return source.path;
  }
  if (source.type === "text" && source.path) {
    return source.path;
  }
  return null;
}

export const FILE_BROWSER_EDIT_READ_BYTES = FILE_VIEWER_MAX_TEXT_BYTES;
