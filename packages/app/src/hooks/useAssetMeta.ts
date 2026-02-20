import { useEffect, useState } from "react";
import { baseURL } from "src/navigation/types";

interface Category {
  id: number;
  category: string;
}

interface Status {
  id: number;
  status: string;
}

export default function useAssetMeta() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

  useEffect(() => {
    // Fetch categories
    fetch(`${baseURL}/api/categories`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || data))
      .catch(err => console.error("Error fetching categories:", err));

    // Fetch statuses
    fetch(`${baseURL}/api/statuses`)
      .then(res => res.json())
      .then(data => setStatuses(data.statuses || data))
      .catch(err => console.error("Error fetching statuses:", err));
  }, []);

  return { categories, statuses };
}