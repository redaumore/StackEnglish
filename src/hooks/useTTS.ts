import { useState, useEffect, useCallback } from 'react';
import { SpeechService } from '../services/SpeechService';
import type { SpeechVoiceOption } from '../services/SpeechService';
import { OpenAITTSService } from '../services/OpenAITTSService';
import { AudioCacheService } from '../services/AudioCacheService';
import type { UserSettings } from '../types/srs';

export function useTTS(settings?: Partial<UserSettings>) {
  const [voices, setVoices] = useState<SpeechVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(settings?.preferredVoiceURI || '');
  const [rate, setRate] = useState<number>(settings?.playbackRate || 1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [cachedAudioCount, setCachedAudioCount] = useState<number>(0);

  // Sync available Web Speech voices
  useEffect(() => {
    const updateVoices = () => {
      const available = SpeechService.getAvailableVoices();
      setVoices(available);
      if (!selectedVoiceURI && available.length > 0) {
        const preferred = available.find((v) => v.isPreferred);
        if (preferred) {
          setSelectedVoiceURI(preferred.uri);
        } else {
          setSelectedVoiceURI(available[0].uri);
        }
      }
    };

    updateVoices();
    const cleanup = SpeechService.onVoicesReady(updateVoices);
    return cleanup;
  }, [selectedVoiceURI]);

  // Refresh cached audio count
  const refreshCacheCount = useCallback(async () => {
    try {
      const count = await AudioCacheService.countCached();
      setCachedAudioCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    AudioCacheService.countCached().then((count) => {
      if (isMounted) setCachedAudioCount(count);
    });
    return () => {
      isMounted = false;
    };
  }, []);


  const speak = useCallback(
    async (text: string, textId?: string, overrideSettings?: Partial<UserSettings>) => {
      if (!text.trim()) return;

      const activeSettings = { ...settings, ...overrideSettings };
      const currentId = textId || text;
      setActiveTextId(currentId);

      // Stop any current audio
      SpeechService.stop();
      OpenAITTSService.stop();

      // Check provider
      if (activeSettings.ttsProvider === 'openai' && activeSettings.openAIApiKey?.trim()) {
        setIsLoading(true);
        try {
          await OpenAITTSService.playAudio(
            text,
            {
              apiKey: activeSettings.openAIApiKey,
              voice: activeSettings.openAIVoice || 'alloy',
              model: activeSettings.openAIModel || 'tts-1',
              speed: activeSettings.playbackRate || rate || 1.0,
            },
            {
              onStart: () => {
                setIsLoading(false);
                setIsSpeaking(true);
              },
              onEnd: () => {
                setIsSpeaking(false);
                setIsLoading(false);
                setActiveTextId(null);
                refreshCacheCount();
              },
              onError: (err) => {
                console.warn('OpenAI TTS error, falling back to Web Speech:', err);
                setIsLoading(false);
                // Fallback to Web Speech
                SpeechService.speak(text, {
                  voiceURI: selectedVoiceURI,
                  rate: rate,
                  onStart: () => setIsSpeaking(true),
                  onEnd: () => {
                    setIsSpeaking(false);
                    setActiveTextId(null);
                  },
                  onError: () => {
                    setIsSpeaking(false);
                    setActiveTextId(null);
                  },
                });
              },
            }
          );
        } catch (e) {
          console.error(e);
          setIsLoading(false);
          setIsSpeaking(false);
          setActiveTextId(null);
        }
      } else {
        // Standard Web Speech API
        setIsSpeaking(true);
        SpeechService.speak(text, {
          voiceURI: selectedVoiceURI,
          rate: rate,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            setActiveTextId(null);
          },
          onError: () => {
            setIsSpeaking(false);
            setActiveTextId(null);
          },
        });
      }
    },
    [settings, selectedVoiceURI, rate, refreshCacheCount]
  );

  const stop = useCallback(() => {
    SpeechService.stop();
    OpenAITTSService.stop();
    setIsSpeaking(false);
    setIsLoading(false);
    setActiveTextId(null);
  }, []);

  const clearAudioCache = useCallback(async () => {
    await AudioCacheService.clearCache();
    setCachedAudioCount(0);
  }, []);

  return {
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    rate,
    setRate,
    isSpeaking,
    isLoading,
    activeTextId,
    cachedAudioCount,
    speak,
    stop,
    clearAudioCache,
    refreshCacheCount,
    isSupported: SpeechService.isAvailable(),
  };
}
