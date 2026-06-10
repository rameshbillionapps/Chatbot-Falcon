import { Link, useLocation } from "wouter";
import { LayoutDashboard, BookOpen, Image, MessageSquare, Settings, Code, ArrowLeft, LogOut, Plug, AlertCircle, Users, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Analytics" },
  { href: "/admin/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { href: "/admin/knowledge-gaps", icon: AlertCircle, label: "Knowledge Gaps" },
  { href: "/admin/media", icon: Image, label: "Media" },
  { href: "/admin/chat-history", icon: MessageSquare, label: "Chat History" },
  { href: "/admin/leads", icon: Users, label: "Leads" },
  { href: "/admin/webhook-queue", icon: Send, label: "Webhook Queue" },
  { href: "/admin/widgets", icon: Code, label: "Widgets" },
  { href: "/admin/api-docs", icon: Plug, label: "API Integration" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: gapCount } = useQuery<number>({
    queryKey: ["/api/admin/knowledge-gaps/count"],
    queryFn: () =>
      fetch("/api/admin/knowledge-gaps?resolved=false", { credentials: "include" })
        .then(r => r.json())
        .then((gaps: { id: number }[]) => gaps.length),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      setLocation("/admin/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-sidebar-border bg-sidebar flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/">
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-sidebar-primary cursor-pointer" data-testid="link-back-home">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to site
            </div>
          </Link>
          <h2 className="font-bold text-lg text-sidebar-foreground mt-2" data-testid="text-admin-title">Admin</h2>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/admin/knowledge-gaps" && gapCount && gapCount > 0 ? (
                    <span className="ml-auto text-[10px] font-semibold bg-amber-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {gapCount}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          {user && (
            <p className="text-xs text-sidebar-foreground/60 px-3 py-1 truncate" data-testid="text-admin-user">
              Logged in as {user.username}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full cursor-pointer"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
