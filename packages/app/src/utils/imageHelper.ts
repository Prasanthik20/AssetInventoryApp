import { Platform } from 'react-native';
import { cacheDirectory, copyAsync, readAsStringAsync, deleteAsync } from 'expo-file-system/legacy';

export const inferMimeType = (uri: string, explicitMimeType?: string): string => {
  if (explicitMimeType) return explicitMimeType;

  const cleanUri = uri.split('?')[0].toLowerCase();
  if (cleanUri.endsWith('.png')) return 'image/png';
  if (cleanUri.endsWith('.webp')) return 'image/webp';
  if (cleanUri.endsWith('.heic')) return 'image/heic';
  if (cleanUri.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

export const toPersistentDataUrl = async (uri: string, mimeType?: string): Promise<string> => {
  if (!uri) return '';
  if (uri.startsWith('data:')) return uri;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  const resolvedMimeType = inferMimeType(uri, mimeType);

  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = uri;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(uri);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        } catch (e) {
          console.warn('Canvas compression failed, falling back to original:', e);
          resolve(uri);
        }
      };
      img.onerror = () => {
        resolve(uri); // fallback to original uri
      };
    });
  }

  // Android/iOS:
  // Copy the content provider or external URI to app cache folder first.
  // This bypasses Android Scoped Storage / Content Provider permission issues.
  const filename = uri.split('/').pop() || `temp_image_${Date.now()}`;
  const cleanFilename = filename.includes('.') ? filename : `${filename}.jpg`;
  const cacheUri = `${cacheDirectory}${cleanFilename}`;

  try {
    await copyAsync({
      from: uri,
      to: cacheUri,
    });

    const base64 = await readAsStringAsync(cacheUri, {
      encoding: 'base64' as any,
    });

    // Clean up temporary cache file
    try {
      await deleteAsync(cacheUri, { idempotent: true });
    } catch (e) {
      console.warn('Could not clean up cached image picker file:', e);
    }

    return `data:${resolvedMimeType};base64,${base64}`;
  } catch (error) {
    console.warn('Cache copy failed, attempting direct read:', error);
    try {
      const base64 = await readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      return `data:${resolvedMimeType};base64,${base64}`;
    } catch (directError) {
      console.error('Direct read failed as well:', directError);
      throw directError;
    }
  }
};
