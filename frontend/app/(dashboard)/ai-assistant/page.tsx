"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Scale, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; section?: string; content: string }[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What are the bail provisions under Section 439 CrPC?",
  "What are the ingredients of offense under Section 138 NI Act?",
  "What is the procedure for filing a FIR under BNS?",
  "What are the fundamental rights under Article 14-21 of the Constitution?",
  "What is the punishment for murder under Section 103 BNS?",
  "What are the provisions for anticipatory bail under Section 438 CrPC?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend returned ${res.status}`);
      }
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || "I could not find relevant information. Please try rephrasing your question.",
        sources: data.sources || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && err.message === "Failed to fetch";
      const errorMessage = isNetworkError
        ? "Cannot connect to the AI backend. Please make sure the backend server is running on port 8000."
        : `Error: ${err.message || "The AI service is currently unavailable. Please try again later."}`;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">AI Legal Assistant</h1>
          <p className="text-muted-foreground">Ask questions about Indian law powered by RAG</p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <Bot className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Legal AI Assistant</h3>
                  <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
                    Ask me anything about Indian law. I can reference IPC, CrPC, BNS, Constitutional provisions, and landmark judgments from the indexed legal dataset.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="mb-1 flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">Legal AI</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 border-t pt-2">
                            <p className="mb-1 text-xs font-semibold opacity-70">Sources:</p>
                            <div className="space-y-1">
                              {msg.sources.map((src, i) => (
                                <div key={i} className="rounded bg-background/20 px-2 py-1 text-xs">
                                  <BookOpen className="mr-1 inline h-3 w-3" />
                                  {src.title}
                                  {src.section && ` - ${src.section}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching legal database...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Ask a legal question... (e.g., Bail provisions under Section 439 CrPC)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden w-72 lg:block">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-sm">About this AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              This assistant uses Retrieval-Augmented Generation (RAG) to answer legal questions based on the Indian Law dataset.
            </p>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Supported Sources:</p>
              <div className="flex flex-wrap gap-1">
                {["Indian Penal Code", "CrPC", "CPC", "BNS", "BNSS", "NI Act", "Constitution"].map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Best Practices:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>Be specific about sections or acts</li>
                <li>Ask one question at a time</li>
                <li>Mention the jurisdiction when relevant</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
