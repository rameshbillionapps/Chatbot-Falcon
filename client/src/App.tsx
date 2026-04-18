import { useState, useEffect } from "react";
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
import KnowledgeGapsPage from "@/pages/admin/knowledge-gaps";
import LeadsPage from "@/pages/admin/leads";

function SiteGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("site_unlocked") === "true");
  const [passwordEnabled, setPasswordEnabled] = useState<boolean | null>(null);
  const [brandName, setBrandName] = useState("AI Chat Assistant");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/settings")
      .then(r => r.json())
      .then((s: Record<string, string>) => {
        setPasswordEnabled(s["site_password_enabled"] === "true");
        if (s["brand_name"]) {
          setBrandName(s["brand_name"]);
          document.title = s["brand_name"];
        }
      })
      .catch(() => setPasswordEnabled(false));
  }, []);

  // Still loading settings — wait before deciding to show gate
  if (passwordEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!passwordEnabled || unlocked) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/site-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("site_unlocked", "true");
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/95 backdrop-blur shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{brandName}</CardTitle>
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
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-site-unlock">
              {loading ? "Checking..." : "Enter Site"}
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
      <Route path="/admin/knowledge-gaps">{() => <ProtectedRoute component={KnowledgeGapsPage} />}</Route>
      <Route path="/admin/leads">{() => <ProtectedRoute component={LeadsPage} />}</Route>
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
