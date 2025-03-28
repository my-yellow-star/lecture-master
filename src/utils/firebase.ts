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
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
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
  userId: string,
  onProgress?: (progress: number) => void
) => {
  const storageRef = ref(storage, `files/${userId}/${file.name}`);

  // 업로드 진행 상태 모니터링
  const uploadTask = uploadBytesResumable(storageRef, file);
  uploadTask.on(
    "state_changed",
    (snapshot: UploadTaskSnapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.(progress);
    },
    (error: Error) => {
      console.error("Upload error:", error);
      throw error;
    }
  );

  await uploadTask;
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

    // 폴더인 경우 하위 파일들도 모두 삭제
    if (fileData.type === "folder") {
      const subFiles = await getFiles(fileId, userId);
      for (const subFile of subFiles) {
        await deleteFile(subFile.id, userId);
      }
    }

    // 파일인 경우 스토리지에서도 삭제
    if (fileData.type === "file" && fileData.fileUrl) {
      const fileUrl = fileData.fileUrl;
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    }

    await deleteDoc(fileRef);
  }
};

export const moveFile = async (
  fileId: string,
  targetFolderId: string | null,
  userId: string
) => {
  const fileRef = doc(db, "files", fileId);
  const fileDoc = await getDoc(fileRef);

  if (fileDoc.exists()) {
    const fileData = fileDoc.data() as FileItem;
    if (fileData.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await updateDoc(fileRef, {
      parentId: targetFolderId,
      updatedAt: new Date(),
    });
  }
};

export const getFileById = async (fileId: string, userId: string) => {
  const fileRef = doc(db, "files", fileId);
  const fileDoc = await getDoc(fileRef);

  if (fileDoc.exists()) {
    const fileData = fileDoc.data() as FileItem;
    if (fileData.userId !== userId) {
      throw new Error("Unauthorized");
    }
    return { ...fileData, id: fileDoc.id };
  }
  return null;
};

export const getParentFolder = async (fileId: string, userId: string) => {
  // fileId를 기준으로 부모 폴더를 조회
  const fileRef = doc(db, "files", fileId);
  const fileDoc = await getDoc(fileRef);
  if (fileDoc.exists()) {
    const fileData = fileDoc.data() as FileItem;
    if (fileData.userId !== userId) {
      throw new Error("Unauthorized");
    }
    const parentId = fileData.parentId;
    if (parentId) {
      const parentRef = doc(db, "files", parentId);
      const parentDoc = await getDoc(parentRef);
      const parentData = parentDoc.data() as FileItem;
      return { ...parentData, id: parentDoc.id };
    }
    return null;
  }
  return null;
};

// 메모 관련 함수들
export const createNote = async (
  noteData: Omit<Note, "id" | "createdAt" | "updatedAt">
): Promise<Note> => {
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
  x: number,
  y: number,
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
      x,
      y,
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

export interface AnalysisResult {
  id: string;
  fileId: string;
  pageNumber: number;
  content: {
    core_summary: string;
    easy_explanation: string;
    examples_or_analogies: string;
    exam_points: string[];
    term_definitions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export async function saveAnalysis(
  fileId: string,
  pageNumber: number,
  content: {
    core_summary: string;
    easy_explanation: string;
    examples_or_analogies: string;
    exam_points: string[];
    term_definitions?: string[];
  },
  userId: string
): Promise<AnalysisResult> {
  const analysisRef = collection(db, "analysis");
  const now = new Date();

  const analysisData = {
    fileId,
    pageNumber,
    content,
    createdAt: now,
    updatedAt: now,
    userId,
  };

  const docRef = await addDoc(analysisRef, analysisData);
  return {
    id: docRef.id,
    ...analysisData,
  };
}

export const getAnalysis = async (
  fileId: string,
  pageNumber: number,
  userId: string
): Promise<AnalysisResult | null> => {
  const analysisRef = collection(db, "analyses");
  const q = query(
    analysisRef,
    where("fileId", "==", fileId),
    where("pageNumber", "==", pageNumber),
    where("userId", "==", userId)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as AnalysisResult;
};

export interface AIUsage {
  id: string;
  userId: string;
  remainingQuota: number;
  createdAt: Date;
  updatedAt: Date;
}

export const initializeAIUsage = async (userId: string): Promise<AIUsage> => {
  const usageRef = collection(db, "aiUsage");
  const newUsage = {
    userId,
    remainingQuota: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(usageRef, newUsage);
  return {
    id: docRef.id,
    ...newUsage,
  };
};

export const getAIUsage = async (userId: string): Promise<AIUsage | null> => {
  const usageRef = collection(db, "aiUsage");
  const q = query(usageRef, where("userId", "==", userId));

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as AIUsage;
};

export const decrementAIUsage = async (userId: string): Promise<AIUsage> => {
  const usageRef = collection(db, "aiUsage");
  const q = query(usageRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return initializeAIUsage(userId);
  }

  const doc = querySnapshot.docs[0];
  const currentUsage = doc.data() as AIUsage;

  if (currentUsage.remainingQuota <= 0) {
    throw new Error("AI 분석 사용량이 모두 소진되었습니다.");
  }

  await updateDoc(doc.ref, {
    remainingQuota: currentUsage.remainingQuota - 1,
    updatedAt: new Date(),
  });

  return {
    ...currentUsage,
    id: doc.id,
    remainingQuota: currentUsage.remainingQuota - 1,
    updatedAt: new Date(),
  };
};
