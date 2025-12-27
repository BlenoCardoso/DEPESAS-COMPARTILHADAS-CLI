import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  Calculator,
  Download,
  Folder,
  LogOut,
  Repeat,
  Settings as SettingsIcon,
  TrendingUp,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type Section = "manage" | "general" | "about";

type MoreItem = {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
};

function MoreList({ items }: { items: MoreItem[] }) {
  return (
    <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-0">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const content = (
            <div
              className={cn(
                "interactive-card flex items-center gap-4 px-5 py-4",
                idx === 0 ? "" : "border-t border-border/60"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground ring-1 ring-border/60">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.description}</p>
                ) : null}
              </div>
            </div>
          );

          return (
            <div key={item.href || item.label}>
              {item.href ? (
                <Link href={item.href}>{content}</Link>
              ) : (
                <button type="button" className="w-full text-left" onClick={item.onClick}>
                  {content}
                </button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function More() {
  const [section, setSection] = useState<Section>("manage");
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const manageItems = useMemo<MoreItem[]>(
    () => [
      {
        label: "Grupos",
        description: "Crie e gerencie seus grupos",
        icon: Users,
        href: "/groups",
      },
      {
        label: "Categorias",
        description: "Organize suas despesas por categoria",
        icon: Folder,
        href: "/expense-categories",
      },
      {
        label: "Despesas recorrentes",
        description: "Cadastre despesas fixas (mensal/semanal/anual)",
        icon: Repeat,
        href: "/expense-templates",
      },
      {
        label: "Exportar relatório",
        description: "Visualize relatórios e totais",
        icon: BarChart3,
        href: "/reports",
      },
      {
        label: "Exportar dados (backup)",
        description: "Baixar JSON com seus dados",
        icon: Download,
        href: "/export-data",
      },
    ],
    []
  );

  const generalItems = useMemo<MoreItem[]>(
    () => [
      {
        label: "Perfil",
        description: "Sua conta e botão de sair",
        icon: UserRound,
        href: "/profile",
      },
      {
        label: "Calculadora",
        description: "Simule divisões de despesas",
        icon: Calculator,
        href: "/calculator",
      },
      {
        label: "Importar dados (backup)",
        description: "Restaurar um arquivo JSON",
        icon: Upload,
        href: "/import-data",
      },
      {
        label: "Notificações",
        description: "Avisos e atualizações",
        icon: Bell,
        href: "/notifications",
      },
      {
        label: "Perfil financeiro",
        description: "Configurações e dados do perfil",
        icon: TrendingUp,
        href: "/financial-profile",
      },
      {
        label: "Configurações",
        description: "Aparência e layout",
        icon: SettingsIcon,
        href: "/settings",
      },
      {
        label: "Sair",
        description: "Encerrar sessão",
        icon: LogOut,
        onClick: async () => {
          await logout();
          setLocation("/");
        },
      },
    ],
    [logout, setLocation]
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="space-y-3">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-2">
          <ToggleGroup
            type="single"
            value={section}
            onValueChange={(v) => setSection((v || "manage") as Section)}
            className="w-full"
            variant="outline"
          >
            <ToggleGroupItem
              value="manage"
              className="flex-1 rounded-2xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              Gerenciar
            </ToggleGroupItem>
            <ToggleGroupItem
              value="general"
              className="flex-1 rounded-2xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              Geral
            </ToggleGroupItem>
            <ToggleGroupItem
              value="about"
              className="flex-1 rounded-2xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            >
              Sobre
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {section === "manage" ? <MoreList items={manageItems} /> : null}
        {section === "general" ? <MoreList items={generalItems} /> : null}

        {section === "about" ? (
          <Card className="rounded-3xl border border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-semibold">{APP_TITLE}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Central de opções do app. Aqui você encontra configurações, relatórios e atalhos de gerenciamento.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </PageContainer>
    </div>
  );
}
