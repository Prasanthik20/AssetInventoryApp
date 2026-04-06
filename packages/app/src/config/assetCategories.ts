import axios from 'axios';
import { baseURL } from 'src/navigation/types';

type CategoryApiItem = {
  category?: string;
};

export const ASSET_CATEGORIES = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${baseURL}/api/categories`);
    const payload = response.data?.categories || response.data || [];
    return (Array.isArray(payload) ? payload : [])
      .map((item: CategoryApiItem | string) =>
        typeof item === 'string' ? item.trim() : String(item?.category || '').trim(),
      )
      .filter(Boolean);
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    return [];
  }
};

export const ASSET_CATEGORIES_WITH_ALL = async (): Promise<string[]> => {
  const categories = await ASSET_CATEGORIES();
  return ['All Categories', ...categories];
};
