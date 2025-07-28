import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isConnected: boolean;
  error: string | null;
}

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isConnected: false,
  error: null
});

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

interface SupabaseProviderProps {
  children: React.ReactNode;
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSupabase = async () => {
      try {
        // 環境変数の安全な取得
        const getEnvVar = (viteVar: string, fallback: string) => {
          if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) {
            const value = (import.meta as any).env[viteVar];
            if (value) return value;
          }
          
          if (typeof process !== 'undefined' && process.env) {
            const value = process.env[viteVar];
            if (value) return value;
          }
          
          return fallback;
        };

        const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', '');
        const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY', '');

        const isProduction = typeof window !== 'undefined' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1';

        if (isProduction && !supabaseKey) {
          setError('Supabase configuration is missing in production');
          setIsConnected(false);
          return;
        }

        if (!supabaseKey && !isProduction) {
          setError('Supabase configuration is missing in development');
          setIsConnected(false);
          return;
        }

        const client = createClient(supabaseUrl, supabaseKey);
        
        // 接続テスト
        const { data, error: testError } = await client
          .from('admin_credentials')
          .select('count', { count: 'exact', head: true })
          .limit(0);

        if (testError && testError.message.includes('relation') === false) {
          setError('Supabaseへの接続に失敗しました');
          setIsConnected(false);
        } else {
          setSupabase(client);
          setIsConnected(true);
          setError(null);
        }
      } catch (initError) {
        setError('Supabaseの初期化に失敗しました');
        setIsConnected(false);
      }
    };

    initSupabase();
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, isConnected, error }}>
      {children}
    </SupabaseContext.Provider>
  );
};