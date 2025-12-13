import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileLayout from "./components/MobileLayout";
import SplashScreen from "./components/SplashScreen";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CurrentGroupProvider } from "./contexts/CurrentGroupContext";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home"));
const FirebaseLogin = lazy(() => import("./pages/FirebaseLogin"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetails = lazy(() => import("./pages/GroupDetails"));
const SharedExpenses = lazy(() => import("./pages/SharedExpenses"));
const PersonalExpenses = lazy(() => import("./pages/PersonalExpenses"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Reports = lazy(() => import("./pages/Reports"));
const Invitations = lazy(() => import("./pages/Invitations"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <MobileLayout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/firebase-login" component={FirebaseLogin} />
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
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </MobileLayout>
  );
}

function App() {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 1200);
    return () => clearTimeout(timer);
  }, []);

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
