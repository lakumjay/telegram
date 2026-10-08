import React, { useState, useEffect, useRef } from 'react';
import { 
    PhoneOff, 
    Mic, 
    MicOff, 
    Volume2, 
    Sparkles, 
    Radio,
    AlertCircle,
    Send,
    RefreshCw
} from 'lucide-react';
import axios from 'axios';

export default function VoiceCallModal({ isOpen, onClose, telegramUserId = 999888777 }) {
    if (!isOpen) return null;

    const [callState, setCallState] = useState('connecting'); // connecting, setup_complete, connected, ended
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [micPermissionError, setMicPermissionError] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    
    const [transcriptHistory, setTranscriptHistory] = useState([
        { sender: 'ai', text: 'સર્વર સાથે કનેક્ટ થઈ રહ્યું છે...' }
    ]);
    const [currentAiText, setCurrentAiText] = useState('');

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const micStreamRef = useRef(null);
    const processorRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const activeAudioNodesRef = useRef([]); // Track active nodes for instant interruption
    const transcriptEndRef = useRef(null);
    const isSetupCompleteRef = useRef(false);

    // Call duration timer
    useEffect(() => {
        let timer;
        if (callState === 'connected') {
            timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [callState]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptHistory, currentAiText]);

    useEffect(() => {
        if (isOpen) {
            startLiveSession();
        }
        return () => {
            endCall();
        };
    }, [isOpen]);

    const startLiveSession = async () => {
        setConnectionError(null);
        setCallState('connecting');
        isSetupCompleteRef.current = false;
        
        try {
            // 1. Initialize Audio Context IMMEDIATELY on user gesture (Fix for Deadlock)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext(); // REMOVED sampleRate: 16000 to fix silent mic bug
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            nextPlayTimeRef.current = audioCtx.currentTime;

            // 2. Get Config
            const res = await axios.get('/api/voice/config');
            const { api_key, system_instruction, voice_name } = res.data;

            if (!api_key) {
                setConnectionError('API Key ગુમ છે.');
                setCallState('ended');
                return;
            }

            // 3. Connect WebSocket
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${api_key}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WS Connected. Sending Setup...');
                setTranscriptHistory([{ sender: 'ai', text: 'ઓડિયો સેટઅપ થઈ રહ્યું છે...' }]);
                
                // ONLY send setup. Do NOT send audio or text until setupComplete.
                ws.send(JSON.stringify({
                    setup: {
                        model: 'models/gemini-3.8-live',
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
                        systemInstruction: {
                            parts: [{ text: system_instruction }]
                        }
                    }
                }));
            };

            ws.onmessage = async (event) => {
                let text = event.data;
                if (event.data instanceof Blob) {
                    text = await event.data.text();
                }
                const msg = JSON.parse(text);

                // Phase A: Setup Complete (CRITICAL FIX FOR DISCONNECTS)
                if (msg.setupComplete) {
                    console.log('Setup Complete received.');
                    isSetupCompleteRef.current = true;
                    setCallState('connected');
                    setTranscriptHistory([{ sender: 'ai', text: 'લાઇવ કૉલ શરૂ થઈ ગયો છે. બોલવાનું શરૂ કરો.' }]);
                    
                    // Now safe to init mic and send data
                    initMicrophone(audioCtx, ws);

                    // Send Initial Greeting Trigger
                    ws.send(JSON.stringify({
                        clientContent: {
                            turns: [{ role: "user", parts: [{ text: "Hello! ફોન ઉપાડો અને મારું ટૂંકમાં સ્વાગત કરો." }] }],
                            turnComplete: true
                        }
                    }));
                }

                // Phase B: Audio & Text Stream Content
                if (msg.serverContent?.modelTurn?.parts) {
                    const parts = msg.serverContent.modelTurn.parts;
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.data) {
                            playAudioChunk(part.inlineData.data, audioCtx);
                        }
                        if (part.text) {
                            setCurrentAiText(prev => prev + part.text);
                        }
                    }
                }

                // Phase C: Turn Complete (AI Finished Speaking)
                if (msg.serverContent?.turnComplete) {
                    setIsAiSpeaking(false);
                    setCurrentAiText(prev => {
                        if (prev.trim()) {
                            setTranscriptHistory(history => [...history, { sender: 'ai', text: prev.trim() }]);
                        }
                        return '';
                    });
                }

                // Phase D: Interruption (CRITICAL FIX FOR AUDIO OVERLAP)
                if (msg.serverContent?.interrupted) {
                    console.log('Interrupted! Stopping current audio.');
                    stopAllAudio();
                    setIsAiSpeaking(false);
                    setCurrentAiText('');
                }
            };

            ws.onerror = (e) => {
                console.error("WebSocket Error:", e);
                setConnectionError("સર્વર સાથે કનેક્શન તૂટી ગયું છે. નેટવર્ક ચેક કરો.");
                setCallState('ended');
            };

            ws.onclose = () => {
                console.log("WebSocket Closed");
                if (callState !== 'ended') {
                    setConnectionError("સર્વર દ્વારા કનેક્શન બંધ કરવામાં આવ્યું.");
                }
                setCallState('ended');
            };

        } catch (err) {
            console.error('Failed to start Live Session', err);
            setConnectionError("લાઇવ સેશન શરૂ કરવામાં ભૂલ.");
            setCallState('ended');
        }
    };

    const initMicrophone = async (audioCtx, ws) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;

            const source = audioCtx.createMediaStreamSource(stream);
            
            // Analyser for UI Visualizer
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Volume and Voice Activity Tracking for instant turn-taking
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let speechActive = false;
            let silenceTimer = null;

            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round(avg * 1.6)));

                // User started speaking -> Interrupt AI if speaking (Barge-In)
                if (avg > 15) {
                    if (isAiSpeaking) {
                        stopAllAudio();
                        setIsAiSpeaking(false);
                    }
                    speechActive = true;
                    if (silenceTimer) {
                        clearTimeout(silenceTimer);
                        silenceTimer = null;
                    }
                } else if (speechActive && avg < 8) {
                    // User was speaking and now fell silent for 900ms -> signal turnComplete!
                    if (!silenceTimer) {
                        silenceTimer = setTimeout(() => {
                            if (speechActive && ws && ws.readyState === WebSocket.OPEN) {
                                console.log('Speech ended. Triggering Gemini response turn.');
                                ws.send(JSON.stringify({
                                    clientContent: {
                                        turnComplete: true
                                    }
                                }));
                                speechActive = false;
                            }
                        }, 900);
                    }
                }

                animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Audio Worklet / ScriptProcessor with 1.4x Gain amplification for clear voice
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            const nativeRate = audioCtx.sampleRate;
            
            processor.onaudioprocess = (e) => {
                if (isMuted || !isSetupCompleteRef.current || ws.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const ratio = nativeRate / 16000;
                const newLength = Math.round(inputData.length / ratio);
                const pcm16 = new Int16Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const nativeIndex = Math.round(i * ratio);
                    let s = inputData[nativeIndex < inputData.length ? nativeIndex : inputData.length - 1];
                    // Amplify microphone input by 1.35x for crystal clear recognition
                    s = s * 1.35;
                    s = Math.max(-1, Math.min(1, s));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const uint8 = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < uint8.length; i++) {
                    binary += String.fromCharCode(uint8[i]);
                }
                const base64 = btoa(binary);

                ws.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: base64
                        }]
                    }
                }));
            };

            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0; // Mute playback to prevent echoing mic back to speakers
            
            source.connect(processor);
            processor.connect(gainNode);
            gainNode.connect(audioCtx.destination);

        } catch (err) {
            console.error('Mic Error', err);
            setMicPermissionError('કૃપા કરીને માઇક્રોફોનની પરમિશન Allow કરો.');
        }
    };

    // Robust Audio Scheduler (CRITICAL FIX FOR AUDIO DROPS / STUTTER)
    const playAudioChunk = (base64, audioCtx) => {
        setIsAiSpeaking(true);
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => console.error("AudioResume error:", err));
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
        
        // Track the source so we can stop it if interrupted
        activeAudioNodesRef.current.push(source);
        source.onended = () => {
            activeAudioNodesRef.current = activeAudioNodesRef.current.filter(s => s !== source);
        };
        
        const currentTime = audioCtx.currentTime;
        
        // Jitter Buffer Logic: Prevent underflow gaps by padding slightly
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime + 0.08; // 80ms buffer pad
        }
        
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
    };

    const stopAllAudio = () => {
        activeAudioNodesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        activeAudioNodesRef.current = [];
        if (audioContextRef.current) {
            nextPlayTimeRef.current = audioContextRef.current.currentTime;
        }
    };

    const endCall = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        stopAllAudio();
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        setCallState('ended');
    };

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const sendTextQuery = (text) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSetupCompleteRef.current) {
            wsRef.current.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: "user", parts: [{ text: text }] }],
                    turnComplete: true
                }
            }));
            setTranscriptHistory(prev => [...prev, { sender: 'user', text }]);
        }
    };

    const reconnect = () => {
        endCall();
        setTimeout(() => {
            startLiveSession();
        }, 500);
    };

    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [showKeypad, setShowKeypad] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
            {/* iPhone Frame Container */}
            <div className="relative w-full h-full sm:h-[844px] sm:max-w-[390px] bg-gradient-to-b from-slate-900 via-neutral-950 to-black sm:rounded-[54px] sm:border-[8px] sm:border-neutral-800 shadow-2xl flex flex-col justify-between overflow-hidden text-white font-sans select-none sm:ring-1 sm:ring-neutral-700">
                
                {/* Dynamic Island / Top Notch Bar */}
                <div className="w-full pt-3 pb-2 flex flex-col items-center z-20">
                    <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-3 border border-neutral-800/80 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] text-neutral-400 font-medium tracking-tight">Gemini Live</span>
                        <div className="w-2.5 h-2.5 rounded-full border border-neutral-600 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                        </div>
                    </div>
                </div>

                {/* Error Banner if any */}
                {(micPermissionError || connectionError) && (
                    <div className="mx-6 p-3 bg-red-950/80 border border-red-500/50 rounded-2xl text-xs text-red-200 flex items-center justify-between z-20">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-[11px] leading-tight">{micPermissionError || connectionError}</span>
                        </div>
                        {connectionError && (
                            <button onClick={reconnect} className="ml-2 px-2.5 py-1 bg-red-800 hover:bg-red-700 rounded-lg text-[10px] font-bold text-white transition">
                                ફરી જોડાઓ
                            </button>
                        )}
                    </div>
                )}

                {/* Contact Profile Header */}
                <div className="flex flex-col items-center text-center mt-6 px-4 z-10">
                    {/* Animated Avatar with Pulsing Waves */}
                    <div className="relative flex items-center justify-center my-4">
                        {/* Audio Wave Ring */}
                        <div 
                            className={`absolute rounded-full transition-all duration-150 ${
                                isAiSpeaking 
                                    ? 'w-40 h-40 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 opacity-40 blur-xl animate-pulse'
                                    : callState === 'connected' && !isMuted
                                    ? 'w-36 h-36 bg-emerald-500 opacity-20 blur-lg'
                                    : 'w-32 h-32 bg-neutral-700 opacity-10'
                            }`}
                            style={{
                                transform: isAiSpeaking ? 'scale(1.2)' : `scale(${1 + (audioLevel / 100) * 0.5})`
                            }}
                        />

                        {/* Caller Photo / Avatar */}
                        <div className={`relative w-28 h-28 rounded-full p-1 bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 ${isAiSpeaking ? 'border-pink-500 shadow-lg shadow-pink-500/40' : 'border-neutral-700'} shadow-2xl flex items-center justify-center`}>
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-900 via-slate-800 to-indigo-900 flex items-center justify-center overflow-hidden">
                                <span className="text-5xl filter drop-shadow">👩‍💼</span>
                            </div>
                        </div>
                    </div>

                    {/* Caller Name */}
                    <h2 className="text-2xl font-semibold tracking-tight text-white mt-1">
                        રિયા (AI Assistant)
                    </h2>

                    {/* Call Status / Timer */}
                    <p className="text-sm font-medium mt-1">
                        {callState === 'connecting' ? (
                            <span className="text-neutral-400 animate-pulse">Calling...</span>
                        ) : callState === 'connected' ? (
                            <span className="text-neutral-300 font-mono tracking-wider">{formatTime(callDuration)}</span>
                        ) : (
                            <span className="text-red-400">Call Ended</span>
                        )}
                    </p>

                    {/* Live Speaking Status Pill */}
                    <div className="mt-2">
                        {isAiSpeaking ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                <Volume2 className="w-3 h-3 mr-1.5 animate-bounce" />
                                રિયા બોલી રહી છે...
                            </span>
                        ) : !isMuted && callState === 'connected' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <Mic className="w-3 h-3 mr-1.5 animate-pulse" />
                                સાંભળી રહી છે (બોલો)...
                            </span>
                        ) : isMuted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-400">
                                <MicOff className="w-3 h-3 mr-1.5" />
                                માઇક મ્યૂટ છે
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Subtitle / Mini Live Transcript Box */}
                <div className="mx-6 my-2 h-24 overflow-y-auto rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3 text-xs leading-relaxed text-neutral-300 backdrop-blur-md shadow-inner flex flex-col justify-end">
                    {transcriptHistory.slice(-2).map((item, idx) => (
                        <div key={idx} className={`mb-1 ${item.sender === 'user' ? 'text-blue-300 font-medium' : 'text-neutral-200'}`}>
                            <span className="text-[10px] text-neutral-500 block">{item.sender === 'user' ? 'તમે:' : 'રિયા:'}</span>
                            <span>{item.text}</span>
                        </div>
                    ))}
                    {currentAiText && (
                        <div className="text-pink-300 flex items-center space-x-1 animate-pulse">
                            <span>{currentAiText}</span>
                        </div>
                    )}
                    <div ref={transcriptEndRef} />
                </div>

                {/* iPhone In-Call 6-Grid Control Buttons */}
                <div className="px-8 pb-10 pt-2 z-10 flex flex-col items-center">
                    <div className="grid grid-cols-3 gap-x-8 gap-y-5 mb-8 w-full max-w-[280px]">
                        
                        {/* 1. Mute Button */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={toggleMute}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                    isMuted 
                                        ? 'bg-white text-black shadow-lg shadow-white/20' 
                                        : 'bg-neutral-800/90 text-white hover:bg-neutral-700/90'
                                }`}
                            >
                                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">
                                {isMuted ? 'unmute' : 'mute'}
                            </span>
                        </div>

                        {/* 2. Keypad / Quick Prompt Button */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => sendTextQuery('નમસ્તે રિયા')}
                                className="w-16 h-16 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                            >
                                <Sparkles className="w-7 h-7 text-amber-300" />
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">Hello AI</span>
                        </div>

                        {/* 3. Speaker Button */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                    isSpeakerOn 
                                        ? 'bg-white text-black shadow-lg shadow-white/20' 
                                        : 'bg-neutral-800/90 text-white hover:bg-neutral-700/90'
                                }`}
                            >
                                <Volume2 className="w-7 h-7" />
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">speaker</span>
                        </div>

                        {/* 4. Request GST Doc Shortcut */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => sendTextQuery('મને જીએસટી સર્ટિફિકેટ મોકલો')}
                                className="w-16 h-16 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg font-bold text-sky-400">GST</span>
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">GST Doc</span>
                        </div>

                        {/* 5. Request PAN Doc Shortcut */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => sendTextQuery('મને પાનકાર્ડ ડોક્યુમેન્ટ મોકલો')}
                                className="w-16 h-16 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg font-bold text-indigo-400">PAN</span>
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">PAN Card</span>
                        </div>

                        {/* 6. All Docs Zip Shortcut */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => sendTextQuery('બધા ડોક્યુમેન્ટ્સ ઝિપ ફાઇલમાં મોકલો')}
                                className="w-16 h-16 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg font-bold text-emerald-400">ZIP</span>
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">All Docs</span>
                        </div>

                    </div>

                    {/* Big Red iPhone End Call Button */}
                    <div className="flex justify-center mt-2">
                        {callState !== 'ended' ? (
                            <button
                                onClick={endCall}
                                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition cursor-pointer"
                                title="End Call"
                            >
                                <PhoneOff className="w-9 h-9" />
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-8 py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition active:scale-95 cursor-pointer border border-neutral-700"
                            >
                                સ્ક્રીન બંધ કરો
                            </button>
                        )}
                    </div>
                </div>

                {/* iPhone Bottom Home Bar Indicator */}
                <div className="w-full flex justify-center pb-2 z-20">
                    <div className="w-32 h-1 bg-neutral-600/60 rounded-full"></div>
                </div>

            </div>
        </div>
    );
}
