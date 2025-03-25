import { FileItem } from "@/types/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

interface BreadcrumbProps {
  currentFolder: FileItem | null;
  onFolderClick: (folderId: string | null) => void;
}

export default function Breadcrumb({
  currentFolder,
  onFolderClick,
}: BreadcrumbProps) {
  const getFolderPath = async (
    folder: FileItem | null
  ): Promise<FileItem[]> => {
    const path: FileItem[] = [];
    let current = folder;

    while (current) {
      path.unshift(current);
      if (current.parentId) {
        const parentDoc = await getDoc(doc(db, "files", current.parentId));
        if (parentDoc.exists()) {
          current = { id: parentDoc.id, ...parentDoc.data() } as FileItem;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return path;
  };

  const [folderPath, setFolderPath] = useState<FileItem[]>([]);

  useEffect(() => {
    getFolderPath(currentFolder).then(setFolderPath);
  }, [currentFolder]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      <button
        onClick={() => onFolderClick(null)}
        className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        홈
      </button>
      {folderPath.map((folder: FileItem, index: number) => (
        <div key={folder.id} className="flex items-center gap-2">
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <button
            onClick={() => onFolderClick(folder.id)}
            className={`hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${
              index === folderPath.length - 1
                ? "text-gray-900 dark:text-white font-medium"
                : ""
            }`}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </div>
  );
}
