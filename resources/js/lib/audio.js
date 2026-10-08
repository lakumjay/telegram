// Small helpers for PCM <-> base64 and for gapless playback of model audio.

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToInt16(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

/** Plays 24 kHz mono PCM chunks back-to-back and supports instant interruption. */
export class PcmPlayer {
  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    this.nextTime = 0;
    this.sources = new Set();
    this.onEndedCallback = null;
  }

  async resume() {
    if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueue(int16) {
    if (!this.ctx || this.ctx.state === "closed") return;

    const float = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 0x8000;

    const buf = this.ctx.createBuffer(1, float.length, this.sampleRate);
    buf.copyToChannel(float, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);

    const startAt = Math.max(this.ctx.currentTime + 0.02, this.nextTime);
    src.start(startAt);
    this.nextTime = startAt + buf.duration;

    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0 && this.onEndedCallback) {
        this.onEndedCallback();
      }
    };
  }

  /** Called when the user barges in: stop everything the model was saying. */
  interrupt() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.sources.clear();
    this.nextTime = 0;
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  close() {
    this.interrupt();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
