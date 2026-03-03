import { useMemo, useState } from "react";
import { Asset } from "src/navigation/types";

export const useAssetFilter = (assets: Asset[]) => {
  const [searchText, setSearchText] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedSerial, setSelectedSerial] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // 🔎 Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const name = asset.assetName?.toLowerCase() || "";
      const serial = asset.serialNumber?.toLowerCase() || "";
      const status = asset.status?.toLowerCase() || "";
      const assignedTo = asset.assignedTo?.toLowerCase() || "";

      const search = searchText.toLowerCase();
      const nameFilter = selectedName.toLowerCase();

      // 1. Search Logic
      const matchesSearch =
        name.includes(search) || 
        serial.includes(search) || 
        assignedTo.includes(search);

      // 2. Name/Category Logic (Changed from === to .includes)
      const matchesName =
        selectedName === "" || name.includes(nameFilter);

      // 3. Serial Logic
      const matchesSerial =
        selectedSerial === "" || asset.serialNumber === selectedSerial;

      // 4. Status Logic
      const matchesStatus =
        selectedStatus === "" ||
        status === selectedStatus.toLowerCase();

      return (
        matchesSearch &&
        matchesName &&
        matchesSerial &&
        matchesStatus
      );
    });
  }, [assets, searchText, selectedName, selectedSerial, selectedStatus]);

  // Rest of your memoized unique values...
  const uniqueNames = useMemo(() => {
    return [...new Set(assets.map((a) => a.assetName).filter(Boolean))].sort();
  }, [assets]);

  const uniqueSerialNumbers = useMemo(() => {
    return [...new Set(assets.map((a) => a.serialNumber).filter(Boolean))].sort();
  }, [assets]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(assets.map((a) => a.status).filter(Boolean))].sort();
  }, [assets]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedName("");
    setSelectedSerial("");
    setSelectedStatus("");
  };

  return {
    searchText,
    setSearchText,
    selectedName,
    setSelectedName,
    selectedSerial,
    setSelectedSerial,
    selectedStatus,
    setSelectedStatus,
    filteredAssets,
    uniqueNames,
    uniqueSerialNumbers,
    uniqueStatuses,
    clearFilters,
  };
};