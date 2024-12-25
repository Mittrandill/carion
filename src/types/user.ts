export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | null | undefined
  address?: string;
  city?: string;
  country?: string;
  companyName?: string;
  role?: string;
  avatarUrl?: string;
  created_at: string;
  updated_at: string;
}

export type NewUser = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUser = Partial<NewUser>;

export type ProfileData = Omit<User, 'id' | 'created_at' | 'updated_at'>;

export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type RegisterData = Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string };

export interface LoginCredentials {
  username: string;
  password: string;
}