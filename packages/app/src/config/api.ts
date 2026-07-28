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
    // 10.0.2.2 = host machine from Android emulator; use LAN IP (e.g. 192.168.0.6) for physical device
    apiUrl: 'http://localhost:3000',//'http://10.0.2.2:3000',
    wsUrl: 'ws://10.0.2.2:3000',
    timeout: 30000,
  },
  staging: {
    apiUrl: 'https://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
    wsUrl: 'ws://localhost:3000',//'wss://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
    timeout: 30000,
  },
  prod: {
    apiUrl: 'https://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
    wsUrl: 'ws://localhost:3000', //'wss://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net',
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
    // Web: during development, point directly to local API for consistency.
    return {
      apiUrl: __DEV__ ? 'http://localhost:3000' : (process.env.REACT_APP_API_URL || '/api'),
      timeout: 30000,
    };
  }

  // Mobile (Android/iOS): Use full URLs
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // For local development: use device IP
    // For production: use Azure backend
    const isDev = __DEV__;
    return {
      apiUrl: getEnv().apiUrl,
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
    DASHBOARD: '/api/dashboard/metrics',
    DASHBOARD_STATS: '/api/dashboard/metrics',

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

export const getPlatformInfo = () => ({
  platform: Platform.OS,
  isDev: __DEV__,
  apiUrl: API_CONFIG.BASE_URL,
  userAgent: Platform.OS === 'web' ? navigator.userAgent : `AssetApp/${Platform.OS}`,
});

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global Axios Interceptor to automatically attach the Auth token
axios.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token for API request', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API_CONFIG;
