# Asset Photo Upload Feature

## Overview
The asset management system now supports photo uploads for assets. Photos can be added when:
- Creating a new asset
- Assigning an asset to an operator
- Returning an asset

## Database Changes

### Schema Update
Added `photoURL` column to `Asset_Details` table:
```sql
ALTER TABLE "Asset_Details" 
ADD COLUMN IF NOT EXISTS "photoURL" TEXT;
```

### Prisma Schema
```prisma
model Asset_Details {
  // ... other fields
  photoURL         String?
  // ... relations
}
```

## API Endpoints Updated

### 1. Create Asset (`POST /api/assets/create`)

**Request Body:**
```json
{
  "assetName": "Laptop",
  "category": "Electronics",
  "modelNumber": "XPS-15",
  "serialNumber": "SN123456",
  "purchaseDate": "2024-01-15",
  "warrantyExpiry": "2026-01-15",
  "price": "1500",
  "location": "Office",
  "status": "Unassigned",
  "photoURL": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Optional
}
```

**Photo Format Options:**
1. Base64 encoded string: `data:image/jpeg;base64,...`
2. HTTP/HTTPS URL: `https://example.com/photos/asset123.jpg`
3. Leave blank or null for no photo

### 2. Assign Asset (`POST /api/assets/assign`)

**Request Body:**
```json
{
  "assetIds": [1, 2, 3],
  "operator_employeeId": 1001,
  "supervisor_employeeId": 2001,
  "assigned_date": "2024-03-04",
  "expected_return_date": "2024-04-04",
  "project_name": "Project Alpha",
  "destination": "Site A",
  "notes": "Handle with care",
  "photoURL": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Optional
}
```

**Note:** If `photoURL` is provided during assignment, it will update the photo for all assigned assets.

### 3. Return Asset (`POST /api/operator/returnAsset`)

**Request Body:**
```json
{
  "assetIds": [1, 2, 3],
  "operatorEmployeeId": 1001,
  "photoURL": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Optional
}
```

**Note:** Photo on return can be used to document the condition of the asset when returned.

## Frontend Integration

### React Native Image Picker Example

```typescript
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Request permissions
const requestPermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions to upload photos!');
    return false;
  }
  return true;
};

// Pick and compress image
const pickImage = async () => {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    // Compress the image
    const manipulatedImage = await manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    return `data:image/jpeg;base64,${manipulatedImage.base64}`;
  }

  return null;
};

// Usage in your component
const handleAddAsset = async () => {
  const photoURL = await pickImage();
  
  const assetData = {
    assetName,
    category,
    // ... other fields
    photoURL, // Add the photo URL
  };

  await axios.post(`${baseURL}/api/assets/create`, assetData);
};
```

### Web File Input Example

```typescript
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64String = reader.result as string;
    setPhotoURL(base64String);
  };
  reader.readAsDataURL(file);
};

// JSX
<input 
  type="file" 
  accept="image/*" 
  onChange={handleFileSelect}
/>
```

## Photo Validation

### Recommended Specifications
- **Format:** JPEG, PNG, WebP, GIF
- **Max Size:** 5MB
- **Recommended Resolution:** 1200x900px or smaller
- **Quality:** 80% compression recommended

### Server-Side Validation (Optional)

You can import the photo helper utilities:

```typescript
import { 
  validatePhoto, 
  validatePhotoSize, 
  MAX_PHOTO_SIZE 
} from '@/lib/photoHelper';

// In your API handler
const photoValidation = validatePhoto(photoURL);
if (!photoValidation.isValid) {
  return res.status(400).json({ message: photoValidation.error });
}

const sizeValidation = validatePhotoSize(photoURL);
if (!sizeValidation.isValid) {
  return res.status(400).json({ message: sizeValidation.error });
}
```

## Database Migration

### Run Migration
```bash
cd packages/server
psql -U your_username -d your_database -f prisma/migrations/add_photo_to_assets.sql
```

### Regenerate Prisma Client
```bash
npx prisma generate
```

## Best Practices

1. **Always compress images on the client side** before uploading to reduce bandwidth and storage
2. **Use aspect ratio cropping** to maintain consistent image dimensions
3. **Implement loading states** during photo upload
4. **Provide preview** of the selected image before submission
5. **Handle errors gracefully** with user-friendly messages
6. **Consider using cloud storage** (AWS S3, Cloudinary, etc.) for production instead of base64 in database

## Storage Considerations

### Base64 in Database (Current Implementation)
**Pros:**
- Simple implementation
- No additional infrastructure needed
- Photos are backed up with database

**Cons:**
- Increases database size significantly
- Slower query performance for large datasets
- Not ideal for high-resolution images

### Cloud Storage (Recommended for Production)
**Pros:**
- Better performance
- Lower database storage costs
- Built-in CDN and optimization
- Easy to scale

**Cons:**
- Requires additional service setup
- Extra cost for storage service

## Future Enhancements

1. **Image Optimization Service:** Implement automatic image compression and optimization
2. **Multiple Photos:** Allow multiple photos per asset
3. **Cloud Storage Integration:** Migrate to AWS S3 or similar service
4. **Thumbnail Generation:** Create thumbnails for grid views
5. **Photo History:** Track photo changes over time
6. **Watermarking:** Add company watermark to asset photos

## Troubleshooting

### Photo not saving
- Check if the `photoURL` field is properly included in the request body
- Verify the base64 string format is correct (includes `data:image/...;base64,` prefix)
- Check database column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'Asset_Details' AND column_name = 'photoURL';`

### Photo too large error
- Compress images before upload
- Reduce image resolution to 1200px width or less
- Use quality setting of 0.8 or lower

### Photo not displaying
- Verify the photoURL contains valid data
- Check browser console for loading errors
- Ensure base64 string includes the proper data URL prefix
