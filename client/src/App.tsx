import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileLayout from "./components/MobileLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Calendar from "./pages/Calendar";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
import PersonalExpenses from "./pages/PersonalExpenses";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import Invitations from "./pages/Invitations";
import Settings from "./pages/Settings";
import SharedExpenses from "./pages/SharedExpenses";
import Tasks from "./pages/Tasks";
import FirebaseLogin from "./pages/FirebaseLogin";

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
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
