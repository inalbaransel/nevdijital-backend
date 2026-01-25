// Type definitions for API requests and responses

export interface CreateGroupDTO {
  department: string;
  classLevel: number;
}

export interface CreateUserDTO {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  department: string;
  classLevel: number;
  studentNo?: string;
}

export interface SendMessageDTO {
  text: string;
  userId: string;
  groupId: string;
}

export interface UploadFileDTO {
  fileName: string;
  fileType: "MUSIC" | "NOTE" | "IMAGE" | "DOCUMENT";
  groupId: string;
  userId: string;
  musicTitle?: string;
  musicUrl?: string;
}

export interface MessageResponse {
  id: string;
  text: string;
  userId: string;
  groupId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    photoURL: string | null;
    uid: string;
  };
}

export interface FileResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  likes: number;
  userId: string;
  groupId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    photoURL: string | null;
  };
}
