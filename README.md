# LightCycle ⚡

LightCycle is a Progressive Web App (PWA) designed to track and predict recurring electricity or power availability schedules (such as 3 days ON / 1 day OFF). 

It is designed to be **offline-first, local-only, and deterministic**. There is no backend, no cloud database, no accounts, and no tracking. Everything runs completely inside your browser and device.

---

## 🛠️ Technology Stack

* **Frontend Framework:** React 19 + TypeScript + Vite
* **Styling:** Tailwind CSS v4 (native CSS-first styling engine)
* **Local Database:** IndexedDB (abstracted using Dexie and Dexie React Hooks)
* **Progressive Web App:** `vite-plugin-pwa` for precaching and service worker management
* **Icon Set:** Lucide React
* **Unit Testing:** Vitest

---

## ⚡ Core Architecture

```text
                    ┌─────────────────────┐
                    │       React UI      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Application State │
                    └──────────┬──────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
       ┌───────▼────────┐              ┌───────▼────────┐
       │ Schedule Engine│              │ IndexedDB      │
       │ (Deterministic)│              │ (Local Store)  │
       └────────────────┘              └────────────────┘
```

The application separates UI presentation from core scheduling logic:
1. **Timezone Integrity:** All calculations utilize pure calendar strings (`YYYY-MM-DD`) and UTC midnights. This prevents issues caused by local browser time shifts or Daylight Savings.
2. **Deterministic Predictor:** Statuses are calculated mathematically on-the-fly based on:
   * Cycle length (`ON days` + `OFF days`)
   * Reference date (where status was known)
   * Target date
   * Modulo operations to find the cycle position.
3. **Database Repositories:** Isolated wrapper layers around IndexedDB handle create, read, update, delete, and manual override tracking.

---

## 📲 PWA & Offline Experience

### Offline Precaching
Vite PWA is configured to precache all static assets (HTML, Compiled JavaScript, CSS styles, and icons). Once initial loading succeeds, the application functions **100% offline** (tested with Airplane mode active).

### Installation Instructions
* **Android (Chrome):** Launch the URL in Chrome, click the three-dot browser menu, and tap **"Install App"** or **"Add to Home screen"**.
* **iOS Safari (iPhone/iPad):** Open the URL in Safari, click the share button, scroll down, and tap **"Add to Home Screen"**.
* **Desktop (Chrome/Edge):** Click the installation icon (monitor with a down-arrow) in the address bar, or select **"Install LightCycle..."** from settings.

---

## ⚠️ Notification Limitations

This app is backend-free, utilizing the local **Web Notifications API**:
* **Android/Desktop:** Reminders trigger successfully when the app is active or cached in the background.
* **iOS Safari:** iOS does *not* support local background scheduling from standard service workers when the app is closed. Reminders on iOS will only trigger if the app is active.

---

## 💾 Data Portability & Backup

Because data remains on-device, LightCycle includes backup options under **Settings**:
* **Export Backup:** Downloads a versioned JSON file of all schedules and calendar logs.
* **Import Backup:** Restores backups from other devices (e.g. sharing schedules with family via messaging apps).

---

## ⚙️ Development Commands

### 1. Initial Setup
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Run Unit Tests
```bash
npm run test
```

### 4. Build Production Bundle
```bash
npm run build
```

### 5. Local Production Preview
```bash
npm run preview
```
