import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Copy, Trash2, Code, Check } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

export default function WidgetsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "*", primaryColor: "#2563eb", welcomeMessage: "Hi! How can I help you today?", botName: "Supplier Assistant", isActive: true });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: widgets = [], isLoading } = useQuery<WidgetConfig[]>({ queryKey: ["/api/admin/widgets"] });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => apiRequest("POST", "/api/admin/widgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
      toast({ title: "Widget created" });
      setForm({ name: "", domain: "*", primaryColor: "#2563eb", welcomeMessage: "Hi! How can I help you today?", botName: "Supplier Assistant", isActive: true });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to create widget", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/widgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/widgets"] });
      toast({ title: "Widget deleted" });
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const getScriptEmbed = (id: number) =>
    `<script src="${baseUrl}/widget.js" data-widget-id="${id}" async></script>`;

  const getGtmEmbed = (id: number) =>
    `<script>\n(function() {\n  var s = document.createElement('script');\n  s.src = '${baseUrl}/widget.js';\n  s.setAttribute('data-widget-id', '${id}');\n  s.async = true;\n  document.head.appendChild(s);\n})();\n</script>`;

  const getIframeEmbed = (id: number) =>
    `<iframe src="${baseUrl}/?widget=${id}" width="400" height="600" frameborder="0" style="position:fixed;bottom:20px;right:20px;z-index:9999;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15)"></iframe>`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Widget Configurations</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage embeddable chatbot widgets</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-add-widget"><Plus className="w-3.5 h-3.5" /> New Widget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Widget</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required data-testid="input-widget-name" /></div>
                <div><Label>Allowed Domain</Label><Input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="* for all domains" data-testid="input-widget-domain" /></div>
                <div><Label>Primary Color</Label><div className="flex gap-2"><Input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" /><Input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} data-testid="input-widget-color" /></div></div>
                <div><Label>Bot Name</Label><Input value={form.botName} onChange={e => setForm(f => ({ ...f, botName: e.target.value }))} data-testid="input-widget-botname" /></div>
                <div><Label>Welcome Message</Label><Input value={form.welcomeMessage} onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value }))} data-testid="input-widget-welcome" /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-widget">{createMutation.isPending ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : widgets.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <Code className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No widgets created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {widgets.map((widget) => (
              <Card key={widget.id} className="border border-border" data-testid={`card-widget-${widget.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: widget.primaryColor || "#2563eb" }} />
                      <CardTitle className="text-sm font-semibold">{widget.name}</CardTitle>
                      <Badge variant={widget.isActive ? "default" : "secondary"} className="text-[10px]">
                        {widget.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this widget?")) deleteMutation.mutate(widget.id); }} data-testid={`button-delete-widget-${widget.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Domain: {widget.domain || "*"} | Bot: {widget.botName}</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="script">
                    <TabsList className="mb-2">
                      <TabsTrigger value="script" className="text-xs">Script Tag</TabsTrigger>
                      <TabsTrigger value="gtm" className="text-xs">GTM</TabsTrigger>
                      <TabsTrigger value="iframe" className="text-xs">iFrame</TabsTrigger>
                    </TabsList>
                    {["script", "gtm", "iframe"].map((method) => {
                      const code = method === "script" ? getScriptEmbed(widget.id)
                        : method === "gtm" ? getGtmEmbed(widget.id)
                        : getIframeEmbed(widget.id);
                      const copyId = `${widget.id}-${method}`;
                      return (
                        <TabsContent key={method} value={method}>
                          <div className="relative">
                            <pre className="bg-card border border-border rounded-lg p-3 text-xs overflow-x-auto font-mono text-foreground">
                              {code}
                            </pre>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 h-7 text-xs gap-1"
                              onClick={() => copyToClipboard(code, copyId)}
                              data-testid={`button-copy-${method}-${widget.id}`}
                            >
                              {copiedId === copyId ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </Button>
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
