"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useState, useRef } from "react";
import { Note } from "@/types";
import { savePDF } from "@/utils/pdfGenerator";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  numPages: number | null;
  totalPages: number;
  extractedText: { [key: number]: string };
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
  fileName: string;
}

export default function PDFViewer({
  pdfUrl,
  currentPage,
  numPages,
  totalPages,
  extractedText,
  onDocumentLoadSuccess,
  onPageChange,
  isLoading,
  fileName,
}: PDFViewerProps) {
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isNoteMode || selectedNote || isDragging || wasDragging) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newNote: Note = {
      id: Date.now().toString(),
      page: currentPage,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      text: "",
    };

    setSelectedNote(newNote);
    setNoteText("");
  };

  const handleNoteSave = () => {
    if (!selectedNote || !noteText.trim()) return;

    const updatedNote = {
      ...selectedNote,
      text: noteText,
    };

    setNotes((prev) => {
      const existingNoteIndex = prev.findIndex(
        (note) => note.id === selectedNote.id
      );
      if (existingNoteIndex !== -1) {
        // 기존 메모 업데이트
        const newNotes = [...prev];
        newNotes[existingNoteIndex] = updatedNote;
        return newNotes;
      } else {
        // 새로운 메모 추가
        return [...prev, updatedNote];
      }
    });
    setSelectedNote(null);
    setNoteText("");
  };

  const handleNoteDelete = () => {
    if (!selectedNote) return;

    setNotes((prev) => prev.filter((note) => note.id !== selectedNote.id));
    setSelectedNote(null);
    setNoteText("");
  };

  const handleSavePDF = async () => {
    try {
      setIsSaving(true);
      await savePDF(notes, pdfUrl, fileName);
    } catch (error) {
      alert("PDF 저장 중 오류가 발생했습니다: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement>,
    noteId: string
  ) => {
    if (!isNoteMode) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setWasDragging(false);
    setDraggedNoteId(noteId);
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !draggedNoteId || !containerRef.current || !isNoteMode)
      return;
    e.preventDefault();
    e.stopPropagation();
    setWasDragging(true);

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === draggedNoteId
          ? {
              ...note,
              x: Math.max(0, Math.min(100, x)),
              y: Math.max(0, Math.min(100, y)),
            }
          : note
      )
    );
  };

  const handleDragEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDraggedNoteId(null);
    setTimeout(() => {
      setWasDragging(false);
    }, 100);
  };

  return (
    <div className="flex-1 flex gap-4 h-[calc(100vh-8rem)]">
      <div className="w-48 shrink-0 border rounded-lg p-2 overflow-y-auto">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-col gap-2"
        >
          {Array.from(new Array(numPages || totalPages), (_, index) => (
            <div
              key={`page_${index + 1}`}
              className={`cursor-pointer border rounded p-1 ${
                currentPage === index + 1
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              } relative`}
              onClick={() => onPageChange(index + 1)}
            >
              <Page
                pageNumber={index + 1}
                width={160}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {notes.filter((note) => note.page === index + 1).length > 0 && (
                <div className="absolute bottom-1 right-1 bg-yellow-300 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {notes.filter((note) => note.page === index + 1).length}
                </div>
              )}
            </div>
          ))}
        </Document>
      </div>
      <div className="flex-1 border rounded-lg p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              이전
            </button>
            <span className="mx-2">
              페이지{" "}
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const newPage = parseInt(e.target.value);
                  if (newPage >= 1 && newPage <= totalPages) {
                    onPageChange(newPage);
                  }
                }}
                disabled={isLoading}
                className="w-16 px-2 py-1 border rounded text-center disabled:bg-gray-100"
              />
              / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              다음
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNoteMode(!isNoteMode)}
              className={`px-4 py-2 rounded ${
                isNoteMode ? "bg-red-500 text-white" : "bg-green-500 text-white"
              }`}
            >
              {isNoteMode ? "메모 모드 종료" : "메모 작성"}
            </button>
            {notes.length > 0 && (
              <button
                onClick={handleSavePDF}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    저장 중...
                  </>
                ) : (
                  "PDF 저장"
                )}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-12rem)]">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col border rounded-lg items-center bg-gray-50"
            loading={
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            }
          >
            <div
              ref={containerRef}
              className="relative"
              onClick={handlePageClick}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              style={{
                cursor:
                  isNoteMode && !isDragging
                    ? "crosshair"
                    : isDragging
                    ? "grabbing"
                    : "default",
                userSelect: isDragging ? "none" : "auto",
              }}
            >
              <Page
                pageNumber={currentPage}
                width={800}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              {notes
                .filter((note) => note.page === currentPage)
                .map((note, index) => (
                  <div
                    key={note.id}
                    className={`absolute w-6 h-6 z-40 bg-yellow-300 rounded-full group flex items-center justify-center text-xs font-bold ${
                      draggedNoteId === note.id
                        ? "ring-2 ring-blue-500"
                        : isNoteMode
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                    style={{
                      left: `${note.x}%`,
                      top: `${note.y}%`,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDragStart(e, note.id);
                    }}
                    onClick={(e) => {
                      if (!isDragging && isNoteMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedNote(note);
                        setNoteText(note.text);
                      }
                    }}
                  >
                    {index + 1}
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-white p-2 rounded shadow-lg border text-sm w-64 z-50">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(parseInt(note.id)).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                      <div className="whitespace-pre-line break-words">
                        {note.text}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Document>
        </div>
      </div>
      {selectedNote && (
        <div
          className="fixed inset-0 bg-black z-50 cursor-default bg-opacity-50 flex items-center justify-center"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white p-4 rounded-lg w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">메모 작성</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-32 p-2 border rounded mb-4"
              placeholder="메모를 입력하세요..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleNoteDelete}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                삭제
              </button>
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                취소
              </button>
              <button
                onClick={handleNoteSave}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
      {extractedText && Object.keys(extractedText).length > 0 && (
        <div className="w-96 shrink-0 border rounded-lg p-4">
          <h2 className="font-bold mb-4">추출된 텍스트</h2>
          <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-y-auto h-[calc(100vh-12rem)]">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/6"></div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm">
                {extractedText[currentPage]}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
