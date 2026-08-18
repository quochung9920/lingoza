import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ct } from "../lib/i18n";

/**
 * Shared primitives.
 *
 * Every one of these renders a real `<button>` when it is interactive. Icon-only
 * controls take a required `label` rather than an optional one, because an
 * unlabelled icon button is unusable with a screen reader and an optional prop
 * is a prop that gets forgotten.
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  block?: boolean;
  children: ReactNode;
};

export function PrimaryButton({ block = true, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`lz-btn lz-btn--primary${block ? " lz-btn--block" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ block = false, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`lz-btn lz-btn--secondary${block ? " lz-btn--block" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ block = false, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`lz-btn lz-btn--ghost${block ? " lz-btn--block" : ""}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode }) {
  return (
    <button type="button" className="lz-icon-btn" aria-label={label} {...rest}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  variant,
  className
}: {
  children: ReactNode;
  variant?: "panel" | "muted";
  className?: string;
}) {
  const modifier = variant ? ` lz-card--${variant}` : "";
  return <section className={`lz-card${modifier}${className ? ` ${className}` : ""}`}>{children}</section>;
}

export function InteractiveCard({
  children,
  onClick,
  disabled,
  ariaLabel,
  className
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`lz-card lz-card--interactive${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="lz-row lz-row--between">
      <div>
        {eyebrow ? <p className="lz-eyebrow">{eyebrow}</p> : null}
        <h2 className="lz-section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

/**
 * A progress bar. The numeric value goes on the element itself via ARIA so it
 * is available to assistive tech even when the visual label is omitted.
 */
export function ProgressBar({
  value,
  label,
  onAccent
}: {
  value: number;
  label: string;
  onAccent?: boolean;
}) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={`lz-progress${onAccent ? " lz-progress--on-accent" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="lz-progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function SkillProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="lz-skill-row">
      <div>
        <p className="lz-muted" style={{ marginBottom: 4 }}>
          {label}
        </p>
        <ProgressBar value={value} label={label} />
      </div>
      <span className="lz-skill-row__value">{Math.round(value * 100)}%</span>
    </div>
  );
}

/** Step dots across the top of the lesson player. */
export function LessonProgress({ total, current }: { total: number; current: number }) {
  return (
    <div
      className="lz-lesson-steps"
      role="progressbar"
      aria-label="Tiến độ bài học"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className="lz-lesson-steps__step"
          data-done={index < current}
          data-current={index === current}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ height = 80 }: { height?: number }) {
  return <div className="lz-skeleton" style={{ height }} aria-hidden="true" />;
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="lz-stack" aria-busy="true" aria-live="polite">
      <span className="lz-visually-hidden">{label ?? ct("common.loading")}</span>
      <Skeleton height={150} />
      <Skeleton height={92} />
      <Skeleton height={92} />
    </div>
  );
}

export function EmptyState({ glyph = "🌱", title, body }: { glyph?: string; title: string; body?: string }) {
  return (
    <div className="lz-state">
      <span className="lz-state__glyph" aria-hidden="true">
        {glyph}
      </span>
      <p className="lz-section-title">{title}</p>
      {body ? <p className="lz-muted">{body}</p> : null}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="lz-state" role="alert">
      <span className="lz-state__glyph" aria-hidden="true">
        ⚠️
      </span>
      <p className="lz-section-title">{title}</p>
      {body ? <p className="lz-muted">{body}</p> : null}
      {onRetry ? <SecondaryButton onClick={onRetry}>{ct("common.retry")}</SecondaryButton> : null}
    </div>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Bạn đang ngoại tuyến"
      body="Lingoza cần kết nối để tải nội dung và âm thanh."
      onRetry={onRetry}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

export function BottomSheet({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="lz-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="lz-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lz-sheet__grabber" aria-hidden="true" />
        <div className="lz-stack">
          <h2 className="lz-section-title">{title}</h2>
          {children}
          <SecondaryButton block onClick={onClose}>
            {ct("common.close")}
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/** Transient message. `role="status"` so it is announced without stealing focus. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="lz-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function FeedbackPanel({
  tone,
  title,
  children
}: {
  tone: "positive" | "neutral" | "attention";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="lz-feedback" data-tone={tone} role="status" aria-live="polite">
      <p className="lz-feedback__title">{title}</p>
      {children}
    </div>
  );
}
