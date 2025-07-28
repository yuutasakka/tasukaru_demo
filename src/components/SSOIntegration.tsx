// Google Workspace / Microsoft Azure AD連携の基盤
interface SSOProvider {
  id: string;
  name: string;
  authUrl: string;
  clientId: string;
  scopes: string[];
}

const SSOProviders: SSOProvider[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    authUrl: 'https://accounts.google.com/oauth/authorize',
    clientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
    scopes: ['openid', 'email', 'profile']
  },
  {
    id: 'microsoft',
    name: 'Microsoft Azure AD',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId: process.env.VITE_MICROSOFT_CLIENT_ID || '',
    scopes: ['openid', 'email', 'profile']
  }
]; 