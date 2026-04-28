import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Plus, Trash2, GripVertical, Download, Database, Key, RefreshCw } from "lucide-react";

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

  const regenerateEmbeddings = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/knowledge/regenerate-embeddings");
      return res.json() as Promise<{ total: number; updated: number }>;
    },
    onSuccess: (data) => {
      toast({ title: `Embeddings regenerated: ${data.updated}/${data.total} articles updated` });
    },
    onError: () => toast({ title: "Failed to regenerate embeddings", variant: "destructive" }),
  });

  const brandConfig = [
    { key: "brand_name", label: "Brand Name", description: "Your business name — shown on the home page, site gate, and admin login", placeholder: "My Business" },
    { key: "brand_tagline", label: "Brand Tagline", description: "Short line shown below the brand name (optional)", placeholder: "Quality you can trust" },
    { key: "brand_location", label: "Location", description: "City/region shown in the hero badge on the home page", placeholder: "Chennai, India" },
    { key: "brand_address", label: "Full Address", description: "Physical address shown in the Contact section", placeholder: "123 Main Street, Chennai 600001" },
    { key: "brand_whatsapp", label: "WhatsApp Number", description: "WhatsApp number with country code (digits only, e.g. 919876543210)", placeholder: "919876543210" },
    { key: "social_instagram", label: "Instagram URL", description: "Full Instagram profile URL", placeholder: "https://www.instagram.com/yourbrand/" },
    { key: "social_facebook", label: "Facebook URL", description: "Full Facebook page URL", placeholder: "https://www.facebook.com/yourbrand" },
    { key: "social_linkedin", label: "LinkedIn URL", description: "Full LinkedIn company page URL", placeholder: "https://www.linkedin.com/company/yourbrand/" },
    { key: "home_hero_title", label: "Hero Title", description: "Main headline on the home page", placeholder: "Welcome to our store" },
    { key: "home_hero_description", label: "Hero Description", description: "Subtitle paragraph below the hero title", placeholder: "We offer...", multiline: true },
    { key: "site_password", label: "Site Password", description: "Optional password gate for the public home page. Leave empty to disable the gate.", placeholder: "Leave empty to disable" },
  ];

  const metaConfig = [
    { key: "meta_verify_token", label: "Webhook Verify Token", description: "Paste this same value in Meta App Dashboard → Webhooks → Verify Token", placeholder: "chatbot_verify_2025" },
    { key: "meta_phone_number_id", label: "Phone Number ID", description: "From Meta Business Manager → WhatsApp → API Setup", placeholder: "1234567890" },
    { key: "meta_welcome_template", label: "Welcome Template Name", description: "Name of the pre-approved WhatsApp template used for first outreach (must include {{1}} for name)", placeholder: "lead_welcome" },
    { key: "meta_template_language", label: "Template Language Code", description: "Language code for the welcome template", placeholder: "en_US" },
  ];

  const settingsConfig = [
    { key: "bot_name", label: "Bot Name", description: "The name displayed in the chatbot header", placeholder: "Supplier Assistant" },
    { key: "welcome_message", label: "Welcome Message", description: "The greeting shown when a user opens the chatbot", placeholder: "Hi! How can I help you?" },
    { key: "system_prompt", label: "System Prompt", description: "Instructions for the AI personality and behavior. This is the core of how the chatbot responds — set the persona, domain, and rules here.", placeholder: "You are a helpful assistant...", multiline: true },
    { key: "contact_phone", label: "Contact Phone / WhatsApp", description: "Phone or WhatsApp number shown in chat when users ask for contact details", placeholder: "+91 98765 43210" },
    { key: "contact_email", label: "Contact Email", description: "Email address shown in chat when users ask for contact details", placeholder: "support@yourcompany.com" },
    { key: "openai_model", label: "OpenAI Model", description: "The model used for generating responses", placeholder: "gpt-4o-mini" },
    { key: "timezone", label: "Timezone", description: "Timezone used to tell the AI the current date and time (e.g. Asia/Kolkata, Asia/Dubai, Europe/London). Defaults to Asia/Kolkata if not set.", placeholder: "Asia/Kolkata" },
    { key: "lead_capture_webhook_url", label: "Lead Capture Webhook URL", description: "POST endpoint that receives chat leads (name, email, phone, source: chat). Leave empty to disable.", placeholder: "https://walead.billionapps.ai/api/leads/webhook" },
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
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Brand Identity</h2>
              <div className="space-y-4">
                {brandConfig.map((config) => (
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
                            rows={3}
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
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Meta & WhatsApp</h2>
              <div className="space-y-4">
                {/* Secret token fields */}
                {["meta_access_token", "meta_app_secret"].map((key) => (
                  <Card key={key} className="border border-border" data-testid={`card-setting-${key}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {key === "meta_access_token" ? "Access Token" : "App Secret"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {key === "meta_access_token"
                          ? "Permanent access token from Meta Business Manager → WhatsApp → API Setup"
                          : "App Secret from Meta App Dashboard → Settings → Basic"}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={formValues[key] || ""}
                          onChange={(e) => setFormValues(v => ({ ...v, [key]: e.target.value }))}
                          placeholder={formValues[key]?.includes("...") ? "Set. Enter new value to replace." : "Paste value here"}
                          className="flex-1"
                          data-testid={`input-setting-${key}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 flex-shrink-0"
                          onClick={() => saveMutation.mutate({ key, value: formValues[key] || "" })}
                          disabled={saveMutation.isPending}
                          data-testid={`button-save-${key}`}
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {/* Non-secret meta fields */}
                {metaConfig.map((config) => (
                  <Card key={config.key} className="border border-border" data-testid={`card-setting-${config.key}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">{config.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input
                          value={formValues[config.key] || ""}
                          onChange={(e) => setFormValues(v => ({ ...v, [config.key]: e.target.value }))}
                          placeholder={config.placeholder}
                          className="flex-1"
                          data-testid={`input-setting-${config.key}`}
                        />
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
                {/* Webhook URL info box */}
                <Card className="border border-dashed border-border bg-muted/30">
                  <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Meta Webhook Setup</p>
                    <p>1. In Meta App Dashboard → Webhooks, set Callback URL to:</p>
                    <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">
                      https://your-domain.com/api/webhooks/meta
                    </code>
                    <p>2. Set Verify Token to match the value above.</p>
                    <p>3. Subscribe to <strong>leadgen</strong> (Facebook Page) and <strong>messages</strong> (WhatsApp Business Account).</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Chatbot</h2>
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

            <Card className="border border-border" data-testid="card-setting-openai_api_key">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">OpenAI API Key</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Used for vector embeddings (semantic search) and chat completions. Uses text-embedding-3-small for embeddings.</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={formValues["openai_api_key"] || ""}
                    onChange={(e) => setFormValues(v => ({ ...v, openai_api_key: e.target.value }))}
                    placeholder={formValues["openai_api_key"]?.includes("...") ? "Key is set. Enter new key to replace." : "sk-..."}
                    className="flex-1"
                    data-testid="input-setting-openai_api_key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => {
                      const val = formValues["openai_api_key"] || "";
                      if (val.includes("...")) {
                        toast({ title: "Enter a new API key to save", variant: "destructive" });
                        return;
                      }
                      saveMutation.mutate({ key: "openai_api_key", value: val });
                    }}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-openai_api_key"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border" data-testid="card-regenerate-embeddings">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Vector Embeddings</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Generate or regenerate vector embeddings for all knowledge base articles. Requires OpenAI API key above. Improves search accuracy with semantic matching.</p>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => regenerateEmbeddings.mutate()}
                  disabled={regenerateEmbeddings.isPending}
                  data-testid="button-regenerate-embeddings"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerateEmbeddings.isPending ? "animate-spin" : ""}`} />
                  {regenerateEmbeddings.isPending ? "Generating..." : "Regenerate Embeddings"}
                </Button>
              </CardContent>
            </Card>

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
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
