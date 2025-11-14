import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converte valor em centavos (inteiro) para string monetária local BRL
export function formatCents(value?: number | null, options?: { currency?: string }) {
  if (value == null) return "-";
  const currency = options?.currency || 'BRL';
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency });
}

// Parse input em reais (string) para centavos inteiro
export function parseReaisToCents(input: string) {
  const normalized = input.replace(/[^0-9,\.]/g, '').replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}
