# AgentGuard Store Submission Guide

This guide provides the necessary information for submitting AgentGuard to major app stores (Apple App Store, Google Play, Microsoft Store).

## 0. App Icon & Native Platform Setup

The app icon/logo lives in two forms:
*   **Web/PWA:** `public/favicon.ico`, `public/apple-touch-icon.png`, and `public/icons/*` are already wired up in `index.html` and `public/manifest.json`.
*   **Native (iOS/Android) source:** `resources/icon.png` (1024x1024, no alpha) and `resources/splash.png` (2732x2732) are the master assets used to generate every native icon/splash size.

To generate the native platforms and populate their icon/splash catalogs:
```bash
npx cap add ios
npx cap add android
npm install --save-dev @capacitor/assets   # requires network access to download prebuilt `sharp` binaries
npx capacitor-assets generate
npx cap sync
```

**Apple Privacy Manifest:** After running `npx cap add ios`, copy `PrivacyInfo.xcprivacy` (repo root) into `ios/App/App/PrivacyInfo.xcprivacy` and add it to the `App` target in Xcode (required by Apple for all new/updated App Store submissions). It declares the same "no tracking, app-functionality-only" data use described in section 1 below — review and adjust the `NSPrivacyAccessedAPITypes` entries if you add further native plugins.

**Required Info.plist entries** (add via Xcode after `cap add ios`, in `ios/App/App/Info.plist`):
*   `NSLocationWhenInUseUsageDescription` — the app optionally reads device location to ground Gemini's Google Maps search grounding for a scan; e.g. "AgentGuard uses your location to improve the accuracy of security grounding results for your scan."
*   `NSFaceIDUsageDescription` — required because of the optional biometric-unlock feature; e.g. "AgentGuard uses Face ID to protect access to the app."

## 1. App Store Connect (Apple) - Privacy Nutrition Label

**Data Collection:**
*   **Contact Info:** Not collected.
*   **Identifiers:** Not collected.
*   **Usage Data:** Not collected.
*   **Diagnostics:** Not collected.
*   **Other Data:** 
    *   **Scan Targets:** The app processes URLs or text provided by the user for security analysis. This data is processed in real-time and not stored.
    *   **Cookie Consent:** A local preference is stored on the device to remember privacy choices.

**Data Use:**
*   **Product Personalization:** To remember privacy preferences.
*   **App Functionality:** To perform the security scan via third-party AI (Google Gemini).

**Data Linked to User:** No.
**Tracking:** No.

---

## 2. Google Play - Data Safety Form

**Data Collection and Security:**
*   **Does your app collect or share any of the required user data types?** Yes.
*   **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS).
*   **Do you provide a way for users to request that their data be deleted?** Yes (via the "Clear Local Data" button in the app).

**Data Types Collected:**
*   **App Activity:** 
    *   **Other user-generated content:** Scan targets (URLs/Text) are collected for the purpose of "App Functionality" and "Security". This data is processed in real-time and not stored.

**Data Sharing:**
*   **Is any of the user data shared with third parties?** Yes.
    *   **Purpose:** App Functionality.
    *   **Recipient:** Google Gemini API (for security analysis).

---

## 3. Microsoft Store - IARC Rating & Packaging
...
**Packaging for Microsoft Store:**
*   **Format:** The app is configured to generate a `.msixbundle` (or `.appxupload`) via `electron-builder`.
*   **Build Command:** Run `npm run electron:build` to generate the package.
*   **Output Location:** The package will be found in the `/release` directory.
*   **Identity:** Ensure the `publisher`, `identityName`, and `applicationId` in `package.json` match your Microsoft Partner Center account exactly.

**Questionnaire Summary:**
...
*   **App Category:** Utility / Security.
*   **Violence:** No.
*   **Sexuality:** No.
*   **Language:** No.
*   **Controlled Substances:** No.
*   **Miscellaneous:**
    *   **Does the app share the user's location?** No.
    *   **Does the app allow users to purchase digital goods?** No.
    *   **Does the app contain any content that could be considered offensive?** No.
    *   **Does the app allow users to interact or exchange content with other users?** No (only via local clipboard sharing).

**Recommended Rating:** PEGI 3 / ESRB Everyone.

---

## 4. Public Privacy Policy URL

The privacy policy is hosted at:
`https://ais-dev-esep3z2wvq3veuxzkffmes-218531837450.us-west2.run.app/privacy`

This URL is public and can be used for all store submissions.
