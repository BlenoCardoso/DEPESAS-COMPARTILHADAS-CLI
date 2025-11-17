import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
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
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "./ui/badge";

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });

  const menuItems = [
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

  const forceMobile = (() => {
    if (typeof window === "undefined") return false;
    const localFlag = localStorage.getItem("force-mobile-layout") === "true";
    const globalFlag = (window as any).__FORCE_MOBILE__ === true;
    const envFlag = import.meta.env.VITE_FORCE_MOBILE === "1";
    return localFlag || globalFlag || envFlag;
  })();

  const toggleForceMobile = () => {
    const current = localStorage.getItem("force-mobile-layout") === "true";
    localStorage.setItem("force-mobile-layout", (!current).toString());
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-xl safe-area-top">
        <div className="container flex h-16 items-center justify-between">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={forceMobile ? "" : "md:hidden"}>
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="p-6 border-b">
                  <div className="flex items-center gap-3">
                    {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10 rounded-lg" />}
                    <div>
                      <SheetTitle className="text-left">{APP_TITLE}</SheetTitle>
                      {user && <p className="text-sm text-muted-foreground">{user.name}</p>}
                    </div>
                  </div>
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <div className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;
                      return (
                        <Link key={item.path} href={item.path}>
                          <div
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
                <div className="p-4 border-t space-y-2">
                  <Link href="/settings">
                    <div
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-all cursor-pointer"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Configurações</span>
                    </div>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sair</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8 rounded-lg" />}
              <span className="font-bold text-lg hidden sm:inline">{APP_TITLE}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount && unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              title={forceMobile ? "Modo mobile ativo (clique para voltar)" : "Ativar modo mobile"}
              onClick={toggleForceMobile}
            >
              {forceMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 safe-area-bottom">{children}</main>
      <nav
        className={`${forceMobile ? "" : "md:hidden"} sticky bottom-0 z-40 w-full border-t bg-card/80 backdrop-blur-xl safe-area-bottom`}
      >
        <div className="container flex items-center justify-around h-16">
          {[
            { icon: Home, path: "/" },
            { icon: Users, path: "/groups" },
            { icon: CreditCard, path: "/shared-expenses" },
            { icon: PieChart, path: "/reports" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
