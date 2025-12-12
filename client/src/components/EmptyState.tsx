import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  cta?: ReactNode;
  hint?: string;
  className?: string;
};

const DefaultIcon = () => (
  <svg
    viewBox="0 0 120 120"
    role="img"
    aria-hidden="true"
    className="h-28 w-28 text-primary/30"
  >
    <defs>
      <linearGradient id="empty-state" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <rect x="12" y="18" width="96" height="72" rx="18" fill="url(#empty-state)" />
    <path
      d="M36 48h48M36 62h30"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />
    <circle cx="78" cy="62" r="9" stroke="currentColor" strokeWidth="6" strokeOpacity="0.35" fill="none" />
    <circle cx="78" cy="62" r="4" fill="currentColor" opacity="0.9" />
  </svg>
);

export function EmptyState({ title, description, icon, cta, hint, className }: EmptyStateProps) {
  return (
    <div className={cn("empty-state glass-panel", className)}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="flex w-full flex-col items-center gap-5 text-center"
      >
        <div className="rounded-3xl bg-primary/10 p-6 text-primary/70">
          {icon ?? <DefaultIcon />}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        {cta && <div className="flex flex-wrap justify-center gap-2">{cta}</div>}
        {hint && <p className="text-xs uppercase tracking-widest text-muted-foreground/80">{hint}</p>}
      </motion.div>
    </div>
  );
}
