// 型ガード関数集
// any型を削減し、型安全なコードを実現するためのユーティリティ

import { 
  ProductResponse, 
  AppError, 
  SMSError, 
  AuthError, 
  ValidationError,
  APIResponse,
  UserSession,
  DiagnosisRequestData
} from '../types/api';

// 基本的な型ガード
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown, guard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!guard) return true;
  return value.every(guard);
}

// API関連の型ガード
export function isProductResponse(obj: unknown): obj is ProductResponse {
  return isObject(obj) && 
         isString(obj.id) &&
         (obj.name === undefined || isString(obj.name)) &&
         (obj.product_name === undefined || isString(obj.product_name));
}

export function isProductResponseArray(obj: unknown): obj is ProductResponse[] {
  return isArray(obj, isProductResponse);
}

export function isDiagnosisRequestData(obj: unknown): obj is DiagnosisRequestData {
  return isObject(obj) &&
         isString(obj.age) &&
         isString(obj.experience) &&
         isString(obj.purpose) &&
         isString(obj.amount) &&
         isString(obj.timing) &&
         (obj.phone === undefined || isString(obj.phone));
}

export function isUserSession(obj: unknown): obj is UserSession {
  return isObject(obj) &&
         isString(obj.id) &&
         isString(obj.timestamp) &&
         isString(obj.phoneNumber) &&
         isDiagnosisRequestData(obj.diagnosisAnswers);
}

// エラー型ガード
export function isAppError(error: unknown): error is AppError {
  return isObject(error) && 
         isString(error.message) &&
         (error.code === undefined || isString(error.code));
}

export function isSMSError(error: unknown): error is SMSError {
  return isAppError(error) && 
         (error.rateLimitExceeded === undefined || isBoolean(error.rateLimitExceeded)) &&
         (error.retryAfter === undefined || isNumber(error.retryAfter));
}

export function isAuthError(error: unknown): error is AuthError {
  return isAppError(error) && 
         isString(error.type) &&
         ['invalid_credentials', 'account_locked', 'session_expired', 'unauthorized'].includes(error.type);
}

export function isValidationError(error: unknown): error is ValidationError {
  return isAppError(error) && 
         (error.field === undefined || isString(error.field)) &&
         (error.value === undefined || isString(error.value));
}

// API レスポンス型ガード
export function isAPIResponse<T>(
  obj: unknown, 
  dataGuard?: (data: unknown) => data is T
): obj is APIResponse<T> {
  if (!isObject(obj) || !isBoolean(obj.success)) {
    return false;
  }
  
  if (obj.success) {
    return !dataGuard || dataGuard(obj.data);
  } else {
    return isAppError(obj.error);
  }
}

// DOM要素型ガード
export function isHTMLElement(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement;
}

export function isHTMLInputElement(element: unknown): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

export function isHTMLFormElement(element: unknown): element is HTMLFormElement {
  return element instanceof HTMLFormElement;
}

export function isHTMLButtonElement(element: unknown): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

// イベント型ガード
export function isMouseEvent(event: unknown): event is MouseEvent {
  return event instanceof MouseEvent;
}

export function isKeyboardEvent(event: unknown): event is KeyboardEvent {
  return event instanceof KeyboardEvent;
}

export function isFocusEvent(event: unknown): event is FocusEvent {
  return event instanceof FocusEvent;
}

export function isChangeEvent(event: unknown): event is Event & { target: HTMLInputElement } {
  return event instanceof Event && 
         event.target instanceof HTMLInputElement;
}

// 環境変数型ガード
export function hasRequiredEnvVars(env: unknown): env is Record<string, string> {
  return isObject(env) &&
         isString(env.VITE_SUPABASE_URL) &&
         isString(env.VITE_SUPABASE_ANON_KEY);
}

// ブラウザ機能検出
export function hasIntersectionObserver(): boolean {
  return typeof window !== 'undefined' && 
         'IntersectionObserver' in window;
}

export function hasResizeObserver(): boolean {
  return typeof window !== 'undefined' && 
         'ResizeObserver' in window;
}

export function hasServiceWorker(): boolean {
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator;
}

export function hasCryptoJS(): boolean {
  return typeof window !== 'undefined' && 
         'CryptoJS' in window &&
         window.CryptoJS !== undefined;
}

// localStorage機能を無効化（セキュリティのため）
export function safeGetLocalStorage(key: string): string | null {
  return null;
}

export function safeSetLocalStorage(key: string, value: string): boolean {
  return false;
}

export function safeParseJSON<T>(
  jsonString: string, 
  guard?: (obj: unknown) => obj is T
): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    return guard ? (guard(parsed) ? parsed : null) : parsed;
  } catch {
    return null;
  }
}

// Promise型ガード
export function isPromise<T>(obj: unknown): obj is Promise<T> {
  return obj instanceof Promise ||
         (isObject(obj) && typeof obj.then === 'function');
}

// 非同期関数型ガード
export function isAsyncFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
  return typeof fn === 'function' && 
         fn.constructor.name === 'AsyncFunction';
}

// Union型のnarrow化ヘルパー
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// 条件付き型ガード
export function isDefinedAndNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isEmpty(value: string | null | undefined): value is '' | null | undefined {
  return !value || value.trim() === '';
}

export function isNotEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
}

// 配列操作での型安全性
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefinedAndNotNull);
}

export function findSafe<T>(
  array: T[], 
  predicate: (item: T) => boolean
): T | undefined {
  return array.find(predicate);
}

// 型安全なオブジェクトアクセス
export function hasProperty<T extends Record<string, unknown>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function getProperty<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  return obj[key];
}

// 型安全なassertion関数
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertIsString(value: unknown, message?: string): asserts value is string {
  assert(isString(value), message || 'Expected string');
}

export function assertIsNumber(value: unknown, message?: string): asserts value is number {
  assert(isNumber(value), message || 'Expected number');
}

export function assertIsObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  assert(isObject(value), message || 'Expected object');
}