import { AudioCacheService } from './AudioCacheService';
import type { OpenAIModel, OpenAIVoice } from '../types/srs';

export interface OpenAITTSOptions {
  apiKey: string;
  voice?: OpenAIVoice;
  model?: OpenAIModel;
  speed?: number;
}

class OpenAITTSServiceImpl {
  private activeAudio: HTMLAudioElement | null = null;

  public getCacheKey(text: string, voice: OpenAIVoice = 'alloy', model: OpenAIModel = 'tts-1', speed: number = 1.0): string {
    const cleanText = text.trim().toLowerCase();
    return `openai_${model}_${voice}_${speed.toFixed(1)}_${cleanText}`;
  }

  public async fetchAudioBlob(text: string, options: OpenAITTSOptions): Promise<Blob> {
    const { apiKey, voice = 'alloy', model = 'tts-1', speed = 1.0 } = options;

    if (!apiKey || !apiKey.trim()) {
      throw new Error('OpenAI API key is missing. Please configure it in Settings.');
    }

    const cacheKey = this.getCacheKey(text, voice, model, speed);
    const cachedBlob = await AudioCacheService.getAudio(cacheKey);
    if (cachedBlob) {
      return cachedBlob;
    }

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      let errorMessage = `OpenAI TTS error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // use status text
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    // Cache in IndexedDB for subsequent zero-cost reviews
    await AudioCacheService.setAudio(cacheKey, blob);

    return blob;
  }

  public async playAudio(
    text: string,
    options: OpenAITTSOptions,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
    }
  ): Promise<void> {
    this.stop();

    try {
      callbacks?.onStart?.();
      const blob = await this.fetchAudioBlob(text, options);
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.activeAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.activeAudio = null;
        callbacks?.onEnd?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this.activeAudio = null;
        callbacks?.onError?.(new Error('Audio playback failed.'));
      };

      await audio.play();
    } catch (err: any) {
      callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public stop(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }
  }
}

export const OpenAITTSService = new OpenAITTSServiceImpl();
