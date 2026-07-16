const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
if (!fs.existsSync(appJsonPath)) {
  console.error(`Error: app.json not found at ${appJsonPath}`);
  process.exit(1);
}

try {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Default to 122 if not set, so the next build starts at 123
  let currentCode = 122;
  if (appJson.expo && appJson.expo.android && typeof appJson.expo.android.versionCode === 'number') {
    currentCode = appJson.expo.android.versionCode;
  }
  
  const newCode = currentCode + 1;
  
  // Map code directly to name: e.g., 123 -> 1.2.3, 124 -> 1.2.4
  const major = Math.floor(newCode / 100);
  const minor = Math.floor((newCode % 100) / 10);
  const patch = newCode % 10;
  const newName = `${major}.${minor}.${patch}`;
  
  appJson.expo.version = newName;
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  appJson.expo.android.versionCode = newCode;
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log(`Successfully bumped version in app.json to ${newName} (versionCode: ${newCode})`);
} catch (error) {
  console.error('Failed to bump version:', error);
  process.exit(1);
}
