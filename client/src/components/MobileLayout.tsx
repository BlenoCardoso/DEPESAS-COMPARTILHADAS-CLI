import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Users, label: "Grupos", path: "/groups" },
  { icon: CreditCard, label: "Despesas Compartilhadas", path: "/shared-expenses" },
  { icon: Wallet, label: "Despesas Pessoais", path: "/personal-expenses" },
  { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
  { icon: Clock, label: "Lembretes", path: "/reminders" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: PieChart, label: "Relatorios", path: "/reports" },
  { icon: ListTodo, label: "Convites", path: "/invitations" },
];

const SUPPORT_NAV: NavItem[] = [
  { icon: Bell, label: "Notificacoes", path: "/notifications", showBadge: true },
  { icon: Settings, label: "Configuracoes", path: "/settings" },
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
    <div className="app-shell">
      <div className={cn("app-frame", forceMobile ? "" : "lg:grid lg:grid-cols-[260px_minmax(0,1fr)]")}>
        {!forceMobile && (
          <DesktopRail
            activePath={location}
            unreadCount={unreadCount ?? 0}
            userName={user?.name ?? null}
            onLogout={handleLogout}
          />
        )}

        <div className="flex h-[100dvh] flex-col overflow-hidden">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl">
            <div className="pt-[var(--safe-area-top)]">
              <div className="flex h-[var(--header-height)] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className={forceMobile ? "" : "lg:hidden"}>
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
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">{APP_TITLE}</p>
                      <p className="text-base font-semibold text-foreground">{activeTitle}</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
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
                  onClick={toggleForceMobile}
                  title={forceMobile ? "Modo mobile ativo" : "Forcar modo mobile"}
                >
                  {forceMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            </div>
          </header>

          <main
            className="flex-1 overflow-y-auto md:pb-0"
            style={{ paddingBottom: forceMobile ? "calc(var(--bottom-nav-height) + var(--safe-area-bottom))" : undefined }}
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
        "safe-area-bottom fixed bottom-0 left-0 right-0 z-40 w-full border-t border-border/70 bg-card/90 backdrop-blur-xl"
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
                  "flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
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
  return (
    <SheetContent side="left" className="flex w-[300px] flex-col p-0">
      <SheetHeader className="border-b border-border/70 px-6 py-5 text-left">
        <SheetTitle className="text-sm text-muted-foreground">{APP_TITLE}</SheetTitle>
        <p className="text-xl font-semibold text-foreground">{userName || "Ola"}</p>
        <p className="text-xs text-muted-foreground">{userEmail || ""}</p>
      </SheetHeader>
      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <NavList items={PRIMARY_NAV} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />
        <div className="border-t border-border/60 pt-5">
          <NavList
            items={SUPPORT_NAV}
            activePath={activePath}
            unreadCount={unreadCount}
            onNavigate={onNavigate}
          />
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-4">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={onLogout}>
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
                variant === "rail" ? "text-sm" : "text-base",
                isActive
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
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
