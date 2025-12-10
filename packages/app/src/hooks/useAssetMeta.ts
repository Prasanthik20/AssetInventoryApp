import { useEffect, useState } from "react";

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
    fetch("http://localhost:3000/api/categories")
      .then(res => res.json())
      .then(data => setCategories(data.categories || data))
      .catch(err => console.error("Error fetching categories:", err));

    // Fetch statuses
    fetch("http://localhost:3000/api/statuses")
      .then(res => res.json())
      .then(data => setStatuses(data.statuses || data))
      .catch(err => console.error("Error fetching statuses:", err));
  }, []);

  return { categories, statuses };
}