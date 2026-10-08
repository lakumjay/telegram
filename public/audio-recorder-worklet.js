class AudioRecordingProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // ~128ms chunks at 16kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bytesWritten = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];
        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bytesWritten++] = channelData[i];
            if (this.bytesWritten >= this.bufferSize) {
                this.flush();
            }
        }
        return true;
    }

    flush() {
        if (this.bytesWritten === 0) return;
        const out = new Float32Array(this.bytesWritten);
        out.set(this.buffer.subarray(0, this.bytesWritten));
        this.port.postMessage(out);
        this.bytesWritten = 0;
    }
}

registerProcessor('audio-recorder-worklet', AudioRecordingProcessor);
