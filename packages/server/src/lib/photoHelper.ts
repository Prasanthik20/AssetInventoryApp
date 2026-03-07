// Photo Upload Helper Utility
// This file contains utility functions for handling photo uploads in the asset management system

/**
 * Validates if the provided string is a valid data URL (base64 image)
 * @param dataURL - The data URL string to validate
 * @returns boolean - true if valid, false otherwise
 */
export function isValidDataURL(dataURL: string): boolean {
  if (!dataURL || typeof dataURL !== 'string') return false;
  
  const dataURLPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
  return dataURLPattern.test(dataURL);
}

/**
 * Validates if the provided string is a valid HTTP/HTTPS URL
 * @param url - The URL string to validate
 * @returns boolean - true if valid, false otherwise
 */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates photo input (either data URL or HTTP URL)
 * @param photo - The photo string to validate
 * @returns object with isValid and type
 */
export function validatePhoto(photo: string | null | undefined): {
  isValid: boolean;
  type: 'dataURL' | 'url' | null;
  error?: string;
} {
  if (!photo) {
    return { isValid: true, type: null }; // Photo is optional
  }

  if (isValidDataURL(photo)) {
    return { isValid: true, type: 'dataURL' };
  }

  if (isValidURL(photo)) {
    return { isValid: true, type: 'url' };
  }

  return { 
    isValid: false, 
    type: null, 
    error: 'Invalid photo format. Must be a valid data URL or HTTP/HTTPS URL' 
  };
}

/**
 * Compresses a base64 image string
 * @param base64String - The base64 image string
 * @param maxWidth - Maximum width (default: 1200px)
 * @param quality - Image quality 0-1 (default: 0.8)
 * @returns Promise<string> - Compressed base64 string
 */
export async function compressBase64Image(
  base64String: string,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> {
  // This is a placeholder for server-side image compression
  // You may want to use libraries like 'sharp' for server-side compression
  // For now, we'll just return the original string
  return base64String;
}

/**
 * Gets the file size of a base64 string in bytes
 * @param base64String - The base64 string
 * @returns number - Size in bytes
 */
export function getBase64Size(base64String: string): number {
  if (!base64String) return 0;
  
  // Remove data URL prefix if present
  const base64 = base64String.split(',')[1] || base64String;
  
  // Calculate size: (base64 length * 3) / 4
  const padding = (base64.match(/=/g) || []).length;
  return (base64.length * 3) / 4 - padding;
}

/**
 * Formats bytes to human readable format
 * @param bytes - Number of bytes
 * @returns string - Formatted string (e.g., "2.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Maximum allowed file size (5MB in bytes)
 */
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * Validates photo size
 * @param photoURL - The photo URL or base64 string
 * @returns object with isValid and error message
 */
export function validatePhotoSize(photoURL: string): {
  isValid: boolean;
  size: number;
  formattedSize: string;
  error?: string;
} {
  const size = getBase64Size(photoURL);
  const formattedSize = formatBytes(size);
  
  if (size > MAX_PHOTO_SIZE) {
    return {
      isValid: false,
      size,
      formattedSize,
      error: `Photo size (${formattedSize}) exceeds maximum allowed size (${formatBytes(MAX_PHOTO_SIZE)})`
    };
  }
  
  return {
    isValid: true,
    size,
    formattedSize
  };
}
