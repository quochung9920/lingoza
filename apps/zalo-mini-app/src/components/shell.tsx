import type { ReactNode } from "react";

import { ct } from "../lib/i18n";
import { IconButton } from "./primitives";

/**
 * App chrome.
 *
 * The header's inline-end padding reserves space for Zalo's floating menu
 * capsule, so no control of ours can end up underneath it. Back always sits at
 * the inline start and always means "up one level" -- the Mini App has no
 * browser chrome to fall back on, so a consistent Back is the only way out.
 */

export type TabId = "learn" | "speak" | "talk" | "progress";

export const TABS: Array<{ id: TabId; icon: string; labelKey: Parameters<typeof ct>[0] }> = [
  { id: "learn", icon: "📚", labelKey: "nav.learn" },
  { id: "speak", icon: "🎤", labelKey: "nav.speak" },
  { id: "talk", icon: "💬", labelKey: "nav.talk" },
  { id: "progress", icon: "📈", labelKey: "nav.progress" }
];

export function MiniAppSafeHeader({
  title,
  onBack,
  meta,
  bordered = false
}: {
  title: string;
  onBack?: () => void;
  meta?: ReactNode;
  bordered?: boolean;
}) {
  return (
    <header className={`lz-header${bordered ? " lz-header--bordered" : ""}`}>
      {onBack ? <IconButton label={ct("common.back")} icon="‹" onClick={onBack} /> : null}
      <h1 className="lz-header__title">{title}</h1>
      {meta ? <span className="lz-header__meta">{meta}</span> : null}
    </header>
  );
}

export function BottomNav({
  active,
  onChange
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="lz-nav" aria-label="Điều hướng chính">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="lz-nav__item"
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="lz-nav__icon" aria-hidden="true">
            {tab.icon}
          </span>
          {ct(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}

export function AppShell({
  header,
  children,
  nav,
  flush
}: {
  header?: ReactNode;
  children: ReactNode;
  nav?: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="lz-shell">
      {header}
      <main className={`lz-main${flush ? " lz-main--flush" : ""}`}>{children}</main>
      {nav}
    </div>
  );
}
