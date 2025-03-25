"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileItem } from "@/types/auth";
import {
  getFiles,
  moveFile,
  getFileById,
  getParentFolder,
  deleteFile,
} from "@/utils/firebase";
import FileList from "@/components/files/FileList";
import FileToolbar from "@/components/files/FileToolbar";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Breadcrumb from "@/components/files/Breadcrumb";

export default function FilesPage() {
  const { data: session, status } = useSession();
  const [currentFolder, setCurrentFolder] = useState<FileItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [parentFolder, setParentFolder] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const loadParentFolder = async () => {
      if (currentFolderId && session?.user?.id) {
        try {
          const parent = await getParentFolder(
            currentFolderId,
            session.user.id
          );
          setParentFolder(parent);
        } catch (error) {
          console.error("부모 폴더 로드 중 오류 발생:", error);
          setParentFolder(null);
        }
      } else {
        setParentFolder(null);
      }
    };

    loadParentFolder();
  }, [currentFolderId, session?.user.id]);

  useEffect(() => {
    const loadFiles = async () => {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          const loadedFiles = await getFiles(
            currentFolderId ?? null,
            session.user.id
          );
          setFiles(loadedFiles);
          if (currentFolderId) {
            const folder = await getFileById(currentFolderId, session.user.id);
            setCurrentFolder(folder ?? null);
          } else {
            setCurrentFolder(null);
          }
        } catch (error) {
          console.error("파일 로드 중 오류 발생:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadFiles();
  }, [currentFolderId, session?.user?.id]);

  const handleFileMove = async (
    fileId: string,
    targetFolderId: string | null
  ) => {
    if (!session?.user?.id) return;

    try {
      await moveFile(fileId, targetFolderId, session.user.id);
      const updatedFiles = await getFiles(
        currentFolderId ?? null,
        session.user.id
      );
      setFiles(updatedFiles);
    } catch (error) {
      console.error("파일 이동 중 오류 발생:", error);
    }
  };

  const handleFolderClick = async (folderId: string | null) => {
    if (!session?.user?.id) return;

    setCurrentFolderId(folderId);
    if (folderId) {
      const folder = await getFileById(folderId, session.user.id);
      setCurrentFolder(folder);
    } else {
      setCurrentFolder(null);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!session?.user?.id) return;

    try {
      await deleteFile(fileId, session.user.id);
      const updatedFiles = await getFiles(
        currentFolderId ?? null,
        session.user.id
      );
      setFiles(updatedFiles);
    } catch (error) {
      console.error("파일 삭제 중 오류 발생:", error);
    }
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
    <div className="container mx-auto p-4">
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        <Header title="내 파일" />
        <Breadcrumb
          currentFolder={currentFolder}
          onFolderClick={handleFolderClick}
        />
        <FileToolbar
          currentFolderId={currentFolderId ?? null}
          onFileUploaded={() => {
            if (session.user?.id) {
              getFiles(currentFolderId ?? null, session.user.id).then(setFiles);
            }
          }}
        />
        <div className="flex-1 mt-4">
          <FileList
            files={files}
            currentFolderId={currentFolderId}
            parentFolder={parentFolder}
            onFolderClick={handleFolderClick}
            onFileClick={(file) => {
              if (file.type === "file" && file.fileType === "application/pdf") {
                router.push(`/editor/${file.id}`);
              }
            }}
            onFileMove={handleFileMove}
            onFileDelete={handleFileDelete}
          />
        </div>
      </div>
    </div>
  );
}
