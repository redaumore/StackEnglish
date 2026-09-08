import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const cleanUpStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: recordedType });
        audioChunksRef.current = [];
        cleanUpStream();
        setIsRecording(false);

        if (stopResolveRef.current) {
          stopResolveRef.current(finalBlob);
          stopResolveRef.current = null;
        }
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError('An error occurred during audio recording.');
        cleanUpStream();
        setIsRecording(false);
      };

      recorder.start(250); // Slice data chunks every 250ms
      setIsRecording(true);
    } catch (err: any) {
      cleanUpStream();
      setIsRecording(false);
      const msg = err?.message || 'Could not access microphone.';
      setError(msg);
      throw err;
    }
  }, [cleanUpStream]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanUpStream();
        setIsRecording(false);
        reject(new Error('Recorder is not active.'));
        return;
      }

      stopResolveRef.current = resolve;
      try {
        recorder.stop();
      } catch (err) {
        cleanUpStream();
        setIsRecording(false);
        reject(err);
      }
    });
  }, [cleanUpStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      cleanUpStream();
    };
  }, [cleanUpStream]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
  };
}
