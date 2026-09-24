import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { LoaderCircle, X } from "lucide-react";
import type { BundledTheme, ThemedToken } from "shiki";
import { Button } from "@/components/ui/button.js";
import { toast } from "@/components/ui/toast.js";
import { useWorkspaceServices } from "@/hooks/useWorkspaceServices.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { getPathLeaf } from "@/lib/path.js";
import { inferCodeLanguage } from "@/lib/codeViewer.js";
import {
  highlightCode,
  shouldUseSyntaxHighlighting,
  type TokenizedCode,
} from "@/lib/shikiHighlighter.js";
import { FILE_BROWSER_EDIT_READ_BYTES } from "@/app-shell/fileBrowserEditModel.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { resolveTheme } from "@/useTheme.js";

/** 与预览大文件高亮同一量级，避免编辑草稿时把 Shiki 拖垮。 */
const FILE_BROWSER_EDIT_HIGHLIGHT_MAX_CHARS = 120_000;

function useFileBrowserEditTokens({
  code,
  language,
  path,
  theme,
}: {
  code: string;
  language: string;
  path: string;
  theme: BundledTheme;
}) {
  const [tokenizedCode, setTokenizedCode] = useState<TokenizedCode | null>(null);

  useEffect(() => {
    setTokenizedCode(null);

    if (!code || code.length > FILE_BROWSER_EDIT_HIGHLIGHT_MAX_CHARS) {
      return;
    }

    let cancelled = false;
    const tokenized = highlightCode(code, language, theme, (result) => {
      if (!cancelled) {
        setTokenizedCode(result);
      }
    });

    if (tokenized) {
      setTokenizedCode(tokenized);
    }

    return () => {
      cancelled = true;
    };
  }, [code, language, path, theme]);

  return tokenizedCode;
}

function renderEditTokens(tokens: readonly ThemedToken[] | undefined, fallback: string) {
  if (!tokens || tokens.length === 0) {
    return fallback || " ";
  }

  return tokens.map((token, index) => (
    <span
      key={`${index}:${token.content}`}
      style={token.color ? { color: token.color } : undefined}
    >
      {token.content}
    </span>
  ));
}

function FileBrowserEditHighlightLayer({
  code,
  language,
  path,
  theme,
  showLineNumbers,
  wrapLongLines,
  gutterColumnWidth,
  codePaddingLeft,
  editorStyle,
}: {
  code: string;
  language: string;
  path: string;
  theme: BundledTheme;
  showLineNumbers: boolean;
  wrapLongLines: boolean;
  gutterColumnWidth: string;
  codePaddingLeft: string;
  editorStyle: CSSProperties;
}) {
  const tokenizedCode = useFileBrowserEditTokens({ code, language, path, theme });
  const lines = code.split("\n");
  const useHighlight = shouldUseSyntaxHighlighting(language) && Boolean(tokenizedCode);

  return (
    <div
      className={
        wrapLongLines ? "flex min-h-full w-full" : "flex min-h-full w-max min-w-full"
      }
    >      {showLineNumbers ? (
        <div
          aria-hidden
          className="sticky left-0 shrink-0 select-none border-r border-border/60 bg-background text-right text-foreground-subtle"
          style={{
            boxSizing: "border-box",
            width: gutterColumnWidth,
            paddingTop: editorStyle.paddingTop,
            paddingBottom: editorStyle.paddingBottom,
            paddingLeft: "0.5rem",
            paddingRight: "0.5rem",
            lineHeight: editorStyle.lineHeight,
            fontSize: editorStyle.fontSize,
            fontFamily: editorStyle.fontFamily,
          }}
        >
          {lines.map((_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
      ) : null}
      <pre
        aria-hidden
        className="m-0 min-w-0 flex-1 bg-transparent font-mono"
        style={{
          margin: 0,
          paddingTop: editorStyle.paddingTop,
          paddingBottom: editorStyle.paddingBottom,
          paddingRight: editorStyle.paddingRight,
          paddingLeft: showLineNumbers ? codePaddingLeft : editorStyle.paddingLeft,
          lineHeight: editorStyle.lineHeight,
          fontSize: editorStyle.fontSize,
          fontFamily: editorStyle.fontFamily,
          whiteSpace: editorStyle.whiteSpace,
          overflowWrap: editorStyle.overflowWrap,
          tabSize: editorStyle.tabSize,
          color: tokenizedCode?.fg ?? "inherit",
        }}
      >
        {useHighlight
          ? tokenizedCode!.tokens.map((lineTokens, lineIndex) => (
              <div key={lineIndex}>{renderEditTokens(lineTokens, lines[lineIndex] ?? "")}</div>
            ))
          : lines.map((line, lineIndex) => <div key={lineIndex}>{line || " "}</div>)}
      </pre>
    </div>
  );
}

export function FileBrowserTextEditor({
  path,
  workspacePath,
  workspaceIdentity,
  workspaceRemoteSessionId,
  onCancel,
  onSaved,
}: {
  path: string;
  workspacePath?: string;
  workspaceIdentity?: string;
  workspaceRemoteSessionId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { intl } = useZCodeIntl();
  const { fileService } = useWorkspaceServices(
    workspacePath,
    workspaceRemoteSessionId,
    workspaceIdentity,
  );
  const theme = useZCodeStore((state) => state.theme);
  const codePreviewSettings = useZCodeStore((state) => state.codePreviewSettings);
  const resolvedTheme = resolveTheme(theme);
  const codeTheme =
    resolvedTheme === "dark" ? codePreviewSettings.darkTheme : codePreviewSettings.lightTheme;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightScrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dirty = draft !== baseline;
  const deferredDraft = useDeferredValue(draft);
  const language = inferCodeLanguage(path, deferredDraft);
  const wrapLongLines = codePreviewSettings.wrapLongLines;
  const showLineNumbers = codePreviewSettings.showLineNumbers;
  const lineCount = Math.max(1, draft.split("\n").length);
  const lineNumberWidthCh = Math.max(2, String(lineCount).length);
  // 行号列总宽 + 代码左内边距，须与高亮层 gutter/pre 对齐，否则光标会漂移。
  const gutterColumnWidth = `calc(${lineNumberWidthCh}ch + 1.25rem)`;
  const codePaddingLeft = "0.75rem";

  const editorStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: `${codePreviewSettings.fontSizePx}px`,
    lineHeight: "1.5",
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
    paddingRight: "0.75rem",
    paddingLeft: showLineNumbers
      ? `calc(${lineNumberWidthCh}ch + 1.25rem + ${codePaddingLeft})`
      : codePaddingLeft,
    whiteSpace: wrapLongLines ? "pre-wrap" : "pre",
    overflowWrap: wrapLongLines ? "anywhere" : "normal",
    tabSize: 2,
  } satisfies CSSProperties;

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setLoadError(null);
    setDraft("");
    setBaseline("");

    void fileService
      .readTextFile({ path, offset: 0, length: FILE_BROWSER_EDIT_READ_BYTES })
      .then((result) => {
        if (disposed) {
          return;
        }
        if (result.isBinary) {
          setLoadError(intl.formatMessage({ id: "sidePane.fileBrowser.editBinary" }));
          return;
        }
        if (result.truncated) {
          setLoadError(intl.formatMessage({ id: "sidePane.fileBrowser.editTooLarge" }));
          return;
        }
        setDraft(result.content);
        setBaseline(result.content);
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }
        logger.error(`[FileBrowserTextEditor] 读取失败 path=${path}`, error);
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [fileService, intl, path]);

  useEffect(() => {
    if (!loading && !loadError) {
      textareaRef.current?.focus();
    }
  }, [loadError, loading]);

  const handleSave = useCallback(async () => {
    if (saving || loadError || loading) {
      return;
    }
    setSaving(true);
    try {
      await fileService.writeTextFile({ path, content: draft });
      setBaseline(draft);
      toast(intl.formatMessage({ id: "sidePane.fileBrowser.editSaved" }));
      onSaved();
    } catch (error) {
      logger.error(`[FileBrowserTextEditor] 保存失败 path=${path}`, error);
      toast(
        error instanceof Error
          ? error.message
          : intl.formatMessage({ id: "sidePane.fileBrowser.editSaveFailed" }),
        { variant: "warning" },
      );
    } finally {
      setSaving(false);
    }
  }, [draft, fileService, intl, loadError, loading, onSaved, path, saving]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave();
      }
    },
    [handleSave, onCancel],
  );

  const handleScroll = useCallback((event: UIEvent<HTMLTextAreaElement>) => {
    const highlight = highlightScrollRef.current;
    if (!highlight) {
      return;
    }
    highlight.scrollTop = event.currentTarget.scrollTop;
    highlight.scrollLeft = event.currentTarget.scrollLeft;
  }, []);

  const fileName = getPathLeaf(path) || path;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-ui-base font-medium text-foreground" title={path}>
            {fileName}
            {dirty ? (
              <span className="ml-1 text-foreground-subtle">
                {intl.formatMessage({ id: "sidePane.fileBrowser.editDirty" })}
              </span>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving || Boolean(loadError) || loading}
          onClick={() => void handleSave()}
        >
          {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {intl.formatMessage({ id: "sidePane.fileBrowser.editSave" })}
        </Button>
        <Button
          type="button"
          size="icon-md"
          variant="ghost"
          onClick={onCancel}
          aria-label={intl.formatMessage({ id: "sidePane.fileBrowser.editCancel" })}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-foreground-subtle">
            <LoaderCircle className="size-4 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-ui-base text-destructive">
            {loadError}
          </div>
        ) : (
          <>
            {/* 高亮层与 textarea 共用字号/行高/换行，滚动由 textarea 驱动同步，保持预览态观感。 */}
            <div
              ref={highlightScrollRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-auto scrollbar-hide"
            >
              <FileBrowserEditHighlightLayer
                code={deferredDraft}
                language={language}
                path={path}
                theme={codeTheme}
                showLineNumbers={showLineNumbers}
                wrapLongLines={wrapLongLines}
                gutterColumnWidth={gutterColumnWidth}
                codePaddingLeft={codePaddingLeft}
                editorStyle={editorStyle}
              />
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              className="absolute inset-0 z-10 h-full w-full resize-none overflow-auto bg-transparent font-mono text-transparent caret-foreground outline-none selection:bg-primary/30"
              style={{
                ...editorStyle,
                color: "transparent",
                caretColor: "var(--color-foreground)",
                WebkitTextFillColor: "transparent",
              }}
              aria-label={intl.formatMessage({ id: "sidePane.fileBrowser.editEditorLabel" })}
            />
          </>
        )}
      </div>
    </div>
  );
}
