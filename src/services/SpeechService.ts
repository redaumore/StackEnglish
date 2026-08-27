/**
 * SpeechService - Native Web Speech API wrapper for Text-to-Speech
 * Supports voice detection (prioritizing en-US and en-GB), playback rate controls,
 * and robust cancel/restart mechanics.
 */

export interface SpeechVoiceOption {
  uri: string;
  name: string;
  lang: string;
  isPreferred: boolean;
}

class SpeechServiceImpl {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.synth);
  }

  public onVoicesReady(cb: () => void): () => void {
    this.listeners.push(cb);
    if (this.isLoaded) {
      cb();
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private loadVoices() {
    if (!this.synth) return;
    const available = this.synth.getVoices();
    if (available && available.length > 0) {
      this.voices = available;
      this.isLoaded = true;
      this.listeners.forEach((cb) => cb());
    }
  }

  public getAvailableVoices(): SpeechVoiceOption[] {
    if (!this.synth) return [];
    if (!this.isLoaded || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    // Filter English voices or return all if no English
    const englishVoices = this.voices.filter((v) => v.lang.startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : this.voices;

    return pool.map((voice) => {
      const isPreferred =
        voice.lang === 'en-US' ||
        voice.lang === 'en-GB' ||
        voice.name.includes('Natural') ||
        voice.name.includes('Google') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Daniel');

      return {
        uri: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        isPreferred,
      };
    });
  }

  public getPreferredVoice(preferredURI?: string): SpeechSynthesisVoice | null {
    if (!this.synth || this.voices.length === 0) return null;

    if (preferredURI) {
      const found = this.voices.find((v) => v.voiceURI === preferredURI);
      if (found) return found;
    }

    // Heuristic selection: High quality English voices
    const enVoices = this.voices.filter((v) => v.lang.startsWith('en'));
    const naturalVoice = enVoices.find((v) => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'));
    if (naturalVoice) return naturalVoice;

    const usVoice = enVoices.find((v) => v.lang === 'en-US');
    if (usVoice) return usVoice;

    const gbVoice = enVoices.find((v) => v.lang === 'en-GB');
    if (gbVoice) return gbVoice;

    return enVoices[0] || this.voices[0] || null;
  }

  public speak(
    text: string,
    options?: {
      voiceURI?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    if (!this.synth) {
      options?.onError?.(new Error('SpeechSynthesis not supported in this browser.'));
      return;
    }

    // Cancel existing utterance to prevent speech backlog
    this.synth.cancel();

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    const voice = this.getPreferredVoice(options?.voiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      // Ignore 'interrupted' / 'canceled' errors when user clicks fast
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        options?.onError?.(e);
      } else {
        options?.onEnd?.();
      }
    };

    // Small timeout ensures clean start on Chrome/Safari
    setTimeout(() => {
      this.synth?.speak(utterance);
    }, 10);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const SpeechService = new SpeechServiceImpl();
