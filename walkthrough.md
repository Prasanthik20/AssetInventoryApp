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
# Walkthrough — Multi-Tenant Subscription & Super Admin Control System

We have successfully implemented and refined the **Subscription Management + Super Admin Control System** for the ASQ Asset Inventory application. All core systems are wired up to live database metrics and fully validated.

Here is a summary of the accomplishments, resolved bugs, and premium workflows added during this execution phase.

---

## 1. Resolved Key Issues & System Polish

### A. Deduplicated Tenant Subscriptions (Duplicate React Key Warning Fix)
- **Problem**: When a tenant had multiple active subscriptions in the database (e.g., overlapping enterprise and trial subscriptions), the `/api/superadmin/tenants` list endpoint generated duplicate rows due to a standard SQL `LEFT JOIN`. This caused duplicate items to render in the table and triggered the React duplicate key warning: `Encountered two children with the same key, .$tenant-nscllp-001`.
- **Solution**: Refactored the GET query in [tenants.ts](file:///Volumes/Data/ASquare/Lavnya%20Group/AssetInventoryApp/packages/server/src/pages/api/superadmin/tenants.ts) using a `LEFT JOIN LATERAL` with `LIMIT 1` sorted by `updatedAt DESC`. This guarantees exactly one, latest subscription is retrieved per organization. The table now displays exactly one unified row per tenant and all duplicate key warnings are fully eliminated.

### B. "Add Organization" Navigation Integration
- **Problem**: The "Add New Organization" button was commented out on the Super Admin cockpit because the registration screen (`AddCompanyScreen`) was registered only in the guest-accessible `AuthStack`. Once logged in, a Super Admin would experience a routing crash or failed navigation.
- **Solution**: 
  - Registered the `AddCompany` screen inside the authenticated [App.tsx](file:///Volumes/Data/ASquare/Lavnya%20Group/AssetInventoryApp/packages/app/App.tsx) stack.
  - Uncommented the action button inside [SuperAdminDashboard.tsx](file:///Volumes/Data/ASquare/Lavnya%20Group/AssetInventoryApp/packages/app/src/screens/SuperAdmin/SuperAdminDashboard.tsx).
  - Modified the redirect routing inside [AddCompanyScreen.tsx](file:///Volumes/Data/ASquare/Lavnya%20Group/AssetInventoryApp/packages/app/src/screens/Client/AddCompanyScreen.tsx) to check the user's role: guest registrations redirect to `CompanyLogin`, while Super Admin registrations dynamically return the user to the `SuperAdminDashboard` with full state preservation.

---

## 2. Core Architectural Accomplishments

### A. Database-Tier Relational Enhancements
- **Deduplicated Relationships**: Designed a lateral join strategy to link tenants, active subscriptions, and catalog pricing tiers cleanly in PostgreSQL.
- **Additive Schema Updates**: Ran raw PostgreSQL transactions safely adding standard SaaS structures (`RenewalRequests`, `Payments`, `Invoices`, `TenantFeatureFlags`, `AuditLogs`, `SupportTickets`, `SupportTicketMessages`) while protecting historical records.

### B. High-Performance APIs
- **Subscription Verification Middleware**: Wraps write endpoints to block operations for expired/suspended organizations.
- **Tenant Controls**: Implemented full `PUT` overrides to modify tenant lifecycle status (`active`, `suspended`, `expired`) and assign custom billing plan catalog tiers.
- **Plan Package Customization**: Custom `POST` endpoint to upsert subscription plans dynamically in the platform catalog.

### C. Aesthetic Super Admin Console
- Harmonized deep-navy glassmorphic aesthetic with high-contrast active-state indicators.
- Live stats metrics showing: Total Organizations, Paid Subscriptions, Pending Renewals, and Platform Assets Logged.
- Interactive modal overlay panels for organizational profile updates and real-time custom plan package configurations.

---

## 3. Verification & Validation Steps

### Manual Validation Flow
1. **Add Company**: Open the Super Admin Dashboard and click **Add New Organization**. Complete the form and verify that the system cleanly registers the organization and redirects you back to the Super Admin Cockpit.
2. **Assign Tiers**: Click **View** on the new organization row to open its profile. Update its status to `suspended` or change its subscription package and save. Verify that the updates persist in the database and list table.
3. **Verify Write Limits**: Log in as a user belonging to the suspended organization and attempt to log/update an asset; verify that a warning banner blocks access with a `403 Forbidden` restriction.

# Walkthrough - Mobile AssetFiltersBar Overlap Fix

We have resolved a UI overlapping issue on the **All Assets** (and all other screens using the shared `AssetFiltersBar` component) screen in the mobile layout.

## Problem Details
In mobile view, the filters (Category, Location, and Status pickers) inside the `AssetFiltersBar` were overlapping and showing up *behind* the first few cards of the `FlatList` component.
This occurred because the `controlsRow` base style has `flexWrap: 'wrap'` enabled for desktop multi-row layouts. When the component dynamically switched to column flow (`flexDirection: 'column'`) on mobile, the inherited `flexWrap: 'wrap'` layout property caused the Yoga layout engine to render a collapsed/incorrect container height for the `AssetFiltersBar`. The next layout sibling, the `<View style={{ flex: 1 }}>` containing the `FlatList`, was drawn on top of the overflowed picker controls.

## Resolution
- Modified [AssetFiltersBar.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/components/common/AssetFiltersBar.tsx#L293-L298):
  - Added `flexWrap: 'nowrap'` directly to `controlsRowMobile` style.
  - This overrides the inherited wrap configuration from `controlsRow` when in mobile layout, ensuring the layout engine correctly computes the height of the column stack and spaces the `FlatList` container directly below the filter controls.

# Walkthrough - AsyncStorage Gradle Release Build Variant Resolution

We have resolved a release APK compilation error where the Gradle task `:app:mergeReleaseNativeLibs` failed with:
`No matching variant of project :react-native-async-storage_async-storage was found.`

## Problem Details
When `newArchEnabled=true` is set in `gradle.properties`, the `@react-native-async-storage/async-storage` library's `build.gradle` attempts to apply the React Native Gradle Plugin (`com.facebook.react`) to its own module.
However, in modern React Native and Gradle setups, the `com.facebook.react` plugin is designed to run exclusively on the main application module (i.e. `:app`). Applying it inside the library module disrupts release build configurations and fails to register variant outputs correctly, throwing a mismatch error for `releaseRuntimeClasspath`.

## Resolution
1. **Added Local Maven Repository to Root Project**: The actual cause for the `No matching variant` resolution failure on the release runtime classpath was that the local Maven repository for React Native (`react-native/android`) was missing from the root project's `allprojects.repositories` block in [build.gradle](file:///d:/APPS/AssetInventoryApp/packages/app/android/build.gradle#L27-L33). We have explicitly added it:
   ```gradle
   allprojects {
     repositories {
       google()
       mavenCentral()
       maven { url "$rootDir/../node_modules/react-native/android" }
       maven { url = 'https://www.jitpack.io' }
     }
   }
   ```
2. **Restored Library com.facebook.react Plugin**: Restored the library's [build.gradle](file:///d:/APPS/AssetInventoryApp/packages/app/node_modules/@react-native-async-storage/async-storage/android/build.gradle#L35-L38) configuration to apply `com.facebook.react` when `isNewArchitectureEnabled` is true. This ensures React Native's autolinking/codegen task is executed for the library module, preventing compilation failures (where `NativeAsyncStorageModuleSpec` classes could not be found).
3. **AndroidManifest package Attribute Cleanup**: Removed the deprecated `package` attribute from `@react-native-async-storage/async-storage`'s [AndroidManifest.xml](file:///d:/APPS/AssetInventoryApp/packages/app/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml) to clean up Gradle namespace warnings:
   ```xml
   <manifest xmlns:android="http://schemas.android.com/apk/res/android">
   ```
4. **Persistent Post-Install Automation**: Configured [fix-async-storage.js](file:///d:/APPS/AssetInventoryApp/packages/app/fix-async-storage.js) as a `"postinstall"` hook in [package.json](file:///d:/APPS/AssetInventoryApp/packages/app/package.json#L12) to automatically patch the `AndroidManifest.xml` namespace warning on any future clean installations.
5. **Optimized Build Process Instructions**: Documented setting `NODE_ENV=production` when executing release tasks (e.g., `./gradlew assembleRelease` or `./gradlew bundleRelease`) in [E2E_TEST_SCENARIOS.md](file:///d:/APPS/AssetInventoryApp/E2E_TEST_SCENARIOS.md#L176-L181) to ensure the Expo config creation task resolves correctly and bundles in production mode.

# Walkthrough - Mobile Layout Overlaps & Filter Visibility Resolution

We have resolved the remaining mobile layout overlapping and visibility issues affecting the asset filter components.

## Problem Details
1. **Overlap in All Assets Screen**: In mobile view, the `FlatList` container still partially overlapped the pickers in `AssetFiltersBar`. This occurred because in the style array `[styles.controlsRow, isMobileLayout && styles.controlsRowMobile, containerStyle]`, both the row and column layouts were merged together, leading to incomplete/faulty style overrides of the `flexWrap` property in React Native (Yoga layout engine).
2. **Invisible Filters in Office/Field Asset Screens**: On the "Assets in Office" and "Assets in Fields" screens, the filters were completely hidden/invisible below the search bar. This happened because:
   - A custom `dropdownContainer` style (containing `height: 54`, background color, border, and `flex: 1`) was mistakenly applied to the parent `filtersContainerStyle` as well as the child `pickerWrapperStyle`.
   - On mobile view, the parent container `filterGroup` has its height set to `height: 'auto'` and `flexGrow: 0`. Since the child picker also had a flex-based layout (`flex: 1`) rather than fixed sizing under those overrides, the nested layout collapsed down to a height of `0` and was cut off by `overflow: 'hidden'`.

## Resolution
1. **Exclusively Select Container Style Class**:
   - Modified [AssetFiltersBar.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/components/common/AssetFiltersBar.tsx#L238-L242) to select *either* `styles.controlsRowMobile` or `styles.controlsRow` dynamically:
     ```tsx
     style={[
       isMobileLayout ? styles.controlsRowMobile : styles.controlsRow,
       containerStyle,
     ]}
     ```
     This completely prevents any stylesheet inheritance/merging issues with `flexWrap: 'wrap'` on mobile.
2. **Fixed Invisible Filters on Sub-Asset Screens**:
   - Removed the faulty `filtersContainerStyle` override from the `<AssetFiltersBar>` calls in [OfficeAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/OfficeAssets.tsx#L101-L107) and [FieldAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/FieldAssets.tsx#L363-L370).
   - This allows the parent container to fall back to its clean default layout styling (`styles.filterGroup` on desktop, `styles.filterGroupMobile` on mobile), so it automatically scales its height around the picker elements.
3. **Improved Spacing**:
   - Added `marginBottom: 10` to `topControlsRowMobile` and `topControlsRow` inside [OfficeAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/OfficeAssets.tsx#L176-L186) and [FieldAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/FieldAssets.tsx#L509-L519) to ensure clean separation between the filter bar and the underlying lists.# Walkthrough - Gradle Worker Daemon OOM Resolution

We have resolved a Java compiler worker crash where the build task `:react-native-community_datetimepicker:compileReleaseJavaWithJavac` failed with:
`Failed to run Gradle Worker Daemon > Unable to connect to the child process`

## Problem Details
Gradle offloads tasks like Java compilation and code generation to independent compiler worker processes to isolate build dependencies. When the host system is under memory pressure, the operating system can terminate these compiler worker processes abruptly. The main Gradle build controller then fails to communicate with the closed process, halting the build.

## Resolution
1. **Configured Max Workers limit**: Added `org.gradle.workers.max=2` in [gradle.properties](file:///d:/APPS/AssetInventoryApp/packages/app/android/gradle.properties#L14) to limit the maximum number of simultaneous worker processes Gradle can spawn, reducing memory footprint during builds.
2. **Updated Build Commands**: Documented build-limiting flags (`--no-daemon --max-workers=2`) in [E2E_TEST_SCENARIOS.md](file:///d:/APPS/AssetInventoryApp/E2E_TEST_SCENARIOS.md#L176-L182) to guide clean, low-memory builds on the development environment.

## Web Browser Flexbox Collapse Resolution (Platform.select Style sheets)
* **Problem**: React Native for Web translates properties like `flex: 1` or `flex: 2` into standard CSS shorthands that resolve to `flex-basis: 0%` (equivalent to `flex: 0 1 0%` or `flex: 1 1 0%`). This caused search and filter picker components to shrink to `0` width in desktop browsers. Inline ternary operators evaluating to `undefined` values on native Android/iOS created conflicts in the layout compiler, disturbing the `.apk` visual layouts.
* **Resolution**: Configured styles using standard compilation-safe `Platform.select({ web: { ... }, default: { flex: X } })`. Metro resolves this at build time, meaning the native bundle contains only the standard native `flex` property, and the web bundle contains the browser-specific flexes.

Affected elements updated in [AssetFiltersBar.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/components/common/AssetFiltersBar.tsx):
1. `searchContainer`
2. `filterGroup`
3. `secondaryFilterRow`
4. `pickerWrapper`

## Responsive / Mobile Viewport Collapse (Web-Only Overrides)
* **Problem**: Setting vertical/mobile override parameters such as `{ flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }` to resolve the web layout collapse conflicted with base styles (`flex: 1` or `flex: 2`) on native devices, breaking the APK layout.
* **Resolution**: Created `webMobileOverride` and `webFilterGroupOverride` helpers using `Platform.select`:
  * On Web: Applies the flex-grow overrides to prevent height collapses on mobile viewports.
  * On Native (default): Resolves to a clean, empty object `{}`, completely preventing style properties conflicts inside the Yoga layout engine on Android/iOS.


## Picker Placeholders & Values Vertical Centering (Middle)
* **Goal**: Align the placeholder and selected text values inside Category, Location, and Status selectors vertically in the exact **middle** of their container, while keeping them **left-aligned** horizontally.
* **Resolution**: 
  1. Overrode `{ height: 'auto' }` on the `<Text>` element in `ModalPicker` to override parent/prop-based native picker height stretch constraints (`height: '100%'`). This enables the parent layout container's `alignItems: 'center'` layout engine to successfully center the text vertically in the middle of the box.
  2. Set `textAlign: 'left'` and `paddingLeft: 12` inside `pickerSelectorText` to keep placeholders and values left-aligned.
  3. Styled the chevron down icon as absolutely positioned on the right using a new `pickerChevron` style class (`position: 'absolute', right: 12`), keeping it cleanly aligned without interfering with the text block.

## Navigation Back Fallback Redirection (goBack Warning Fix)
* **Problem**: In React Native for Web, refreshing the browser page on any details/listing sub-screen (like `TotalAssetDetails`, `FieldAssets`, `OfficeAssets`, etc.) wipes the React Navigation stack history. Clicking the back arrow calls `navigation.goBack()`, which fails with a developer warning since there is no previous screen in the browser history stack.
* **Resolution**: Implemented a reusable `handleGoBack` check across all listing/assignment screens:
  * Checks `navigation.canGoBack()`. If true, it calls `navigation.goBack()`.
  * If false (history is empty), it retrieves the logged-in user profile from `AsyncStorage` and redirects them to their respective role-based dashboard (`SuperAdminDashboard`, `SupervisorDashboard`, `OperatorDashboard`, or `CompanyDashboard`).

Screens updated:
1. [TotalAssetDetails.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/TotalAssetDetails.tsx)
2. [FieldAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/FieldAssets.tsx)
3. [OfficeAssets.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/OfficeAssets.tsx)
4. [CompanyUsersScreen.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/CommonScreen/CompanyUsersScreen.tsx)
5. [ReturnAssetScreen.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/ReturnAssetScreen.tsx)
6. [AssignAssetScreen.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/AssetDetails/AssignAssetScreen.tsx)# Walkthrough - Offline B2B Subscription Renewal Workflow

We have successfully implemented a manual, offline B2B billing and plan renewal workflow in both the client mobile app and server API, along with dynamic tier-based plan validation.

## Changes Implemented

### 1. Database Schema & Auto-Migration
* **[schema.prisma](file:///d:/APPS/AssetInventoryApp/packages/server/prisma/schema.prisma)**: Added `minUsers` (`min_users`) and `minAssets` (`min_assets`) range boundary fields to the `Plans` database model definition.
* **[plans.ts](file:///d:/APPS/AssetInventoryApp/packages/server/src/pages/api/superadmin/plans.ts)**:
  - Integrated self-migrating database checks that automatically alter the database schema (adding columns `min_users` and `min_assets`) if not already present.
  - Automatically seeds the system pricing plans catalog with updated tier ranges:
    - **Free Trial**: 1 - 5 users, 1 - 100 assets (₹0.00)
    - **Starter**: 6 - 25 users, 101 - 2,500 assets (₹4,999.00)
    - **Professional**: 26 - 100 users, 2,501 - 25,000 assets (₹14,999.00)
    - **Enterprise**: 101+ users, 25,001+ assets (-₹1.00)
    - **Enterprise (Demo)**: 1 - 999 users, 1 - 999,999 assets (₹0.00)
  - Configured GET permissions to allow Tenant Admins and Admins to read the plans list, while restricting POST/PUT/DELETE parameters strictly to Super Admins.

### 2. Client Navigation & Range Visuals
* **[types.ts](file:///d:/APPS/AssetInventoryApp/packages/app/src/navigation/types.ts)**: Registered `Billing` screen parameter definitions.
* **[App.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/App.tsx)**: Stack mapping and browser deep-linking triggers configuration.
* **[BillingScreen.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/CommonScreen/BillingScreen.tsx)**:
  - Updated card rendering elements to display custom, dynamic usage ranges (e.g. `Supports 101 - 2,500 assets`) using new range text formatting helper functions.
  - Implemented role-based filtering to dynamically hide the `'enterprise-demo'` tier from standard clients (making it visible only to Super Admins).
  - Formatted the Enterprise Plan price (defined as `-1.00`) as `"Custom Pricing"`.
  - Configured the checkout form to hide bank details and skip payment screenshot/transaction ID requirements when selecting the Enterprise Plan, replacing them with a custom notification message card to request corporate manager alignment.

### 3. Server-Side Tier & Enterprise B2B Validation
* **[renew.ts](file:///d:/APPS/AssetInventoryApp/packages/server/src/pages/api/subscription/renew.ts)**:
  - Added strict validation checks that verify if the tenant's current counts of assets and active users fall within the chosen plan's specific min/max boundaries.
  - Rejects renewal requests with a `400 Bad Request` status and detailed warning if they attempt to request a tier mismatching their actual organizational usage metrics.
  - Automatically bypasses transaction screenshot requirements for Enterprise custom pricing requests, assigning placeholder transaction keys instead.

### 4. Admin Dashboard Banner & Trigger Updates
* **[CompanyDashboard.tsx](file:///d:/APPS/AssetInventoryApp/packages/app/src/screens/Admin/CompanyDashboard.tsx)**: Added a "Renew / Upgrade Now" banner link and a Quick Action entry redirecting users to the Billing dashboard.

---

## Verification Summary

* Verified `/api/superadmin/plans` queries, alterations, and auto-seeding scripts run successfully.
* Verified `BillingScreen` displays the user and asset tier limits ranges dynamically (e.g., `Supports 6 - 25 users`).
* Verified `/api/subscription/renew` validation checks reject plan renewals if user or asset counts exceed target plan thresholds.
* Verified that selecting the Enterprise Plan correctly displays a Custom pricing notice, hides the payment/bank form, and allows submission via placeholders.

