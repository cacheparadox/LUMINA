# ✨ LUMINA — Your Emotional Garden

> A beautiful, offline-first, emotionally intelligent journaling system that evolves alongside you.

![Main Interface](public/splash.png)

LUMINA is not just a notes app. It is a memory archive, a mood mirror, and a private emotional ecosystem. Designed with a cozy, dreamy "cottagecore" aesthetic, it provides a safe space for your late-night thoughts under fairy lights.

## 🌸 Features

*   **Offline-First & Local:** Your private thoughts never leave your device unless you want them to. All data is securely stored locally using IndexedDB (via Dexie.js), and the app runs entirely offline as an installable PWA.
*   **Security:** Built-in PIN lockbox and biometric (fingerprint/Face ID) unlock support.
*   **AI Emotional Analysis:** Integrates seamlessly with OpenRouter (Claude, GPT, Gemini). Automatically scores your entries for emotional intensity (1-10) and tags high-intensity entries as **Memories ⚡**.
*   **Voice Journaling:** Native voice recording with waveform visualization and auto-transcription using the Web Speech API.
*   **Dream Space:** A distraction-free, dark-themed writing environment featuring a beautiful particle background and soothing rain ambience (Web Audio API).
*   **Habit & Self-Care Tracking:** Track sleep, water, workouts, and meditation directly in the app.
*   **Gratitude Garden:** A dedicated space for daily positive reflections.
*   **Mood & Calendar Heatmap:** Visualize your emotional journey with color-coded, interactive monthly heatmaps and mood distribution charts.
*   **Memory Timeline & Photo Wall:** Browse past entries in a chronological timeline or view your photo memoirs in a Pinterest-style masonry grid.
*   **Notifications & Reminders:** Gentle check-ins, yearly rewinds, and monthly/yearly anniversary notifications for your past entries.
*   **Aesthetic Customization:** Personalize your journal with different font choices, color themes (Cream, Lavender, Rose, Midnight, etc.), and ambient background sounds.
*   **RAG-Ready AI Chat:** "Talk to your past self" by asking the AI questions about your previous journal entries.

## 🚀 Technology Stack

*   **Framework:** Next.js 16 (App Router)
*   **Styling:** Vanilla CSS, minimal Tailwind, and Framer Motion for buttery-smooth animations and glassmorphism UI.
*   **Database:** Dexie.js (IndexedDB wrapper)
*   **AI Backend:** OpenRouter (Multi-model fallback)
*   **PWA:** Custom Service Worker (`sw.js`) and Manifest for native app-like installation.

## 🛠️ Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/LokiLaufeyson-TheTrickster/LUMINA.git
   cd LUMINA
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
5. (Optional) Navigate to **Settings** within the app to add your OpenRouter API key to enable AI Emotion Scoring and Chat features.

## 🌙 Design Philosophy

LUMINA embraces the "late-night thoughts under fairy lights" vibe. It avoids sterile tech aesthetics in favor of:
*   Soft cream backgrounds and warm pink/lavender accents
*   Glassmorphism cards and smooth Framer Motion transitions
*   Floating particles (HTML5 Canvas) instead of heavy DOM elements
*   A focus on user privacy (Local-First Policy)

---
*Built with love, for your inner world.*
