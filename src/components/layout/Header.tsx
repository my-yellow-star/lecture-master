"use client";

import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Link
            href="/files"
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span>←</span>
            <span>메인으로</span>
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="h-8 w-8 shrink-0 rounded-full bg-orange-50 hover:bg-orange-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
        {session?.user && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span>{session.user.name || session.user.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}
