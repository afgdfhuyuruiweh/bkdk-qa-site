# BkDk Q&A Space 💥⚡

BkDk Q&A Space is a premium, highly aesthetic, single-owner Q&A web application themed around **Bakugo Katsuki & Midoriya Izuku (BkDk)** from *My Hero Academia*. It features glassmorphism cards, responsive column layout, a custom HTML5 canvas particle background, and real-time synchronization with Google Firebase.

---

## 🎨 Themes

You can swap themes in the owner settings panel:
1. **Wonder Duo (Default)**: A beautiful hybrid gradient of Bakugo's explosive orange and Deku's emerald green, featuring dual-color glowing canvas particles.
2. **Dynamight 💥**: Matte charcoal-black and orange glowing elements inspired by Kacchan, featuring floating amber nitro sparks.
3. **Deku ⚡**: Emerald teal and red-boot accents inspired by Izuku, featuring neon cyan lightning bolts (Full Cowl style).
4. **Comic Grid 📖**: A unique, retro halftone comic style layout featuring ink borders and manga panel drop shadows (particles are disabled for this theme to preserve the static print comic aesthetic!).

---

## 📂 Project Structure

- **`index.html`**: SPA layout containing the landing portal, profile feed, dashboard, settings panel, and sharing preview elements.
- **`styles.css`**: Design system specifying the four custom themes, responsive layouts, borders, glows, and animations.
- **`db.js`**: Database adapter using `localStorage` for localized persistence. Prefilled with default BkDk profile configurations and headcanon Q&As.
- **`auth.js`**: Session manager for logging into the dashboard (both mock-local and Firebase-active).
- **`firebase-config.js`**: Holds details for connecting to your online Firebase project.
- **`firebase-sync.js`**: Real-time connector that swaps standard mock operations for Firestore and Firebase Auth when config keys are filled.
- **`app.js`**: Orchestrator controlling routes, settings, posts/questions rendering, twemoji icons, and the canvas animations.

---

## 💻 How to Run Locally

You can run this site instantly on your computer:
1. **Double Click**: Double click [index.html](file:///C:/Users/arang/.gemini/antigravity/scratch/bkdk-qa-site/index.html) in your Windows Explorer. It runs locally out-of-the-box!
2. **Local Port Server**: If you want to run it on a local server, run the following in PowerShell:
   ```powershell
   python -m http.server 8000
   ```
   Then open your browser to `http://localhost:8000`.

---

## 🌐 Deploying to the Internet (For Free)

### Option 1: Vercel (Fastest & Simplest)
1. Go to [Vercel](https://vercel.com/) and register for a free account.
2. Click **Add New** -> **Project**.
3. Drag-and-drop the entire `bkdk-qa-site` folder directly into Vercel's upload dropzone.
4. Vercel will deploy it in seconds and give you a free, custom link (like `bkdkaskme.vercel.app`).

### Option 2: GitHub Pages
1. Go to [GitHub](https://github.com/) and create a new repository (e.g. `bkdkask`).
2. Upload the files (`index.html`, `styles.css`, `app.js`, `db.js`, `auth.js`, `firebase-config.js`, `firebase-sync.js`, `package.json`) to the repository.
3. Go to **Settings** -> **Pages** in the repo.
4. Under **Build and deployment**, select **Deploy from a branch**, select the `main` branch, and click **Save**.
5. Your page will be online at `https://your-username.github.io/bkdkask/` within 2 minutes!

---

## 🔒 Activating Firebase Real-Time Database & Google Auth

To make your site live so people can ask you real questions:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Create a Project**.
2. Go to **Build > Authentication** and enable the **Google** sign-in provider.
3. Go to **Build > Firestore Database** and click **Create Database** (start in test mode or production mode).
4. Register a Web App in your project settings and copy the keys.
5. Open [firebase-config.js](file:///C:/Users/arang/.gemini/antigravity/scratch/bkdk-qa-site/firebase-config.js) and paste the keys:
   ```javascript
   window.FIREBASE_CONFIG = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```
6. Deploy the changes. The first Google account to log into the site will lock down sole ownership of the Q&A box, preventing anyone else from entering the dashboard!
