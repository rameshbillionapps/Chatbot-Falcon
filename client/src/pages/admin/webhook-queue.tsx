import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, RotateCcw, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WebhookQueueItem {
  id: number;
  enquiryId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: string;
  createdAt: string;
}

interface QueueResponse {
  items: WebhookQueueItem[];
  total: number;
}

const LIMIT = 50;

export default function WebhookQueuePage() {
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);

  const { data, isLoading, refetch } = useQuery<QueueResponse>({
    queryKey: ["/api/admin/webhook-queue", offset],
    queryFn: () =>
      fetch(`/api/admin/webhook-queue?limit=${LIMIT}&offset=${offset}`, { credentials: "include" })
        .then(r => r.json()),
    refetchInterval: 30_000, // Auto-refresh every 30s as worker runs
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/webhook-queue/${id}/retry`),
    onSuccess: () => {
      refetch();
      toast({ title: "Item queued for retry" });
    },
    onError: () => toast({ title: "Failed to retry", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/webhook-queue/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhook-queue"] });
      toast({ title: "Item deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const stats = {
    pending: items.filter(i => i.status === "pending").length,
    delivered: items.filter(i => i.status === "delivered").length,
    failed: items.filter(i => i.status === "failed").length,
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Webhook Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage webhook delivery attempts to your CRM.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">{total} total</Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No queue items</p>
              <p className="text-xs text-muted-foreground mt-1">
                Webhook deliveries will appear here as they're processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs px-2 py-1 rounded font-mono bg-muted text-foreground">
                          {item.enquiryId}
                        </code>
                        <Badge variant="outline" className={`text-xs ${statusColor(item.status)}`}>
                          {item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Attempt {item.attempts}/{item.maxAttempts}
                        </span>
                      </div>

                      {item.lastError && (
                        <div className="text-sm text-red-600 flex items-start gap-1">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{item.lastError}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                          Created: {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                        {item.status === "pending" && (
                          <p>
                            Retry at: {formatDistanceToNow(new Date(item.nextRetryAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {item.status === "failed" || item.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => retryMutation.mutate(item.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
