"use client";

import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Link
            href="/files"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ←
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>
      <button
        onClick={toggleTheme}
        className="h-8 w-8 shrink-0 rounded-full bg-white dark:bg-gray-700 hover:border dark:hover:bg-gray-600 transition-colors"
      >
        {theme === "light" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
