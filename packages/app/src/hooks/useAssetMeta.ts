import axios from "axios";
import { useEffect, useState } from "react";
import { baseURL } from "src/navigation/types";

interface Category {
  id: number | string;
  categoryId: string;
  category: string;
}

interface Status {
  id: number | string;
  status: string;
}

export default function useAssetMeta() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

  useEffect(() => {
    // Fetch categories
    axios.get(`${baseURL}/api/categories`)
      .then(res => setCategories(res.data.categories || res.data))
      .catch(err => console.error("Error fetching categories:", err));

    // Fetch statuses
    axios.get(`${baseURL}/api/statuses`)
      .then(res => res.data)
      .then(data => setStatuses(data.statuses || data))
      .catch(err => console.error("Error fetching statuses:", err));
  }, []);

  return { categories, statuses };
}