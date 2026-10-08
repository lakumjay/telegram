import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2, ShieldCheck, Activity, Terminal, AlertTriangle, Radio } from 'lucide-react';

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
    const [micWarning, setMicWarning] = useState(null);

    // Persistent Audio & Socket References (Prevents V8 Garbage Collection)
    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const micStreamRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const processorRef = useRef(null);
    const silentGainRef = useRef(null);
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
    const watchdogTimerRef = useRef(null);
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
        const timeStr = new Date().toLocaleTimeString();
        setRecentLogs(prev => [...prev.slice(-49), `[${timeStr}] ${text}`]);
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
        setMicWarning(null);
        setCallState('connecting');
        setUserInputTranscription('');
        setAiSpokenText('');
        isSetupCompleteRef.current = false;
        chunksSentCounterRef.current = 0;
        addLog('1. માઇક્રોફોન અને ઓડિયો કનેક્શન શરૂ કરી રહ્યા છીએ...');

        try {
            // STEP 1: Microphone Capture directly in the User Gesture!
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            micStreamRef.current = stream;

            const track = stream.getAudioTracks()[0];
            console.log('[Mic Track]', {
                label: track?.label,
                enabled: track?.enabled,
                muted: track?.muted,
                readyState: track?.readyState
            });

            if (track) {
                if (track.muted) {
                    setMicWarning('માઇક્રોફોન તમારા OS / સિસ્ટમ સેટિંગ્સમાં Mute છે.');
                    addLog('⚠️ ચેતવણી: માઇક્રોફોન OS દ્વારા Mute છે!');
                }
                track.onmute = () => {
                    console.warn('[Mic Track] Muted by OS/browser!');
                    setMicWarning('માઇક્રોફોન તમારા OS / સિસ્ટમ સેટિંગ્સમાં Mute થઈ ગયું છે.');
                    addLog('⚠️ માઇક્રોફોન સિસ્ટમ દ્વારા Muted');
                };
                track.onunmute = () => {
                    console.log('[Mic Track] Unmuted.');
                    setMicWarning(null);
                    addLog('✅ માઇક્રોફોન Unmuted');
                };
            }

            // STEP 2: AudioContext Initialization
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            audioCtx.onstatechange = () => {
                console.log(`[AudioContext State]: ${audioCtx.state}`);
                if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                    audioCtx.resume().catch(e => console.warn('AudioContext resume error:', e));
                }
            };

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            nextPlayTimeRef.current = audioCtx.currentTime;
            console.log(`[AudioContext] Initialized at ${audioCtx.sampleRate} Hz`);

            // STEP 3: MediaStreamSourceNode (held in ref + window to prevent V8 Garbage Collection)
            const source = audioCtx.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            window._activeMicSourceNode = source;

            // STEP 4: Analyser Node for Live RMS & Meter
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            window._activeAnalyser = analyser;

            const timeData = new Float32Array(analyser.fftSize);
            const updateVolumeAndRms = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getFloatTimeDomainData(timeData);

                let sumSq = 0;
                for (let i = 0; i < timeData.length; i++) {
                    sumSq += timeData[i] * timeData[i];
                }
                const rms = Math.sqrt(sumSq / timeData.length);
                currentRmsRef.current = rms;
                setAudioLevel(Math.min(100, Math.round(rms * 500)));

                if (!isAiSpeakingRef.current) {
                    if (rms > 0.015) {
                        isUserSpeakingRef.current = true;
                        setIsUserSpeaking(true);
                    } else if (rms < 0.006) {
                        isUserSpeakingRef.current = false;
                        setIsUserSpeaking(false);
                    }
                }
                animFrameRef.current = requestAnimationFrame(updateVolumeAndRms);
            };
            updateVolumeAndRms();

            // STEP 5: High-Performance Audio Downsampler & Pipeline
            const nativeRate = audioCtx.sampleRate;
            console.log(`[Mic Pipeline] Native Rate: ${nativeRate} Hz -> Target: 16000 Hz`);

            // ScriptProcessorNode (Synchronous, rock-solid, zero worklet-thread serialization crashes)
            const processor = audioCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;
            window._activeProcessor = processor;

            processor.onaudioprocess = (e) => {
                const float32Input = e.inputBuffer.getChannelData(0);
                convertAndSend(float32Input, nativeRate);
            };

            source.connect(processor);
            const silentGain = audioCtx.createGain();
            silentGain.gain.value = 0;
            silentGainRef.current = silentGain;
            window._activeSilentGain = silentGain;
            processor.connect(silentGain);
            silentGain.connect(audioCtx.destination);
            console.log('[Mic Pipeline] Audio Processor connected successfully.');

            // STEP 6: Fetch Backend Config & Ephemeral Token
            addLog('2. સર્વર પાસેથી અધિકૃત Ephemeral Token મેળવી રહ્યા છીએ...');
            const res = await axios.get('/api/voice/config');
            const { auth_token, is_ephemeral, system_instruction, voice_name, live_model } = res.data;
            const targetModel = live_model || 'models/gemini-3.8-live';

            if (!auth_token) {
                setErrorMsg('સર્વર તરફથી અધિકૃત ટોકન મળ્યો નથી.');
                setCallState('ended');
                return;
            }

            // STEP 7: Connect WebSocket directly to Gemini Live
            addLog(`3. Gemini Live WebSocket કનેક્ટ કરી રહ્યા છીએ (${targetModel})...`);
            const wsUrl = is_ephemeral
                ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${auth_token}`
                : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${auth_token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected! Sending Setup message...');
                addLog('4. WebSocket ઓપન થયું. સેટેઅપ મેસેજ મોકલી રહ્યા છીએ...');

                // Standalone Pure Voice Setup: No tools, No Telegram logic
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

                // Setup Complete confirmation
                if (msg.setupComplete) {
                    console.log('[WS] Setup Complete confirmed by Gemini.');
                    addLog('5. ✅ Gemini સાથે સેશન કનેક્ટ થઈ ગયું! હવે તમે ગુજરાતીમાં બોલી શકો છો...');
                    isSetupCompleteRef.current = true;
                    setCallState('connected');

                    // Stats Logger (chunks/sec + RMS)
                    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
                    statsTimerRef.current = setInterval(() => {
                        console.log(`[Mic Audio Stats] chunks/sec: ${chunksSentCounterRef.current}, RMS: ${currentRmsRef.current.toFixed(4)}, AI Speaking: ${isAiSpeakingRef.current}`);
                        chunksSentCounterRef.current = 0;
                    }, 1000);

                    // Watchdog: Prevents mic from getting stuck if audio playback finishes
                    if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current);
                    watchdogTimerRef.current = setInterval(() => {
                        if (isAiSpeakingRef.current && audioContextRef.current) {
                            if (activeAudioNodesRef.current.length === 0 && (audioContextRef.current.currentTime >= nextPlayTimeRef.current)) {
                                isAiSpeakingRef.current = false;
                                setIsAiSpeaking(false);
                                console.log('[Echo Guard Watchdog] Playback finished. Mic UNLOCKED.');
                            }
                        }
                    }, 250);

                    // Smart Keep-Alive (only if completely idle for > 4.0s)
                    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                    heartbeatRef.current = setInterval(() => {
                        const now = Date.now();
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSetupCompleteRef.current) {
                            if (!isAiSpeakingRef.current && !isUserSpeakingRef.current && (now - lastAudioSentTimeRef.current > 4000)) {
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
                    }, 3000);
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
            setErrorMsg('લાઇવ સેશન શરૂ કરવામાં ક્ષતિ: ' + (err.message || 'માઇક્રોફોન પરમિશન Allow કરો'));
            cleanupResources();
            setCallState('ended');
        }
    };

    // Convert Float32 to 16kHz Int16 and stream to Gemini
    const convertAndSend = (float32Input, nativeRate) => {
        if (isMutedRef.current || !isSetupCompleteRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        // Smart Mic Gating:
        // When AI is actively playing speech, soft-gate speaker leakage (drop if RMS < 0.012).
        // If user speaks louder (RMS >= 0.012), let audio through so Gemini detects interruption!
        // When AI is NOT playing, send 100% of mic audio continuously!
        if (isAiSpeakingRef.current && currentRmsRef.current < 0.012) {
            return;
        }

        const ratio = nativeRate / 16000;
        const newLength = Math.floor(float32Input.length / ratio);
        const pcm16 = new Int16Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const srcPos = i * ratio;
            const i0 = Math.floor(srcPos);
            const i1 = Math.min(i0 + 1, float32Input.length - 1);
            const frac = srcPos - i0;
            let s = float32Input[i0] * (1 - frac) + float32Input[i1] * frac;
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

    // High-fidelity Jitter Buffer Audio Playback
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

        // Gemini streams 24kHz PCM
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        activeAudioNodesRef.current.push(source);

        source.onended = () => {
            activeAudioNodesRef.current = activeAudioNodesRef.current.filter(s => s !== source);
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
        window._activeMicSourceNode = null;
        window._activeProcessor = null;
        window._activeSilentGain = null;
        window._activeAnalyser = null;

        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (statsTimerRef.current) {
            clearInterval(statsTimerRef.current);
            statsTimerRef.current = null;
        }
        if (watchdogTimerRef.current) {
            clearInterval(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
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

        if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch (e) {}
            processorRef.current = null;
        }
        if (silentGainRef.current) {
            try { silentGainRef.current.disconnect(); } catch (e) {}
            silentGainRef.current = null;
        }
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.disconnect(); } catch (e) {}
            sourceNodeRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
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
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                            <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                Standalone Voice Test
                                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    Step 1 (Pure Voice)
                                </span>
                            </h1>
                            <p className="text-xs text-slate-400">
                                16kHz PCM Live Stream • No Tools • No Telegram SDK
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-slate-400 font-mono">
                            {formatTime(callDuration)}
                        </div>
                        <div className={`text-xs font-semibold ${
                            callState === 'connected' ? 'text-emerald-400' :
                            callState === 'connecting' ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                            {callState === 'connected' ? '🟢 કૉલ ચાલુ છે' :
                             callState === 'connecting' ? '🟡 કનેક્ટિંગ...' : '⚪ નિષ્ક્રિય'}
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Mic Warning */}
                {micWarning && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{micWarning}</span>
                    </div>
                )}

                {/* Avatar & Visualizer */}
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="relative">
                        <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl transition-all duration-300 shadow-xl ${
                            isAiSpeaking 
                                ? 'bg-gradient-to-tr from-pink-500 to-rose-600 scale-110 shadow-pink-500/40 ring-4 ring-pink-500/30' 
                                : isUserSpeaking 
                                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 scale-105 shadow-cyan-500/40 ring-4 ring-cyan-500/30' 
                                : 'bg-slate-800 border-2 border-slate-700'
                        }`}>
                            {isAiSpeaking ? '👩‍💼' : '🎙️'}
                        </div>

                        {/* Live Audio Waves */}
                        {callState === 'connected' && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/90 border border-slate-700 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 shadow">
                                <Activity className={`w-3 h-3 ${isAiSpeaking ? 'text-pink-400 animate-spin' : 'text-cyan-400 animate-pulse'}`} />
                                <span>
                                    {isAiSpeaking ? '🗣️ રિયા બોલે છે' : isUserSpeaking ? '👂 તમે બોલો છો' : '👂 સાંભળી રહ્યું છે'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Live Mic Energy Bar */}
                    {callState === 'connected' && (
                        <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-400">
                                <span>માઇક્રોફોન વોલ્યુમ (RMS)</span>
                                <span className="font-mono">{audioLevel}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
                                    style={{ width: `${audioLevel}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Gemini Heard: Live Input Transcription */}
                <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
                            <Volume2 className="w-3.5 h-3.5" />
                            Gemini Input Transcription (તમે જે બોલ્યા):
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Realtime STT</span>
                    </div>
                    <div className="text-sm font-medium text-slate-200 min-h-[40px] leading-relaxed">
                        {userInputTranscription || (
                            <span className="text-slate-500 italic">
                                {callState === 'connected' ? 'તમે બોલવાનું શરૂ કરો (દા.ત. "નમસ્તે રિયા, કેમ છો?")...' : 'કૉલ શરૂ થયા પછી તમારો અવાજ અહીં લખાશે...'}
                            </span>
                        )}
                    </div>
                </div>

                {/* AI Spoken Text */}
                {aiSpokenText && (
                    <div className="p-4 bg-purple-950/20 border border-purple-800/30 rounded-2xl space-y-1">
                        <div className="text-xs font-semibold text-purple-400">
                            રિયાનો ઉત્તર (Rhea Response):
                        </div>
                        <div className="text-sm text-slate-200 leading-relaxed">
                            {aiSpokenText}
                        </div>
                    </div>
                )}

                {/* Control Action Buttons */}
                <div className="flex items-center justify-center space-x-4 pt-2">
                    {callState !== 'connected' && callState !== 'connecting' ? (
                        <button
                            onClick={startCall}
                            className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center space-x-2 transition cursor-pointer"
                        >
                            <PhoneCall className="w-5 h-5" />
                            <span>લાઇવ ટેસ્ટ કૉલ શરૂ કરો</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={toggleMute}
                                className={`p-4 rounded-2xl border transition cursor-pointer ${
                                    isMuted 
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                }`}
                                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                            >
                                {isMuted ? <MicOff className="w-6 h-6 text-amber-400" /> : <Mic className="w-6 h-6" />}
                            </button>

                            <button
                                onClick={endCall}
                                className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 flex items-center space-x-2 transition cursor-pointer"
                            >
                                <PhoneOff className="w-5 h-5" />
                                <span>કૉલ પૂરો કરો</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Live Console Output Log */}
                <div className="border border-slate-800 bg-slate-950 rounded-2xl p-4 space-y-2 font-mono">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            Live Diagnostic Console Log
                        </span>
                        <span className="text-[10px] text-slate-500">Auto-logging</span>
                    </div>

                    <div className="h-40 overflow-y-auto text-[11px] space-y-1 text-slate-300 pr-2">
                        {recentLogs.length === 0 ? (
                            <div className="text-slate-600 italic">કૉલ શરૂ થયા પછી લૉગ્સ અહીં દેખાશે...</div>
                        ) : (
                            recentLogs.map((log, idx) => (
                                <div key={idx} className="leading-tight text-slate-300 font-mono">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer instructions */}
                <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                    Step 1 Target: ૫ મિનિટ સુધી સતત વાતો કરો (હેડફોન અને સ્પીકર) • કોઈ ટૂલ કૉલ કે ટેલિગ્રામ લૉજિક નથી
                </div>

            </div>
        </div>
    );
}
