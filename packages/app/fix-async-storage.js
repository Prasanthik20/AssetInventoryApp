const fs = require('fs');
const path = require('path');

// Patch android/src/main/AndroidManifest.xml to remove the deprecated package attribute
const manifestFile = path.join(__dirname, 'node_modules', '@react-native-async-storage', 'async-storage', 'android', 'src', 'main', 'AndroidManifest.xml');

if (fs.existsSync(manifestFile)) {
  let content = fs.readFileSync(manifestFile, 'utf8');
  const targetText = 'package="com.reactnativecommunity.asyncstorage"';
  
  if (content.includes(targetText)) {
    content = content.replace(targetText, '');
    fs.writeFileSync(manifestFile, content, 'utf8');
    console.log('[Postinstall] Successfully removed deprecated package attribute from react-native-async-storage AndroidManifest.xml.');
  } else {
    console.log('[Postinstall] react-native-async-storage AndroidManifest.xml is already patched.');
  }
} else {
  console.log('[Postinstall] react-native-async-storage AndroidManifest.xml not found.');
}
