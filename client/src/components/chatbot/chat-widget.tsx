import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minus } from "lucide-react";
import { ChatMessage, type Message } from "./chat-message";
import { ChatInput } from "./chat-input";
import { apiRequest } from "@/lib/queryClient";

interface ChatSession {
  id: number;
  visitorId: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const startSession = async () => {
    try {
      const res = await apiRequest("POST", "/api/chat/sessions", {
        visitorId: `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sourceDomain: window.location.hostname,
      });
      const data = await res.json();
      setSession(data.session);
      setSuggestedQuestions(data.suggestedQuestions || []);
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasNewMessage(false);
    if (!session) {
      await startSession();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const sendMessage = async (text: string) => {
    if (!session || !text.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setSuggestedQuestions([]);

    try {
      const res = await apiRequest("POST", "/api/chat", {
        message: text,
        sessionId: session.id,
      });
      const data = await res.json();

      const botMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
        mediaAttachments: data.mediaAttachments,
      };
      setMessages((prev) => [...prev, botMsg]);

      if (!isOpen) {
        setHasNewMessage(true);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-8rem))] bg-background border border-border rounded-2xl shadow-2xl flex flex-col"
            data-testid="chatbot-window"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary-foreground">Supplier Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-primary-foreground/80">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 rounded-md text-primary-foreground/70 transition-colors"
                  data-testid="button-minimize-chat"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-md text-primary-foreground/70 transition-colors"
                  data-testid="button-close-chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground mb-2">Welcome!</h4>
                  <p className="text-sm text-muted-foreground mb-6 px-4">
                    I can help you with product info, pricing, fabrics, printing methods, and more.
                  </p>
                  {suggestedQuestions.length > 0 && (
                    <div className="space-y-2 px-2">
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border bg-card text-foreground hover-elevate transition-all"
                          data-testid={`button-suggestion-${i}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isTyping && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <ChatInput onSend={sendMessage} disabled={isTyping || !session} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={isOpen ? handleClose : handleOpen}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.92 }}
        data-testid="button-open-chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
        )}
      </motion.button>
    </>
  );
}
