import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import type { OpenTabLauncherItemId } from "@/app-shell/animatedSidePanePanelModel.js";

export interface OpenTabLauncherItem {
  id: OpenTabLauncherItemId;
  label: string;
  icon: LucideIcon;
  onOpen: () => void;
}

export function OpenTabLauncher({
  items,
  isDesktop,
  captionControlsStyle,
  headerActions,
}: {
  items: OpenTabLauncherItem[];
  isDesktop?: boolean;
  captionControlsStyle?: CSSProperties;
  headerActions?: ReactNode;
}) {
  const { intl } = useZCodeIntl();

  return (
    <div className="side-pane-open-tab-shell flex h-full min-h-0 flex-col bg-background">
      <div
        className={cn(
          "flex h-12 shrink-0 items-center justify-end px-2",
          isDesktop && "[app-region:drag]",
        )}
        style={captionControlsStyle}
      >
        {headerActions}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
        <div className="side-pane-open-tab-content flex w-full shrink-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-ui-xl font-semibold leading-7 text-foreground">
              {intl.formatMessage({ id: "sidePane.openTab" })}
            </h2>
            <p className="text-ui-base leading-5 text-foreground-subtle">
              {intl.formatMessage({ id: "sidePane.openTabDescription" })}
            </p>
          </div>
          <div className="side-pane-open-tab-list flex w-full flex-col gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-side-pane-open-tab-item={item.id}
                  className="side-pane-open-tab-button flex h-12 min-w-0 items-center gap-3 rounded-xl bg-surface px-3 text-ui-base font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={item.onOpen}
                >
                  <Icon className="size-4 text-foreground-subtle" />
                  <span className="side-pane-open-tab-button-label min-w-0 flex-1 truncate text-left">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
