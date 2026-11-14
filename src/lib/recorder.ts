/** Microphone recording with MediaRecorder. */

let stream: MediaStream | null = null;

async function getStream(): Promise<MediaStream> {
  if (stream && stream.getAudioTracks().some(t => t.readyState === 'live')) return stream;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return stream;
}

export function releaseMic() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
}

export interface Recording {
  stop: () => Promise<Blob>;
}

export async function startRecording(): Promise<Recording> {
  const s = await getStream();
  const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
  const rec = new MediaRecorder(s, type ? { mimeType: type } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise<Blob>(resolve => {
        rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        if (rec.state !== 'inactive') rec.stop();
        else resolve(new Blob(chunks));
      })
  };
}

export async function recordFor(ms: number): Promise<Blob> {
  const r = await startRecording();
  await new Promise(res => setTimeout(res, ms));
  return r.stop();
}

export function playBlob(blob: Blob): Promise<void> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}
