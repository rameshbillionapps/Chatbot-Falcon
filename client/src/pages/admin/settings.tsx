import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Plus, Trash2, GripVertical, Download, Database } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings.length > 0) {
      const vals: Record<string, string> = {};
      settings.forEach((s) => { vals[s.key] = s.value; });
      setFormValues(vals);

      const sqSetting = settings.find(s => s.key === "suggested_questions");
      if (sqSetting) {
        try {
          const parsed = JSON.parse(sqSetting.value);
          if (Array.isArray(parsed)) setQuestions(parsed);
        } catch {}
      }
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

  const saveQuestions = () => {
    saveMutation.mutate({ key: "suggested_questions", value: JSON.stringify(questions) });
  };

  const addQuestion = () => {
    const trimmed = newQuestion.trim();
    if (trimmed && !questions.includes(trimmed)) {
      setQuestions([...questions, trimmed]);
      setNewQuestion("");
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

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
          <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>
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

            <Card className="border border-border" data-testid="card-setting-suggested_questions">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Suggested Questions</CardTitle>
                    <p className="text-xs text-muted-foreground">Default questions shown when a user opens the chatbot</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={saveQuestions}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-suggested_questions"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2" data-testid={`row-question-${i}`}>
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        value={q}
                        onChange={(e) => updateQuestion(i, e.target.value)}
                        className="flex-1"
                        data-testid={`input-question-${i}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeQuestion(i)}
                        data-testid={`button-delete-question-${i}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Add a new suggested question..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                      data-testid="input-new-question"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-shrink-0"
                      onClick={addQuestion}
                      disabled={!newQuestion.trim()}
                      data-testid="button-add-question"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border" data-testid="card-database-backup">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Database Backup</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Download a full backup of all data (knowledge base, media, chat history, settings)</p>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = "/api/admin/backup";
                    link.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast({ title: "Backup download started" });
                  }}
                  data-testid="button-download-backup"
                >
                  <Download className="w-3.5 h-3.5" /> Download Backup
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
