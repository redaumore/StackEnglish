import { useState, useEffect, useRef, useCallback } from 'react';

function playSoftChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 1.2);
  } catch {
    // AudioContext blocked or unsupported, fail gracefully
  }
}

export function useTimer(initialMinutes: number = 20) {
  const totalSeconds = initialMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
    setHasFinished(false);
  }, []);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback((minutes: number = initialMinutes) => {
    setIsActive(false);
    setHasFinished(false);
    setSecondsRemaining(minutes * 60);
  }, [initialMinutes]);

  const addTime = useCallback((extraMinutes: number = 5) => {
    setSecondsRemaining((prev) => prev + extraMinutes * 60);
    setHasFinished(false);
  }, []);

  useEffect(() => {
    if (isActive && secondsRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            setHasFinished(true);
            playSoftChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const elapsedSeconds = totalSeconds - secondsRemaining;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
  const isWarning = secondsRemaining <= 120 && secondsRemaining > 0;

  return {
    secondsRemaining,
    formattedTime,
    minutes,
    seconds,
    isActive,
    hasFinished,
    isWarning,
    progressPercent,
    start,
    pause,
    reset,
    addTime,
  };
}
