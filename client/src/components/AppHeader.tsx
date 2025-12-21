import { APP_LOGO, APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Link } from "wouter";

export function AppHeader({
  title,
  left,
  right,
  className,
}: {
  title: string;
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/70",
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
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-border shrink-0"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold ring-1 ring-border shrink-0">
                  DC
                </div>
              )}
              <span className="min-w-0 truncate text-[1.05rem] font-semibold leading-none tracking-tight text-foreground">
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
