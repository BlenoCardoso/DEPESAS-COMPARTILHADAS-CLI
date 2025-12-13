import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PageContainer } from "./layout/PageContainer";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import {
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  Home,
  ListTodo,
  LogOut,
  Menu,
  PieChart,
  Settings,
  Users,
  Wallet,
  Smartphone,
  Monitor,
} from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  showBadge?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Users, label: "Grupos", path: "/groups" },
  { icon: CreditCard, label: "Despesas Compartilhadas", path: "/shared-expenses" },
  { icon: Wallet, label: "Despesas Pessoais", path: "/personal-expenses" },
  { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
  { icon: Clock, label: "Lembretes", path: "/reminders" },
  { icon: Calendar, label: "Calendário", path: "/calendar" },
  { icon: PieChart, label: "Relatórios", path: "/reports" },
  { icon: ListTodo, label: "Convites", path: "/invitations" },
];

const SUPPORT_NAV: NavItem[] = [
  { icon: Bell, label: "Notificações", path: "/notifications", showBadge: true },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const BOTTOM_NAV: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "Grupos", path: "/groups" },
  { icon: CreditCard, label: "Despesas", path: "/shared-expenses" },
  { icon: PieChart, label: "Relatorios", path: "/reports" },
];

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  useFirebaseMessaging(Boolean(user));

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  const forceMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const localFlag = localStorage.getItem("force-mobile-layout") === "true";
    const globalFlag = (window as any).__FORCE_MOBILE__ === true;
    const envFlag = import.meta.env.VITE_FORCE_MOBILE === "1";
    return localFlag || globalFlag || envFlag;
  }, []);

  const toggleForceMobile = () => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem("force-mobile-layout") === "true";
    localStorage.setItem("force-mobile-layout", (!current).toString());
    window.location.reload();
  };

  const activeTitle = useMemo(() => {
    return PRIMARY_NAV.find(item => item.path === location)?.label || APP_TITLE;
  }, [location]);

  return (
    <div className="app-shell h-[100dvh] overflow-hidden bg-background">
      <div className={cn("app-frame h-full", forceMobile ? "" : "lg:grid lg:grid-cols-[260px_minmax(0,1fr)]")}> 
        {!forceMobile && (
          <DesktopRail
            activePath={location}
            unreadCount={unreadCount ?? 0}
            userName={user?.name ?? null}
            onLogout={handleLogout}
          />
        )}

        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 z-40 bg-gradient-to-b from-primary/20 via-background/95 to-background/85 shadow-sm backdrop-blur-xl">
            <div className="pt-[var(--safe-area-top)]">
              <div className="flex h-[var(--header-height)] items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          forceMobile ? "" : "lg:hidden",
                          "interactive-tap rounded-2xl"
                        )}
                      >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </SheetTrigger>
                    <NavigationDrawer
                      onNavigate={() => setIsMenuOpen(false)}
                      unreadCount={unreadCount ?? 0}
                      onLogout={handleLogout}
                      userEmail={user?.email}
                      userName={user?.name}
                      activePath={location}
                    />
                  </Sheet>

                  <Link href="/">
                    <div className="flex cursor-pointer items-center gap-2">
                      {APP_LOGO && (
                        <img src={APP_LOGO} alt={APP_TITLE} className="h-9 w-9 rounded-2xl object-cover" />
                      )}
                      <div className="leading-tight">
                        <p className="text-[11px] font-medium text-muted-foreground">{APP_TITLE}</p>
                        <p className="text-base font-semibold text-foreground">{activeTitle}</p>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <Link href="/notifications">
                    <Button variant="ghost" size="icon" className="interactive-tap relative rounded-2xl">
                      <Bell className="h-5 w-5" />
                      {unreadCount && unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] justify-center px-1 text-[11px]"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="interactive-tap rounded-2xl"
                    onClick={toggleForceMobile}
                    title={forceMobile ? "Modo mobile ativo" : "Forçar modo mobile"}
                  >
                    {forceMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main
            className="app-main-scroll min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ paddingBottom: forceMobile ? "calc(5rem + var(--safe-area-bottom))" : undefined }}
          >
            <PageContainer as="div">
              <div key={location} className="page-transition">
                {children}
              </div>
            </PageContainer>
          </main>
        </div>
      </div>

      <BottomNavigation forceMobile={forceMobile} activePath={location} unreadCount={unreadCount ?? 0} />
    </div>
  );
}

function BottomNavigation({ forceMobile, activePath, unreadCount }: { forceMobile: boolean; activePath: string; unreadCount: number }) {
  return (
    <nav
      className={cn(
        forceMobile ? "" : "md:hidden",
        "safe-area-bottom fixed bottom-0 left-0 right-0 z-40 w-full border-t border-border/70 bg-background/75 backdrop-blur-xl shadow-[0_-8px_24px_-24px_rgba(15,23,42,0.6)]"
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-around px-2 sm:px-4">
        {BOTTOM_NAV.map(item => {
          const Icon = item.icon;
          const isActive = activePath === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "interactive-card flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/15 text-primary scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-[1.03]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavigationDrawer({
  onNavigate,
  unreadCount,
  onLogout,
  userName,
  userEmail,
  activePath,
}: {
  onNavigate: () => void;
  unreadCount: number;
  onLogout: () => void;
  userName?: string | null;
  userEmail?: string | null;
  activePath: string;
}) {
  const primaryCompact = PRIMARY_NAV.slice(0, 4);
  const primaryMore = PRIMARY_NAV.slice(4);

  return (
    <SheetContent side="left" className="flex w-[280px] flex-col p-0">
      <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
        <SheetTitle className="text-xs text-muted-foreground">{APP_TITLE}</SheetTitle>
        <p className="text-lg font-semibold text-foreground leading-tight">{userName || "Olá"}</p>
        <p className="text-[11px] text-muted-foreground truncate">{userEmail || ""}</p>
      </SheetHeader>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <NavList items={primaryCompact} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />

        <Accordion type="single" collapsible>
          <AccordionItem value="more" className="border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Mais</span>
                <span className="text-xs text-muted-foreground">Organização e ajustes</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="space-y-3">
                <NavList items={primaryMore} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />

                <div className="border-t border-border/60 pt-3">
                  <NavList items={SUPPORT_NAV} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="border-t border-border/60 px-3 py-3">
        <Button variant="ghost" className="w-full justify-start gap-2 rounded-2xl" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </SheetContent>
  );
}

function DesktopRail({ activePath, unreadCount, userName, onLogout }: {
  activePath: string;
  unreadCount: number;
  userName: string | null;
  onLogout: () => void;
}) {
  return (
    <aside className="hidden h-full flex-col border-r border-border/60 bg-sidebar/80 px-6 py-6 lg:flex">
      <Link href="/">
        <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 shadow-sm">
          {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10 rounded-2xl object-cover" />}
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">{APP_TITLE}</p>
            <p className="text-lg font-semibold text-foreground">Painel</p>
          </div>
        </div>
      </Link>
      <NavList items={PRIMARY_NAV} activePath={activePath} unreadCount={unreadCount} variant="rail" className="mt-6" />
      <div className="mt-auto w-full border-t border-border/60 pt-5">
        <NavList items={SUPPORT_NAV} activePath={activePath} unreadCount={unreadCount} variant="rail" />
        <div className="mt-6 rounded-2xl border border-border/60 p-4 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-[0.4em]">Conta</p>
          <p className="mt-1 text-foreground">{userName || "Usuario"}</p>
          <Button variant="ghost" size="sm" className="mt-4 gap-2 px-0 text-muted-foreground" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavList({
  items,
  activePath,
  unreadCount,
  onNavigate,
  variant = "drawer",
  className,
}: {
  items: NavItem[];
  activePath: string;
  unreadCount: number;
  onNavigate?: () => void;
  variant?: "drawer" | "rail";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activePath === item.path;
        const showBadge = item.showBadge && unreadCount > 0;
        return (
          <Link key={item.path} href={item.path}>
            <div
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors",
                variant === "rail" ? "text-sm" : "text-sm",
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className={cn("flex items-center", variant === "drawer" ? "gap-2" : "gap-3")}>
                <Icon className={cn(variant === "drawer" ? "h-4 w-4" : "h-5 w-5")} />
                <span className="font-medium leading-tight">{item.label}</span>
              </div>
              {showBadge && (
                <Badge variant="destructive" className="rounded-full px-2 text-[11px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
