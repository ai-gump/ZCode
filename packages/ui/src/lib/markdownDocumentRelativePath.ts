import { getContainingDirectoryPath, isAbsoluteFilePath } from "@/lib/path.js";

function isPathInsideWorkspaceRoot(path: string, workspacePath: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedWorkspacePath = workspacePath.replace(/\\/g, "/").replace(/\/$/, "");
  return (
    normalizedPath === normalizedWorkspacePath ||
    normalizedPath.startsWith(`${normalizedWorkspacePath}/`)
  );
}

function splitAbsolutePathSegments(path: string): {
  prefix: string;
  segments: string[];
  separator: string;
} | null {
  const separator = path.includes("\\") && !path.includes("/") ? "\\" : "/";
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) {
    return null;
  }

  if (/^[a-zA-Z]:/.test(normalized)) {
    return {
      prefix: `${normalized.slice(0, 2)}${separator}`,
      segments: normalized.slice(2).split("/").filter(Boolean),
      separator,
    };
  }

  if (normalized.startsWith("//")) {
    const uncBody = normalized.slice(2);
    const slashIndex = uncBody.indexOf("/");
    if (slashIndex < 0) {
      return {
        prefix: `\\\\${uncBody}${separator}`,
        segments: [],
        separator,
      };
    }
    return {
      prefix: `\\\\${uncBody.slice(0, slashIndex)}${separator}`,
      segments: uncBody.slice(slashIndex + 1).split("/").filter(Boolean),
      separator,
    };
  }

  if (normalized.startsWith("/")) {
    return {
      prefix: "/",
      segments: normalized.slice(1).split("/").filter(Boolean),
      separator: "/",
    };
  }

  return null;
}

function joinAbsolutePathSegments(prefix: string, segments: string[], separator: string): string {
  if (segments.length === 0) {
    return prefix.endsWith(separator) || prefix === "/"
      ? prefix.replace(/[\\/]+$/, "") || prefix
      : prefix;
  }
  if (prefix === "/") {
    return `/${segments.join("/")}`;
  }
  const normalizedPrefix = prefix.endsWith(separator) ? prefix.slice(0, -1) : prefix;
  return `${normalizedPrefix}${separator}${segments.join(separator)}`;
}

/**
 * 以绝对目录为基解析相对片段（允许 `..`），不负责 workspace 边界检查。
 */
export function resolvePathAgainstAbsoluteBase(
  baseDir: string,
  relativePath: string,
): string | null {
  const split = splitAbsolutePathSegments(baseDir);
  if (!split) {
    return null;
  }

  const segments = [...split.segments];
  for (const segment of relativePath.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length === 0) {
        return null;
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return joinAbsolutePathSegments(split.prefix, segments, split.separator);
}

function stripRelativeHrefPrefix(path: string): string {
  if (path.startsWith("./")) {
    return path.slice(2);
  }
  return path;
}

export function isDocumentRelativeMarkdownHref(path: string): boolean {
  if (!path || path.startsWith("#") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)) {
    return false;
  }
  if (path.startsWith("./") || path.startsWith("../")) {
    return true;
  }
  if (path.startsWith("/") || isAbsoluteFilePath(path)) {
    return false;
  }
  // 同目录裸文件名（如 photo.png）或 images/a.png
  return true;
}

/**
 * 将 workspace 内绝对路径改写成 `./rel` 形式，供 rehype-harden 前使用。
 * harden 可能把 `./rel` 收成 `/rel`，resolve 侧仍按 workspace 根解析。
 */
export function toWorkspaceRelativeMarkdownHref(
  workspacePath: string,
  absolutePath: string,
): string | null {
  if (!isPathInsideWorkspaceRoot(absolutePath, workspacePath)) {
    return null;
  }

  const normalizedWorkspace = workspacePath.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedAbsolute = absolutePath.replace(/\\/g, "/").replace(/\/$/, "");
  if (normalizedAbsolute === normalizedWorkspace) {
    return null;
  }

  const relativePath = normalizedAbsolute.slice(normalizedWorkspace.length + 1);
  if (!relativePath) {
    return null;
  }

  const separator = workspacePath.includes("\\") && !workspacePath.includes("/") ? "\\" : "/";
  return `./${relativePath.replaceAll("/", separator === "\\" ? "\\" : "/")}`;
}

/**
 * 相对 Markdown 文档目录解析路径，且结果必须落在 workspace 内。
 */
export function resolveMarkdownDocumentRelativePath(
  workspacePath: string,
  documentPath: string,
  hrefPath: string,
): string | null {
  if (!isAbsoluteFilePath(documentPath) || !isAbsoluteFilePath(workspacePath)) {
    return null;
  }
  if (!isPathInsideWorkspaceRoot(documentPath, workspacePath)) {
    return null;
  }

  const documentDir = getContainingDirectoryPath(documentPath);
  if (!documentDir || !isPathInsideWorkspaceRoot(documentDir, workspacePath)) {
    return null;
  }

  const relativePath = stripRelativeHrefPrefix(hrefPath);
  if (!relativePath) {
    return null;
  }

  const absolutePath = resolvePathAgainstAbsoluteBase(documentDir, relativePath);
  if (!absolutePath || !isPathInsideWorkspaceRoot(absolutePath, workspacePath)) {
    return null;
  }

  return absolutePath;
}
