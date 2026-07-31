import { useState, useCallback } from 'react';
import axios from 'axios';
import { Asset, baseURL } from 'src/navigation/types';

interface UseFetchAssetsOptions {
  limit?: number;
  filterStatus?: string; // Optional client-side status filter e.g. 'Unassigned'
}

export const useFetchAssets = (options: UseFetchAssetsOptions = {}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchAssets = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const response = await axios.get(`${baseURL}/api/assets`, {
        params: { page: pageNum, limit: options.limit || 50 }
      });

      const rawData = response.data.assets || [];
      const { total, totalPages } = response.data;

      setTotalCount(total || 0);
      setHasMore(pageNum < (totalPages || 1));

      // De-duplicate by id
      const uniqueMap = new Map();
      rawData.forEach((item: any) => {
        const id = item.assetId || item.id;
        if (!uniqueMap.has(id)) uniqueMap.set(id, item);
      });

      let fetchedList = Array.from(uniqueMap.values()) as Asset[];

      if (options.filterStatus) {
        const filterLower = options.filterStatus.toLowerCase();
        fetchedList = fetchedList.filter(a => String(a.status || '').toLowerCase() === filterLower);
      }

      setAssets(prev => {
        if (!append) return fetchedList;
        const existingIds = new Set(prev.map(a => a.assetId || a.id));
        const filteredNew = fetchedList.filter(a => !existingIds.has(a.assetId || a.id));
        return [...prev, ...filteredNew];
      });
    } catch (err: any) {
      console.error('Fetch Assets Error:', err);
      setError('Failed to fetch assets.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [options.limit, options.filterStatus]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAssets(nextPage, true);
    }
  }, [loadingMore, hasMore, loading, page, fetchAssets]);

  return {
    assets,
    setAssets,
    loading,
    loadingMore,
    error,
    page,
    hasMore,
    totalCount,
    fetchAssets,
    handleLoadMore
  };
};

export default useFetchAssets;
