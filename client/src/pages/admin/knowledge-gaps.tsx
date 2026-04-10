import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCheck, Trash2, AlertCircle, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface KnowledgeGap {
  id: number;
  question: string;
  count: number;
  resolved: boolean;
  createdAt: string;
  lastAskedAt: string;
}

export default function KnowledgeGapsPage() {
  const { toast } = useToast();
  const [showResolved, setShowResolved] = useState(false);

  const { data: gaps = [], isLoading } = useQuery<KnowledgeGap[]>({
    queryKey: ["/api/admin/knowledge-gaps", showResolved],
    queryFn: () =>
      fetch(`/api/admin/knowledge-gaps?resolved=${showResolved}`, { credentials: "include" })
        .then(r => r.json()),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/knowledge-gaps/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-gaps"] });
      toast({ title: "Marked as resolved" });
    },
    onError: () => toast({ title: "Failed to resolve", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/knowledge-gaps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-gaps"] });
      toast({ title: "Gap removed" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const totalAsked = gaps.reduce((sum, g) => sum + g.count, 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Knowledge Gaps</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Questions your bot couldn't answer — add these to your knowledge base to improve accuracy.
            </p>
          </div>
          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(v => !v)}
          >
            {showResolved ? "Show Unresolved" : "Show Resolved"}
          </Button>
        </div>

        {/* Summary */}
        {!showResolved && gaps.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Unanswered Questions</p>
                <p className="text-2xl font-bold text-foreground mt-1">{gaps.length}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Times Asked</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalAsked}</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Top Gap (asked)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {gaps.length > 0 ? gaps[0].count : 0}×
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : gaps.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="py-12 text-center">
              {showResolved ? (
                <>
                  <CheckCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No resolved gaps yet.</p>
                </>
              ) : (
                <>
                  <BookOpen className="w-10 h-10 text-green-500/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No gaps detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your knowledge base is covering all questions so far.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {gaps.map((gap, i) => (
              <Card
                key={gap.id}
                className={`border transition-colors ${gap.resolved ? "border-border opacity-60" : "border-border"}`}
                data-testid={`card-gap-${i}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium leading-snug break-words">
                          {gap.question}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <Badge
                            variant={gap.count >= 5 ? "destructive" : gap.count >= 2 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            Asked {gap.count}× {gap.count >= 5 ? "🔥" : ""}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last asked {formatDistanceToNow(new Date(gap.lastAskedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!gap.resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => resolveMutation.mutate(gap.id)}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-${i}`}
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Resolve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(gap.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-gap-${i}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!showResolved && gaps.length > 0 && (
          <Card className="border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                How to use this list
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p>1. Pick the highest-count questions — those are the most urgent gaps.</p>
              <p>2. Go to <strong>Knowledge Base</strong> and add an article covering that topic.</p>
              <p>3. Click <strong>Resolve</strong> on the gap once the article is added.</p>
              <p>4. Regenerate embeddings in <strong>Settings</strong> so the new article is searchable.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
