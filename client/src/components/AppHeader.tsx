import { APP_LOGO, APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Link } from "wouter";

export function AppHeader({
  title,
  left,
  right,
  className,
  variant = "default",
}: {
  title: string;
  left: ReactNode;
  right: ReactNode;
  className?: string;
  variant?: "default" | "solid";
}) {
  return (
    <header
      className={cn(
        "shrink-0 z-40 border-b",
        variant === "solid"
          ? "bg-primary text-primary-foreground border-transparent"
          : "bg-background/85 backdrop-blur-xl border-border/70",
        className
      )}
    >
      <div className="pt-[var(--safe-area-top)]">
        <div className="flex h-[var(--header-height)] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 shrink-0">{left}</div>

          <Link href="/">
            <div className="min-w-0 flex-1 flex items-center justify-start gap-3 cursor-pointer">
              {APP_LOGO ? (
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className={cn(
                    "h-9 w-9 rounded-full object-cover ring-1 shrink-0",
                    variant === "solid" ? "ring-primary-foreground/20" : "ring-border"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ring-1 shrink-0",
                    variant === "solid"
                      ? "bg-primary-foreground/10 text-primary-foreground ring-primary-foreground/20"
                      : "bg-primary/15 text-primary ring-border"
                  )}
                >
                  DC
                </div>
              )}
              <span
                className={cn(
                  "font-display min-w-0 truncate text-[1.05rem] font-semibold leading-none tracking-tight",
                  variant === "solid" ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {title}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 shrink-0">{right}</div>
        </div>
      </div>
    </header>
  );
}
