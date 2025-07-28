// API型定義ファイル
// any型を排除し、型安全なAPI通信を実現

export interface ProductResponse {
  id: string;
  name?: string;
  product_name?: string;
  description?: string;
  company?: string;
  type?: string;
  product_type?: string;
  risk_level?: string;
  expected_return?: string;
  minimum_investment?: number;
  tags?: string[];
  url?: string;
  detail_url?: string;
  application_url?: string;
  apply_url?: string;
  recommendation_reasons?: string[];
}

export interface DiagnosisRequestData {
  age: string;
  experience: string;
  purpose: string;
  amount: string;
  timing: string;
  phone?: string;
}

export interface SMSResponse {
  success: boolean;
  message: string;
  sid?: string;
  to?: string;
  status?: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered';
  error_code?: string;
  error_message?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  isValid?: boolean;
  attempts?: number;
  maxAttempts?: number;
  error?: string;
}

export interface AdminCredentials {
  id: string;
  username: string;
  email?: string;
  phone_number?: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  login_attempts: number;
  locked_until?: string;
  requires_password_change: boolean;
}

export interface SecureConfigData {
  key: string;
  value: string;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

// エラー型定義
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface SMSError extends AppError {
  rateLimitExceeded?: boolean;
  retryAfter?: number;
  sid?: string;
}

export interface ValidationError extends AppError {
  field?: string;
  value?: string;
}

export interface AuthError extends AppError {
  type: 'invalid_credentials' | 'account_locked' | 'session_expired' | 'unauthorized';
  remainingAttempts?: number;
  lockoutTime?: number;
}

// API レスポンス型のユニオン
export type APIResponse<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

// 管理機能関連
export interface DesignSettings {
  id: string;
  template: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  timestamp: string;
  phoneNumber: string;
  userName?: string;
  email?: string;
  diagnosisAnswers: DiagnosisRequestData;
  diagnosisResult?: ProductResponse[];
  notes?: string;
  smsVerified?: boolean;
  verifiedPhoneNumber?: string;
  verificationTimestamp?: string;
}

// ページネーション
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// リアルタイム更新
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// Supabase関連
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseUser;
}

// 型ガード関数
export function isProductResponse(obj: unknown): obj is ProductResponse {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj &&
         typeof (obj as ProductResponse).id === 'string';
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && 
         error !== null && 
         'message' in error && 
         typeof (error as AppError).message === 'string';
}

export function isSMSError(error: unknown): error is SMSError {
  return isAppError(error) && 
         ('rateLimitExceeded' in error || 'retryAfter' in error);
}

export function isAuthError(error: unknown): error is AuthError {
  return isAppError(error) && 
         'type' in error &&
         typeof (error as AuthError).type === 'string';
}

export function isValidationError(error: unknown): error is ValidationError {
  return isAppError(error) && 
         ('field' in error || 'value' in error);
}

export function isAPIResponse<T>(obj: unknown): obj is APIResponse<T> {
  return typeof obj === 'object' && 
         obj !== null && 
         'success' in obj &&
         typeof (obj as APIResponse<T>).success === 'boolean';
}