export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
}

export interface Note {
  id: string;
  fileId: string;
  page: number;
  x: number;
  y: number;
  text: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
