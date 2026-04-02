"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import {
  Bot,
  Send,
  Loader2,
  User,
  Building2,
  ChevronRight,
  Clock,
  MessageCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  workspaceId: string | null;
  role: string;
  updatedAt: string;
  messageCount: number;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface ChatInterfaceProps {
  organizationId: string;
  workspaceId: string | null;
  workspaces: Workspace[];
  recentConversations: ConversationSummary[];
}

export function ChatInterface({
  organizationId,
  workspaceId,
  workspaces,
  recentConversations: initialConversations,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [chatMode, setChatMode] = useState<"supervisor" | "workspace">("supervisor");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (convId: string) => {
    const res = await api<{ conversationId: string; messages: Message[] }>(
      `/chat?conversationId=${convId}`
    );
    if (res.ok && res.data) {
      setMessages(res.data.messages);
      setConversationId(convId);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const body: Record<string, string> = { message: userMessage.content };
      if (conversationId) body.conversationId = conversationId;
      if (chatMode === "workspace" && selectedWorkspaceId) {
        body.workspaceId = selectedWorkspaceId;
      }

      const res = await api<{
        conversationId: string;
        response: string;
        metadata: Record<string, unknown>;
      }>("/chat", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok && res.data) {
        if (!conversationId) {
          setConversationId(res.data.conversationId);
        }

        const assistantMessage: Message = {
          id: `resp-${Date.now()}`,
          role: "ASSISTANT",
          content: res.data.response,
          metadata: res.data.metadata,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "SYSTEM",
            content: `Error: ${res.error || "Failed to get response"}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "SYSTEM",
          content: "Network error. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, chatMode, selectedWorkspaceId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const selectedWs = workspaces.find((w) => w.id === selectedWorkspaceId);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1400px] gap-4">
      {/* Sidebar — conversation history */}
      <div className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <button
            onClick={startNewConversation}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                conversationId === conv.id && "bg-accent"
              )}
            >
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{conv.title}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    conv.role === "ceo" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {conv.role === "ceo" ? "lil_Bin" : "Workspace"}
                  </span>
                  <span>{conv.messageCount} msgs</span>
                </div>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet
            </p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              chatMode === "supervisor" ? "bg-primary/10" : "bg-blue-500/10"
            )}>
              {chatMode === "supervisor" ? (
                <Bot className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold">
                {chatMode === "supervisor" ? "lil_Bin — AI Chief of Staff" : `${selectedWs?.name ?? "Workspace"} Agent`}
              </h1>
              <p className="text-xs text-muted-foreground">
                {chatMode === "supervisor"
                  ? "Supervisor mode — manages all workspaces"
                  : "Workspace mode — scoped to one business"}
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setChatMode("supervisor"); setSelectedWorkspaceId(null); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                chatMode === "supervisor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              lil_Bin
            </button>
            <div className="relative">
              <select
                value={chatMode === "workspace" ? (selectedWorkspaceId ?? "") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setChatMode("workspace");
                    setSelectedWorkspaceId(e.target.value);
                  }
                }}
                className={cn(
                  "appearance-none rounded-lg border-0 px-3 py-1.5 pr-7 text-xs font-medium transition-colors",
                  chatMode === "workspace"
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <option value="">Workspace Agent</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h2 className="text-lg font-semibold">
                {chatMode === "supervisor" ? "Chat with lil_Bin" : `Chat with ${selectedWs?.name ?? "Workspace"} Agent`}
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {chatMode === "supervisor"
                  ? "Ask lil_Bin about your business operations. It will delegate to workspace sub-agents and department agents as needed."
                  : "Ask the workspace agent about tasks, revenue, staff, or give instructions for this specific business."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {chatMode === "supervisor" ? (
                  <>
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Cho tôi tổng quan toàn bộ hoạt động" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Báo cáo tuần này" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="System health check" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="So sánh hiệu suất các workspace" />
                  </>
                ) : (
                  <>
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Tình trạng công việc hôm nay" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Doanh thu tuần này" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Tạo task mới" />
                    <SuggestionChip onClick={(t) => { setInput(t); }} text="Báo cáo tổng hợp" />
                  </>
                )}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "mb-4 flex gap-3",
                msg.role === "USER" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role !== "USER" && (
                <div className={cn(
                  "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  msg.role === "SYSTEM" ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  <Bot className={cn("h-4 w-4", msg.role === "SYSTEM" ? "text-destructive" : "text-primary")} />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "USER"
                    ? "bg-primary text-primary-foreground"
                    : msg.role === "SYSTEM"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground"
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.metadata && msg.role === "ASSISTANT" && (
                  <DelegationChain metadata={msg.metadata} />
                )}
              </div>
              {msg.role === "USER" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="mb-4 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {chatMode === "supervisor"
                      ? "lil_Bin is analyzing all workspaces..."
                      : `${selectedWs?.name ?? "Workspace"} agent is working...`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === "supervisor"
                  ? "Ask lil_Bin anything about your businesses..."
                  : `Message the ${selectedWs?.name ?? "workspace"} agent...`
              }
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                input.trim() && !loading
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
    >
      {text}
    </button>
  );
}

function DelegationChain({ metadata }: { metadata: Record<string, unknown> }) {
  const delegations = metadata.delegations as Array<{
    workspace: string;
    intent: string;
    department?: string;
    actions: number;
  }> | undefined;

  if (!delegations || delegations.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-background/50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Delegation Chain
      </p>
      {delegations.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{d.workspace}</span>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px]">{d.intent}</span>
          {d.department && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-blue-500">{d.department}</span>
            </>
          )}
          <span className="ml-auto">{d.actions} actions</span>
        </div>
      ))}
    </div>
  );
}
