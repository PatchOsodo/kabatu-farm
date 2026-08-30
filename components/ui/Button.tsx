import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The one place that decides what "this is clickable" looks like.
 * Before this component, every module re-implemented buttons/links as
 * plain colored text (`className="text-ink-900 hover:text-gold-600"`),
 * which is indistinguishable from a label at a glance. Every interactive
 * element in the app should route through here or <TabLink>/<ViewLink>
 * below rather than growing its own one-off classes again.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-forest-900 text-parchment-50 border border-forest-900 hover:bg-forest-800 active:bg-forest-700",
  secondary:
    "bg-transparent text-ink-900 border border-line hover:border-ink-300 hover:bg-parchment-100/60",
  ghost:
    "bg-transparent text-ink-900 border border-transparent hover:bg-parchment-100/70 underline decoration-line/70 underline-offset-4 hover:decoration-gold-500",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/5",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded gap-1.5",
  md: "text-sm px-4 py-2 rounded gap-2",
};

const BASE =
  "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Same visual language as <Button>, but renders an <a> via next/link for navigation. */
export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  children,
  className = "",
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={[BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(" ")}
    >
      {children}
    </Link>
  );
}

/**
 * Tab-style nav link (sidebar sub-nav, module tab bars). Visually distinct
 * from a <LinkButton> — underline + weight shift on the active tab — but
 * still unambiguously clickable at rest, unlike the old plain-text tabs.
 */
export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
        active
          ? "border-gold-500 text-ink-900 font-medium"
          : "border-transparent text-ink-500 hover:text-ink-900 hover:border-line",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/**
 * Row/detail "view" link — replaces the old bare `text-ink-900
 * hover:text-gold-600` pattern used on every table row across every
 * module. Adds a visible arrow + underline so it reads as an action, not
 * a label, even before hovering.
 */
export function ViewLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-ink-900 underline decoration-line/70 underline-offset-2 hover:text-gold-600 hover:decoration-gold-500"
    >
      {children}
      <span aria-hidden className="text-ink-300">
        →
      </span>
    </Link>
  );
}
