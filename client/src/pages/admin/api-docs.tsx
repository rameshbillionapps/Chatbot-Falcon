import { useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Globe, MessageSquare, Camera, ExternalLink } from "lucide-react";

function CopyBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 bg-slate-700/60 hover:bg-slate-600 text-slate-300"
        onClick={handleCopy}
        data-testid="button-copy-code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  description,
  requestBody,
  responseBody,
  notes,
}: {
  method: string;
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  notes?: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card className="border border-border" data-testid={`card-endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs font-mono font-bold ${methodColors[method] || "bg-gray-100 text-gray-800"}`}>
            {method}
          </Badge>
          <code className="text-sm font-mono text-foreground">{path}</code>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requestBody && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Request Body</p>
            <CopyBlock code={requestBody} />
          </div>
        )}
        {responseBody && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Response</p>
            <CopyBlock code={responseBody} />
          </div>
        )}
        {notes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5 border border-border">
            {notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiDocsPage() {
  const baseUrl = window.location.origin;
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">API Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use these endpoints to integrate the chatbot with WhatsApp, mobile apps, or any external system
          </p>
        </div>

        <Card className="border border-primary/20 bg-primary/5" data-testid="card-base-url">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">Base URL:</span>
                <code className="text-sm font-mono text-primary truncate" data-testid="text-base-url">{baseUrl}</code>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={copyBaseUrl} data-testid="button-copy-base-url">
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat API Endpoints
          </h2>
          <div className="space-y-4">
            <EndpointCard
              method="POST"
              path="/api/chat/sessions"
              description="Create a new chat session. Call this once per visitor/conversation."
              requestBody={`{
  "visitorId": "whatsapp-919876543210",
  "visitorName": "Customer Name",
  "sourceDomain": "whatsapp"
}`}
              responseBody={`{
  "session": {
    "id": 1,
    "visitorId": "whatsapp-919876543210",
    "visitorName": "Customer Name",
    "sourceDomain": "whatsapp",
    "startedAt": "2026-03-06T10:00:00.000Z"
  },
  "suggestedQuestions": [
    "What types of T-shirts do you manufacture?",
    "What printing methods do you offer?"
  ]
}`}
              notes="Save the session.id — you'll use it for all messages in this conversation. Set sourceDomain to 'whatsapp' to filter these chats in the admin dashboard."
            />

            <EndpointCard
              method="POST"
              path="/api/chat"
              description="Send a text message and get an AI response with optional media attachments."
              requestBody={`// Content-Type: application/json
{
  "message": "What caps do you manufacture?",
  "sessionId": 1
}`}
              responseBody={`{
  "content": "We manufacture baseball caps, trucker caps, snapbacks...",
  "mediaAttachments": [
    {
      "type": "image",
      "url": "https://example.com/cap-gallery.webp",
      "title": "Cap Manufacturing Gallery"
    },
    {
      "type": "pdf",
      "url": "https://example.com/caps-catalogue.pdf",
      "title": "Caps Product Catalogue"
    }
  ],
  "matchedCategories": ["products"]
}`}
              notes="Use 'content' as the reply text. Send each item in 'mediaAttachments' as separate media messages (images, PDFs, video links)."
            />

            <EndpointCard
              method="POST"
              path="/api/chat"
              description="Send a message with a product photo for AI identification."
              requestBody={`// Content-Type: multipart/form-data
// Fields:
//   message: "Is this product available?"
//   sessionId: 1
//   image: <file> (JPEG, PNG, GIF, or WebP)`}
              responseBody={`{
  "content": "This is a Baseball Cap. Yes, we manufacture Baseball Caps! We offer custom caps including baseball caps, trucker caps, and snapbacks...",
  "mediaAttachments": [],
  "matchedCategories": ["products"]
}`}
              notes="The AI analyzes the uploaded image and identifies whether the product matches your manufacturing capabilities. Accepts JPEG, PNG, GIF, and WebP formats."
            />

            <EndpointCard
              method="GET"
              path="/api/chat/sessions/:id/messages"
              description="Retrieve the full conversation history for a session."
              responseBody={`[
  {
    "id": 1,
    "sessionId": 1,
    "role": "user",
    "content": "What caps do you make?",
    "mediaAttachments": null,
    "timestamp": "2026-03-06T10:01:00.000Z"
  },
  {
    "id": 2,
    "sessionId": 1,
    "role": "assistant",
    "content": "We manufacture baseball caps, trucker caps...",
    "mediaAttachments": [...],
    "timestamp": "2026-03-06T10:01:05.000Z"
  }
]`}
              notes="Replace :id with the session ID. Messages are returned in chronological order."
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            WhatsApp Integration Guide
          </h2>

          <Card className="border border-border" data-testid="card-whatsapp-guide">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your WhatsApp Business API (via Twilio, Meta Cloud API, WATI, or similar) to this chatbot for automated AI replies.
              </p>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Webhook Flow</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">1</Badge>
                    <span className="text-foreground">Customer sends a WhatsApp message</span>
                  </div>
                  <div className="ml-4 border-l-2 border-border h-2" />
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">2</Badge>
                    <span className="text-foreground">WhatsApp provider webhook triggers your server</span>
                  </div>
                  <div className="ml-4 border-l-2 border-border h-2" />
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">3</Badge>
                    <span className="text-foreground">Find or create session for this phone number</span>
                  </div>
                  <div className="ml-4 border-l-2 border-border h-2" />
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">4</Badge>
                    <span className="text-foreground">POST /api/chat with message + sessionId</span>
                  </div>
                  <div className="ml-4 border-l-2 border-border h-2" />
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">5</Badge>
                    <span className="text-foreground">Send AI response back via WhatsApp API</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Example Webhook Handler</h3>
                <CopyBlock
                  language="javascript"
                  code={`// Node.js webhook handler example
app.post('/webhook/whatsapp', async (req, res) => {
  const { from, body } = parseIncomingMessage(req);

  // 1. Find or create session
  let session = await findSessionByPhone(from);
  if (!session) {
    const resp = await fetch('${baseUrl}/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: \`whatsapp-\${from}\`,
        visitorName: from,
        sourceDomain: 'whatsapp'
      })
    });
    session = (await resp.json()).session;
  }

  // 2. Get AI response
  const aiResp = await fetch('${baseUrl}/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: body,
      sessionId: session.id
    })
  });
  const { content, mediaAttachments } = await aiResp.json();

  // 3. Send reply via WhatsApp API
  await sendWhatsAppMessage(from, content);
  for (const media of mediaAttachments) {
    await sendWhatsAppMedia(from, media.url, media.title);
  }

  res.sendStatus(200);
});`}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">Tips</h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Map each phone number to a unique visitorId (e.g., whatsapp-919876543210)</li>
                  <li>• Set sourceDomain to "whatsapp" to filter these chats in the admin dashboard</li>
                  <li>• Reuse the same sessionId for ongoing conversations with the same number</li>
                  <li>• Media URLs in responses can be forwarded as WhatsApp media messages</li>
                  <li>• All WhatsApp conversations appear in Admin → Chat History</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Other Integrations
          </h2>
          <Card className="border border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-3">
                The same API can be used to integrate with any platform:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Telegram Bot", desc: "Forward messages to /api/chat and reply" },
                  { title: "Facebook Messenger", desc: "Use Meta webhook with chat API" },
                  { title: "Mobile App", desc: "Embed chat via REST API calls" },
                  { title: "Custom Website", desc: "Use embed codes from Widgets page" },
                  { title: "CRM Systems", desc: "Log conversations via sessions API" },
                  { title: "Slack / Teams", desc: "Bot that queries the chat API" },
                ].map((item) => (
                  <div key={item.title} className="bg-muted/30 rounded-lg p-3 border border-border">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
