import { useState } from "react";
import { useSession } from "next-auth/react";
import { createFolder, uploadFile } from "@/utils/firebase";
import { toast } from "react-hot-toast";

interface FileToolbarProps {
  currentFolderId: string | null;
  onFileUploaded: () => void;
}

interface UploadProgress {
  fileName: string;
  fileSize: number;
  progress: number;
}

export default function FileToolbar({
  currentFolderId,
  onFileUploaded,
}: FileToolbarProps) {
  const { data: session } = useSession();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleCreateFolder = async () => {
    if (!session?.user?.id || !newFolderName.trim()) return;

    try {
      await createFolder(
        newFolderName.trim(),
        currentFolderId,
        session.user.id
      );
      setNewFolderName("");
      setIsCreatingFolder(false);
      onFileUploaded();
    } catch (error) {
      console.error("폴더 생성 중 오류 발생:", error);
      toast.error("폴더 생성에 실패했습니다.");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setUploadProgress({
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
    });

    try {
      await uploadFile(file, currentFolderId, session.user.id, (progress) => {
        setUploadProgress((prev) => (prev ? { ...prev, progress } : null));
      });
      setUploadProgress(null);
      onFileUploaded();
      toast.success("파일이 성공적으로 업로드되었습니다.");
    } catch (error) {
      console.error("파일 업로드 중 오류 발생:", error);
      toast.error("파일 업로드에 실패했습니다.");
      setUploadProgress(null);
    }
  };

  return (
    <div className="flex items-center gap-4 justify-end">
      <div>
        {isCreatingFolder ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="폴더 이름"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              생성
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName("");
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            새 폴더
          </button>
        )}
      </div>
      <div>
        {uploadProgress ? (
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex-1 min-w-[200px]">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {uploadProgress.fileName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {formatFileSize(uploadProgress.fileSize)}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {uploadProgress.progress}%
              </div>
            </div>
          </div>
        ) : (
          <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
            파일 업로드
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf"
            />
          </label>
        )}
      </div>
    </div>
  );
}
