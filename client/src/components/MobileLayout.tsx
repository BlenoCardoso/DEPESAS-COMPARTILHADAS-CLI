import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PageContainer } from "./layout/PageContainer";
import { useFirebaseMessaging } from "@/hooks/useFirebaseMessaging";
import { AppHeader } from "./AppHeader";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import {
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  BarChart3,
  Home,
  LogOut,
  Menu,
  Plus,
  PieChart,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Repeat,
  Folder,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  icon: typeof Home;
  label: string;
  shortLabel?: string;
  path: string;
  showBadge?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Users, label: "Grupos", path: "/groups" },
  { icon: CreditCard, label: "Despesas Compartilhadas", path: "/shared-expenses" },
  { icon: Wallet, label: "Despesas Pessoais", shortLabel: "Pessoais", path: "/personal-expenses" },
  { icon: ArrowLeftRight, label: "Saldos do Grupo", shortLabel: "Saldos", path: "/group-balances" },
  { icon: Repeat, label: "Despesas Recorrentes", shortLabel: "Recorrentes", path: "/expense-templates" },
  { icon: Folder, label: "Categorias", path: "/expense-categories" },
  { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
  { icon: Clock, label: "Lembretes", path: "/reminders" },
  { icon: Calendar, label: "Calendário", path: "/calendar" },
  { icon: PieChart, label: "Relatórios", path: "/reports" },
];

// Rotas acessíveis via atalhos/contexto (ex.: card na tela de Grupos),
// mas que não devem aparecer no menu lateral.
const HIDDEN_NAV_FOR_TITLES: NavItem[] = [
  { icon: Home, label: "Convites", path: "/invitations" },
];

const SUPPORT_NAV: NavItem[] = [
  { icon: Bell, label: "Notificações", path: "/notifications", showBadge: true },
  { icon: TrendingUp, label: "Perfil Financeiro", shortLabel: "Perfil", path: "/financial-profile" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

const BOTTOM_NAV: NavItem[] = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Users, label: "Grupos", path: "/groups" },
  { icon: ReceiptText, label: "Compartilhadas", path: "/shared-expenses" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
];

const HEADER_SHORTCUT_PATHS = new Set(["/notifications", "/settings"]);

function isPathActive(currentPath: string, itemPath: string) {
  const cleanCurrent = currentPath.split("?")[0]?.split("#")[0] || "/";
  const cleanItem = itemPath.split("?")[0]?.split("#")[0] || itemPath;
  if (cleanItem === "/") return cleanCurrent === "/";
  return cleanCurrent === cleanItem || cleanCurrent.startsWith(cleanItem + "/");
}

function getInitials(userName?: string | null, userEmail?: string | null) {
  const base = (userName || "").trim() || (userEmail || "").split("@")[0] || "";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${last}`.toUpperCase();
}

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { currentGroup } = useCurrentGroup();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 30000,
  });

  useFirebaseMessaging(Boolean(user));

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    setLocation("/");
  };

  const forceMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const localFlag = localStorage.getItem("force-mobile-layout") === "true";
    const globalFlag = (window as any).__FORCE_MOBILE__ === true;
    const envFlag = import.meta.env.VITE_FORCE_MOBILE === "1";
    return localFlag || globalFlag || envFlag;
  }, []);

  const activeTitle = useMemo(() => {
    const allNav = [...PRIMARY_NAV, ...SUPPORT_NAV, ...HIDDEN_NAV_FOR_TITLES];
    const matches = allNav.filter((item) => isPathActive(location, item.path));
    if (matches.length === 0) return APP_TITLE;
    return matches.reduce((best, item) => (item.path.length > best.path.length ? item : best)).label;
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
          <AppHeader
            title={activeTitle}
            variant="solid"
            left={
              forceMobile ? null : (
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                        className={cn("hidden md:inline-flex lg:hidden", "interactive-tap rounded-2xl")}
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
                    userAvatarUrl={(user as any)?.avatarUrl}
                    activePath={location}
                  />
                </Sheet>
              )
            }
            right={
              forceMobile ? (
                <>
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
                  <Link href="/settings">
                    <Button variant="ghost" size="icon" className="interactive-tap rounded-2xl">
                      <Settings className="h-5 w-5" />
                      <span className="sr-only">Configurações</span>
                    </Button>
                  </Link>
                </>
              ) : null
            }
          />

          <main
            className="app-main-scroll min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ paddingBottom: forceMobile ? "calc(5rem + var(--safe-area-bottom))" : undefined }}
          >
            <PageContainer as="div">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location}
                  className="route-transition"
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0 }
                  }
                  animate={{ opacity: 1 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0 }
                  }
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
                  style={{ willChange: "opacity" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </PageContainer>
          </main>
        </div>
      </div>

      <BottomNavigation
        forceMobile={forceMobile}
        activePath={location}
        unreadCount={unreadCount ?? 0}
        onAdd={() => {
          const clean = location.split("?")[0]?.split("#")[0] || "/";
          const target = clean.startsWith("/personal-expenses")
            ? "/personal-expenses?create=1"
            : clean.startsWith("/shared-expenses")
              ? "/shared-expenses?create=1"
              : currentGroup?.id
                ? "/shared-expenses?create=1"
                : "/personal-expenses?create=1";
          setLocation(target);
        }}
      />
    </div>
  );
}

function BottomNavigation({
  forceMobile,
  activePath,
  unreadCount,
  onAdd,
}: {
  forceMobile: boolean;
  activePath: string;
  unreadCount: number;
  onAdd: () => void;
}) {
  return (
    <nav
      className={cn(
        forceMobile ? "" : "md:hidden",
        "safe-area-bottom fixed bottom-0 left-0 right-0 z-40 w-full border-t border-border/70 bg-card/95 shadow-md supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur"
      )}
    >
      <div className="relative mx-auto w-full max-w-5xl px-2 sm:px-4 overflow-visible">
        <div className="grid h-14 grid-cols-5 items-center overflow-visible">
          {BOTTOM_NAV.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(activePath, item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-1 py-1">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-primary/12 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="relative flex items-center justify-center">
            <Button
              type="button"
              onClick={onAdd}
              className={cn(
                "interactive-tap absolute -top-6 h-14 w-14 rounded-full p-0 bg-primary text-primary-foreground shadow-md ring-4 ring-background",
                "hover:bg-primary/95"
              )}
              aria-label="Adicionar despesa"
            >
              <Plus className="h-7 w-7" />
            </Button>
          </div>

          {BOTTOM_NAV.slice(2).map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(activePath, item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div className="flex flex-col items-center justify-center gap-1 py-1">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-primary/12 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
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
  userAvatarUrl,
  activePath,
}: {
  onNavigate: () => void;
  unreadCount: number;
  onLogout: () => void;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  activePath: string;
}) {
  const bottomNavPaths = useMemo(() => new Set(BOTTOM_NAV.map((item) => item.path)), []);
  const supportItems = useMemo(
    () => SUPPORT_NAV.filter((item) => !HEADER_SHORTCUT_PATHS.has(item.path)),
    []
  );
  const drawerOrganizationSections = useMemo(() => {
    const secondary = PRIMARY_NAV.filter((item) => !bottomNavPaths.has(item.path));

    const financePaths = new Set(["/personal-expenses", "/group-balances", "/expense-templates", "/expense-categories"]);
    const planningPaths = new Set(["/tasks", "/reminders", "/calendar"]);

    const finance = secondary.filter((item) => financePaths.has(item.path));
    const planning = secondary.filter((item) => planningPaths.has(item.path));
    const other = secondary.filter((item) => !financePaths.has(item.path) && !planningPaths.has(item.path));

    return [
      { title: "FINANCEIRO", items: finance },
      { title: "ROTINA", items: planning },
      { title: "APLICATIVO", items: other },
    ].filter((section) => section.items.length > 0);
  }, [bottomNavPaths]);
  const initials = getInitials(userName, userEmail);

  return (
    <SheetContent
      side="left"
      className="flex w-[280px] flex-col p-0 pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)]"
    >
      <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            {userAvatarUrl ? <AvatarImage src={userAvatarUrl} alt={userName || APP_TITLE} /> : null}
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="text-xs text-muted-foreground">{APP_TITLE}</SheetTitle>
            <p className="text-lg font-semibold text-foreground leading-tight truncate">{userName || "Olá"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail || ""}</p>
          </div>
        </div>
      </SheetHeader>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {drawerOrganizationSections.map((section, index) => (
          <div key={section.title} className={cn("space-y-2", index === 0 ? "" : "border-t border-border/60 pt-3")}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{section.title}</p>
            <NavList items={section.items} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />
          </div>
        ))}

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">CONTA</p>
          <NavList items={supportItems} activePath={activePath} unreadCount={unreadCount} onNavigate={onNavigate} />
        </div>
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
        const isActive = isPathActive(activePath, item.path);
        const showBadge = item.showBadge && unreadCount > 0;
        const label = variant === "drawer" ? (item.shortLabel || item.label) : item.label;
        return (
          <Link key={item.path} href={item.path}>
            <div
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm transition-colors",
                variant === "rail" ? "text-sm" : "text-sm",
                isActive
                  ? cn(
                      variant === "drawer" ? "rounded-full" : "rounded-2xl",
                      "bg-primary/12 text-primary"
                    )
                  : cn(
                      variant === "drawer" ? "rounded-full" : "rounded-2xl",
                      "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )
              )}
            >
              <div className={cn("flex items-center", variant === "drawer" ? "gap-2" : "gap-3")}>
                <Icon className={cn(variant === "drawer" ? "h-4 w-4" : "h-5 w-5")} />
                <span className="min-w-0 truncate font-medium leading-tight">{label}</span>
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
