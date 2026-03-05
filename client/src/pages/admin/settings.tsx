import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings.length > 0) {
      const vals: Record<string, string> = {};
      settings.forEach((s) => { vals[s.key] = s.value; });
      setFormValues(vals);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("PUT", `/api/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setting saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const settingsConfig = [
    { key: "bot_name", label: "Bot Name", description: "The name displayed in the chatbot header", placeholder: "Supplier Assistant" },
    { key: "welcome_message", label: "Welcome Message", description: "The greeting shown when a user opens the chatbot", placeholder: "Hi! How can I help you?" },
    { key: "system_prompt", label: "System Prompt", description: "Instructions for the AI personality and behavior", placeholder: "You are a helpful assistant...", multiline: true },
    { key: "openai_model", label: "OpenAI Model", description: "The model used for generating responses", placeholder: "gpt-5.2" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure chatbot behavior and appearance</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : (
          <div className="space-y-4">
            {settingsConfig.map((config) => (
              <Card key={config.key} className="border border-border" data-testid={`card-setting-${config.key}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{config.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {config.multiline ? (
                      <textarea
                        value={formValues[config.key] || ""}
                        onChange={(e) => setFormValues(v => ({ ...v, [config.key]: e.target.value }))}
                        placeholder={config.placeholder}
                        rows={4}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        data-testid={`input-setting-${config.key}`}
                      />
                    ) : (
                      <Input
                        value={formValues[config.key] || ""}
                        onChange={(e) => setFormValues(v => ({ ...v, [config.key]: e.target.value }))}
                        placeholder={config.placeholder}
                        className="flex-1"
                        data-testid={`input-setting-${config.key}`}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-shrink-0"
                      onClick={() => saveMutation.mutate({ key: config.key, value: formValues[config.key] || "" })}
                      disabled={saveMutation.isPending}
                      data-testid={`button-save-${config.key}`}
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
