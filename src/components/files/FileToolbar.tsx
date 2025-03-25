import { useState } from "react";
import { useSession } from "next-auth/react";
import { createFolder, uploadFile } from "@/utils/firebase";

interface FileToolbarProps {
  currentFolderId: string | null;
  onFileUploaded: () => void;
}

export default function FileToolbar({
  currentFolderId,
  onFileUploaded,
}: FileToolbarProps) {
  const { data: session } = useSession();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

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
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id) return;

    try {
      await uploadFile(file, currentFolderId, session.user.id);
      onFileUploaded();
    } catch (error) {
      console.error("파일 업로드 중 오류 발생:", error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
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
        <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer">
          파일 업로드
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf"
          />
        </label>
      </div>
    </div>
  );
}
