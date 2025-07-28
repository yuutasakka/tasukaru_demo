/**
 * API仕様書に基づいた型安全なAPIクライアント
 * OpenAPI仕様書から自動生成される型定義を使用
 */

// APIレスポンスの基本型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 認証関連の型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// SMS認証関連の型
export interface SendSMSRequest {
  phoneNumber: string;
}

export interface VerifySMSRequest {
  phoneNumber: string;
  code: string;
}

export interface VerifySMSResponse {
  success: boolean;
  verified: boolean;
  message: string;
}

// 診断関連の型
export interface DiagnosisSubmitRequest {
  age: '20s' | '30s' | '40s' | '50s' | '60s';
  experience: 'beginner' | 'intermediate' | 'advanced';
  purpose: 'asset' | 'retirement' | 'education' | 'others';
  amount: 'under10k' | '10k-30k' | '30k-50k' | 'over50k';
  timing: 'now' | '3months' | '6months' | '1year';
  phoneNumber: string;
}

export interface DiagnosisResult {
  id: string;
  recommendedProducts: Product[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedReturns: {
    yearly: number;
    total: number;
  };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'stock' | 'bond' | 'fund' | 'etf';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  minInvestment: number;
}

// APIクライアントクラス
export class TaskalAPIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  
  constructor(baseURL: string = process.env.VITE_API_URL || '/api') {
    this.baseURL = baseURL;
  }

  // ヘッダーの生成
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Version': '1.0.0'
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  // エラーハンドリング
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'APIエラーが発生しました');
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data.data || data
    };
  }

  // 認証API
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });
    
    const result = await this.handleResponse<LoginResponse>(response);
    if (result.data?.tokens.accessToken) {
      this.accessToken = result.data.tokens.accessToken;
    }
    
    return result;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    
    this.accessToken = null;
    return this.handleResponse(response);
  }

  // SMS認証API
  async sendSMSCode(request: SendSMSRequest): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/sms/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }

  async verifySMSCode(request: VerifySMSRequest): Promise<ApiResponse<VerifySMSResponse>> {
    const response = await fetch(`${this.baseURL}/sms/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }

  // 診断API
  async submitDiagnosis(request: DiagnosisSubmitRequest): Promise<ApiResponse<DiagnosisResult>> {
    const response = await fetch(`${this.baseURL}/diagnosis/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }

  async getDiagnosisResult(id: string): Promise<ApiResponse<DiagnosisResult>> {
    const response = await fetch(`${this.baseURL}/diagnosis/results/${id}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    
    return this.handleResponse(response);
  }

  // 管理者API
  async getUsers(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    
    const response = await fetch(`${this.baseURL}/admin/users?${queryParams}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getAnalyticsSummary(): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/admin/analytics/summary`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    
    return this.handleResponse(response);
  }
}

// シングルトンインスタンス
export const apiClient = new TaskalAPIClient();