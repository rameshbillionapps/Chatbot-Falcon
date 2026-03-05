import { useState } from "react";
import { MessageCircle, User, FileText, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export interface MediaAttachment {
  type: string;
  url: string;
  title: string;
}

export interface Message {
  id: number;
  role: string;
  content: string;
  timestamp: string;
  mediaAttachments?: MediaAttachment[];
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
    </motion.div>
  );
}

function MediaCarousel({ media }: { media: MediaAttachment[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const images = media.filter(m => m.type === "image");
  const pdfs = media.filter(m => m.type === "pdf");
  const videos = media.filter(m => m.type === "video");

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="relative">
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={images[currentIndex]?.url}
              alt={images[currentIndex]?.title}
              className="w-full h-40 object-cover cursor-pointer"
              onClick={() => setLightboxSrc(images[currentIndex]?.url)}
              data-testid={`img-media-${currentIndex}`}
            />
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-between mt-1.5">
              <button
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="p-1 rounded-md bg-card border border-border disabled:opacity-30"
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setCurrentIndex(i => Math.min(images.length - 1, i + 1))}
                disabled={currentIndex === images.length - 1}
                className="p-1 rounded-md bg-card border border-border disabled:opacity-30"
                data-testid="button-carousel-next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {lightboxSrc && (
            <ImageLightbox src={lightboxSrc} alt="Media" onClose={() => setLightboxSrc(null)} />
          )}
        </div>
      )}

      {pdfs.map((pdf, i) => (
        <a
          key={i}
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover-elevate transition-all"
          data-testid={`link-pdf-${i}`}
        >
          <div className="w-9 h-9 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{pdf.title}</p>
            <p className="text-[10px] text-muted-foreground">PDF Document</p>
          </div>
          <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </a>
      ))}

      {videos.map((video, i) => (
        <a
          key={i}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover-elevate transition-all"
          data-testid={`link-video-${i}`}
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{video.title}</p>
            <p className="text-[10px] text-muted-foreground">Video</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageCircle className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {message.mediaAttachments && message.mediaAttachments.length > 0 && (
          <MediaCarousel media={message.mediaAttachments} />
        )}

        <p className={`text-[10px] text-muted-foreground mt-1 px-1 ${isUser ? "text-right" : ""}`}>
          {time}
        </p>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-secondary-foreground" />
        </div>
      )}
    </motion.div>
  );
}
