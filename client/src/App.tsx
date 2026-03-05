import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AnalyticsPage from "@/pages/admin/analytics";
import KnowledgePage from "@/pages/admin/knowledge";
import MediaPage from "@/pages/admin/media";
import ChatHistoryPage from "@/pages/admin/chat-history";
import SettingsPage from "@/pages/admin/settings";
import WidgetsPage from "@/pages/admin/widgets";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin" component={AnalyticsPage} />
      <Route path="/admin/knowledge" component={KnowledgePage} />
      <Route path="/admin/media" component={MediaPage} />
      <Route path="/admin/chat-history" component={ChatHistoryPage} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route path="/admin/widgets" component={WidgetsPage} />
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
