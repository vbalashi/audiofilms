# **Audio Films — MVP (Working Title)**

**A phrase-based listening comprehension trainer for YouTube videos.**

Audio Films helps language learners practice *blind listening* by playing short phrases from a YouTube video and revealing the text only when the learner is ready.

This README describes the **MVP scope**, **architecture**, and **setup instructions** for developers.

---

## **✨ MVP Overview**

The app allows a user to:

1. Paste a **YouTube URL**
2. Automatically fetch **English manual captions**
3. Practice *phrase-by-phrase listening*
4. Reveal the text when ready
5. Click any word to see its **definition**

This is a **desktop-only**, single-user web tool.
No authentication, no persistence, no mobile support.

---

## **🎧 Core User Flow**

1. User opens the site.
2. User pastes a YouTube link.
3. The app fetches English captions using `youtube-transcript`.
4. Captions are converted into phrase objects:

   ```ts
   { id, startSec, endSec, text }
   ```
5. In **Blind Mode**:

   * Video is blurred.
   * Text is masked with underscores.
   * User listens to one phrase at a time using keyboard shortcuts.
6. Press ↓ to reveal text (Read Mode).
7. In Read Mode:

   * Full text visible.
   * Each word is clickable → dictionary definition.

---

## **⌨️ Keyboard Shortcuts**

| Action                           | Shortcut          |
| -------------------------------- | ----------------- |
| Play / Pause current phrase      | **Space**         |
| Replay phrase from start         | **Shift + Space** |
| Next phrase                      | **→**             |
| Previous phrase                  | **←**             |
| Reveal text (enter Read Mode)    | **↓**             |
| Hide text (Back to Blind Mode)   | **↑**             |
| Define selected word (Read Mode) | **D**             |

---

## **🧠 Features Included in MVP**

### **1. YouTube IFrame Player**

* Handled by `react-youtube`
* Blurred in Blind Mode (CSS: `blur-xl grayscale opacity-80`)
* No video/audio downloads

### **2. Subtitle Fetching**

API route:

```
GET /api/get-subs?videoId=<id>
```

* Uses `youtube-transcript`
* Converts captions into phrase objects
* Returns `{ phrases: Phrase[] }`

### **3. Phrase Playback Engine**

* Loop 1 phrase at a time
* Uses `requestAnimationFrame` to detect phrase end
* Padding:

  * `paddingStart = -0.2s`
  * `paddingEnd   = +0.2s`

### **4. Blind Mode**

* Video blurred
* Subtitle text masked:

  ```
  Well, admittedly → ____, ____________
  ```

### **5. Read Mode + Dictionary**

API route:

```
GET /api/dict?word=<word>
```

* Proxies to Free Dictionary API
* On 404 → provide Google Translate fallback
* Clickable word spans

---

## **🏗️ Tech Stack**

### **Frontend**

* Next.js 14+ (App Router)
* TypeScript
* React
* Zustand (player state)
* Tailwind CSS
* react-youtube

### **Backend**

* Next.js API Routes (Node runtime)
* `youtube-transcript` for caption retrieval

### **Optional**

* lucide-react (icons)
* shadcn/ui components (if desired)

---

## **🚫 Out of Scope (MVP)**

The following **will NOT** be implemented in MVP:

* User accounts / login
* Saving user progress
* Storing videos or subtitles
* Japanese/Chinese tokenization
* Automatic speech recognition (ASR)
* Mobile Safari or background audio support
* Screenshots or ffmpeg usage

This keeps the MVP simple, deployable, and fast to build.

---

## **📁 Project Structure (Suggested)**

```
src/
  app/
    page.tsx                // Video URL input
    watch/[videoId]/page.tsx
    api/
      get-subs/route.ts     // Subtitle fetcher
      dict/route.ts         // Dictionary proxy
  components/
    PlayerLayout.tsx
    YouTubePlayer.tsx
    KeyboardHandler.tsx
    SentenceDisplay.tsx
  store/
    playerStore.ts
  data/
    mock-subs.ts
  types/
    subtitles.ts
```

---

## **🚀 Getting Started**

### **1. Create the App**

```bash
npx create-next-app@latest audio-films \
  --typescript --tailwind --eslint
cd audio-films
```

### **2. Install Dependencies**

```bash
npm install zustand react-youtube youtube-transcript
npm install -D lucide-react
```

### **3. Add Store, Components, and API Routes**

Copy the supplied code from this repo into:

* `store/playerStore.ts`
* `components/*`
* `api/get-subs/route.ts`
* `api/dict/route.ts`

### **4. Run Dev Server**

```bash
npm run dev
```

Open:
`http://localhost:3000/watch/dQw4w9WgXcQ` (example YouTube ID)

---

## **🏁 MVP Success Criteria**

The app is considered **feature complete** when a user can:

### ✓ Paste a YouTube URL

### ✓ Load English captions

### ✓ Loop through phrases using keyboard only

### ✓ Toggle Blind / Read modes

### ✓ Reveal text on demand

### ✓ Click words to see definitions

If all of these work smoothly, the MVP is **done**.


