import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Link as LinkIcon, Trash2, Image, FileText, Film, ExternalLink } from "lucide-react";
import type { MediaAsset } from "@shared/schema";

export default function MediaPage() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlForm, setUrlForm] = useState({ title: "", url: "", type: "image", description: "", category: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: assets = [], isLoading } = useQuery<MediaAsset[]>({ queryKey: ["/api/admin/media"] });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "File uploaded" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const urlMutation = useMutation({
    mutationFn: async (data: typeof urlForm) => apiRequest("POST", "/api/admin/media", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Media added" });
      setUrlForm({ title: "", url: "", type: "image", description: "", category: "" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to add media", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Media deleted" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/admin/media"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "All media deleted" });
    },
    onError: () => toast({ title: "Failed to delete all media", variant: "destructive" }),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    uploadMutation.mutate(formData);
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = typeFilter === "all" ? assets : assets.filter(a => a.type === typeFilter);

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "pdf") return <FileText className="w-5 h-5 text-destructive" />;
    if (type === "video") return <Film className="w-5 h-5 text-primary" />;
    return <Image className="w-5 h-5 text-primary" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Media Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">{assets.length} media assets</p>
          </div>
          <div className="flex gap-2">
            {assets.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5" disabled={deleteAllMutation.isPending} data-testid="button-delete-all-media">
                    <Trash2 className="w-3.5 h-3.5" /> Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all media assets?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {assets.length} media assets. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAllMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-all-media">
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf" />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending} data-testid="button-upload-file">
              <Upload className="w-3.5 h-3.5" /> Upload File
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" data-testid="button-add-url"><LinkIcon className="w-3.5 h-3.5" /> Add URL</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Media by URL</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); urlMutation.mutate(urlForm); }} className="space-y-4">
                  <div><Label>Title</Label><Input value={urlForm.title} onChange={e => setUrlForm(f => ({ ...f, title: e.target.value }))} required data-testid="input-media-title" /></div>
                  <div><Label>URL</Label><Input value={urlForm.url} onChange={e => setUrlForm(f => ({ ...f, url: e.target.value }))} required data-testid="input-media-url" /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={urlForm.type} onValueChange={v => setUrlForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger data-testid="select-media-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Input value={urlForm.description} onChange={e => setUrlForm(f => ({ ...f, description: e.target.value }))} data-testid="input-media-description" /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={urlMutation.isPending} data-testid="button-save-media">{urlMutation.isPending ? "Adding..." : "Add"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All ({assets.length})</TabsTrigger>
            <TabsTrigger value="image" data-testid="tab-images">Images ({assets.filter(a => a.type === "image").length})</TabsTrigger>
            <TabsTrigger value="pdf" data-testid="tab-pdfs">PDFs ({assets.filter(a => a.type === "pdf").length})</TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-videos">Videos ({assets.filter(a => a.type === "video").length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-10 text-center">
              <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No media assets found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((asset) => (
              <Card key={asset.id} className="border border-border overflow-hidden group" data-testid={`card-media-${asset.id}`}>
                <div className="relative aspect-square bg-muted">
                  {asset.type === "image" ? (
                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon type={asset.type} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/90">
                      <ExternalLink className="w-4 h-4 text-black" />
                    </a>
                    <button className="p-2 rounded-full bg-white/90" onClick={() => { if (confirm("Delete this media?")) deleteMutation.mutate(asset.id); }} data-testid={`button-delete-media-${asset.id}`}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <CardContent className="p-2.5">
                  <p className="text-xs font-medium truncate text-foreground">{asset.title}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{asset.type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
