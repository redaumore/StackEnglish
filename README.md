# StackEnglish 🚀
> **Spaced Repetition System (SRS) for Professional English in Software Engineering**

**StackEnglish** is a production-ready, client-side Spaced Repetition Single Page Application built specifically for software engineers, tech leads, and engineering managers to master high-impact idiomatic expressions across 5 core meeting scenarios:
1. **Kick-offs & Inceptions**
2. **Daily Standups & Follow-ups**
3. **Scope Negotiation & Pushback**
4. **Architecture Reviews & System Design**
5. **Blameless Incident Post-Mortems**

---

## ⚡ Key Features

- **SuperMemo SM-2 Algorithm**: Exact implementation tracking interval growth, ease factors (min 1.3, default 2.5), repetitions, and scheduled review dates.
- **Dynamic Daily Sessions**: Auto-prioritizes due cards (`dueDate <= now`) combined with daily new unstudied cards (configurable limit).
- **20-Minute Focus Timer**: Countdown timer with soft audio chimes and cognitive fatigue warnings.
- **Native Web Speech API (TTS)**: Built-in voice playback with dialect filtering (`en-US` / `en-GB`), speed rate control (0.8x, 1.0x, 1.2x), and instant pronunciation for phrases and meeting sentences.
- **Keyboard-First Navigation**:
  - `Space`: Reveal definition and technical example sentence.
  - `1`: Again (Fail, reset to 1d)
  - `2`: Hard (1.2x interval)
  - `3`: Good (Standard SM-2 interval * EF)
  - `4`: Easy (1.3x interval boost)
- **Speaking Scripts & Multimodal Speech Evaluation**:
  - Interactive technical dialogue simulator between software engineers (Architects, Leads, SREs, Product Managers).
  - Client-side audio recording (`useAudioRecorder`) across Chromium, Firefox, and Safari via `MediaRecorder`.
  - Multimodal AI speech evaluation calibrated on a `0.0 - 10.0` scale evaluating stress, rhythm, and intelligibility against target dialogue lines.
  - Inline phonetic highlighting and tooltips for phoneme, word stress, omitted sounds, and added sounds (`SpeechAnnotationTooltip`).
  - One-click "Add to Anki" button directly from pronunciation feedback tooltips.
  - Strict dialogue completion threshold: dialogues require an average score $\ge 7.0$ to pass; sessions under 7.0 prompt targeted retries.
- **Embedded 110-Phrase Starter Deck**: Meticulously curated with authentic engineering vocabulary (e.g. *thundering herd with jitter*, *blast radius mitigation*, *de-scoping non-critical features*).
- **Deck Library & CRUD**: Instant search, filter by meeting context and status, create custom phrases, edit, and delete.
- **Zero-Setup Offline Storage**: LocalStorage persistence with 1-click JSON backup and merge/replace JSON import.
- **Developer-Centric Aesthetic**: Clean Dark Mode by default with Tailwind CSS, Lucide icons, and responsive layout.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Validation**: Zod runtime schema validation
- **AI Models & Speech Evaluation (OpenAI)**:
  - **Transcription**: OpenAI Whisper (`whisper-1`) for acoustic speech recognition
  - **Pronunciation & Dialogue Evaluation**: OpenAI `gpt-4o-mini` with structured JSON output
  - **Speech Synthesis (TTS)**: OpenAI `tts-1` & `tts-1-hd` neural voices (`alloy`, `nova`, `onyx`, `echo`, `fable`, `shimmer`)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Celebration & Sound**: Canvas Confetti & Web Audio API synthesis
- **TTS Fallback**: Native Browser `window.speechSynthesis`

---

## ⚙️ Environment Configuration (`.env`)

You can provide your OpenAI API key via a `.env` file at the root of the project:

```bash
# .env
OPENAI_API_KEY=sk-proj-...
```

- When `OPENAI_API_KEY` is present in `.env`:
  - **Flashcards**: Automatically activates **OpenAI Neural TTS (`tts-1`)** for authentic pronunciation of phrases and example meeting sentences with local IndexedDB caching.
  - **Speech & Pronunciation Evaluation**: Evaluates dialogues using **OpenAI Whisper (`whisper-1`)** and **`gpt-4o-mini`** for phoneme, stress, and fluency feedback on a 0.0–10.0 scale.
  - **Speaking Scripts & Dictionary**: Automatically generates tailored workplace dialogues and looks up technical definitions without manual key entry.

---

## 🚀 Quickstart

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (optional)
```bash
cp .env.example .env
# Edit .env and paste your OPENAI_API_KEY
```

### 3. Start development server
```bash
npm run dev
```

### 3. Build for production
```bash
npm run build
```

### 4. Preview production build
```bash
npm run preview
```

---

## 🧠 SM-2 Algorithm Specification

| Rating | Grade | Description | Interval Formula | Ease Factor ($\text{EF}$) |
|---|---|---|---|---|
| **Again** | `1` | Complete recall failure | Reset to $1\text{ day}$ | $\max(1.3, \text{EF} - 0.20)$ |
| **Hard** | `2` | Strained recall | $\max(1, \text{interval} \times 1.2)$ | $\max(1.3, \text{EF} - 0.15)$ |
| **Good** | `3` | Correct recall | $\text{interval} \times \text{EF}$ | $\text{EF} + (0.1 - (5-4)(0.08 + (5-4)0.02))$ |
| **Easy** | `4` | Effortless recall | $\text{interval} \times \text{EF} \times 1.3$ | $\max(1.3, \text{EF} + 0.15)$ |
