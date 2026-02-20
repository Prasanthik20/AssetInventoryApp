import { Platform } from 'react-native';
 
/**
* API Configuration for Multi-Platform Access
*
* Supports:
* - React Native (iOS/Android)
* - React Native Web
* - Web Browser
*/
 
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000',
    timeout: 30000,
  },
 staging: {
    apiUrl: 'https://asset-api-anbfahfmdjh6bzap.southindia-01.azurewebsites.net',
    wsUrl: 'wss://asset-api-anbfahfmdjh6bzap.southindia-01.azurewebsites.net',
    timeout: 30000,
  },
  prod: {
    apiUrl: 'https://asset-api-anbfahfmdjh6bzap.southindia-01.azurewebsites.net',
    wsUrl: 'wss://asset-api-anbfahfmdjh6bzap.southindia-01.azurewebsites.net',
    timeout: 30000,
  },
};
 
// Determine environment
const getEnv = () => {
  if (__DEV__) {
    return ENV.dev;
  }
  // Check build type or use staging/prod based on app config
  return ENV.prod;
};
 
// Platform-specific configuration
const getPlatformConfig = () => {
  if (Platform.OS === 'web') {
    // Web: Use relative URLs (same domain)
    return {
      apiUrl: process.env.REACT_APP_API_URL || '/api',
      timeout: 30000,
    };
  }
 
  // Mobile (Android/iOS): Use full URLs
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // For local development: use device IP
    // For production: use Azure backend
    const isDev = __DEV__;
    return {
      apiUrl: isDev ? 'http://192.168.1.100:3000' : getEnv().apiUrl,
      timeout: 30000,
    };
  }
 
  return getEnv();
};
 
export const API_CONFIG = {
  BASE_URL: getPlatformConfig().apiUrl,
  TIMEOUT: getPlatformConfig().timeout || 30000,
  
  // API Endpoints
  ENDPOINTS: {
    // Auth
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_REFRESH: '/api/auth/refresh',
    
    // Users
    USERS: '/api/users',
    USER_PROFILE: '/api/users/profile',
    
    // Assets
    ASSETS: '/api/assets',
    ASSET_DETAILS: '/api/assets/:id',
    ASSET_ASSIGN: '/api/assets/:id/assign',
    ASSET_RETURN: '/api/assets/:id/return',
    
    // Dashboard
    DASHBOARD: '/api/dashboard',
    DASHBOARD_STATS: '/api/dashboard/stats',
    
    // Categories
    CATEGORIES: '/api/categories',
    
    // Status
    STATUSES: '/api/statuses',
  },
 
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_MULTIPLIER: 2,
    INITIAL_DELAY: 1000,
  },
 
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
 
/**
* Build full endpoint URL
* @param endpoint - The endpoint path
* @param params - URL parameters for substitution
* @returns Full URL
*/
export const buildUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
 
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });
  }
 
  return url;
};
 
/**
* Get headers with auth token
* @param token - Authorization token
* @returns Headers object
*/
export const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = { ...API_CONFIG.DEFAULT_HEADERS };
 
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
 
  return headers;
};
 
/**
* Get platform info for debugging
*/
export const getPlatformInfo = () => ({
  platform: Platform.OS,
  isDev: __DEV__,
  apiUrl: API_CONFIG.BASE_URL,
  userAgent: Platform.OS === 'web' ? navigator.userAgent : `AssetApp/${Platform.OS}`,
});
 
export default API_CONFIG;
 
 