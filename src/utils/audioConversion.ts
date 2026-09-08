// Audio conversion utility to turn arbitrary browser audio blobs into standard WAV format
export async function convertBlobToWav(blob: Blob): Promise<{ wavBlob: Blob; wavBase64: string }> {
  // If already wav, just read it
  if (blob.type.includes('wav')) {
    const arrayBuf = await blob.arrayBuffer();
    const base64 = bufferToBase64(arrayBuf);
    return { wavBlob: blob, wavBase64: base64 };
  }

  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate: 24000,
  });

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const wavBuffer = audioBufferToWav(audioBuffer);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    const wavBase64 = bufferToBase64(wavBuffer);

    return { wavBlob, wavBase64 };
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1; // mono is sufficient and keeps payload small
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Mix down channels to mono
  const channelData = new Float32Array(buffer.length);
  if (buffer.numberOfChannels === 1) {
    channelData.set(buffer.getChannelData(0));
  } else {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = (ch0[i] + ch1[i]) / 2;
    }
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = channelData.length * bytesPerSample;
  const wavSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(wavSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
