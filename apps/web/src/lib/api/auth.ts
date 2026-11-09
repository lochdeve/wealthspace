import { apiRequest } from '@/lib/api/client';
import type { LoginInput, RegisterInput, UserProfile } from '@/lib/api/types';

export function register(data: RegisterInput): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/register', {
    method: 'POST',
    body: data,
  });
}

export function login(data: LoginInput): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/login', {
    method: 'POST',
    body: data,
  });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

export function getMe(cookieHeader: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/me', {
    method: 'GET',
    cookieHeader,
  });
}
