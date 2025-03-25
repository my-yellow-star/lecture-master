"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import type {
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
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
  const [extractedText, setExtractedText] = useState<{ [key: number]: string }>(
    {}
  );
  const [totalPages, setTotalPages] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setExtractedText({});
      setCurrentPage(1);
      setTotalPages(0);
      setNumPages(null);
    }
  };

  const extractText = async () => {
    if (!confirm("텍스트를 추출하시겠습니까?")) return;
    if (!pdfFile) {
      console.warn("pdf file not exists");
      return;
    }

    setIsLoading(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument(URL.createObjectURL(pdfFile)).promise;
      setTotalPages(pdf.numPages);
      const pageTexts: { [key: number]: string } = {};

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // y 좌표별로 텍스트 아이템들을 그룹화
        const textGroups: {
          [key: number]: Array<{ text: string; x: number }>;
        } = {};
        const Y_TOLERANCE = 5; // y 좌표 허용 오차

        textContent.items.forEach((item: TextItem | TextMarkedContent) => {
          if ("str" in item && "transform" in item && item.str.trim() !== "") {
            const y = Math.round(item.transform[5]);
            const x = item.transform[4]; // x 좌표

            // 가장 가까운 y 좌표 그룹 찾기
            const closestY =
              Object.keys(textGroups)
                .map(Number)
                .find((groupY) => Math.abs(groupY - y) <= Y_TOLERANCE) || y;

            if (!textGroups[closestY]) {
              textGroups[closestY] = [];
            }
            textGroups[closestY].push({
              text: item.str.replace(/\n/g, " "),
              x: x,
            });
          }
        });

        // y 좌표를 기준으로 내림차순 정렬하고, 각 그룹 내에서 x 좌표로 정렬
        const sortedGroups = Object.entries(textGroups)
          .sort(([y1], [y2]) => Number(y2) - Number(y1))
          .map(([, group]) =>
            group.sort((a, b) => a.x - b.x).map((item) => item.text)
          );

        // 각 그룹의 텍스트를 하나의 문장으로 결합
        const pageText = sortedGroups
          .map((group) => group.join(" "))
          .join("\n");

        pageTexts[i] = pageText;
      }

      setExtractedText(pageTexts);
    } catch (error) {
      console.error("텍스트 추출 중 오류가 발생했습니다:", error);
    } finally {
      setIsLoading(false);
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
              <button
                onClick={extractText}
                disabled={!pdfFile || isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 flex items-center gap-2"
              >
                텍스트 추출하기
              </button>
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
                extractedText={extractedText}
                onDocumentLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setTotalPages(numPages);
                }}
                onPageChange={handlePageChange}
                isLoading={isLoading}
                fileName={pdfFile?.name || ""}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
