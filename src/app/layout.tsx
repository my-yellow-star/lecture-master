import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AIUsageProvider } from "@/context/AIUsageContext";
import SessionProvider from "@/components/providers/SessionProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "강의 자료 도우미",
  description: "PDF 파일에 메모를 추가하고 관리하는 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider>
            <AIUsageProvider>
              {children}
              <Toaster position="top-right" />
            </AIUsageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
