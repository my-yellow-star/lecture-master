"use client";

import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useAIUsage } from "@/context/AIUsageContext";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const { aiUsage } = useAIUsage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

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
        {session?.user && (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-purple-300 dark:bg-purple-600">
              🔎
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              {aiUsage?.remainingQuota ?? 0}
            </span>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="h-8 w-8 shrink-0 rounded-full bg-orange-50 hover:bg-orange-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
        {session?.user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || ""}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span>{session.user.name || session.user.email}</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                <Link
                  href="/files"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  내 파일
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
