import assert from "node:assert/strict";
import test from "node:test";
import {
  expandMarkdownHrefAgainstDocument,
  resolveMarkdownDocumentRelativePath,
  resolveMarkdownFileLink,
  toWorkspaceRelativeMarkdownHref,
} from "../src/lib/markdownFileLink.js";

const workspacePath = "/Users/me/project";
const documentPath = "/Users/me/project/docs/guide.md";

test("resolveMarkdownDocumentRelativePath resolves same-dir and nested relative images", () => {
  assert.equal(
    resolveMarkdownDocumentRelativePath(workspacePath, documentPath, "./diagram.png"),
    "/Users/me/project/docs/diagram.png",
  );
  assert.equal(
    resolveMarkdownDocumentRelativePath(workspacePath, documentPath, "diagram.png"),
    "/Users/me/project/docs/diagram.png",
  );
  assert.equal(
    resolveMarkdownDocumentRelativePath(workspacePath, documentPath, "images/a.png"),
    "/Users/me/project/docs/images/a.png",
  );
  assert.equal(
    resolveMarkdownDocumentRelativePath(workspacePath, documentPath, "../assets/logo.png"),
    "/Users/me/project/assets/logo.png",
  );
});

test("resolveMarkdownDocumentRelativePath rejects workspace escape", () => {
  assert.equal(
    resolveMarkdownDocumentRelativePath(workspacePath, documentPath, "../../outside.png"),
    null,
  );
});

test("expandMarkdownHrefAgainstDocument rewrites to workspace-relative href for harden", () => {
  assert.equal(
    expandMarkdownHrefAgainstDocument(workspacePath, documentPath, "./diagram.png"),
    "./docs/diagram.png",
  );
  assert.equal(
    expandMarkdownHrefAgainstDocument(workspacePath, documentPath, "diagram.png"),
    "./docs/diagram.png",
  );
  assert.equal(
    expandMarkdownHrefAgainstDocument(workspacePath, documentPath, "../assets/logo.png"),
    "./assets/logo.png",
  );
});

test("toWorkspaceRelativeMarkdownHref keeps paths inside workspace", () => {
  assert.equal(
    toWorkspaceRelativeMarkdownHref(workspacePath, "/Users/me/project/docs/diagram.png"),
    "./docs/diagram.png",
  );
  assert.equal(toWorkspaceRelativeMarkdownHref(workspacePath, "/tmp/evil.png"), null);
});

test("resolveMarkdownFileLink with documentPath prefers document directory", () => {
  assert.equal(
    resolveMarkdownFileLink(workspacePath, "./diagram.png", { documentPath })?.path,
    "/Users/me/project/docs/diagram.png",
  );
  assert.equal(
    resolveMarkdownFileLink(workspacePath, "diagram.png", { documentPath })?.path,
    "/Users/me/project/docs/diagram.png",
  );
});

test("resolveMarkdownFileLink without documentPath keeps workspace-root relative semantics", () => {
  assert.equal(
    resolveMarkdownFileLink(workspacePath, "./diagram.png")?.path,
    "/Users/me/project/diagram.png",
  );
  assert.equal(resolveMarkdownFileLink(workspacePath, "diagram.png"), null);
  assert.equal(
    resolveMarkdownFileLink(workspacePath, "docs/diagram.png")?.path,
    "/Users/me/project/docs/diagram.png",
  );
});

test("resolveMarkdownFileLink harden-style /path stays workspace-root even with documentPath", () => {
  // rewrite 阶段应已把文档相对展开成 ./docs/...；此处 /docs/... 必须按 workspace 根解析，
  // 否则会二次拼成 docs/docs/...
  assert.equal(
    resolveMarkdownFileLink(workspacePath, "/docs/diagram.png", { documentPath })?.path,
    "/Users/me/project/docs/diagram.png",
  );
});
