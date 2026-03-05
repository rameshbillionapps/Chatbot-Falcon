import { Link, useLocation } from "wouter";
import { LayoutDashboard, BookOpen, Image, MessageSquare, Settings, Code, ArrowLeft } from "lucide-react";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Analytics" },
  { href: "/admin/knowledge", icon: BookOpen, label: "Knowledge Base" },
  { href: "/admin/media", icon: Image, label: "Media" },
  { href: "/admin/chat-history", icon: MessageSquare, label: "Chat History" },
  { href: "/admin/widgets", icon: Code, label: "Widgets" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
