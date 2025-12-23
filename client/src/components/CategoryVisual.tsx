import { cn } from "@/lib/utils";
import {
  BookOpen,
  Car,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  PartyPopper,
  ReceiptText,
  ShoppingCart,
  Tag,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ReactNode } from "react";

type CategoryTone = {
  base: string;
  border: string;
};

const TONES: CategoryTone[] = [
  { base: "bg-primary/10 text-primary", border: "border-primary/20" },
  { base: "bg-secondary/10 text-secondary", border: "border-secondary/20" },
  { base: "bg-accent/10 text-accent", border: "border-accent/20" },
  { base: "bg-info/10 text-info", border: "border-info/20" },
  { base: "bg-success/10 text-success", border: "border-success/20" },
  { base: "bg-warning/10 text-warning", border: "border-warning/25" },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function toneForCategory(categoryName: string): CategoryTone {
  const key = (categoryName || "").trim().toLowerCase();
  const index = key ? hashString(key) % TONES.length : 0;
  return TONES[index] ?? TONES[0];
}

function normalizeCategoryName(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function lucideForCategory(categoryName: string): LucideIcon {
  const key = normalizeCategoryName(categoryName);

  if (/(alimentacao|alimentacao|comida|restaurante|mercado|supermercado|lanch|cafe)/.test(key)) return Utensils;
  if (/(transporte|uber|99|taxi|carro|gasolina|combustivel|onibus|metro|trem)/.test(key)) return Car;
  if (/(moradia|casa|aluguel|condominio|energia|luz|agua|internet)/.test(key)) return Home;
  if (/(lazer|festa|cinema|show|viagem|turismo|entretenimento|jogo)/.test(key)) return PartyPopper;
  if (/(saude|farmacia|medic|consulta|hospital|dentista)/.test(key)) return HeartPulse;
  if (/(educacao|escola|faculdade|curso|livro)/.test(key)) return GraduationCap;
  if (/(compras|shopping|loja)/.test(key)) return ShoppingCart;
  if (/(servic|manutenc|reparo|conserto)/.test(key)) return Wrench;
  if (/(conta|fatura|cartao|credito|debito|banco)/.test(key)) return ReceiptText;
  if (/(outros|diversos)/.test(key)) return Package;

  return Tag;
}

function emojiNode(icon?: string | null) {
  const value = (icon || "").trim();
  if (!value) return null;
  return (
    <span className="leading-none" aria-hidden="true">
      {value}
    </span>
  );
}

export function CategoryIcon({
  name,
  icon,
  size = "xs",
  className,
}: {
  name: string;
  icon?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const tone = toneForCategory(name);
  const Emoji = emojiNode(icon);
  const Icon = lucideForCategory(name);

  const sizeClasses =
    size === "md"
      ? "h-9 w-9 rounded-2xl"
      : size === "sm"
        ? "h-7 w-7 rounded-xl"
        : "h-5 w-5 rounded-lg";

  const content = Emoji ? (
    <span className={cn(size === "md" ? "text-lg" : size === "sm" ? "text-base" : "text-[12px]")}>{Emoji}</span>
  ) : (
    <Icon className={cn(size === "md" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden="true" />
  );

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        tone.base,
        tone.border,
        sizeClasses,
        className
      )}
      title={name}
      aria-label={name}
    >
      {content}
    </span>
  );
}

export function CategoryPill({
  name,
  icon,
  iconSize = "xs",
  className,
}: {
  name: string;
  icon?: string | null;
  iconSize?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <CategoryIcon name={name} icon={icon} size={iconSize} />
      <span className="min-w-0 truncate text-[11px] text-muted-foreground">{name}</span>
    </span>
  );
}

export function CategoryOption({
  name,
  icon,
  className,
  right,
}: {
  name: string;
  icon?: string | null;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <span className={cn("flex w-full min-w-0 items-center justify-between gap-3", className)}>
      <span className="flex min-w-0 items-center gap-2">
        <CategoryIcon name={name} icon={icon} size="sm" />
        <span className="min-w-0 truncate">{name}</span>
      </span>
      {right}
    </span>
  );
}
