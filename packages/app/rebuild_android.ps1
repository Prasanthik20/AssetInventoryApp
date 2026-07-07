
# ============================================================
# rebuild_android.ps1 - Clean, Prebuild, Patch & Build APK
# Run from: d:\PSIMS\AssetInventoryApp\packages\app
# ============================================================

$ErrorActionPreference = "Stop"
$appDir = $PSScriptRoot

Write-Host "`n=== Step 1: Backup keystore ===" -ForegroundColor Cyan
$keystoreSrc = "$appDir\android\my-release-key.keystore"
$keystoreDst = "$appDir\my-release-key.keystore"
if (Test-Path $keystoreSrc) {
    Copy-Item $keystoreSrc $keystoreDst -Force
    Write-Host "Keystore backed up to app root." -ForegroundColor Green
} elseif (Test-Path $keystoreDst) {
    Write-Host "Keystore already at app root." -ForegroundColor Green
} else {
    Write-Error "Keystore not found at $keystoreSrc or $keystoreDst!"
}

Write-Host "`n=== Step 2: Delete android folder ===" -ForegroundColor Cyan
$androidDir = "$appDir\android"
if (Test-Path $androidDir) {
    Write-Host "Stopping any running Gradle daemons..." -ForegroundColor Yellow
    if (Test-Path "$androidDir\gradlew.bat") {
        try {
            Start-Process -FilePath "$androidDir\gradlew.bat" -ArgumentList "--stop" -Wait -NoNewWindow -ErrorAction SilentlyContinue
        } catch {}
    }
    
    Write-Host "Terminating java.exe processes to release file locks..." -ForegroundColor Yellow
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Give the OS a moment to release file handles
    Start-Sleep -Seconds 2

    Remove-Item $androidDir -Recurse -Force
    Write-Host "Android folder deleted." -ForegroundColor Green
} else {
    Write-Host "Android folder not found, skipping delete." -ForegroundColor Yellow
}

Write-Host "`n=== Step 3: expo prebuild (Android only) ===" -ForegroundColor Cyan
Set-Location $appDir
npx expo prebuild --platform android --clean
Write-Host "Expo prebuild complete." -ForegroundColor Green

Write-Host "`n=== Step 3.5: Create local.properties ===" -ForegroundColor Cyan
$localProps = "$appDir\android\local.properties"
$sdkPath = "C:/Users/sntha/AppData/Local/Android/Sdk"
Set-Content -Path $localProps -Value "sdk.dir=$sdkPath"
Write-Host "local.properties created with SDK path." -ForegroundColor Green

Write-Host "`n=== Step 4: Patch gradle.properties ===" -ForegroundColor Cyan
$gradleProps = "$appDir\android\gradle.properties"
$propsContent = Get-Content $gradleProps -Raw

# Increase JVM memory
$propsContent = $propsContent -replace 'org\.gradle\.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m'

# Set Java home for Android Studio JBR
if ($propsContent -notmatch 'org\.gradle\.java\.home') {
    $propsContent += "`norg.gradle.java.home=C:/Program Files/Android/Android Studio/jbr"
}

# Enable parallel builds
if ($propsContent -notmatch 'org\.gradle\.parallel') {
    $propsContent += "`norg.gradle.parallel=true"
} else {
    $propsContent = $propsContent -replace 'org\.gradle\.parallel=.*', 'org.gradle.parallel=true'
}

# Signing config
$signingBlock = @"

# Release Signing Configurations (Google Play Store)
MYAPP_RELEASE_STORE_FILE=../my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=@Square1993
MYAPP_RELEASE_KEY_PASSWORD=@Square1993
"@

if ($propsContent -notmatch 'MYAPP_RELEASE_STORE_FILE') {
    $propsContent += $signingBlock
}

Set-Content $gradleProps $propsContent -NoNewline
Write-Host "gradle.properties patched." -ForegroundColor Green

Write-Host "`n=== Step 5: Patch app/build.gradle (signing config) ===" -ForegroundColor Cyan
$appBuildGradle = "$appDir\android\app\build.gradle"
$buildContent = Get-Content $appBuildGradle -Raw

# Insert signing configs block if not present
if ($buildContent -notmatch 'MYAPP_RELEASE_STORE_FILE') {
    # Add signingConfigs block after "android {" line
    $releaseSigningConfig = @'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
'@

    # Patch defaultConfig to use release signing
    $buildContent = $buildContent -replace '(buildTypes\s*\{[^}]*debug\s*\{[^}]*\})', @'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    $1
'@
}

# Ensure release buildType uses release signing
if ($buildContent -notmatch 'signingConfig signingConfigs\.release') {
    $buildContent = $buildContent -replace '(\/\/ Caution! In production, you need to generate your own keystore file\.\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\s*)signingConfig signingConfigs\.debug', @'
$1if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }
'@
}

Set-Content $appBuildGradle $buildContent -NoNewline
Write-Host "app/build.gradle patched." -ForegroundColor Green

Write-Host "`n=== Step 6: Copy keystore into android folder ===" -ForegroundColor Cyan
Copy-Item "$appDir\my-release-key.keystore" "$appDir\android\my-release-key.keystore" -Force
Write-Host "Keystore copied to android folder." -ForegroundColor Green

Write-Host "`n=== Step 7: Build release APK ===" -ForegroundColor Cyan
Set-Location "$appDir\android"
.\gradlew assembleRelease
Write-Host "`n=== BUILD COMPLETE ===" -ForegroundColor Green
$apkPath = "$appDir\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    Write-Host "APK generated at: $apkPath" -ForegroundColor Green
} else {
    Write-Host "APK not found at expected path. Check build output above." -ForegroundColor Yellow
}
