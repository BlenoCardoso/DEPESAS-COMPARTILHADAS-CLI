import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileLayout from "./components/MobileLayout";
import SplashScreen from "./components/SplashScreen";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CurrentGroupProvider } from "./contexts/CurrentGroupContext";
import Calendar from "./pages/Calendar";
import FirebaseLogin from "./pages/FirebaseLogin";
import GroupDetails from "./pages/GroupDetails";
import Groups from "./pages/Groups";
import Home from "./pages/Home";
import Invitations from "./pages/Invitations";
import Notifications from "./pages/Notifications";
import PersonalExpenses from "./pages/PersonalExpenses";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SharedExpenses from "./pages/SharedExpenses";
import Tasks from "./pages/Tasks";

function Router() {
  return (
    <MobileLayout>
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
      <ThemeProvider defaultTheme="light">
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
