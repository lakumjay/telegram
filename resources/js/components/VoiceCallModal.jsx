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

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                setAudioLevel(Math.min(100, Math.round((sum / dataArray.length) * 1.6)));
                animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Processor to convert float32 to int16 PCM (16kHz)
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            const nativeRate = audioCtx.sampleRate;
            
            processor.onaudioprocess = (e) => {
                // Wait until setup is truly complete and mic is not muted
                if (isMuted || !isSetupCompleteRef.current || ws.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const ratio = nativeRate / 16000;
                const newLength = Math.round(inputData.length / ratio);
                const pcm16 = new Int16Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    const nativeIndex = Math.round(i * ratio);
                    let s = inputData[nativeIndex < inputData.length ? nativeIndex : inputData.length - 1];
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-[32px] shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header Call Status */}
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center space-x-2.5">
                        <div className={`flex items-center space-x-1.5 px-3 py-1 border rounded-full text-xs font-semibold ${
                            callState === 'connected' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : callState === 'connecting'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                            <Radio className={`w-3.5 h-3.5 ${callState === 'connected' ? 'animate-pulse' : ''}`} />
                            <span>
                                {callState === 'connected' ? `લાઇવ કૉલ ચાલુ છે • ${formatTime(callDuration)}` : 
                                 callState === 'connecting' ? 'જોડાઈ રહ્યું છે...' : 'કૉલ પૂર્ણ થયો'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {callState !== 'ended' ? (
                            <button
                                onClick={endCall}
                                className="flex items-center space-x-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
                            >
                                <PhoneOff className="w-3.5 h-3.5" />
                                <span>કૉલ કટ કરો</span>
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                            >
                                બંધ કરો
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Banner */}
                {(micPermissionError || connectionError) && (
                    <div className="m-3 p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                            <span>{micPermissionError || connectionError}</span>
                        </div>
                        {connectionError && (
                            <button onClick={reconnect} className="flex items-center space-x-1 px-3 py-1 bg-red-900/50 hover:bg-red-800 rounded-lg border border-red-700 transition cursor-pointer text-white">
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>ફરીથી જોડાઓ</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Dynamic Visualizer Orb */}
                <div className="py-8 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent via-purple-950/20 to-transparent">
                    <div className="relative flex items-center justify-center">
                        <div 
                            className={`absolute w-36 h-36 rounded-full transition-all duration-150 ${
                                isAiSpeaking 
                                    ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-60 blur-2xl scale-125 animate-pulse' 
                                    : !isMuted && callState === 'connected'
                                    ? 'bg-emerald-500 opacity-40 blur-xl' 
                                    : 'bg-slate-700 opacity-20 blur-lg'
                            }`} 
                            style={{
                                transform: isAiSpeaking ? 'scale(1.2)' : `scale(${1 + (audioLevel / 100) * 0.6})`
                            }}
                        />

                        <div 
                            onClick={toggleMute}
                            className={`relative w-24 h-24 rounded-full p-1 shadow-2xl transition-all duration-200 cursor-pointer ${
                                isAiSpeaking 
                                    ? 'bg-gradient-to-tr from-pink-400 via-purple-500 to-indigo-400 animate-spin scale-110 ring-4 ring-pink-400/50' 
                                    : !isMuted && callState === 'connected'
                                    ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 ring-4 ring-emerald-500/40' 
                                    : 'bg-gradient-to-tr from-slate-700 to-slate-800'
                            }`}
                            style={{
                                transform: isAiSpeaking ? 'scale(1.08)' : `scale(${1 + (audioLevel / 100) * 0.3})`
                            }}
                        >
                            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                                <span className="text-3xl">
                                    {isAiSpeaking ? '👩‍💼' : isMuted ? '🔇' : '🎙️'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Label */}
                    <div className="text-center mt-4 space-y-1">
                        <div className="flex items-center justify-center space-x-1.5">
                            <span className="text-sm font-bold text-white">સ્નેહા (Gemini Live)</span>
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold rounded-full border border-indigo-500/30">
                                0 Latency WebSocket
                            </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-300 mt-2">
                            {callState === 'connecting' ? (
                                <span className="text-amber-400 animate-pulse">સર્વર સાથે જોડાઈ રહ્યું છે... કૃપા કરીને રાહ જુઓ...</span>
                            ) : isAiSpeaking ? (
                                <span className="text-pink-300 flex items-center justify-center">
                                    <Volume2 className="w-3.5 h-3.5 mr-1 animate-bounce" />
                                    સ્નેહા બોલી રહી છે... (વચ્ચે બોલીને અટકાવી શકો છો)
                                </span>
                            ) : isMuted ? (
                                <span className="text-slate-400">માઇક બંધ છે</span>
                            ) : (
                                <span className="text-emerald-400 flex items-center justify-center">
                                    <Mic className="w-3.5 h-3.5 mr-1 animate-pulse" />
                                    માઇક ચાલુ છે • કાંઈક બોલો...
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5 justify-center px-4">
                        <button
                            onClick={() => sendTextQuery('હેલ્લો')}
                            disabled={callState !== 'connected'}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition cursor-pointer"
                        >
                            💬 "હેલ્લો"
                        </button>
                        <button
                            onClick={() => sendTextQuery('રાજેશ્વરી સોલાર પાનકાર્ડ આપો')}
                            disabled={callState !== 'connected'}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition cursor-pointer"
                        >
                            📄 "પાનકાર્ડ માંગો"
                        </button>
                    </div>
                </div>

                {/* Main Transcript Body */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-slate-900/50 shadow-inner">
                    {transcriptHistory.map((item, idx) => (
                        <div key={idx} className={`flex ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md ${
                                item.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none'
                            }`}>
                                <div className="text-[10px] text-slate-400 mb-0.5 font-semibold">
                                    <span>{item.sender === 'user' ? '👤 તમે' : '👩‍💼 સ્નેહા AI'}</span>
                                </div>
                                <p className="whitespace-pre-wrap">{item.text}</p>
                            </div>
                        </div>
                    ))}
                    {currentAiText && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center space-x-2 text-xs text-slate-300">
                                <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
                                <span>{currentAiText}</span>
                            </div>
                        </div>
                    )}
                    <div ref={transcriptEndRef} />
                </div>

                {/* Bottom Control Bar */}
                {callState === 'connected' && (
                    <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center space-x-2">
                        <button
                            type="button"
                            onClick={toggleMute}
                            className={`p-4 rounded-full border transition cursor-pointer ${
                                !isMuted
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                                    : 'bg-red-900/60 text-red-400 border-red-800 hover:bg-red-800'
                            }`}
                            title={isMuted ? 'માઇક શરૂ કરો' : 'માઇક બંધ કરો'}
                        >
                            {!isMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
