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
import { useTheme } from "@/contexts/theme";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Target,
    label: "Job Description Matcher",
    description: "Match resume to job postings",
  },
];

const navigation = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Target, label: "Job Matcher" },
  { icon: FileText, label: "My Resumes" },
  { icon: Settings, label: "Settings" },
];

interface SidebarProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function Sidebar({ onNavigate, currentPage = "Dashboard" }: SidebarProps) {
  const { user, signout } = useAuth();
  const { isDarkMode } = useTheme();
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
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen w-64 border-r backdrop-blur",
      isDarkMode 
        ? "border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-900/60"
        : "border-gray-200 bg-gradient-to-b from-white to-gray-50"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center gap-3 border-b px-6",
          isDarkMode ? "border-slate-700/30" : "border-gray-200"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20">
            <FileText className="h-5 w-5 text-white font-bold" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            ResumAI
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-5">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                currentPage === item.label
                  ? isDarkMode
                    ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-100 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    : "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-900 border border-blue-300 shadow-lg shadow-blue-500/10"
                  : isDarkMode
                    ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Features Section */}
        <div className={cn(
          "flex-1 overflow-auto px-3 py-4 border-t",
          isDarkMode ? "border-slate-700/30" : "border-gray-200"
        )}>
          <h3 className={cn(
            "mb-4 px-3 text-xs font-bold uppercase tracking-widest",
            isDarkMode ? "text-slate-400" : "text-gray-500"
          )}>
            ✨ Features
          </h3>
          <div className="space-y-2">
            {features.map((feature) => (
              <div
                key={feature.label}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-3 py-3 transition-all border cursor-pointer",
                  isDarkMode
                    ? "hover:bg-slate-800/50 border-transparent hover:border-blue-500/20"
                    : "hover:bg-gray-100 border-transparent hover:border-blue-300"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/20 group-hover:border-blue-500/40"
                    : "bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-200 group-hover:border-blue-400"
                )}>
                  <feature.icon className={cn(
                    "h-4 w-4",
                    isDarkMode ? "text-blue-300" : "text-blue-600"
                  )} />
                </div>
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    isDarkMode ? "text-slate-100" : "text-gray-900"
                  )}>
                    {feature.label}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isDarkMode ? "text-slate-400" : "text-gray-500"
                  )}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className={cn(
          "border-t bg-gradient-to-t p-4",
          isDarkMode
            ? "border-slate-700/30 from-slate-900/60 to-transparent"
            : "border-gray-200 from-gray-50 to-transparent"
        )}>
          <div className={cn(
            "flex items-center gap-3 mb-4 rounded-lg p-3 border",
            isDarkMode
              ? "bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-slate-700/30"
              : "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200"
          )}>
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className={cn(
                  "h-10 w-10 rounded-full border-2",
                  isDarkMode ? "border-blue-500/30" : "border-blue-400"
                )}
              />
            ) : (
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold border",
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-blue-300 border-blue-500/30"
                  : "bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 border-blue-300"
              )}>
                {user ? getInitials(user.name) : "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn(
                "truncate text-sm font-semibold",
                isDarkMode ? "text-slate-100" : "text-gray-900"
              )}>
                {user?.name || "User"}
              </p>
              <p className={cn(
                "truncate text-xs",
                isDarkMode ? "text-slate-500" : "text-gray-500"
              )}>
                {user?.email || "No email"}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border",
              isDarkMode
                ? "text-slate-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 border-transparent"
                : "text-gray-600 hover:bg-red-100 hover:text-red-600 hover:border-red-300 border-transparent"
            )}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
