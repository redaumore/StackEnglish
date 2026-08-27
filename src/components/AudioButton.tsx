import { Volume2, Loader2 } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';
import type { UserSettings } from '../types/srs';

interface AudioButtonProps {
  text: string;
  textId?: string;
  settings?: UserSettings;
  voiceURI?: string;
  rate?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  label?: string;
  className?: string;
}

export const AudioButton = ({
  text,
  textId,
  settings,
  voiceURI,
  rate = 1.0,
  size = 'md',
  variant = 'secondary',
  label,
  className = '',
}: AudioButtonProps) => {
  const mergedSettings: Partial<UserSettings> = {
    ...settings,
    preferredVoiceURI: voiceURI || settings?.preferredVoiceURI,
    playbackRate: rate || settings?.playbackRate || 1.0,
  };

  const { speak, isSpeaking, isLoading, activeTextId, isSupported } = useTTS(mergedSettings);
  const isCurrent = activeTextId === (textId || text);
  const isThisSpeaking = isSpeaking && isCurrent;
  const isThisLoading = isLoading && isCurrent;

  if (!isSupported && settings?.ttsProvider !== 'openai') {
    return null;
  }

  const sizeClasses = {
    sm: 'p-1.5 text-xs gap-1',
    md: 'p-2.5 text-sm gap-2',
    lg: 'px-4 py-3 text-base gap-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow active:scale-95 transition-all',
    secondary:
      'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 active:scale-95 transition-all',
    ghost:
      'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(text, textId || text, mergedSettings);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label || 'Listen to audio pronunciation'}
      aria-label={label || 'Listen to audio pronunciation'}
      className={`inline-flex items-center justify-center rounded-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${
        isThisSpeaking
          ? 'ring-2 ring-indigo-500 animate-pulse text-indigo-400'
          : isThisLoading
          ? 'ring-2 ring-amber-500/60 text-amber-400'
          : ''
      } ${className}`}
    >
      {isThisLoading ? (
        <Loader2 className={`${iconSizes[size]} text-amber-400 animate-spin`} />
      ) : isThisSpeaking ? (
        <Volume2 className={`${iconSizes[size]} text-indigo-400 animate-bounce`} />
      ) : (
        <Volume2 className={`${iconSizes[size]} text-current`} />
      )}
      {label && <span className="truncate">{label}</span>}
    </button>
  );
};
