# AgentGuard Store Submission Guide

This guide provides the necessary information for submitting AgentGuard to major app stores (Apple App Store, Google Play, Microsoft Store).

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
