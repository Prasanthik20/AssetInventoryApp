import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, buildUrl } from 'src/config/api';

/**
 * API Service with automatic token refresh, retry logic, and error handling
 * Works across web and mobile platforms
 */

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.DEFAULT_HEADERS,
    });

    // Request interceptor: add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle token refresh and errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleResponseError(error)
    );
  }

  /**
   * Get stored auth token
   */
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch {
      return null;
    }
  }

  /**
   * Save auth token
   */
  public async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Remove auth token (logout)
   */
  public async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  /**
   * Subscribe to token refresh
   */
  private subscribeTokenRefresh(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify all subscribers of new token
   */
  private notifyTokenRefresh(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Handle response errors with auto-retry and token refresh
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (this.isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve) => {
          this.subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(this.client(originalRequest) as Promise<never>);
          });
        });
      }

      this.isRefreshing = true;
      originalRequest._retry = 1;

      try {
        const response = await this.client.post(API_CONFIG.ENDPOINTS.AUTH_REFRESH);
        const { token } = response.data;

        await this.setToken(token);
        this.notifyTokenRefresh(token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        return this.client(originalRequest) as Promise<never>;
      } catch (refreshError) {
        // Refresh failed, logout user
        await this.removeToken();
        // Trigger logout action here (depends on your state management)
        return Promise.reject(refreshError);
      } finally {
        this.isRefreshing = false;
      }
    }

    // Handle other errors with retry logic
    if (this.shouldRetry(error)) {
      const retryCount = originalRequest._retry || 0;
      if (retryCount < API_CONFIG.RETRY.MAX_ATTEMPTS) {
        originalRequest._retry = retryCount + 1;

        const delay = API_CONFIG.RETRY.INITIAL_DELAY *
          Math.pow(API_CONFIG.RETRY.BACKOFF_MULTIPLIER, retryCount);

        await this.sleep(delay);
        return this.client(originalRequest) as Promise<never>;
      }
    }

    return Promise.reject(this.formatError(error));
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    const status = error.response?.status;

    // Retry on network errors or 5xx status codes
    if (!error.response) {
      return true;
    }

    // Retry on specific 5xx errors (but not 501)
    return status === 503 || status === 504 || status === 408;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format error response for consistent error handling
   */
  private formatError(error: AxiosError) {
    return {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      originalError: error,
    };
  }

  /**
   * GET request
   */
  public async get(endpoint: string, config?: AxiosRequestConfig) {
    return this.client.get(buildUrl(endpoint), config);
  }

  /**
   * POST request
   */
  public async post(endpoint: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(buildUrl(endpoint), data, config);
  }

  /**
   * PUT request
   */
  public async put(endpoint: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(buildUrl(endpoint), data, config);
  }

  /**
   * PATCH request
   */
  public async patch(endpoint: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch(buildUrl(endpoint), data, config);
  }

  /**
   * DELETE request
   */
  public async delete(endpoint: string, config?: AxiosRequestConfig) {
    return this.client.delete(buildUrl(endpoint), config);
  }

  /**
   * Get axios instance for advanced usage
   */
  public getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiService = new ApiService();

export default apiService;
