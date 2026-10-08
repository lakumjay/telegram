import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    PhoneOff, 
    Mic, 
    MicOff, 
    Volume2, 
    Sparkles, 
    AlertCircle,
    FileText
} from 'lucide-react';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { PcmPlayer, arrayBufferToBase64, base64ToInt16 } from '../lib/audio';

export default function VoiceCallModal({ isOpen, onClose, telegramUserId = 999888777 }) {
    if (!isOpen) return null;

    const [callState, setCallState] = useState('connecting'); // connecting, connected, ended
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [micPermissionError, setMicPermissionError] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    
    // Live User and AI speech transcriptions
    const [transcriptHistory, setTranscriptHistory] = useState([
        { sender: 'ai', text: 'સર્વર સાથે જોડાઈ રહ્યું છે...' }
    ]);
    const [currentAiText, setCurrentAiText] = useState('');
    const [lastToolEvent, setLastToolEvent] = useState(null);

    // Refs
    const sessionRef = useRef(null);
    const playerRef = useRef(null);
    const micCtxRef = useRef(null);
    const micStreamRef = useRef(null);
    const workletNodeRef = useRef(null);
    const micSourceRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const isMutedRef = useRef(false);
    const isAiSpeakingRef = useRef(false);
    const closingRef = useRef(false);
    const transcriptEndRef = useRef(null);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        isAiSpeakingRef.current = isAiSpeaking;
    }, [isAiSpeaking]);

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
    }, [transcriptHistory, currentAiText, lastToolEvent]);

    const handleTranscript = useCallback((sender, text) => {
        setTranscriptHistory(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender === sender) {
                return [...prev.slice(0, -1), { ...last, text: last.text + text }];
            }
            return [...prev, { sender, text }];
        });
    }, []);

    const endCall = useCallback(async () => {
        closingRef.current = true;
        setCallState('ended');

        try {
            sessionRef.current?.close();
        } catch (e) {}
        sessionRef.current = null;

        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }

        if (micSourceRef.current) {
            micSourceRef.current.disconnect();
            micSourceRef.current = null;
        }

        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }

        if (micCtxRef.current && micCtxRef.current.state !== 'closed') {
            await micCtxRef.current.close().catch(() => {});
        }
        micCtxRef.current = null;

        if (playerRef.current) {
            playerRef.current.close();
            playerRef.current = null;
        }

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        setIsAiSpeaking(false);
    }, []);

    // Tool call execution (Telegram document delivery or live content query)
    const handleToolCall = async (call) => {
        if (call.name === 'query_document_content') {
            const queryText = call.args?.query;
            const docName = call.args?.document_name || '';
            console.log(`[ToolCall] Gemini invoked query_document_content: query="${queryText}", doc="${docName}"`);
            setLastToolEvent(`🔍 દસ્તાવેજમાંથી વિગત શોધી રહી છું: "${queryText}"...`);

            try {
                const res = await axios.post('/api/voice/query-content', {
                    query: queryText,
                    document_name: docName
                });
                const payload = res.data;
                console.log('[Content Query Result]', payload);

                if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: {
                                output: {
                                    status: "success",
                                    summary: payload.summary || "વિગત મળી નથી.",
                                    results_count: payload.results_count || 0
                                }
                            }
                        }]
                    });
                }
            } catch (err) {
                console.error('[Content Query Error]', err);
                if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: {
                                output: {
                                    status: "error",
                                    summary: "દસ્તાવેજ વાંચવામાં ટેકનિકલ ક્ષતિ થઈ."
                                }
                            }
                        }]
                    });
                }
            }
            return;
        }

        if (call.name === 'get_document') {
            const docType = call.args?.document_type;
            console.log(`[ToolCall] Gemini invoked get_document: ${docType}`);
            setLastToolEvent(`📄 ${docType?.toUpperCase()} દસ્તાવેજ ટેલિગ્રામમાં મોકલાઈ રહ્યો છે...`);

            try {
                const tgWebApp = window.Telegram?.WebApp;
                const initData = tgWebApp?.initData || '';

                const toolRes = await axios.post('/api/voice/get-document', {
                    document_type: docType,
                    init_data: initData,
                    telegram_user_id: telegramUserId
                });

                const resultPayload = toolRes.data;
                console.log('[ToolCall Result]', resultPayload);
                setLastToolEvent(`✅ ${resultPayload.document_title || docType?.toUpperCase()} મોકલી દેવાયો!`);

                if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: {
                                output: {
                                    status: resultPayload.status || "success",
                                    document_title: resultPayload.document_title || docType,
                                    message: resultPayload.message || "Document delivered to Telegram successfully"
                                }
                            }
                        }]
                    });
                }
            } catch (err) {
                console.error('[ToolCall Error]', err);
                setLastToolEvent(`❌ ભૂલ: ${err.response?.data?.message || err.message}`);
                if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: {
                                output: {
                                    status: "error",
                                    message: "Document not found or error occurred."
                                }
                            }
                        }]
                    });
                }
            }
        }
    };

    // Message handler for Gemini Live events
    const handleLiveMessage = useCallback((msg) => {
        const sc = msg.serverContent;
        if (sc) {
            // User interrupted AI speech
            if (sc.interrupted) {
                console.log('[Gemini Live] Interruption detected. Cutting AI playback.');
                playerRef.current?.interrupt();
                setIsAiSpeaking(false);
                setCurrentAiText('');
            }

            // AI Audio chunks
            const parts = sc.modelTurn?.parts || [];
            for (const part of parts) {
                if (part.inlineData?.data) {
                    setIsAiSpeaking(true);
                    playerRef.current?.enqueue(base64ToInt16(part.inlineData.data));
                }
                if (part.text) {
                    setCurrentAiText(prev => prev + part.text);
                }
            }

            // User Speech Transcription (Gemini native input transcription)
            if (sc.inputTranscription?.text) {
                handleTranscript('user', sc.inputTranscription.text);
            }

            // AI Output Speech Transcription
            if (sc.outputTranscription?.text) {
                handleTranscript('ai', sc.outputTranscription.text);
            }

            // Turn complete
            if (sc.turnComplete) {
                setCurrentAiText('');
            }
        }

        // Handle tool calls
        if (msg.toolCall?.functionCalls) {
            for (const call of msg.toolCall.functionCalls) {
                handleToolCall(call);
            }
        }
    }, [handleTranscript]);

    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            micStreamRef.current = stream;

            // Dedicated 16kHz AudioContext for mic capture
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const micCtx = new AudioCtx({ sampleRate: 16000 });
            micCtxRef.current = micCtx;

            // Add audio worklet module
            await micCtx.audioWorklet.addModule('/pcm-capture-worklet.js');

            const source = micCtx.createMediaStreamSource(stream);
            micSourceRef.current = source;

            // Analyser for UI visualizer
            const analyser = micCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round(avg * 2)));
                animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Worklet node for 16-bit PCM streaming
            const workletNode = new AudioWorkletNode(micCtx, 'pcm-capture-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                if (!sessionRef.current || isMutedRef.current) return;
                // Don't send mic audio if AI is currently speaking to prevent feedback echo
                if (isAiSpeakingRef.current) return;

                const base64Audio = arrayBufferToBase64(event.data);
                sessionRef.current.sendRealtimeInput({
                    audio: {
                        data: base64Audio,
                        mimeType: 'audio/pcm;rate=16000'
                    }
                });
            };

            source.connect(workletNode);
        } catch (err) {
            console.error('[Mic Error]', err);
            setMicPermissionError('કૃપા કરીને માઇક્રોફોનની પરમિશન Allow કરો.');
        }
    };

    const startLiveSession = async () => {
        closingRef.current = false;
        setConnectionError(null);
        setMicPermissionError(null);
        setCallState('connecting');

        try {
            // 1. Output Audio Player (24kHz)
            const player = new PcmPlayer(24000);
            await player.resume();
            player.onEndedCallback = () => {
                setIsAiSpeaking(false);
            };
            playerRef.current = player;

            // 2. Fetch Ephemeral Token and Configuration from backend
            const res = await axios.get('/api/voice/config');
            const { auth_token, system_instruction, voice_name, live_model } = res.data;

            if (!auth_token) {
                throw new Error('સર્વર તરફથી અધિકૃત ટોકન મળ્યો નથી.');
            }

            const targetModel = live_model || 'models/gemini-3.8-live';

            // 3. Connect to Gemini Live via official SDK
            const ai = new GoogleGenAI({
                apiKey: auth_token,
                httpOptions: { apiVersion: 'v1alpha' }
            });

            const session = await ai.live.connect({
                model: targetModel,
                config: {
                    responseModalities: ['audio'],
                    systemInstruction: system_instruction,
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voice_name || 'Aoede'
                            }
                        }
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: 'query_document_content',
                                    description: 'Fast search inside document pages/OCR text in Gujarati, Hindi or English to answer questions like address, partners, terms, amounts, dates, clauses without sending file.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            query: {
                                                type: 'STRING',
                                                description: 'The search question or topic (e.g. address, registration number, rent amount, terms).'
                                            },
                                            document_name: {
                                                type: 'STRING',
                                                description: 'Optional document or company name if known (e.g. rajeshwari solar, gst, pan, agreement).'
                                            }
                                        },
                                        required: ['query']
                                    }
                                },
                                {
                                    name: 'get_document',
                                    description: 'Search user verified company document (by type: gst, pan, stamp, or by document title/GST number/content) and deliver it directly into their Telegram chat.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            document_type: {
                                                type: 'STRING',
                                                description: 'The document identifier or search term (e.g., gst, pan, stamp, GST number, or agreement name).'
                                            }
                                        },
                                        required: ['document_type']
                                    }
                                }
                            ]
                        }
                    ]
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Gemini Live] WebSocket connection opened successfully.');
                    },
                    onmessage: (msg) => handleLiveMessage(msg),
                    onerror: (e) => {
                        console.error('[Gemini Live Error]', e);
                        setConnectionError(e?.message || 'કનેક્શનમાં ક્ષતિ થઈ.');
                        setCallState('ended');
                    },
                    onclose: () => {
                        if (!closingRef.current) {
                            console.log('[Gemini Live] Session closed unexpectedly.');
                            endCall();
                        }
                    }
                }
            });

            sessionRef.current = session;

            // 4. Start Microphone capture
            await startMic();

            setCallState('connected');
            setTranscriptHistory([{ sender: 'ai', text: 'નમસ્તે! રિયા લાઈવ છે...' }]);

            // Automatically trigger Riya to speak first and warmly greet user
            try {
                session.send({
                    clientContent: {
                        turns: [{
                            role: "user",
                            parts: [{ text: "નમસ્તે! કૉલ શરૂ થઈ ગયો છે. સામેથી ખુશ થઈને બોલો: 'નમસ્તે જય ભાઈ! બોલો, આજે તમારે કયા ડોક્યુમેન્ટની જરૂર છે?'" }]
                        }],
                        turnComplete: true
                    }
                });
            } catch (greetErr) {
                console.warn('[Greeting trigger note]', greetErr);
            }
        } catch (err) {
            console.error('Failed to start Live Session:', err);
            setConnectionError(err.message || 'લાઇવ સેશન શરૂ કરવામાં ભૂલ.');
            setCallState('ended');
        }
    };

    useEffect(() => {
        if (isOpen) {
            startLiveSession();
        }
        return () => {
            endCall();
        };
    }, [isOpen]);

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const reconnect = () => {
        endCall();
        setTimeout(() => {
            startLiveSession();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
            {/* iPhone Frame Container */}
            <div className="relative w-full h-full sm:h-[844px] sm:max-w-[390px] bg-gradient-to-b from-slate-900 via-neutral-950 to-black sm:rounded-[54px] sm:border-[8px] sm:border-neutral-800 shadow-2xl flex flex-col justify-between overflow-hidden text-white font-sans select-none sm:ring-1 sm:ring-neutral-700">
                
                {/* Dynamic Island / Top Notch Bar */}
                <div className="w-full pt-3 pb-2 flex flex-col items-center z-20">
                    <div className="w-32 h-6 bg-black rounded-full flex items-center justify-between px-3 border border-neutral-800/80 shadow-md">
                        <div className={`w-2 h-2 rounded-full ${callState === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        <span className="text-[10px] text-neutral-400 font-medium tracking-tight">Gemini Live VAD</span>
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
                <div className="flex flex-col items-center text-center mt-4 px-4 z-10">
                    {/* Animated Avatar with Pulsing Audio Waves */}
                    <div className="relative flex items-center justify-center my-3">
                        <div 
                            className={`absolute rounded-full transition-all duration-150 ${
                                isAiSpeaking 
                                    ? 'w-40 h-40 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 opacity-40 blur-xl animate-pulse'
                                    : callState === 'connected' && !isMuted
                                    ? 'w-36 h-36 bg-emerald-500 opacity-25 blur-lg'
                                    : 'w-32 h-32 bg-neutral-700 opacity-10'
                            }`}
                            style={{
                                transform: isAiSpeaking ? 'scale(1.2)' : `scale(${1 + (audioLevel / 100) * 0.6})`
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

                    {/* Live Speaking Status Pill & Mic Level Meter */}
                    <div className="mt-2 flex flex-col items-center space-y-1">
                        <div>
                            {isAiSpeaking ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                    <Volume2 className="w-3 h-3 mr-1.5 animate-bounce" />
                                    રિયા બોલી રહી છે...
                                </span>
                            ) : !isMuted && callState === 'connected' ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    <Mic className="w-3 h-3 mr-1.5 animate-pulse" />
                                    સાંભળી રહી છે (Auto VAD Active)...
                                </span>
                            ) : isMuted ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-400">
                                    <MicOff className="w-3 h-3 mr-1.5" />
                                    માઇક મ્યૂટ છે
                                </span>
                            ) : null}
                        </div>

                        {/* On-Screen Mic Level Bar */}
                        {!isMuted && callState === 'connected' && (
                            <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex items-center px-0.5">
                                <div 
                                    className="h-1 bg-emerald-400 rounded-full transition-all duration-75"
                                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                                ></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tool Event Notification Bar (Telegram Send Confirmation) */}
                {lastToolEvent && (
                    <div className="mx-6 px-3 py-2 bg-indigo-950/70 border border-indigo-500/40 rounded-xl text-[11px] text-indigo-200 flex items-center space-x-2 animate-bounce">
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="truncate">{lastToolEvent}</span>
                    </div>
                )}

                {/* Subtitle / Live Transcript Box */}
                <div className="mx-6 my-2 h-28 overflow-y-auto rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3 text-xs leading-relaxed text-neutral-300 backdrop-blur-md shadow-inner flex flex-col justify-end">
                    {transcriptHistory.slice(-3).map((item, idx) => (
                        <div key={idx} className={`mb-1 ${item.sender === 'user' ? 'text-blue-300 font-medium' : 'text-neutral-200'}`}>
                            <span className="text-[10px] text-neutral-500 block">{item.sender === 'user' ? '👤 તમે:' : '👩‍💼 રિયા:'}</span>
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

                {/* iPhone In-Call Control Grid */}
                <div className="px-8 pb-8 pt-1 z-10 flex flex-col items-center">
                    <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-6 w-full max-w-[280px]">
                        
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

                        {/* 2. Speaker Indicator */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-neutral-800/90 text-white flex items-center justify-center">
                                <Volume2 className="w-7 h-7 text-emerald-400" />
                            </div>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">speaker</span>
                        </div>

                        {/* 3. Status indicator */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-neutral-800/90 text-white flex items-center justify-center">
                                <Sparkles className="w-7 h-7 text-amber-300" />
                            </div>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">Live AI</span>
                        </div>

                    </div>

                    {/* Big Red iPhone End Call Button */}
                    <div className="flex justify-center mt-1">
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
