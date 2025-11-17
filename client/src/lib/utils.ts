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

// Exibe um rótulo amigável para usuário priorizando nome/email; se for o usuário logado, usa seus dados locais
export function userLabel(
  target?: { id?: string | null; openId?: string | null; name?: string | null; email?: string | null },
  currentUser?: { id?: string | null; openId?: string | null; name?: string | null; email?: string | null }
) {
  if (!target) return "";
  const idsMatch =
    (currentUser?.id && target.id && target.id === currentUser.id) ||
    (currentUser?.id && target.openId && target.openId === currentUser.id) ||
    (currentUser?.openId && target.openId && target.openId === currentUser.openId);

  if (idsMatch) {
    return (
      currentUser?.name ||
      currentUser?.email ||
      target.name ||
      target.email ||
      (target.id ?? "")
    );
  }

  return target.name || target.email || (target.id ?? "");
}

// Tradução de papéis de membros
export function translateMemberRole(role?: string | null) {
  if (!role) return "";
  switch (role) {
    case 'owner':
      return 'Proprietário(a)';
    case 'admin':
      return 'Administrador(a)';
    case 'member':
      return 'Membro';
    default:
      return role;
  }
}
