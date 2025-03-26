import { FileItem } from "@/types/auth";
import { formatFileSize } from "@/utils/format";
import { useState } from "react";

interface FileListProps {
  files: FileItem[];
  currentFolderId: string | null;
  parentFolder: FileItem | null;
  onFolderClick: (folderId: string | null) => void;
  onFileClick: (file: FileItem) => void;
  onFileMove: (fileId: string, targetFolderId: string | null) => void;
  onFileDelete: (fileId: string) => void;
}

export default function FileList({
  files,
  currentFolderId,
  parentFolder,
  onFolderClick,
  onFileClick,
  onFileMove,
  onFileDelete,
}: FileListProps) {
  const [draggedFile, setDraggedFile] = useState<FileItem | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const handleDragStart = (file: FileItem) => {
    if (file.type === "file") {
      setDraggedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent, file: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (file?.type === "file") return;
    if (
      !file ||
      (file?.type === "folder" && file.id !== draggedFile?.parentId)
    ) {
      setDragOverFolder(file?.id ?? null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, targetFile: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    if (targetFile?.type === "file") return;
    if (
      draggedFile &&
      (!targetFile ||
        (targetFile?.type === "folder" &&
          targetFile.id !== draggedFile.parentId))
    ) {
      onFileMove(draggedFile.id, targetFile?.id ?? null);
    }
    setDraggedFile(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    setFileToDelete(file);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      onFileDelete(fileToDelete.id);
      setFileToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setFileToDelete(null);
  };

  // 파일 정렬
  const sortedFiles = [...files].sort((a, b) => {
    // 폴더가 먼저
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;

    // 같은 타입일 경우 updatedAt 기준 내림차순
    const aDate =
      a.updatedAt instanceof Date ? a.updatedAt : a.updatedAt.toDate();
    const bDate =
      b.updatedAt instanceof Date ? b.updatedAt : b.updatedAt.toDate();
    return bDate.getTime() - aDate.getTime();
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {currentFolderId && (
          <div
            className={`flex items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
              dragOverFolder === (parentFolder?.id ?? "root")
                ? "border-2 border-dashed border-blue-500"
                : "border-2 border-dashed border-transparent"
            }`}
            onClick={() => onFolderClick(parentFolder?.id ?? null)}
            onDragOver={(e) =>
              handleDragOver(
                e,
                parentFolder
                  ? {
                      id: parentFolder.id,
                      type: "folder",
                      name: "상위 폴더",
                      parentId: null,
                      userId: "",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    }
                  : null
              )
            }
            onDragLeave={handleDragLeave}
            onDrop={(e) =>
              handleDrop(
                e,
                parentFolder
                  ? {
                      id: parentFolder.id,
                      type: "folder",
                      name: "상위 폴더",
                      parentId: null,
                      userId: "",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    }
                  : null
              )
            }
          >
            <span className="text-2xl">📁</span>
            <span className="text-gray-900 dark:text-white">..</span>
          </div>
        )}
        {sortedFiles.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
              dragOverFolder === file.id
                ? "border-2 border-dashed border-blue-500"
                : "border-2 border-dashed border-transparent"
            }`}
            onClick={() =>
              file.type === "folder"
                ? onFolderClick(file.id)
                : onFileClick(file)
            }
            draggable={file.type === "file"}
            onDragStart={() => handleDragStart(file)}
            onDragOver={(e) => handleDragOver(e, file)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, file)}
          >
            <span className="text-2xl">
              {file.type === "folder" ? "📁" : "📄"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {file.name}
              </div>
              {file.type === "file" && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.fileSize || 0)}
                </div>
              )}
            </div>
            <button
              onClick={(e) => handleDeleteClick(e, file)}
              className="p-1 group-hover:block hidden text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 삭제 확인 모달 */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-[#00000080] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {fileToDelete.type === "folder" ? "폴더" : "파일"} 삭제
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              &quot;{fileToDelete.name}&quot;을(를) 삭제하시겠습니까?
              {fileToDelete.type === "folder" &&
                " 폴더 내의 모든 파일도 함께 삭제됩니다."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
