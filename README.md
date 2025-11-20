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

---

## Subtitle Fetching & Known Issues

During development, we encountered significant challenges with fetching YouTube subtitles due to YouTube's strict IP blocking and rate limiting, particularly when running from cloud/hosting environments.

### What We Tried (and what failed)

1.  **`youtube-transcript` Library**:
    *   **Method**: Uses YouTube's internal `timedtext` API endpoint.
    *   **Result**: Returned 0 items. The API request succeeded (HTTP 200 OK) but returned an empty body.
    *   **Root Cause**: YouTube blocks the `timedtext` endpoint for certain IP ranges (likely data centers, VPS, cloud hosting).

2.  **Direct Scraping (`fetch`/`curl`)**:
    *   **Method**: Extracted `captionTracks` from the video page HTML and tried fetching the `baseUrl` directly.
    *   **Attempts**: Tried with various headers (`User-Agent`, `Referer`, `Cookie`, `Accept-Language`), removing IP parameters, and using different formats (`json3`, `vtt`, XML).
    *   **Result**: Consistently returned HTTP 200 OK with an empty body (0 bytes).
    *   **Root Cause**: Same IP blocking as above - YouTube validates the request origin.

3.  **`@distube/ytdl-core`**:
    *   **Method**: A maintained fork of `ytdl-core` that handles signature deciphering and player script parsing.
    *   **Result**: Successfully fetched video metadata and track lists, but failed to fetch the actual track content (empty body).
    *   **Root Cause**: Confirms the IP block affects the content delivery specifically, not just the metadata.

4.  **Browser Verification**:
    *   **Method**: Used a headless browser to visit the `timedtext` URL directly.
    *   **Result**: Empty page, confirming the block persists even with full browser context.

### Current Solution (Mock Fallback)

To ensure the MVP is demonstrable, we have implemented a **mock fallback** for the demo video (`dQw4w9WgXcQ` - "Never Gonna Give You Up").

*   **Implementation**: The `/api/get-subs` route checks if the video ID matches the demo video when subtitle fetching fails or returns empty results.
*   **Fallback Data**: Returns a hardcoded set of 12 subtitle phrases synchronized to the song lyrics.
*   **Code Location**: `app/src/app/api/get-subs/route.ts` (lines 17-38 for empty result case, lines 55-73 for error case).

### Why This Approach Works

The mock fallback works because:
1. It bypasses YouTube's API entirely for the demo video.
2. It provides a consistent, reliable experience for testing and demonstration.
3. It allows the rest of the application logic (phrase navigation, blind mode, etc.) to function correctly.

### Production Considerations

For a production deployment with real subtitle fetching, you would need one of the following:

1.  **Residential Proxies**: Route requests through residential IP addresses to bypass YouTube's datacenter IP blocks.
2.  **Browser-Based Scraper**: Use Puppeteer/Playwright to simulate a full user session with proper cookies and session state.
3.  **YouTube Data API v3**: Use the official API (requires OAuth, has quota limits, and doesn't always provide auto-generated captions).
4.  **User-Side Fetching**: Move subtitle fetching to the client-side browser where YouTube's restrictions are less strict.

**Note**: The current implementation with `youtube-transcript` will work correctly from residential IP addresses (e.g., home internet connections), but fails from most cloud/VPS environments.
