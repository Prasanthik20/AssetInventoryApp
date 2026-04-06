import { useMemo, useState } from "react";
import { Asset } from "src/navigation/types";

export const useAssetFilter = (assets: Asset[]) => {
  const [searchText, setSearchText] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // 🔎 Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const name = asset.assetName?.toLowerCase() || "";
      const serial = asset.serialNumber?.toLowerCase() || "";
      const category = String(asset.category || "").toLowerCase();
      const location = asset.location?.toLowerCase() || "";
      const status = asset.status?.toLowerCase() || "";
      const assignedTo = asset.assignedTo?.toLowerCase() || "";

      const search = searchText.toLowerCase();
      const nameFilter = selectedName.toLowerCase();

      // 1. Search Logic
      const matchesSearch =
        name.includes(search) || 
        serial.includes(search) || 
        location.includes(search) ||
        assignedTo.includes(search);

      // 2. Category Logic
      const matchesName =
        selectedName === "" || category.includes(nameFilter);

      // 3. Location Logic
      const matchesLocation =
        selectedLocation === "" || location === selectedLocation.toLowerCase();

      // 4. Status Logic
      const matchesStatus =
        selectedStatus === "" ||
        status === selectedStatus.toLowerCase();

      return (
        matchesSearch &&
        matchesName &&
        matchesLocation &&
        matchesStatus
      );
    });
  }, [assets, searchText, selectedName, selectedLocation, selectedStatus]);

  // Rest of your memoized unique values...
  const uniqueNames = useMemo(() => {
    return [...new Set(assets.map((a) => a.assetName).filter(Boolean))].sort();
  }, [assets]);

  const uniqueLocations = useMemo(() => {
    return [...new Set(assets.map((a) => a.location).filter(Boolean))].sort();
  }, [assets]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(assets.map((a) => a.status).filter(Boolean))].sort();
  }, [assets]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedName("");
    setSelectedLocation("");
    setSelectedStatus("");
  };

  return {
    searchText,
    setSearchText,
    selectedName,
    setSelectedName,
    selectedLocation,
    setSelectedLocation,
    selectedStatus,
    setSelectedStatus,
    filteredAssets,
    uniqueNames,
    uniqueLocations,
    uniqueStatuses,
    clearFilters,
  };
};