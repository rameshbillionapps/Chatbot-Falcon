import { useState, useRef } from "react";
import { Send, ImagePlus, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: File) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || disabled) return;
    onSend(text.trim() || "Can you identify this product?", selectedImage || undefined);
    setText("");
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="px-3 py-3 border-t border-border bg-background rounded-b-2xl">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="h-20 w-20 object-cover rounded-lg border border-border"
            data-testid="img-upload-preview"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
            data-testid="button-remove-image"
          >
            <X className="w-3 h-3 text-destructive-foreground" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0 hover:bg-accent"
          data-testid="button-upload-image"
        >
          <ImagePlus className="w-4 h-4 text-muted-foreground" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground"
          style={{ minHeight: "40px", maxHeight: "100px" }}
          data-testid="input-chat-message"
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !selectedImage) || disabled}
          className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Powered by AI - Responses may not always be accurate
      </p>
    </div>
  );
}
