import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, User, Globe, Clock } from "lucide-react";

interface SessionWithCount {
  id: number;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  sourceDomain: string | null;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

interface ChatMsg {
  id: number;
  role: string;
  content: string;
  timestamp: string;
}

export default function ChatHistoryPage() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const { data: sessions = [], isLoading } = useQuery<SessionWithCount[]>({
    queryKey: ["/api/admin/sessions"],
  });

  const { data: messages = [] } = useQuery<ChatMsg[]>({
    queryKey: ["/api/admin/sessions", selectedSession, "messages"],
    enabled: !!selectedSession,
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Chat History</h1>
          <p className="text-sm text-muted-foreground mt-1">{sessions.length} conversations</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : sessions.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No chat sessions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="border border-border cursor-pointer hover-elevate transition-all"
                onClick={() => setSelectedSession(session.id)}
                data-testid={`card-session-${session.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.visitorName || session.visitorId.slice(0, 20)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {session.sourceDomain && (
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{session.sourceDomain}</span>
                        )}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(session.startedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {session.messageCount} msgs
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conversation #{selectedSession}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No messages in this session</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`} data-testid={`message-${msg.role}-${msg.id}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
