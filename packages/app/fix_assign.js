const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'screens', 'AssetDetails', 'AssignAssetScreen.tsx');

if (!fs.existsSync(filePath)) {
  console.error("Error: AssignAssetScreen.tsx not found at", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Check if the file is already broken
if (content.includes('const toAssetId =')) {
  console.log("File already has helper functions. Doing standard replacement...");
}

// We will reconstruct the broken region by finding the text around it.
const searchMarker = `const onDueChange = (event: any, selectedDate?: Date) => {
  setShowDuePicker(false); // Close picker
  if (selectedDate) {
    setDueDate(selectedDate.toISOString().split('T')[0]);
  }
};`;

const targetIndex = content.indexOf(searchMarker);
if (targetIndex === -1) {
  console.error("Error: Could not find onDueChange function in the file to perform the insertion.");
  process.exit(1);
}

const insertPosition = targetIndex + searchMarker.length;

const codeToInsert = `

  const toAssetId = (value: unknown) => Number(value);
  const toAssetKey = (value: unknown) => String(toAssetId(value));

  const assetCategories = categories
    .map((item) => String(item?.category || '').trim())
    .filter(Boolean);

  const filteredAssets = useMemo(() => {
    const query = assetSearchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const category = String(asset.category || '').toLowerCase();
      const assetName = String(asset.assetName || '').toLowerCase();
      const modelNumber = String(asset.modelNumber || '').toLowerCase();
      const matchesCategory =
        assetCategoryFilter === 'All Categories' ||
        category.includes(assetCategoryFilter.toLowerCase()) ||
        assetName.includes(assetCategoryFilter.toLowerCase()) ||
        modelNumber.includes(assetCategoryFilter.toLowerCase());

      if (!matchesCategory) return false;

      if (!query) return true;

      const serialNumber = String(asset.serialNumber || '').toLowerCase();
      const assetId = String(asset.assetId || '').toLowerCase();

      return (
        category.includes(query) ||
        assetName.includes(query) ||
        modelNumber.includes(query) ||
        serialNumber.includes(query) ||
        assetId.includes(query)
      );
    });
  }, [assets, assetSearchQuery, assetCategoryFilter]);

  const pickImage = async (useCamera: boolean, isBarcode: boolean, targetAssetId?: number | string) => {
    const hasTargetAsset =
      targetAssetId !== undefined &&
      targetAssetId !== null &&
      !Number.isNaN(toAssetId(targetAssetId));
    const targetKey = hasTargetAsset ? toAssetKey(targetAssetId) : null;

    try {
      if (hasTargetAsset && targetKey) {
        if (isBarcode) setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
        else setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: true }));
      } else {
        if (isBarcode) setBarcodeLoading(true);
        else setPhotoLoading(true);
      }

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showSnackbar('Camera permission is required.', 'error');
          return;
        }
      }
      // Note: No permission needed for gallery — Android Photo Picker is sandboxed.

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        allowsMultipleSelection: !useCamera && !isBarcode,
        aspect: isBarcode ? [4, 3] : [1, 1],
        quality: 0.2,
        base64: true,
      };

      if (options.allowsMultipleSelection) {
        delete options.allowsEditing;
        delete options.aspect;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const photos: string[] = [];
        for (const asset of result.assets) {
          try {
            const dataUrl = await toPersistentDataUrl(asset.uri, asset.mimeType || undefined);
            if (dataUrl) {
              photos.push(dataUrl);
            }
          } catch (err) {
            console.warn("Error processing image:", err);
          }
        }

        if (photos.length > 0) {
          const primaryPhoto = photos[0];
          if (isBarcode) {
            if (hasTargetAsset && targetKey) {
              setAssetBarcodeMap((prev) => ({ ...prev, [targetKey]: primaryPhoto }));
              showSnackbar('Barcode saved for selected asset.', 'success');
            } else {
              setBarcodeURL(primaryPhoto);
              showSnackbar('Barcode image will be attached to the assignment.', 'success');
            }
          } else {
            if (hasTargetAsset && targetKey) {
              setAssetPhotoMap((prev) => ({ ...prev, [targetKey]: primaryPhoto }));
              setAssetPhotoBatchMap((prev) => ({ ...prev, [targetKey]: photos }));
              showSnackbar('Photo saved for selected asset.', 'success');
            } else {
              setPhoto(primaryPhoto);
              setPhotoBatch(photos);
              showSnackbar('Photo will be attached to the assignment.', 'success');
            }
          }
        } else {
          showSnackbar('Failed to process image.', 'error');
        }
      }
    } catch (error) {
      console.error('Picker error:', error);
      showSnackbar('Failed to open camera or image library.', 'error');
    } finally {
      if (hasTargetAsset && targetKey) {
        if (isBarcode) setAssetBarcodeLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
        else setAssetPhotoLoadingMap((prev) => ({ ...prev, [targetKey]: false }));
      } else {
        if (isBarcode) setBarcodeLoading(false);
        else setPhotoLoading(false);
      }
    }
  };

  const handleUploadBarcode = (targetAssetId?: number | string) => {
    if (Platform.OS === 'web') {
      pickImage(false, true, targetAssetId);
    } else {
      Alert.alert(
        "Upload Barcode",
        "Choose an option",
        [
          { text: "Take Photo", onPress: () => pickImage(true, true, targetAssetId) },
          { text: "Choose from Gallery", onPress: () => pickImage(false, true, targetAssetId) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleUploadPhoto = (targetAssetId?: number | string) => {
    if (Platform.OS === 'web') {
      pickImage(false, false, targetAssetId);
    } else {
      Alert.alert(
        "Upload Photo",
        "Choose an option",
        [
          { text: "Take Photo", onPress: () => pickImage(true, false, targetAssetId) },
          { text: "Choose from Gallery", onPress: () => pickImage(false, false, targetAssetId) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const toggleAssetSelection = (asset: Asset) => {`;

// Let's replace the broken starting part of toggleAssetSelection with our correct, full insert
const brokenToggleStart = `\n\n    setSelectedAssets((prev) => {`;
const brokenToggleIndex = content.indexOf(brokenToggleStart, insertPosition);

if (brokenToggleIndex === -1) {
  // If the broken toggle start is not found, maybe it's slightly different
  content = content.slice(0, insertPosition) + codeToInsert + content.slice(insertPosition);
} else {
  // Replace from insertPosition to the start of the toggle selection body with our fully structured code block
  content = content.slice(0, insertPosition) + codeToInsert + content.slice(brokenToggleIndex + brokenToggleStart.length);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Success! AssignAssetScreen.tsx has been successfully restored and updated.");
