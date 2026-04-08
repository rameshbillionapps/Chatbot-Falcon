import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/admin/login";
import AnalyticsPage from "@/pages/admin/analytics";
import KnowledgePage from "@/pages/admin/knowledge";
import MediaPage from "@/pages/admin/media";
import ChatHistoryPage from "@/pages/admin/chat-history";
import SettingsPage from "@/pages/admin/settings";
import WidgetsPage from "@/pages/admin/widgets";
import ApiDocsPage from "@/pages/admin/api-docs";

const SITE_PASSWORD = "falcon2025";

function SiteGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem("site_unlocked") === "true";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      sessionStorage.setItem("site_unlocked", "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/95 backdrop-blur shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Falcon Head Gear</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter password to access the site</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Enter site password"
                className={error ? "border-destructive" : ""}
                autoFocus
                data-testid="input-site-password"
              />
              {error && (
                <p className="text-xs text-destructive mt-1.5" data-testid="text-password-error">Incorrect password. Please try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full" data-testid="button-site-unlock">
              Enter Site
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

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
      <Route path="/admin/api-docs">{() => <ProtectedRoute component={ApiDocsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SiteGate>
          <Router />
        </SiteGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
