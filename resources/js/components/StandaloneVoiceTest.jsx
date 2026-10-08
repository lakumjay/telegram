import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2, ShieldCheck, Activity, Terminal } from 'lucide-react';

export default function StandaloneVoiceTest() {
    const [callState, setCallState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'ended'
    const [isMuted, setIsMuted] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [userInputTranscription, setUserInputTranscription] = useState('');
    const [aiSpokenText, setAiSpokenText] = useState('');
    const [callDuration, setCallDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [recentLogs, setRecentLogs] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);

    // Refs
    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const micStreamRef = useRef(null);
    const workletNodeRef = useRef(null);
    const fallbackProcessorRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const activeAudioNodesRef = useRef([]);
    const isAiSpeakingRef = useRef(false);
    const isUserSpeakingRef = useRef(false);
    const isMutedRef = useRef(false);
    const isSetupCompleteRef = useRef(false);
    const heartbeatRef = useRef(null);
    const statsTimerRef = useRef(null);
    const chunksSentCounterRef = useRef(0);
    const currentRmsRef = useRef(0);
    const lastAudioSentTimeRef = useRef(Date.now());
    const queueDrainTimerRef = useRef(null);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // Call duration timer
    useEffect(() => {
        let timer;
        if (callState === 'connected') {
            timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(timer);
    }, [callState]);

    const addLog = (text) => {
        setRecentLogs(prev => [...prev.slice(-49), text]);
    };

    // Safe socket send with outgoing logging
    const safeWsSend = (payload, typeLabel) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const jsonStr = JSON.stringify(payload);
        const byteSize = new Blob([jsonStr]).size;
        console.log(`[WS SEND] type: ${typeLabel}, size: ${byteSize}B`);
        wsRef.current.send(jsonStr);
    };

    // Safe socket close with required client close logging
    const safeWsClose = (reason) => {
        console.log(`CLIENT CLOSING SOCKET: ${reason}`);
        addLog(`CLIENT CLOSING SOCKET: ${reason}`);
        if (wsRef.current) {
            try { wsRef.current.close(); } catch (e) {}
            wsRef.current = null;
        }
    };

    const startCall = async () => {
        setErrorMsg(null);
        setCallState('connecting');
        setUserInputTranscription('');
        setAiSpokenText('');
        isSetupCompleteRef.current = false;
        chunksSentCounterRef.current = 0;
        addLog('1. Fetching config & ephemeral token from backend...');

        try {
            // 1. AudioContext on user gesture
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            nextPlayTimeRef.current = audioCtx.currentTime;
            console.log(`[AudioContext] Initialized at ${audioCtx.sampleRate} Hz`);

            // 2. Fetch Config & Ephemeral Token from existing backend endpoint
            const res = await axios.get('/api/voice/config');
            const { auth_token, is_ephemeral, system_instruction, voice_name, live_model } = res.data;
            const targetModel = live_model || 'models/gemini-3.8-live';

            if (!auth_token) {
                setErrorMsg('સર્વર તરફથી અધિકૃત ટોકન મળ્યો નથી.');
                setCallState('ended');
                return;
            }

            addLog(`2. Connecting WebSocket (${targetModel})...`);
            const wsUrl = is_ephemeral
                ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${auth_token}`
                : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${auth_token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected! Sending Setup message...');
                addLog('3. WebSocket open. Sending setup (no tools, pure voice)...');

                // Pure Voice Setup: No tools, No Telegram logic
                const setupMessage = {
                    setup: {
                        model: targetModel,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: voice_name || 'Aoede'
                                    }
                                }
                            }
                        },
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction: {
                            parts: [{ text: system_instruction }]
                        }
                    }
                };

                safeWsSend(setupMessage, 'setup');
            };

            ws.onmessage = async (event) => {
                let text = event.data;
                if (event.data instanceof Blob) {
                    text = await event.data.text();
                }

                let msg = {};
                try { msg = JSON.parse(text); } catch (e) { return; }

                // Setup Complete
                if (msg.setupComplete) {
                    console.log('[WS] Setup Complete confirmed by Gemini.');
                    addLog('4. Setup Complete confirmed by Gemini! Starting 16kHz mic...');
                    isSetupCompleteRef.current = true;
                    setCallState('connected');

                    // Start microphone streaming pipeline
                    await initMicrophone(audioCtx, ws);

                    // Start stats logger (chunks/sec + RMS)
                    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
                    statsTimerRef.current = setInterval(() => {
                        console.log(`[Mic Audio Stats] chunks/sec: ${chunksSentCounterRef.current}, RMS: ${currentRmsRef.current.toFixed(4)}`);
                        chunksSentCounterRef.current = 0;
                    }, 1000);

                    // Start Smart Keep-Alive (only if completely idle for > 3.5s)
                    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                    heartbeatRef.current = setInterval(() => {
                        const now = Date.now();
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSetupCompleteRef.current) {
                            if (!isAiSpeakingRef.current && !isUserSpeakingRef.current && (now - lastAudioSentTimeRef.current > 3500)) {
                                const silent = new Int16Array(320);
                                const u8 = new Uint8Array(silent.buffer);
                                let b = '';
                                for (let i = 0; i < u8.length; i++) b += String.fromCharCode(u8[i]);
                                safeWsSend({
                                    realtimeInput: {
                                        mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: btoa(b) }]
                                    }
                                }, 'keepAliveSilence');
                                lastAudioSentTimeRef.current = now;
                            }
                        }
                    }, 2500);

                    // Initial pure Gujarati voice trigger (NO English)
                    safeWsSend({
                        clientContent: {
                            turns: [{ role: "user", parts: [{ text: "નમસ્તે! ફોન ઉપાડવા બદલ આભાર, મારું સ્વાગત કરો અને કહો કે તમે લાઈવ સાંભળી રહ્યા છો." }] }],
                            turnComplete: true
                        }
                    }, 'clientContentGreeting');
                }

                // Live User Input Transcription from Gemini
                if (msg.serverContent?.inputTranscription?.text) {
                    const userSpoken = msg.serverContent.inputTranscription.text;
                    console.log('[Gemini inputTranscription]:', userSpoken);
                    setUserInputTranscription(prev => prev + ' ' + userSpoken);
                    addLog(`👂 Gemini Heard: "${userSpoken}"`);
                }

                // AI Model Speech Output (24kHz PCM)
                if (msg.serverContent?.modelTurn?.parts) {
                    const parts = msg.serverContent.modelTurn.parts;
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.data) {
                            playAudioChunk(part.inlineData.data, audioCtx);
                        }
                        if (part.text) {
                            setAiSpokenText(prev => prev + part.text);
                        }
                    }
                }

                // AI Interrupted by User (Gemini native barge-in)
                if (msg.serverContent?.interrupted) {
                    console.log('[WS] Gemini detected user interruption! Stopping audio playback.');
                    addLog('⚡ Barge-in: Gemini detected user interruption!');
                    stopAllAudio();
                }

                // Turn Complete signal from Gemini
                if (msg.serverContent?.turnComplete) {
                    console.log('[WS] Gemini turnComplete received.');
                    // Note: We do NOT unlock mic at turnComplete.
                    // We unlock ONLY when audio playback queue is actually empty + 300ms!
                }
            };

            ws.onerror = (e) => {
                console.error('[WebSocket Error]', e);
                setErrorMsg('WebSocket કનેક્શન એરર.');
            };

            ws.onclose = (event) => {
                console.log(`[WebSocket onclose] Code: ${event.code}, Reason: ${event.reason || 'None'}`);
                addLog(`WebSocket Closed: Code ${event.code} (${event.reason || 'Normal'})`);
                cleanupResources();
                setCallState('ended');
            };

        } catch (err) {
            console.error('Failed to start Live Session', err);
            setErrorMsg('લાઇવ સેશન શરૂ કરવામાં ક્ષતિ: ' + err.message);
            cleanupResources();
            setCallState('ended');
        }
    };

    // Initialize 16kHz Downsampling Microphone Pipeline
    const initMicrophone = async (audioCtx, ws) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            micStreamRef.current = stream;

            const source = audioCtx.createMediaStreamSource(stream);

            // Analyser for Live Volume & RMS
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const timeData = new Float32Array(analyser.fftSize);

            const updateVolumeAndRms = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getFloatTimeDomainData(timeData);

                // Compute RMS Energy
                let sumSq = 0;
                for (let i = 0; i < timeData.length; i++) {
                    sumSq += timeData[i] * timeData[i];
                }
                const rms = Math.sqrt(sumSq / timeData.length);
                currentRmsRef.current = rms;
                setAudioLevel(Math.min(100, Math.round(rms * 500)));

                if (!isAiSpeakingRef.current) {
                    if (rms > 0.02) {
                        isUserSpeakingRef.current = true;
                        setIsUserSpeaking(true);
                    } else if (rms < 0.008) {
                        isUserSpeakingRef.current = false;
                        setIsUserSpeaking(false);
                    }
                }

                animFrameRef.current = requestAnimationFrame(updateVolumeAndRms);
            };
            updateVolumeAndRms();

            const nativeRate = audioCtx.sampleRate;
            console.log(`[Mic Pipeline] Native Rate: ${nativeRate} Hz -> Target: 16000 Hz`);

            // High-fidelity downsample Float32 to 16kHz Int16 with Linear Interpolation
            const convertAndSend = (float32Input) => {
                if (isMutedRef.current || !isSetupCompleteRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
                // STRICT ECHO GUARD: Drop mic audio while AI is playing OR during 300ms queue drain!
                if (isAiSpeakingRef.current || activeAudioNodesRef.current.length > 0) return;

                const ratio = nativeRate / 16000;
                const newLength = Math.floor(float32Input.length / ratio);
                const pcm16 = new Int16Array(newLength);

                for (let i = 0; i < newLength; i++) {
                    const srcPos = i * ratio;
                    const i0 = Math.floor(srcPos);
                    const i1 = Math.min(i0 + 1, float32Input.length - 1);
                    const frac = srcPos - i0;
                    let s = float32Input[i0] * (1 - frac) + float32Input[i1] * frac;
                    // Clarity boost 1.3x, clamped
                    s = Math.max(-1, Math.min(1, s * 1.3));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const uint8 = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < uint8.length; i++) {
                    binary += String.fromCharCode(uint8[i]);
                }
                const base64 = btoa(binary);

                safeWsSend({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: base64
                        }]
                    }
                }, 'realtimeInput');

                chunksSentCounterRef.current++;
                lastAudioSentTimeRef.current = Date.now();
            };

            // AudioWorklet with proper input/output routing
            let workletSuccess = false;
            try {
                if (audioCtx.audioWorklet) {
                    const workletCode = `
                        class AudioRecordingProcessor extends AudioWorkletProcessor {
                            constructor() {
                                super();
                                this.bufferSize = 2048;
                                this.buffer = new Float32Array(this.bufferSize);
                                this.bytesWritten = 0;
                            }
                            process(inputs, outputs) {
                                const input = inputs[0];
                                if (!input || !input[0]) return true;
                                const channelData = input[0];
                                if (outputs && outputs[0] && outputs[0][0]) {
                                    outputs[0][0].set(channelData);
                                }
                                for (let i = 0; i < channelData.length; i++) {
                                    this.buffer[this.bytesWritten++] = channelData[i];
                                    if (this.bytesWritten >= this.bufferSize) {
                                        const out = new Float32Array(this.bytesWritten);
                                        out.set(this.buffer.subarray(0, this.bytesWritten));
                                        this.port.postMessage(out);
                                        this.bytesWritten = 0;
                                    }
                                }
                                return true;
                            }
                        }
                        registerProcessor('audio-recorder-worklet', AudioRecordingProcessor);
                    `;
                    const blob = new Blob([workletCode], { type: 'application/javascript' });
                    const blobUrl = URL.createObjectURL(blob);

                    await audioCtx.audioWorklet.addModule(blobUrl);
                    URL.revokeObjectURL(blobUrl);

                    const workletNode = new AudioWorkletNode(audioCtx, 'audio-recorder-worklet');
                    workletNodeRef.current = workletNode;

                    workletNode.port.onmessage = (event) => {
                        convertAndSend(event.data);
                    };

                    const silentGain = audioCtx.createGain();
                    silentGain.gain.value = 0;
                    source.connect(workletNode);
                    workletNode.connect(silentGain);
                    silentGain.connect(audioCtx.destination);

                    workletSuccess = true;
                    console.log('[Mic Pipeline] AudioWorklet connected successfully.');
                }
            } catch (wErr) {
                console.warn('[Mic Pipeline] AudioWorklet fallback to ScriptProcessor:', wErr);
            }

            // Fallback to ScriptProcessor
            if (!workletSuccess) {
                const processor = audioCtx.createScriptProcessor(2048, 1, 1);
                fallbackProcessorRef.current = processor;
                processor.onaudioprocess = (e) => {
                    convertAndSend(e.inputBuffer.getChannelData(0));
                };

                const silentGain = audioCtx.createGain();
                silentGain.gain.value = 0;
                source.connect(processor);
                processor.connect(silentGain);
                silentGain.connect(audioCtx.destination);
                console.log('[Mic Pipeline] ScriptProcessor connected successfully.');
            }

        } catch (err) {
            console.error('Microphone initialization error:', err);
            setErrorMsg('માઇક્રોફોન પરમિશન Allow કરો.');
        }
    };

    // Jitter buffer queue for seamless audio playback
    const playAudioChunk = (base64, audioCtx) => {
        isAiSpeakingRef.current = true;
        setIsAiSpeaking(true);

        if (queueDrainTimerRef.current) {
            clearTimeout(queueDrainTimerRef.current);
            queueDrainTimerRef.current = null;
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        // Gemini sends 24kHz PCM
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        activeAudioNodesRef.current.push(source);

        source.onended = () => {
            activeAudioNodesRef.current = activeAudioNodesRef.current.filter(s => s !== source);
            // REQUIREMENT 3: Unlock mic only when playback queue is ACTUALLY EMPTY and 300ms have passed!
            if (activeAudioNodesRef.current.length === 0) {
                if (queueDrainTimerRef.current) clearTimeout(queueDrainTimerRef.current);
                queueDrainTimerRef.current = setTimeout(() => {
                    if (activeAudioNodesRef.current.length === 0) {
                        isAiSpeakingRef.current = false;
                        setIsAiSpeaking(false);
                        console.log('[Echo Guard] Audio queue fully drained + 300ms. Mic 100% UNLOCKED.');
                    }
                }, 300);
            }
        };

        const currentTime = audioCtx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime + 0.05;
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
    };

    const stopAllAudio = () => {
        activeAudioNodesRef.current.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        activeAudioNodesRef.current = [];
        if (queueDrainTimerRef.current) clearTimeout(queueDrainTimerRef.current);
        isAiSpeakingRef.current = false;
        setIsAiSpeaking(false);
        if (audioContextRef.current) {
            nextPlayTimeRef.current = audioContextRef.current.currentTime;
        }
    };

    const cleanupResources = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (statsTimerRef.current) {
            clearInterval(statsTimerRef.current);
            statsTimerRef.current = null;
        }
        if (queueDrainTimerRef.current) {
            clearTimeout(queueDrainTimerRef.current);
            queueDrainTimerRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        stopAllAudio();
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (fallbackProcessorRef.current) {
            fallbackProcessorRef.current.disconnect();
            fallbackProcessorRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
        }
    };

    const endCall = () => {
        safeWsClose('User clicked End Call button');
        cleanupResources();
        setCallState('ended');
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        console.log(`[Mic] Mute toggled: ${next ? 'MUTED' : 'UNMUTED'}`);
        addLog(`Microphone ${next ? 'MUTED' : 'UNMUTED'}`);
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center font-sans">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center space-x-2">
                            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Gemini Live Voice Test</h1>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Phase 1 Standalone: Pure 16kHz PCM Audio Stream • No Tools • No Telegram
                        </p>
                    </div>
                    {callState === 'connected' && (
                        <div className="bg-slate-800 px-3 py-1.5 rounded-full text-xs font-mono text-cyan-300 border border-cyan-500/30">
                            ⏱️ {formatTime(callDuration)}
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                        {errorMsg}
                    </div>
                )}

                {/* Live Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-400">Live Status:</span>
                        {callState === 'connected' ? (
                            isAiSpeaking ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                                    🗣️ Rhea Speaking (રિયા બોલે છે)
                                </span>
                            ) : isUserSpeaking ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                    👂 Listening (તમે બોલી રહ્યા છો)
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    🟢 Ready & Connected (બોલો...)
                                </span>
                            )
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                                {callState === 'connecting' ? '🔄 કનેક્ટ થઈ રહ્યું છે...' : '🔴 Call Disconnected'}
                            </span>
                        )}
                    </div>

                    {/* Live Mic Meter */}
                    {callState === 'connected' && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">Mic Level:</span>
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
                                    style={{ width: `${audioLevel}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Live Transcript Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Transcription Card */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 min-h-[120px] flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                                <Mic className="w-3.5 h-3.5" />
                                <span>Gemini inputTranscription (તમારો અવાજ)</span>
                            </div>
                            <p className="text-sm text-slate-200 mt-2 italic">
                                {userInputTranscription ? `"${userInputTranscription}"` : 'હજુ સુધી કોઈ અવાજ સાંભળ્યો નથી...'}
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-2">Gemini Live native speech transcription</span>
                    </div>

                    {/* AI Rhea Response Card */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 min-h-[120px] flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Rhea Response (રિયાનો જવાબ)</span>
                            </div>
                            <p className="text-sm text-slate-200 mt-2">
                                {aiSpokenText ? aiSpokenText : 'રિયાના જવાબની રાહ જોવાઈ રહી છે...'}
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-2">Voice: Aoede (24kHz Native Audio)</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center space-x-4 pt-2">
                    {callState !== 'connected' ? (
                        <button
                            onClick={startCall}
                            disabled={callState === 'connecting'}
                            className="flex items-center space-x-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all text-base"
                        >
                            <PhoneCall className="w-5 h-5" />
                            <span>{callState === 'connecting' ? 'કનેક્ટ થઈ રહ્યું છે...' : 'Start Voice Call (કૉલ શરૂ કરો)'}</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isMuted 
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                }`}
                                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                            >
                                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>

                            <button
                                onClick={endCall}
                                className="flex items-center space-x-2 px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-2xl shadow-lg shadow-red-900/30 transition-all text-base"
                            >
                                <PhoneOff className="w-5 h-5" />
                                <span>End Call (કૉલ પૂરો કરો)</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Live Console Output Box */}
                <div className="bg-black/90 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                        <span className="flex items-center space-x-1.5">
                            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Live Activity Logs (F12 Console Mirror)</span>
                        </span>
                        <span className="text-[10px]">Open DevTools Console (F12) for full details</span>
                    </div>
                    <div className="h-32 overflow-y-auto space-y-1 text-slate-300 scrollbar-thin">
                        {recentLogs.length === 0 ? (
                            <span className="text-slate-600">Logs will appear here once call starts...</span>
                        ) : (
                            recentLogs.map((log, i) => (
                                <div key={i} className="leading-relaxed">
                                    <span className="text-cyan-400 select-none">&gt; </span>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
