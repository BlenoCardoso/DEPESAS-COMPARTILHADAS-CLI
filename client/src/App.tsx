import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileLayout from "./components/MobileLayout";
import SplashScreen from "./components/SplashScreen";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CurrentGroupProvider } from "./contexts/CurrentGroupContext";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { initPushNotifications, setupPushNotificationListeners } from "./lib/pushNotifications";
import { Capacitor } from "@capacitor/core";

const routeLoaders = {
  Home: () => import("./pages/Home"),
  FirebaseLogin: () => import("./pages/FirebaseLogin"),
  More: () => import("./pages/More"),
  Profile: () => import("./pages/Profile"),
  Calculator: () => import("./pages/Calculator"),
  ExportData: () => import("./pages/ExportData"),
  ImportData: () => import("./pages/ImportData"),
  Groups: () => import("./pages/Groups"),
  GroupDetails: () => import("./pages/GroupDetails"),
  SharedExpenses: () => import("./pages/SharedExpenses"),
  PersonalExpenses: () => import("./pages/PersonalExpenses"),
  Tasks: () => import("./pages/Tasks"),
  Reminders: () => import("./pages/Reminders"),
  Calendar: () => import("./pages/Calendar"),
  Reports: () => import("./pages/Reports"),
  Invitations: () => import("./pages/Invitations"),
  Notifications: () => import("./pages/Notifications"),
  Settings: () => import("./pages/Settings"),
  FinancialProfile: () => import("./pages/FinancialProfile"),
  GroupBalances: () => import("./pages/GroupBalances"),
  ExpenseTemplates: () => import("./pages/ExpenseTemplates"),
  ExpenseCategories: () => import("./pages/ExpenseCategories"),
} as const;

const Home = lazy(routeLoaders.Home);
const FirebaseLogin = lazy(routeLoaders.FirebaseLogin);
const More = lazy(routeLoaders.More);
const Profile = lazy(routeLoaders.Profile);
const Calculator = lazy(routeLoaders.Calculator);
const ExportData = lazy(routeLoaders.ExportData);
const ImportData = lazy(routeLoaders.ImportData);
const Groups = lazy(routeLoaders.Groups);
const GroupDetails = lazy(routeLoaders.GroupDetails);
const SharedExpenses = lazy(routeLoaders.SharedExpenses);
const PersonalExpenses = lazy(routeLoaders.PersonalExpenses);
const Tasks = lazy(routeLoaders.Tasks);
const Reminders = lazy(routeLoaders.Reminders);
const Calendar = lazy(routeLoaders.Calendar);
const Reports = lazy(routeLoaders.Reports);
const Invitations = lazy(routeLoaders.Invitations);
const Notifications = lazy(routeLoaders.Notifications);
const Settings = lazy(routeLoaders.Settings);
const FinancialProfile = lazy(routeLoaders.FinancialProfile);
const GroupBalances = lazy(routeLoaders.GroupBalances);
const ExpenseTemplates = lazy(routeLoaders.ExpenseTemplates);
const ExpenseCategories = lazy(routeLoaders.ExpenseCategories);

const scheduleIdle = (callback: () => void) => {
  if (typeof window === "undefined") return;

  const requestIdleCallback = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void })
    .requestIdleCallback;

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(callback, { timeout: 1500 });
    return;
  }

  window.setTimeout(callback, 350);
};

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;

    const isPublicRoute = location === "/" || location === "/firebase-login" || location === "/404";
    if (!isPublicRoute) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, location, setLocation]);

  return (
    <MobileLayout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/firebase-login" component={FirebaseLogin} />
          <Route path="/more" component={More} />
          <Route path="/profile" component={Profile} />
          <Route path="/calculator" component={Calculator} />
          <Route path="/export-data" component={ExportData} />
          <Route path="/import-data" component={ImportData} />
          <Route path="/groups" component={Groups} />
          <Route path="/groups/:id">{params => <GroupDetails groupId={params.id} />}</Route>
          <Route path="/shared-expenses" component={SharedExpenses} />
          <Route path="/personal-expenses" component={PersonalExpenses} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/reminders" component={Reminders} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/reports" component={Reports} />
          <Route path="/invitations" component={Invitations} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/settings" component={Settings} />
          <Route path="/financial-profile" component={FinancialProfile} />
          <Route path="/group-balances" component={GroupBalances} />
          <Route path="/expense-templates" component={ExpenseTemplates} />
          <Route path="/expense-categories" component={ExpenseCategories} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </MobileLayout>
  );
}

function App() {
  const [isBooting, setIsBooting] = useState(true);

  const prefetchRouteChunks = useMemo(() => {
    // Evita puxar de cara as rotas mais pesadas (ex: relatórios/calendário),
    // mas deixa as transições comuns bem rápidas.
    return () => {
      const safePrefetch = (loader: () => Promise<unknown>) => {
        void loader().catch(() => undefined);
      };

      safePrefetch(routeLoaders.Groups);
      safePrefetch(routeLoaders.GroupDetails);
      safePrefetch(routeLoaders.SharedExpenses);
      safePrefetch(routeLoaders.PersonalExpenses);
      safePrefetch(routeLoaders.Tasks);
      safePrefetch(routeLoaders.Reminders);
      safePrefetch(routeLoaders.Invitations);
      safePrefetch(routeLoaders.Notifications);
      safePrefetch(routeLoaders.Settings);
    };
  }, []);

  useEffect(() => {
    // Remove o delay artificial fixo; deixa o primeiro render acontecer o quanto antes.
    // Mantém a splash por apenas 1 frame para evitar "flash" em alguns devices.
    const raf = window.requestAnimationFrame(() => setIsBooting(false));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // Inicializar notificações push quando o app carregar
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initPushNotifications().then((token) => {
        void token;
      });
      
      setupPushNotificationListeners();
    }
  }, []);

  useEffect(() => {
    if (isBooting) return;
    scheduleIdle(prefetchRouteChunks);
  }, [isBooting, prefetchRouteChunks]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <CurrentGroupProvider>
            {isBooting ? <SplashScreen /> : <Router />}
          </CurrentGroupProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
