"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendReviewMessage } from "@/features/review/actions/send-review-message";

export interface ReviewChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ReviewChatProps {
  projectId: string;
  initialMessages: ReviewChatMessage[];
  sessionId: string | null;
  providerConfigured: boolean;
}

export function ReviewChat({
  projectId,
  initialMessages,
  sessionId,
  providerConfigured,
}: ReviewChatProps) {
  const [messages, setMessages] = useState<ReviewChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [lastUserContent, setLastUserContent] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      setError(null);
      setLastUserContent(content);
      setInput("");

      // Optimistically add user message
      const tempUserMsg: ReviewChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setLoading(true);

      try {
        const result = await sendReviewMessage({
          projectId,
          content: content.trim(),
        });

        if (!result.success) {
          setError(result.error ?? "Failed to send message.");
          // Remove the optimistic user message on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
          return;
        }

        // Update session ID if this was the first message
        if (result.sessionId && !currentSessionId) {
          setCurrentSessionId(result.sessionId);
        }

        // Add assistant response
        if (result.assistantMessage) {
          const assistantMsg: ReviewChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.assistantMessage,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch {
        setError("An unexpected error occurred. Please try again.");
        // Remove the optimistic user message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [projectId, currentSessionId, loading],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRetry = () => {
    if (lastUserContent) {
      setError(null);
      sendMessage(lastUserContent);
    }
  };

  const handleStartConversation = () => {
    sendMessage("Hello! I'd like to review my project intake and fill in any gaps.");
  };

  // Welcome state — no messages yet
  if (messages.length === 0 && !loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Review Conversation
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Start a conversation with the AI assistant to review your project
          intake and fill in any gaps. The assistant will analyze what
          information is missing and ask targeted follow-up questions.
        </p>
        <button
          type="button"
          onClick={handleStartConversation}
          disabled={!providerConfigured}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
      {/* Message area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              type="button"
              onClick={handleRetry}
              className="font-medium text-red-800 underline hover:text-red-900"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="font-medium text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <label htmlFor="review-chat-input" className="sr-only">
            Type your message
          </label>
          <textarea
            ref={textareaRef}
            id="review-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
