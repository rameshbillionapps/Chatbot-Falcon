import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/admin/login";
import AnalyticsPage from "@/pages/admin/analytics";
import KnowledgePage from "@/pages/admin/knowledge";
import MediaPage from "@/pages/admin/media";
import ChatHistoryPage from "@/pages/admin/chat-history";
import SettingsPage from "@/pages/admin/settings";
import WidgetsPage from "@/pages/admin/widgets";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin/login" component={LoginPage} />
      <Route path="/admin">{() => <ProtectedRoute component={AnalyticsPage} />}</Route>
      <Route path="/admin/knowledge">{() => <ProtectedRoute component={KnowledgePage} />}</Route>
      <Route path="/admin/media">{() => <ProtectedRoute component={MediaPage} />}</Route>
      <Route path="/admin/chat-history">{() => <ProtectedRoute component={ChatHistoryPage} />}</Route>
      <Route path="/admin/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route path="/admin/widgets">{() => <ProtectedRoute component={WidgetsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
