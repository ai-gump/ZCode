"use client";

import type { ComponentProps } from "react";
import { cn } from "@/components/lib/utils.js";

export const imageThumbnailTriggerClassName =
  "my-4 block w-fit max-w-1/2 cursor-zoom-in overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const imageThumbnailClassName =
  "h-auto max-h-90 max-w-full rounded-xl border border-border bg-background object-cover";

/** 文档预览：居中、接近正文宽度，明显高于聊天缩略图。 */
export const markdownDocumentImageTriggerClassName =
  "mx-auto my-6 block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const markdownDocumentImageClassName =
  "mx-auto h-auto max-h-[min(70vh,48rem)] w-auto max-w-full rounded-xl border border-border bg-background object-contain";

export const markdownDocumentImagePlaceholderClassName =
  "mx-auto flex min-h-48 w-full max-w-3xl items-center justify-center rounded-xl border border-border bg-surface px-3 py-8 text-center text-ui-base text-foreground-subtle";

export function ImageThumbnailGallery({
  children,
  className,
  grouped = true,
  layout = "thumbnail",
  ...props
}: ComponentProps<"div"> & {
  grouped?: boolean;
  /** document：文档预览纵向居中大图；thumbnail：聊天缩略图网格。 */
  layout?: "thumbnail" | "document";
}) {
  return (
    <div
      className={cn(
        grouped
          ? layout === "document"
            ? "my-6 flex flex-col items-center gap-4 [&>[data-image-thumbnail-trigger]]:my-0"
            : "my-4 grid grid-cols-1 gap-2 [&>[data-image-thumbnail-trigger]]:my-0 [&>[data-image-thumbnail-trigger]]:h-32 [&>[data-image-thumbnail-trigger]]:w-full [&>[data-image-thumbnail-trigger]]:max-w-none [&>[data-image-thumbnail-trigger]>img]:size-full [&>[data-image-thumbnail-trigger]>img]:max-h-none sm:grid-cols-2 md:flex md:flex-wrap md:[&>[data-image-thumbnail-trigger]]:h-44 md:[&>[data-image-thumbnail-trigger]]:w-auto md:[&>[data-image-thumbnail-trigger]]:shrink-0 md:[&>[data-image-thumbnail-trigger]>img]:h-44 md:[&>[data-image-thumbnail-trigger]>img]:w-auto md:[&>[data-image-thumbnail-trigger]>img]:max-w-none"
          : "contents",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
