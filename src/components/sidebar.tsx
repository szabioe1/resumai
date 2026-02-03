"use client";

import {
  FileText,
  Sparkles,
  Target,
  BookOpen,
  TrendingUp,
  Settings,
  LayoutDashboard,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Sparkles,
    label: "AI Analysis",
    description: "Deep resume scoring",
  },
  {
    icon: Target,
    label: "ATS Optimization",
    description: "Beat applicant tracking",
  },
  {
    icon: BookOpen,
    label: "Keyword Matching",
    description: "Industry-specific terms",
  },
  {
    icon: TrendingUp,
    label: "Career Insights",
    description: "Growth recommendations",
  },
  {
    icon: Zap,
    label: "Quick Fixes",
    description: "Instant improvements",
  },
];

const navigation = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FileText, label: "My Resumes" },
  { icon: Settings, label: "Settings" },
];

interface SidebarProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function Sidebar({ onNavigate, currentPage = "Dashboard" }: SidebarProps) {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signout();
    navigate("/signin");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-sidebar-foreground">
            ResumAI
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                currentPage === item.label
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Features Section */}
        <div className="flex-1 overflow-auto px-3 py-4">
          <h3 className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Features
          </h3>
          <div className="space-y-1">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent group-hover:bg-primary/10">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground">
                    {feature.label}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="h-9 w-9 rounded-full"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                {user ? getInitials(user.name) : "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.name || "User"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50">
                {user?.email || "No email"}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
