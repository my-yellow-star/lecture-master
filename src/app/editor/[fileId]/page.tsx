"use client";

import { useState, Suspense, useEffect, use } from "react";
import dynamic from "next/dynamic";
import "pdfjs-dist/web/pdf_viewer.css";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { getFileById } from "@/utils/firebase";

// PDF 관련 컴포넌트들을 동적으로 임포트
const PDFViewer = dynamic(() => import("../../../components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  ),
});

// params fieldId 를 use(params).fieldId 로 사용
export default function EditorPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { fileId } = use(params);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const loadFile = async () => {
      if (!session?.user?.id) return;

      try {
        const file = await getFileById(fileId, session.user.id);
        if (
          file &&
          file.type === "file" &&
          file.fileType === "application/pdf"
        ) {
          setPdfUrl(file.fileUrl ?? null);
          setFileName(file.name);
        } else {
          router.push("/files");
        }
      } catch (error) {
        console.error("파일 로드 중 오류 발생:", error);
        router.push("/files");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [fileId, session?.user?.id, router]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="container p-4">
      <div className="fixed left-0 right-0 top-0 bottom-0 bg-gray-100 dark:bg-gray-900 z-10">
        <div className="container mx-auto p-4 h-full flex flex-col">
          <Header title="강의자료 도우미" showBackButton />
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
                fileName={fileName}
                pdfFile={null}
                fileId={fileId}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
