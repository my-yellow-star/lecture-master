import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { FileItem, Note } from "@/types/auth";

// 파일 시스템 관련 함수들
export const createFolder = async (
  name: string,
  parentId: string | null,
  userId: string
) => {
  const folderData: Omit<FileItem, "id"> = {
    name,
    type: "folder",
    parentId,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(collection(db, "files"), folderData);
  return { id: docRef.id, ...folderData };
};

export const uploadFile = async (
  file: File,
  parentId: string | null,
  userId: string
) => {
  const storageRef = ref(storage, `files/${userId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);

  const fileData: Omit<FileItem, "id"> = {
    name: file.name,
    type: "file",
    parentId,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    fileUrl,
    fileSize: file.size,
    fileType: file.type,
  };

  const docRef = await addDoc(collection(db, "files"), fileData);
  return { id: docRef.id, ...fileData };
};

export const getFiles = async (parentId: string | null, userId: string) => {
  const q = query(
    collection(db, "files"),
    where("userId", "==", userId),
    where("parentId", "==", parentId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FileItem[];
};

export const deleteFile = async (fileId: string, userId: string) => {
  const fileRef = doc(db, "files", fileId);
  const fileDoc = await getDoc(fileRef);

  if (fileDoc.exists()) {
    const fileData = fileDoc.data() as FileItem;
    if (fileData.userId !== userId) {
      throw new Error("Unauthorized");
    }

    if (fileData.type === "file" && fileData.fileUrl) {
      const storageRef = ref(storage, fileData.fileUrl);
      await deleteObject(storageRef);
    }

    await deleteDoc(fileRef);
  }
};

// 메모 관련 함수들
export const createNote = async (
  noteData: Omit<Note, "id" | "createdAt" | "updatedAt">
) => {
  const note: Omit<Note, "id"> = {
    ...noteData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(collection(db, "notes"), note);
  return { id: docRef.id, ...note };
};

export const getNotes = async (fileId: string, userId: string) => {
  const q = query(
    collection(db, "notes"),
    where("fileId", "==", fileId),
    where("userId", "==", userId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Note[];
};

export const updateNote = async (
  noteId: string,
  text: string,
  userId: string
) => {
  const noteRef = doc(db, "notes", noteId);
  const noteDoc = await getDoc(noteRef);

  if (noteDoc.exists()) {
    const noteData = noteDoc.data() as Note;
    if (noteData.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await updateDoc(noteRef, {
      text,
      updatedAt: new Date(),
    });
  }
};

export const deleteNote = async (noteId: string, userId: string) => {
  const noteRef = doc(db, "notes", noteId);
  const noteDoc = await getDoc(noteRef);

  if (noteDoc.exists()) {
    const noteData = noteDoc.data() as Note;
    if (noteData.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await deleteDoc(noteRef);
  }
};
