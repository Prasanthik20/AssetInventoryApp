# Walkthrough - Media & Contacts Permissions and Access Support

We have successfully configured native data permissions and updated the image/video selection mechanism throughout the Expo React Native app to provide comprehensive and modern access for camera, photos, videos, microphone, and contacts.

## Changes Implemented

### 1. App Configuration
Modified `packages/app/app.json` to declare standard permissions and descriptions for Android and iOS systems:
- **Android Permissions**: Added location (fine & coarse), camera, external storage, granular media visual access (images, videos, user selected), microphone, and contacts (read & write) permissions:
  - `android.permission.ACCESS_FINE_LOCATION` (GPS location tracking)
  - `android.permission.ACCESS_COARSE_LOCATION` (Network location tracking)
  - `android.permission.CAMERA`
  - `android.permission.READ_CONTACTS`
  - `android.permission.WRITE_CONTACTS` (contacts creation/modification)
  - `android.permission.READ_EXTERNAL_STORAGE`
  - `android.permission.WRITE_EXTERNAL_STORAGE`
  - `android.permission.READ_MEDIA_IMAGES`
  - `android.permission.READ_MEDIA_VIDEO`
  - `android.permission.READ_MEDIA_VISUAL_USER_SELECTED` (Android 14+ specific for premium UX)
  - `android.permission.RECORD_AUDIO`
- **iOS infoPlist**: Declared detailed usage descriptions matching Apple App Store requirements for camera, photo library read/write, microphone, contacts, and location (always / when in use / foreground).
- **Expo Plugins**: Updated the `"expo-image-picker"` plugin properties to specify permissions for photos, camera, and microphone.

---

### 2. Native Android Manifest
Modified `packages/app/android/app/src/main/AndroidManifest.xml` to:
- Include all required permission tags (including location fine/coarse and contacts read/write), ensuring immediate native builds and APK compilations properly request these capabilities from the OS.
- Add `android:label="@string/app_name"` directly to the `.MainActivity` tag. This fixes the issue where the sideload/installation/download process fallback to displaying the package name (`com.assetmgmt.com`) instead of the human-readable app name ("Asq Asset Ledger").

---

### 3. Adaptive Foreground Icon Resizing
Generated a professionally centered, scaled, and padded adaptive foreground icon:
- **Location**: Generated image is stored as an artifact at `C:\Users\sntha\.gemini\antigravity-ide\brain\4ca2ce6e-456f-427f-93de-11bf7cdd317b\asq_resized_1779685701428.png`.
- **Reasoning**: Standard Android Adaptive Icons require a generous margin (only the central 66% circle is guaranteed to be visible/safe). If the logo is too close to the edges of the image canvas, the OS cuts/crops it off on the device home screen.
- **Action**: Resized the logo with 25% transparent padding, placing it exactly in the center of a 1024x1024 transparent canvas, so it fits perfectly within the safe circle under all device shape masks.

---

### 4. Codebase Upgrades (Image Picker Options)
Updated all key screens that leverage `expo-image-picker` to use `ImagePicker.MediaTypeOptions.All` (images + videos) for the asset photos and proof media:
- **[AddEditAsset.tsx](file:///d:/PSIMS/AssetInventoryApp/packages/app/src/screens/AssetDetails/AddEditAsset.tsx)**: Changed `MediaTypeOptions` to support images & videos for asset photos, whilst cleanly retaining image-only restrictions for scanning/uploading barcodes.
- **[AssignAssetScreen.tsx](file:///d:/PSIMS/AssetInventoryApp/packages/app/src/screens/AssetDetails/AssignAssetScreen.tsx)**: Updated options to support All types for photos.
- **[ReturnAssetScreen.tsx](file:///d:/PSIMS/AssetInventoryApp/packages/app/src/screens/AssetDetails/ReturnAssetScreen.tsx)**: Updated options to support All types for photos.
- **[AssetFullDetails.tsx](file:///d:/PSIMS/AssetInventoryApp/packages/app/src/screens/AssetDetails/AssetFullDetails.tsx)**: Updated details screen photo editing to allow both image and video uploads.
- **[OverdueNotificationModal.tsx](file:///d:/PSIMS/AssetInventoryApp/packages/app/src/screens/CommonScreen/OverdueNotificationModal.tsx)**: Enabled All media types for proof attachments.

---

## Verification Summary

- The JSON in `app.json` parses cleanly.
- The `AndroidManifest.xml` tags are valid and compile directly with Gradle.
- Picking options cleanly isolate barcodes (restricted to images only) while providing complete photos and videos access for asset media.
