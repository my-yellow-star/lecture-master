"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import "pdfjs-dist/web/pdf_viewer.css";
import { useTheme } from "@/context/ThemeContext";

// PDF 관련 컴포넌트들을 동적으로 임포트
const PDFViewer = dynamic(() => import("../components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function LectureMaster() {
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setCurrentPage(1);
      setTotalPages(0);
      setNumPages(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="container p-4">
      <div className="fixed left-0 right-0 top-0 bottom-0 bg-white dark:bg-gray-900 z-10">
        <div className="container mx-auto p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              강의 자료 도우미
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === "light" ? "☀️" : "🌙"}
              </button>
              <div className="w-64">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={onFileChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-100
                    dark:hover:file:bg-blue-800"
                />
              </div>
            </div>
          </div>
          {pdfUrl && (
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              }
            >
              <PDFViewer
                pdfUrl={pdfUrl}
                currentPage={currentPage}
                numPages={numPages}
                totalPages={totalPages}
                onDocumentLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setTotalPages(numPages);
                }}
                onPageChange={handlePageChange}
                fileName={pdfFile?.name || ""}
                pdfFile={pdfFile}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
