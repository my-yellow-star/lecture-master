"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getAIUsage,
  AIUsage,
  initializeAIUsage,
  decrementAIUsage,
} from "@/utils/firebase";

interface AIUsageContextType {
  aiUsage: AIUsage | null;
  decrementUsage: () => Promise<void>;
}

const AIUsageContext = createContext<AIUsageContextType | null>(null);

export function AIUsageProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [aiUsage, setAIUsage] = useState<AIUsage | null>(null);

  useEffect(() => {
    const loadAIUsage = async () => {
      if (!session?.user?.id) return;
      try {
        let usage = await getAIUsage(session.user.id);
        if (!usage) {
          usage = await initializeAIUsage(session.user.id);
        }
        setAIUsage(usage);
      } catch (error) {
        console.error("AI 사용량 로드 중 오류 발생:", error);
      }
    };
    loadAIUsage();
  }, [session?.user?.id]);

  const decrementUsage = async () => {
    if (!session?.user?.id) return;

    await decrementAIUsage(session.user.id);
    setAIUsage((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        remainingQuota: Math.max(0, prev.remainingQuota - 1),
      };
    });
  };

  return (
    <AIUsageContext.Provider value={{ aiUsage, decrementUsage }}>
      {children}
    </AIUsageContext.Provider>
  );
}

export function useAIUsage() {
  const context = useContext(AIUsageContext);
  if (!context) {
    throw new Error("useAIUsage must be used within an AIUsageProvider");
  }
  return context;
}
