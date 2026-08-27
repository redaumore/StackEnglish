# Anki4Devs 🚀
> **Spaced Repetition System (SRS) for Professional English in Software Engineering**

**Anki4Devs** is a production-ready, client-side Spaced Repetition Single Page Application built specifically for software engineers, tech leads, and engineering managers to master high-impact idiomatic expressions across 5 core meeting scenarios:
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
- **Embedded 110-Phrase Starter Deck**: Meticulously curated with authentic engineering vocabulary (e.g. *thundering herd with jitter*, *blast radius mitigation*, *de-scoping non-critical features*).
- **Deck Library & CRUD**: Instant search, filter by meeting context and status, create custom phrases, edit, and delete.
- **Zero-Setup Offline Storage**: LocalStorage persistence with 1-click JSON backup and merge/replace JSON import.
- **Developer-Centric Aesthetic**: Clean Dark Mode by default with Tailwind CSS, Lucide icons, and responsive layout.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Celebration & Sound**: Canvas Confetti & Web Audio API synthesis
- **TTS**: Native Browser `window.speechSynthesis`

---

## 🚀 Quickstart

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
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
