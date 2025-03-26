"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useState, useRef, useEffect } from "react";
import { savePDF } from "@/utils/pdfGenerator";
import { createNote, getNotes, updateNote, deleteNote } from "@/utils/firebase";
import { useSession } from "next-auth/react";
import { Note, NoteInput } from "@/types/auth";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  numPages: number | null;
  totalPages: number;
  onDocumentLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onPageChange: (newPage: number) => void;
  fileName: string;
  pdfFile: File | null;
  fileId: string;
}

export default function PDFViewer({
  pdfUrl,
  currentPage,
  numPages,
  totalPages,
  onDocumentLoadSuccess,
  onPageChange,
  fileName,
  fileId,
}: PDFViewerProps) {
  const { data: session } = useSession();
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [showTooltipId, setShowTooltipId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const shouldUpdateListRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "text">("notes");
  const updateTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isModalEditing || isDragging || editingNoteId) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        if (currentPage > 1) {
          onPageChange(currentPage - 1);
        }
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        if (currentPage < totalPages) {
          onPageChange(currentPage + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentPage,
    totalPages,
    onPageChange,
    isModalEditing,
    isDragging,
    editingNoteId,
  ]);

  // 메모 데이터 로드
  useEffect(() => {
    const loadNotes = async () => {
      if (!session?.user?.id || !fileId) return;
      try {
        const loadedNotes = await getNotes(fileId, session.user.id);
        // createdAt 기준으로 오름차순 정렬
        setNotes(
          loadedNotes.sort((a, b) => {
            const aTime =
              a.createdAt instanceof Date
                ? a.createdAt.getTime()
                : a.createdAt.toDate().getTime();
            const bTime =
              b.createdAt instanceof Date
                ? b.createdAt.getTime()
                : b.createdAt.toDate().getTime();
            return aTime - bTime;
          })
        );
      } catch (error) {
        console.error("메모 로드 중 오류 발생:", error);
      }
    };
    loadNotes();
  }, [fileId, session?.user.id]);

  // 백그라운드 업데이트 처리
  useEffect(() => {
    if (!session?.user?.id) return;

    const updateNotes = async () => {
      if (shouldUpdateListRef.current.size === 0) return;
      console.log("updateNotes, ", shouldUpdateListRef.current);

      const updatePromises = Array.from(shouldUpdateListRef.current).map(
        async (noteId) => {
          const note = notes.find((n) => n.id === noteId);
          if (!note) return;
          try {
            await updateNote(
              noteId,
              note.text,
              note.x,
              note.y,
              session.user.id
            );
          } catch (error) {
            console.error(`메모 ${noteId} 업데이트 중 오류 발생:`, error);
          }
        }
      );

      await Promise.all(updatePromises);
      setLastSaved(new Date());
      shouldUpdateListRef.current = new Set();
    };

    if (updateTimeoutRef.current) {
      clearInterval(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setInterval(updateNotes, 1000);

    return () => {
      if (updateTimeoutRef.current) {
        clearInterval(updateTimeoutRef.current);
      }
    };
  }, [notes, session?.user?.id]);

  const handlePageClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isNoteMode || isDragging || wasDragging) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const input: NoteInput = {
      page: currentPage,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      text: "",
    };
    const newNote: Note = session?.user.id
      ? await createNote({
          fileId,
          page: input.page,
          x: input.x,
          y: input.y,
          text: noteText,
          userId: session.user.id,
        })
      : {
          id: new Date().getTime().toString(),
          page: input.page,
          x: input.x,
          y: input.y,
          text: "",
          userId: "",
          fileId: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    setSelectedNote(newNote);
    setNotes((prev) => [...prev, newNote]);
    setNoteText("");
    setIsModalEditing(true);
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setNoteText(note.text);
    setIsModalEditing(true);
    // PDF 뷰어에서 해당 메모로 스크롤
    const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
    if (noteElement) {
      noteElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSidebarNoteClick = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteText(note.text);
  };

  const handleNoteDelete = async () => {
    if (!session?.user?.id) return;

    if (isModalEditing) {
      if (!selectedNote?.id) return;
      try {
        await deleteNote(selectedNote.id, session.user.id);
        setNotes((prev) => prev.filter((note) => note.id !== selectedNote.id));
        setLastSaved(new Date());
      } catch (error) {
        console.error("메모 삭제 중 오류 발생:", error);
      }
      setSelectedNote(null);
      setNoteText("");
      setIsModalEditing(false);
    } else {
      if (!editingNoteId) return;
      try {
        await deleteNote(editingNoteId, session.user.id);
        setNotes((prev) => prev.filter((note) => note.id !== editingNoteId));
        setLastSaved(new Date());
      } catch (error) {
        console.error("메모 삭제 중 오류 발생:", error);
      }
      setEditingNoteId(null);
      setNoteText("");
    }
  };

  const handleSavePDF = async () => {
    if (!confirm("현재 PDF 파일을 다운로드하시겠습니까?")) return;

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
    if (draggedNoteId) {
      shouldUpdateListRef.current.add(draggedNoteId);
    }
    setDraggedNoteId(null);
    setTimeout(() => {
      setWasDragging(false);
    }, 100);
  };

  const handleNoteConfirm = async () => {
    if (!session?.user?.id) return;

    if (isModalEditing) {
      if (!selectedNote) return;

      setNotes((prev) =>
        prev.map((note) =>
          note.id === selectedNote.id ? { ...note, text: noteText } : note
        )
      );
      shouldUpdateListRef.current.add(selectedNote.id);

      setSelectedNote(null);
      setNoteText("");
      setIsModalEditing(false);
    } else {
      if (!editingNoteId) return;

      try {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === editingNoteId ? { ...note, text: noteText } : note
          )
        );
        shouldUpdateListRef.current.add(editingNoteId);
      } catch (error) {
        console.error("메모 저장 중 오류 발생:", error);
      }

      setEditingNoteId(null);
      setNoteText("");
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      <div className="lg:w-48 shrink-0 border border-gray-200 dark:border-gray-700 rounded-lg p-2 overflow-y-auto bg-white dark:bg-gray-800 scrollbar-custom">
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
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700"
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
                <div className="absolute bottom-1 right-1 bg-yellow-300 dark:bg-yellow-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {notes.filter((note) => note.page === index + 1).length}
                </div>
              )}
            </div>
          ))}
        </Document>
      </div>
      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
            >
              이전
            </button>
            <span className="mx-2 text-gray-900 dark:text-white">
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
                className="w-16 px-2 py-1 border rounded text-center disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
            >
              다음
            </button>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                마지막 저장: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            {notes.length > 0 && (
              <button
                onClick={handleSavePDF}
                disabled={isSaving}
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded disabled:border-gray-300 dark:disabled:border-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 flex items-center gap-2"
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
            <button
              onClick={() => setIsNoteMode(!isNoteMode)}
              className={`px-4 py-2 rounded ${
                isNoteMode ? "bg-red-500 text-white" : "bg-green-500 text-white"
              }`}
            >
              {isNoteMode ? "편집 모드 종료" : "편집 모드"}
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-12rem)]">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg items-center bg-gray-50 dark:bg-gray-900"
            loading={
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            }
          >
            <div
              ref={containerRef}
              className="relative w-full"
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
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={containerRef.current?.clientWidth}
              />
              {notes
                .filter((note) => note.page === currentPage)
                .map((note, index) => (
                  <div
                    key={note.id}
                    data-note-id={note.id}
                    className={`absolute w-6 h-6 z-40 bg-yellow-300 dark:bg-yellow-500 rounded-full group flex items-center justify-center text-xs font-bold ${
                      draggedNoteId === note.id
                        ? "ring-2 ring-blue-500"
                        : selectedNote?.id === note.id ||
                          editingNoteId === note.id
                        ? "ring-2 ring-blue-500 animate-pulse scale-125"
                        : isNoteMode
                        ? "cursor-pointer"
                        : ""
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
                    onMouseOver={() => {
                      setShowTooltipId(note.id);
                    }}
                    onMouseOut={() => {
                      setShowTooltipId(null);
                    }}
                    onClick={(e) => {
                      if (!isDragging && isNoteMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        handleNoteClick(note);
                      }
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              {showTooltipId && (
                <NoteTooltip
                  note={notes.find((note) => note.id === showTooltipId)}
                />
              )}
            </div>
          </Document>
        </div>
      </div>
      <div className="lg:w-96 shrink-0 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === "notes"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            메모 목록
          </button>
          {/* <button
            onClick={() => {
              setActiveTab("text");
              if (!extractedText[currentPage]) {
                handleExtractText();
              }
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === "text"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            텍스트 추출
          </button> */}
        </div>
        <div className="h-[calc(100vh-12rem)]">
          {activeTab === "notes" ? (
            <div className="overflow-y-auto h-full scrollbar-custom">
              <div className="space-y-4">
                {notes
                  .filter((note) => note.page === currentPage)
                  .map((note, index) => (
                    <div
                      key={note.id}
                      className={`p-4 bg-gray-50 dark:bg-gray-900 rounded-lg`}
                      onMouseOver={() => {
                        setShowTooltipId(note.id);
                      }}
                      onMouseOut={() => {
                        setShowTooltipId(null);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          메모 #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(note.createdAt instanceof Date
                            ? note.createdAt
                            : note.createdAt.toDate()
                          ).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="w-full h-32 p-2 border border-gray-200 dark:border-gray-700 focus:border-gray-600 dark:focus:border-gray-300 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
                            placeholder="메모를 입력하세요..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleNoteDelete}
                              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => {
                                setEditingNoteId(null);
                                setNoteText("");
                              }}
                              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
                            >
                              취소
                            </button>
                            <button
                              onClick={handleNoteConfirm}
                              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                            >
                              확인
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 hover:line-clamp-none cursor-pointer"
                          onClick={() => handleSidebarNoteClick(note)}
                        >
                          {note.text}
                        </div>
                      )}
                    </div>
                  ))}
                {notes.filter((note) => note.page === currentPage).length ===
                  0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    현재 페이지에 작성된 메모가 없습니다.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <p className="text-xs text-gray-400 dark:text-gray-500 pl-2">
                * 파일에 따라 추출 정보가 정확하지 않을 수 있습니다.
              </p>
              <div className="flex-1 overflow-y-auto scrollbar-custom mt-2 ">
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {selectedNote && isModalEditing && (
        <div
          className="fixed inset-0 bg-[#00000080] z-50 cursor-default bg-opacity-50 flex items-center justify-center"
          onClick={() => {
            setSelectedNote(null);
            setNoteText("");
            setIsModalEditing(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 p-4 rounded-lg w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              메모 작성
            </h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full h-32 p-2 border dark:border-gray-700 rounded mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none ring-0"
              placeholder="메모를 입력하세요..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleNoteDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                삭제
              </button>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setIsModalEditing(false);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleNoteConfirm}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteTooltip({ note }: { note: Note | undefined }) {
  if (!note) return <></>;
  return (
    <div
      className="absolute left-full z-50 bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 text-sm w-64"
      style={{
        left: `calc(${note.x}% + 32px)`,
        top: `calc(${note.y}%)`,
      }}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {(note.createdAt instanceof Date
          ? note.createdAt
          : note.createdAt.toDate()
        ).toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </div>
      <div className="whitespace-pre-line break-words text-gray-900 dark:text-white">
        {note.text}
      </div>
    </div>
  );
}
