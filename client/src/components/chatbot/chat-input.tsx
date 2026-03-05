import { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-3 py-3 border-t border-border bg-background rounded-b-2xl">
      <div className="flex items-end gap-2">
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
          disabled={!text.trim() || disabled}
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
