export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiErrorBody {
  code: string;
  message: string | string[];
}
