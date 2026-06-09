import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, UserCheck, Building2, Phone, Mail, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Enquiry {
  id: number;
  enquiryId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  productInterested: string | null;
  isForEvent: boolean | null;
  company: string | null;
  gst: string | null;
  source: string;
  status: string;
  capturedAt: string;
}

interface EnquiriesResponse {
  enquiries: Enquiry[];
  total: number;
}

const LIMIT = 50;

export default function LeadsPage() {
  const { toast } = useToast();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery<EnquiriesResponse>({
    queryKey: ["/api/admin/leads", offset],
    queryFn: () =>
      fetch(`/api/admin/leads?limit=${LIMIT}&offset=${offset}`, { credentials: "include" })
        .then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Enquiry deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const enquiries = data?.enquiries ?? [];
  const total = data?.total ?? 0;

  const sourceColor = (source: string) => {
    switch (source) {
      case "chat":
        return "bg-blue-100 text-blue-800";
      case "card":
        return "bg-purple-100 text-purple-800";
      case "whatsapp":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-yellow-100 text-yellow-800";
      case "contacted":
        return "bg-blue-100 text-blue-800";
      case "converted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Enquiries
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              All captured leads and enquiries from chatbot, business cards, and WhatsApp.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">{total} total</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Enquiries</p>
              <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : enquiries.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No enquiries captured yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enquiries will appear here as visitors interact with the chatbot.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {enquiries.map((enquiry) => (
              <Card key={enquiry.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className={`text-xs px-2 py-1 rounded font-mono bg-muted text-foreground`}>
                          {enquiry.enquiryId}
                        </code>
                        <Badge variant="outline" className={`text-xs ${sourceColor(enquiry.source)}`}>
                          {enquiry.source}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${statusColor(enquiry.status)}`}>
                          {enquiry.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {enquiry.name && (
                          <span className="font-semibold text-foreground">{enquiry.name}</span>
                        )}
                        {enquiry.phone && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />{enquiry.phone}
                          </span>
                        )}
                        {enquiry.email && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />{enquiry.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                        {enquiry.productInterested && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 shrink-0" />{enquiry.productInterested}
                          </span>
                        )}
                        {enquiry.isForEvent && (
                          <Badge variant="outline" className="text-xs">For Event</Badge>
                        )}
                        {enquiry.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />{enquiry.company}
                          </span>
                        )}
                        {enquiry.gst && (
                          <span className="text-xs">GST: {enquiry.gst}</span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(enquiry.capturedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(enquiry.id)}
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
