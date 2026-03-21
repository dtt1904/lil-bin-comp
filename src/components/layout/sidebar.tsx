"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  ShieldCheck,
  Building2,
  Network,
  Bot,
  FolderKanban,
  Brain,
  ScrollText,
  BarChart3,
  Home,
  FileText,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";

const navSections = [
  {
    label: "Command",
    items: [
      { name: "Command Center", href: "/", icon: LayoutDashboard },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Approvals", href: "/approvals", icon: ShieldCheck },
    ],
  },
  {
    label: "Organization",
    items: [
      { name: "Workspaces", href: "/workspaces", icon: Building2 },
      { name: "Departments", href: "/departments", icon: Network },
      { name: "Agents", href: "/agents", icon: Bot },
      { name: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Knowledge", href: "/knowledge", icon: Brain },
      { name: "Logs", href: "/logs", icon: ScrollText },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Modules",
    items: [
      { name: "Listings", href: "/modules/listings", icon: Home },
      { name: "Content", href: "/modules/content", icon: FileText },
      { name: "Invoices", href: "/modules/invoices", icon: Receipt },
    ],
  },
  {
    label: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-2">
        <Bot className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold tracking-tight text-foreground">
          lil_Bin
        </span>
      </div>

      {/* Workspace Switcher */}
      <div className="px-2 pb-2">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mt-6 mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
