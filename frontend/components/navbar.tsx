"use client";

import { Bot, Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="flex h-16 items-center border-b bg-card px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search cases, hearings..." className="pl-10 bg-muted/50" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/ai-assistant">
          <Button variant="outline" size="sm" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
