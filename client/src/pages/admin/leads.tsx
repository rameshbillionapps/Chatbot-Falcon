import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, UserCheck, Building2, Phone, Mail, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: number;
  whatsappPhone: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  designation: string | null;
  website: string | null;
  capturedAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

const LIMIT = 50;

export default function LeadsPage() {
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery<LeadsResponse>({
    queryKey: ["/api/admin/leads", offset],
    queryFn: () =>
      fetch(`/api/admin/leads?limit=${LIMIT}&offset=${offset}`, { credentials: "include" })
        .then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Lead deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Business Card Leads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Contact details captured from WhatsApp business card images.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">{total} total</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Captured</p>
              <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No leads captured yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask a WhatsApp contact to send a photo of their business card.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {lead.name && (
                          <span className="font-semibold text-foreground">{lead.name}</span>
                        )}
                        {lead.designation && (
                          <Badge variant="outline" className="text-xs">{lead.designation}</Badge>
                        )}
                        {!lead.name && !lead.designation && (
                          <span className="text-sm text-muted-foreground italic">No name extracted</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                        {lead.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />{lead.company}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 shrink-0" />{lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 shrink-0" />{lead.email}
                          </span>
                        )}
                        {lead.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 shrink-0" />{lead.website}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From WA: {lead.whatsappPhone} &middot;{" "}
                        {formatDistanceToNow(new Date(lead.capturedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(lead.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
