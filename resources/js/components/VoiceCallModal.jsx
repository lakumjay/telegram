import React, { useState, useEffect, useRef } from 'react';
import { 
    PhoneOff, 
    Mic, 
    MicOff, 
    Volume2, 
    Sparkles, 
    Radio,
    AlertCircle,
    RefreshCw,
    FileText
} from 'lucide-react';
import axios from 'axios';

export default function VoiceCallModal({ isOpen, onClose, telegramUserId = 999888777 }) {
    if (!isOpen) return null;

    const [callState, setCallState] = useState('connecting'); // connecting, connected, ended
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [micPermissionError, setMicPermissionError] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    
    // Live User speech transcription from Gemini
    const [userSpokenText, setUserSpokenText] = useState('');
    const [transcriptHistory, setTranscriptHistory] = useState([
        { sender: 'ai', text: 'સર્વર સાથે જોડાઈ રહ્યું છે...' }
    ]);
    const [currentAiText, setCurrentAiText] = useState('');
    const [lastToolEvent, setLastToolEvent] = useState(null);

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const micStreamRef = useRef(null);
    const workletNodeRef = useRef(null);
    const fallbackProcessorRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const activeAudioNodesRef = useRef([]);
    const transcriptEndRef = useRef(null);
    const isSetupCompleteRef = useRef(false);
    const recognitionRef = useRef(null);
    const isAiSpeakingRef = useRef(false);
    const callStateRef = useRef(callState);
    const isOpenRef = useRef(isOpen);
    const heartbeatRef = useRef(null);
    const recentAiUtterancesRef = useRef([]);
    const isUserSpeakingRef = useRef(false);
    const lastAudioSentTimeRef = useRef(Date.now());
    const ambientFloorRef = useRef(10);

    useEffect(() => { callStateRef.current = callState; }, [callState]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

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
    }, [transcriptHistory, currentAiText, userSpokenText, lastToolEvent]);

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
        setUserSpokenText('');
        setLastToolEvent(null);
        
        try {
            // 1. AudioContext initialized on user gesture
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            nextPlayTimeRef.current = audioCtx.currentTime;
            console.log(`[Audio] AudioContext initialized. SampleRate: ${audioCtx.sampleRate} Hz`);

            // 2. Fetch Config & System Instruction
            const res = await axios.get('/api/voice/config');
            const { auth_token, is_ephemeral, system_instruction, voice_name } = res.data;

            if (!auth_token) {
                setConnectionError('સર્વર તરફથી અધિકૃત ટોકન મળ્યો નથી.');
                setCallState('ended');
                return;
            }

            // 3. Connect to Gemini Multimodal Live WebSocket using Ephemeral Token
            const wsUrl = is_ephemeral
                ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${auth_token}`
                : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${auth_token}`;
            
            console.log(`[WebSocket] Connecting to: ${wsUrl.split('?')[0]} with ${is_ephemeral ? 'Ephemeral Access Token' : 'Direct Key'}`);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log(`[WebSocket] Connected with ${is_ephemeral ? 'Ephemeral Token' : 'Auth Token'}. Sending Setup...`);
                setTranscriptHistory([{ sender: 'ai', text: 'કૉલ જોડાઈ રહ્યો છે...' }]);
                
                // Gemini Live Setup message with inputAudioTranscription and tools
                const setupMessage = {
                    setup: {
                        model: 'models/gemini-3.8-live',
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: 'Aoede'
                                    }
                                }
                            }
                        },
                        // Enable real-time Speech-to-Text of user's voice
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction: {
                            parts: [{ text: system_instruction }]
                        },
                        tools: [
                            {
                                functionDeclarations: [
                                    {
                                        name: "get_document",
                                        description: "Search user's verified company document and deliver it directly into their Telegram chat.",
                                        parameters: {
                                            type: "OBJECT",
                                            properties: {
                                                document_type: {
                                                    type: "STRING",
                                                    enum: ["gst", "pan", "stamp"],
                                                    description: "The type of document to deliver. Must strictly be gst, pan, or stamp."
                                                }
                                            },
                                            required: ["document_type"]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                };

                ws.send(JSON.stringify(setupMessage));
            };

            ws.onmessage = async (event) => {
                let text = event.data;
                if (event.data instanceof Blob) {
                    text = await event.data.text();
                }
                
                // Logging for verification
                console.log(`[WS onmessage] ${text.substring(0, 300)}...`);

                const msg = JSON.parse(text);

                // Phase A: Setup Complete
                if (msg.setupComplete) {
                    console.log('[WS] Setup Complete confirmed by Gemini.');
                    isSetupCompleteRef.current = true;
                    setCallState('connected');
                    setTranscriptHistory([{ sender: 'ai', text: 'નમસ્તે! રિયા લાઈવ છે. તમે બોલી શકો છો...' }]);
                    recentAiUtterancesRef.current = ['નમસ્તે', 'રિયા', 'જય સર', 'બોલો', 'કેમ છો'];

                    // Start Smart Keep-Alive Heartbeat: Send comfort silence ONLY if idle for > 3.5s
                    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                    heartbeatRef.current = setInterval(() => {
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSetupCompleteRef.current) {
                            const now = Date.now();
                            if (!isAiSpeakingRef.current && !isUserSpeakingRef.current && (now - lastAudioSentTimeRef.current > 3500)) {
                                const silent = new Int16Array(320); // 20ms silence
                                const u8 = new Uint8Array(silent.buffer);
                                let b = '';
                                for (let i = 0; i < u8.length; i++) b += String.fromCharCode(u8[i]);
                                wsRef.current.send(JSON.stringify({
                                    realtimeInput: {
                                        mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: btoa(b) }]
                                    }
                                }));
                                lastAudioSentTimeRef.current = now;
                            }
                        }
                    }, 2500);
                    
                    // Initialize Mic streaming pipeline
                    await initMicrophone(audioCtx, ws);

                    // Shield initial greeting from microphone echo
                    isAiSpeakingRef.current = true;
                    setIsAiSpeaking(true);

                    // Send pure Gujarati initial trigger (no English words to preserve stable female voice)
                    ws.send(JSON.stringify({
                        clientContent: {
                            turns: [{ role: "user", parts: [{ text: "નમસ્તે! કૉલ શરૂ થઈ ગયો છે, પ્રેમથી સ્વાગત કરો અને પૂછો કે આજે કયું ડોક્યુમેન્ટ જોઈએ છે." }] }],
                            turnComplete: true
                        }
                    }));
                }

                // Phase B-1: Real-time User Input Transcription from Gemini
                if (msg.serverContent?.inputTranscription?.text) {
                    const heardText = msg.serverContent.inputTranscription.text;
                    console.log('[Gemini Heard User]', heardText);
                    setUserSpokenText(heardText);
                    setTranscriptHistory(history => {
                        const last = history[history.length - 1];
                        if (last && last.sender === 'user') {
                            return [...history.slice(0, -1), { sender: 'user', text: heardText }];
                        }
                        return [...history, { sender: 'user', text: heardText }];
                    });
                }

                // Phase B-2: Audio & Output Text from AI
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

                // Phase C: Turn Complete (AI finished generating speech)
                if (msg.serverContent?.turnComplete) {
                    const remainingMs = Math.max(0, Math.round((nextPlayTimeRef.current - audioCtx.currentTime) * 1000));
                    setTimeout(() => {
                        if (activeAudioNodesRef.current.length === 0) {
                            isAiSpeakingRef.current = false;
                            setIsAiSpeaking(false);
                            console.log('[Echo Guard] AI finished speaking. Microphone 100% UNLOCKED.');
                        }
                    }, remainingMs + 80);

                    setCurrentAiText(prev => {
                        const trimmed = prev.trim();
                        if (trimmed) {
                            recentAiUtterancesRef.current.push(trimmed);
                            if (recentAiUtterancesRef.current.length > 8) {
                                recentAiUtterancesRef.current.shift();
                            }
                            setTranscriptHistory(history => [...history, { sender: 'ai', text: trimmed }]);
                        }
                        return '';
                    });
                }

                // Phase D: Interruption (User spoke while AI was talking)
                if (msg.serverContent?.interrupted) {
                    console.log('[WS] Gemini detected user interruption. Stopping audio.');
                    stopAllAudio();
                    setIsAiSpeaking(false);
                    setCurrentAiText('');
                }

                // Phase E: Tool Call Handling (get_document)
                if (msg.toolCall?.functionCalls) {
                    for (const call of msg.toolCall.functionCalls) {
                        if (call.name === "get_document") {
                            const docType = call.args?.document_type;
                            console.log(`[ToolCall] Gemini invoked get_document: ${docType}`);
                            setLastToolEvent(`📄 ${docType?.toUpperCase()} દસ્તાવેજ ટેલિગ્રામમાં મોકલાઈ રહ્યો છે...`);

                            // Call secure backend endpoint with Telegram initData
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

                                // Send toolResponse back to Gemini so it confirms via voice
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({
                                        toolResponse: {
                                            functionResponses: [
                                                {
                                                    response: { output: resultPayload },
                                                    id: call.id
                                                }
                                            ]
                                        }
                                    }));
                                }
                            } catch (err) {
                                console.error('[ToolCall Error]', err);
                                setLastToolEvent(`❌ દસ્તાવેજ શોધવામાં ક્ષતિ: ${err.response?.data?.message || err.message}`);
                                
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({
                                        toolResponse: {
                                            functionResponses: [
                                                {
                                                    response: { output: { success: false, message: "Document not found." } },
                                                    id: call.id
                                                }
                                            ]
                                        }
                                    }));
                                }
                            }
                        }
                    }
                }
            };

            ws.onerror = (e) => {
                console.error("[WebSocket Error]", e);
                setConnectionError("સર્વર સાથે કનેક્શન એરર. નેટવર્ક ચેક કરો.");
                if (isOpenRef.current && callStateRef.current !== 'ended') {
                    setTimeout(() => { if (isOpenRef.current) startLiveSession(); }, 1000);
                } else {
                    setCallState('ended');
                }
            };

            ws.onclose = (event) => {
                console.log(`[WebSocket onclose] Code: ${event.code}, Reason: ${event.reason || 'None'}`);
                
                // If user didn't intentionally hang up and modal is open, auto-reconnect!
                if (isOpenRef.current && callStateRef.current !== 'ended') {
                    console.log('[WebSocket] Live call closed. Auto-reconnecting in 800ms...');
                    setCallState('connecting');
                    setConnectionError('કનેક્શન ફરીથી જોડાઈ રહ્યું છે...');
                    setTimeout(() => {
                        if (isOpenRef.current && callStateRef.current !== 'ended') {
                            startLiveSession();
                        }
                    }, 800);
                    return;
                }

                if (callState !== 'ended') {
                    setConnectionError(`કૉલ પૂર્ણ થયો (Code: ${event.code})`);
                }
                setCallState('ended');
            };

        } catch (err) {
            console.error('Failed to start Live Session', err);
            setConnectionError("લાઇવ સેશન શરૂ કરવામાં ભૂલ.");
            setCallState('ended');
        }
    };

    // Initialize Microphone with AudioWorklet and 16kHz PCM downsampling
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
            
            // Analyser for on-screen live meter
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
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round(avg * 1.8)));

                // Dynamic Voice Activity Detection (VAD)
                if (isAiSpeakingRef.current || activeAudioNodesRef.current.length > 0) {
                    // AI is talking, don't trigger user VAD
                } else {
                    // Dynamically adapt noise floor during pauses
                    if (!isUserSpeakingRef.current) {
                        ambientFloorRef.current = (ambientFloorRef.current * 0.95) + (avg * 0.05);
                    }
                    const speakThreshold = Math.max(12, ambientFloorRef.current + 5);
                    const silenceThreshold = Math.max(6, ambientFloorRef.current + 2);

                    if (avg > speakThreshold) {
                        isUserSpeakingRef.current = true;
                    } else if (isUserSpeakingRef.current && avg <= silenceThreshold) {
                        isUserSpeakingRef.current = false;
                    }
                }

                animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            // Web Speech Recognition: Natural auxiliary recognizer with strict Anti-Echo Shield
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'gu-IN'; // Gujarati / Hindi recognition

                    recognition.onresult = (event) => {
                        // Drop if AI is actively speaking
                        if (isAiSpeakingRef.current || activeAudioNodesRef.current.length > 0) {
                            return;
                        }

                        let finalTranscript = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            }
                        }

                        const spoken = finalTranscript.trim();
                        if (!spoken) return;

                        // Check if the user is asking for documents or expressing intent
                        const userKeywords = [
                            'જીએસટી', 'gst', 'પેન', 'પાન', 'pan', 'સ્ટેમ્પ', 'stamp',
                            'આધાર', 'ડોક્યુમેન્ટ', 'કાગળ', 'જોઈએ', 'જોવે', 'આપો', 'મોકલો',
                            'મોકલી', 'મારે', 'મને', 'હું', 'કરવું', 'કરો', 'કેમ', 'શું', 'હા'
                        ];
                        const hasUserIntent = userKeywords.some(kw => spoken.toLowerCase().includes(kw));

                        // Echo guard ONLY applies if there is NO user intent and it matches AI verbatim
                        if (!hasUserIntent) {
                            const isExactEcho = recentAiUtterancesRef.current.some(utt => utt.trim() === spoken);
                            if (isExactEcho || (currentAiText && currentAiText.trim() === spoken)) {
                                console.log('[Echo Shield] Ignored speaker loopback text:', spoken);
                                return;
                            }
                        }

                        console.log('[Speech Recognition Heard User]:', spoken);
                        setUserSpokenText(spoken);
                        setTranscriptHistory(history => [...history, { sender: 'user', text: spoken }]);

                        // Send user turn with text directly to Gemini WebSocket!
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSetupCompleteRef.current) {
                            console.log('[Live Voice Turn Sent to Gemini]:', spoken);
                            wsRef.current.send(JSON.stringify({
                                clientContent: {
                                    turns: [{
                                        role: "user",
                                        parts: [{ text: spoken }]
                                    }],
                                    turnComplete: true
                                }
                            }));
                        }
                    };

                    recognition.onerror = (err) => {
                        console.warn('[Speech Recognition] Note:', err.error);
                        if (err.error === 'no-speech' || err.error === 'aborted' || err.error === 'network') {
                            setTimeout(() => {
                                if (callStateRef.current !== 'ended' && isSetupCompleteRef.current) {
                                    try { recognition.start(); } catch(e) {}
                                }
                            }, 300);
                        }
                    };

                    recognition.onend = () => {
                        if (callStateRef.current !== 'ended' && isSetupCompleteRef.current) {
                            setTimeout(() => {
                                try { recognition.start(); } catch(e) {}
                            }, 200);
                        }
                    };

                    recognition.start();
                    recognitionRef.current = recognition;
                    console.log('[Speech Recognition] Active with Anti-Echo Protection for natural conversation!');
                } catch(e) {
                    console.warn('[Speech Recognition] Failed to initialize:', e);
                }
            }

            const nativeRate = audioCtx.sampleRate;
            console.log(`[Mic Pipeline] Capturing at ${nativeRate} Hz. Converting to 16000 Hz.`);

            // High-fidelity downsample Float32 to 16kHz Int16 Little-Endian base64 with Linear Interpolation
            const convertAndSend = (float32Input) => {
                // Drop mic data if muted, not setup, or AI is speaking to prevent feedback echo!
                if (isMuted || !isSetupCompleteRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
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
                    // Crisp 1.3x voice clarity boost, clamped cleanly without distortion
                    s = Math.max(-1, Math.min(1, s * 1.3));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const uint8 = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < uint8.length; i++) {
                    binary += String.fromCharCode(uint8[i]);
                }
                const base64 = btoa(binary);

                // Send realtime input chunk to Gemini
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{
                                mimeType: "audio/pcm;rate=16000",
                                data: base64
                            }]
                        }
                    }));
                    lastAudioSentTimeRef.current = Date.now();
                }
            };

            // Try AudioWorklet first using an INLINE BLOB (100% reliable, no 404 / CORS issues)
            let workletSuccess = false;
            try {
                if (audioCtx.audioWorklet) {
                    const workletCode = `
                        class AudioRecordingProcessor extends AudioWorkletProcessor {
                            constructor() {
                                super();
                                this.bufferSize = 4096;
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

                    // Connect to silent gain node to ensure Chrome keeps the worklet active in audio graph
                    const silentGain = audioCtx.createGain();
                    silentGain.gain.value = 0;
                    source.connect(workletNode);
                    workletNode.connect(silentGain);
                    silentGain.connect(audioCtx.destination);

                    workletSuccess = true;
                    console.log('[Mic Pipeline] Inline AudioWorkletNode successfully active and connected to audio graph!');
                }
            } catch (workletErr) {
                console.warn('[Mic Pipeline] AudioWorklet inline failed, using ScriptProcessor fallback:', workletErr);
            }

            // Fallback to ScriptProcessor if AudioWorklet not supported
            if (!workletSuccess) {
                const processor = audioCtx.createScriptProcessor(2048, 1, 1);
                fallbackProcessorRef.current = processor;
                processor.onaudioprocess = (e) => {
                    convertAndSend(e.inputBuffer.getChannelData(0));
                };

                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 0;
                source.connect(processor);
                processor.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                console.log('[Mic Pipeline] ScriptProcessor fallback active and sending audio chunks.');
            }

        } catch (err) {
            console.error('Mic initialization error:', err);
            setMicPermissionError('કૃપા કરીને માઇક્રોફોનની પરમિશન Allow કરો.');
        }
    };

    // Jitter buffer queue for seamless audio playback
    const playAudioChunk = (base64, audioCtx) => {
        isAiSpeakingRef.current = true;
        setIsAiSpeaking(true);
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.error("Audio resume error:", e));
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
        
        // Gemini sends 24,000Hz PCM
        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        activeAudioNodesRef.current.push(source);
        source.onended = () => {
            activeAudioNodesRef.current = activeAudioNodesRef.current.filter(s => s !== source);
            if (activeAudioNodesRef.current.length === 0) {
                // Unlock mic quickly (80ms) for seamless, natural human conversation
                setTimeout(() => {
                    if (activeAudioNodesRef.current.length === 0) {
                        isAiSpeakingRef.current = false;
                        setIsAiSpeaking(false);
                    }
                }, 80);
            }
        };
        
        const currentTime = audioCtx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime + 0.05; // 50ms smooth pad
        }
        
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
    };

    const stopAllAudio = () => {
        activeAudioNodesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        activeAudioNodesRef.current = [];
        isAiSpeakingRef.current = false;
        setIsAiSpeaking(false);
        if (audioContextRef.current) {
            nextPlayTimeRef.current = audioContextRef.current.currentTime;
        }
    };

    const endCall = () => {
        callStateRef.current = 'ended';
        setCallState('ended');
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
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
            audioContextRef.current.close();
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            recognitionRef.current = null;
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
                    {transcriptHistory.slice(-2).map((item, idx) => (
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

                        {/* 2. Keypad / Quick Greeting Button */}
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

                        {/* 6. Stamp Paper Shortcut */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => sendTextQuery('મને સ્ટેમ્પ પેપર મોકલો')}
                                className="w-16 h-16 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
                            >
                                <span className="text-base font-bold text-amber-400">STAMP</span>
                            </button>
                            <span className="text-[11px] font-medium text-neutral-300 mt-1.5">Stamp Doc</span>
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
