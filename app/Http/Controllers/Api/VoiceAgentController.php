<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramUser;
use App\Models\VoiceCallLog;
use App\Services\AiVoiceAgentService;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VoiceAgentController extends Controller
{
    protected AiVoiceAgentService $voiceAgentService;
    protected TelegramBotService $telegramBotService;

    public function __construct(AiVoiceAgentService $voiceAgentService, TelegramBotService $telegramBotService)
    {
        $this->voiceAgentService = $voiceAgentService;
        $this->telegramBotService = $telegramBotService;
    }

    /**
     * Start or Continue Live Voice Session
     */
    public function talk(Request $request): JsonResponse
    {
        $request->validate([
            'transcript' => 'required|string',
            'session_id' => 'nullable|string',
            'telegram_user_id' => 'nullable|numeric',
        ]);

        $transcript = $request->transcript;
        $sessionId = $request->session_id;
        $telegramUserId = $request->telegram_user_id;

        $turn = $this->voiceAgentService->processTurn($transcript, $sessionId, $telegramUserId);

        // Generate Sneha Voice Audio URL
        $cleanText = preg_replace('/[*_#`]/u', '', $turn['voice_response']);
        $encodedText = urlencode(mb_substr($cleanText, 0, 450));
        $turn['tts_audio_url'] = url("/api/voice/tts?text={$encodedText}&lang=gu");

        // If documents were confirmed and telegram_user_id was provided, push to Telegram
        if ($turn['action'] === 'deliver_files_and_end_call' && $telegramUserId) {
            $user = TelegramUser::where('telegram_id', $telegramUserId)->first();
            if ($user) {
                $this->telegramBotService->sendMessage($user->telegram_id, "📞 *કૉલ પૂર્ણ થયો!*\n\nતમે કૉલ પર માંગેલા દસ્તાવેજો નીચે મુજબ છે:");
                $this->telegramBotService->deliverDocumentsToTelegram($user->telegram_id, $turn['documents']);
                if (!empty($turn['zip'])) {
                    $this->telegramBotService->deliverZipToTelegram($user->telegram_id, $turn['zip']);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $turn,
        ]);
    }

    /**
     * Sneha Neural Human Voice MP3 Stream (Ultra-low latency + Smart Disk Cache)
     */
    public function textToSpeech(Request $request)
    {
        $text = trim($request->query('text', ''));
        $lang = $request->query('lang', 'gu'); // gu or hi

        if (empty($text)) {
            return response()->noContent();
        }

        $cleanText = preg_replace('/[*_#`]/u', '', $text);
        $cacheDir = storage_path('app/public/voice_cache');
        if (!File::exists($cacheDir)) {
            File::makeDirectory($cacheDir, 0755, true);
        }

        $cacheHash = md5($cleanText . '_' . $lang);
        $cachedFile = $cacheDir . '/' . $cacheHash . '.mp3';

        // 1. Serve from instant cache if exists (0.005 seconds!)
        if (file_exists($cachedFile) && filesize($cachedFile) > 500) {
            return response()->file($cachedFile, [
                'Content-Type' => 'audio/mpeg',
                'Cache-Control' => 'public, max-age=86400',
                'Access-Control-Allow-Origin' => '*',
            ]);
        }

        // 2. Generate via Python Sneha Neural TTS (Edge Neural Engine)
        $scriptPath = base_path('scripts/sneha_tts.py');
        if (file_exists($scriptPath)) {
            $escapedText = escapeshellarg($cleanText);
            $escapedOut = escapeshellarg($cachedFile);
            $escapedLang = escapeshellarg($lang);

            $cmd = "python3 {$scriptPath} {$escapedText} {$escapedOut} {$escapedLang} 2>&1";
            exec($cmd, $output, $returnCode);

            if ($returnCode === 0 && file_exists($cachedFile) && filesize($cachedFile) > 500) {
                return response()->file($cachedFile, [
                    'Content-Type' => 'audio/mpeg',
                    'Cache-Control' => 'public, max-age=86400',
                    'Access-Control-Allow-Origin' => '*',
                ]);
            }
        }

        // 3. Fallback to Google Translate Stream if Python CLI was busy
        try {
            $ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={$lang}&q=" . urlencode($cleanText);
            $res = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Referer' => 'https://translate.google.com/',
            ])->timeout(8)->get($ttsUrl);

            if ($res->successful()) {
                file_put_contents($cachedFile, $res->body());
                return response($res->body(), 200, [
                    'Content-Type' => 'audio/mpeg',
                    'Cache-Control' => 'public, max-age=86400',
                    'Access-Control-Allow-Origin' => '*',
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('TTS fallback warning: ' . $e->getMessage());
        }

        return response()->json(['error' => 'TTS generation failed'], 500);
    }

    /**
     * Transcribe direct Audio Blob from React Mic using Groq Whisper (Free)
     */
    public function transcribeAudio(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file',
        ]);

        $audioFile = $request->file('audio');
        $groqApiKey = config('services.groq.key') ?: env('GROQ_API_KEY');

        if (!$groqApiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Groq API Key not configured. Using browser speech fallback.',
            ], 400);
        }

        try {
            $response = Http::withHeaders(['Authorization' => "Bearer {$groqApiKey}"])
                ->attach('file', file_get_contents($audioFile->getRealPath()), 'audio.webm')
                ->post('https://api.groq.com/openai/v1/audio/transcriptions', [
                    'model' => 'whisper-large-v3',
                    'language' => 'gu',
                    'response_format' => 'json',
                ]);

            if ($response->successful()) {
                $text = $response->json()['text'] ?? '';
                return response()->json([
                    'success' => true,
                    'transcript' => $text,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Whisper transcription failed: ' . $response->body(),
            ], 500);
        } catch (\Throwable $e) {
            Log::error('Audio transcribe error: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Validate Telegram WebApp initData string using Bot Token HMAC-SHA256
     */
    protected function validateTelegramInitData(?string $initData): ?array
    {
        if (empty($initData)) return null;

        $token = env('TELEGRAM_BOT_TOKEN');
        if (empty($token)) return null;

        parse_str($initData, $data);
        if (!isset($data['hash'])) return null;

        $hash = $data['hash'];
        unset($data['hash']);

        ksort($data);
        $dataCheckString = [];
        foreach ($data as $key => $val) {
            $dataCheckString[] = "{$key}={$val}";
        }
        $checkString = implode("\n", $dataCheckString);

        $secretKey = hash_hmac('sha256', $token, 'WebAppData', true);
        $calculatedHash = hash_hmac('sha256', $checkString, $secretKey);

        if (hash_equals($calculatedHash, $hash)) {
            if (isset($data['user'])) {
                return json_decode($data['user'], true);
            }
        }

        return null;
    }

    /**
     * Tool Call Endpoint: get_document
     * Whitelist strictly: gst, pan, stamp.
     * Identifies user ONLY from validated Telegram initData (or fallback authenticated user).
     */
    public function getDocumentForTelegram(Request $request): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string|in:gst,pan,stamp',
            'init_data' => 'nullable|string',
        ]);

        $docType = $request->input('document_type');
        $initData = $request->input('init_data');

        // Authenticate Telegram User strictly via initData
        $telegramUser = $this->validateTelegramInitData($initData);
        $chatId = null;

        if ($telegramUser && isset($telegramUser['id'])) {
            $chatId = $telegramUser['id'];
        } else {
            // Local fallback / direct Telegram chat id if authorized
            $fallbackId = $request->input('telegram_user_id');
            if ($fallbackId) {
                $user = TelegramUser::where('telegram_id', $fallbackId)->where('is_authorized', true)->first();
                if ($user) $chatId = $user->telegram_id;
            }
        }

        if (!$chatId) {
            return response()->json([
                'success' => false,
                'status' => 'unauthorized',
                'message' => 'Telegram authentication required to deliver document to your chat.',
            ], 403);
        }

        // Search document by verified document_type
        $queryMap = [
            'gst' => 'gst',
            'pan' => 'pan',
            'stamp' => 'stamp',
        ];
        $searchKey = $queryMap[$docType] ?? $docType;

        $searchResult = app(\App\Services\DeepSearchService::class)->search($searchKey);
        $docs = $searchResult['documents'];

        if ($docs->isEmpty()) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'message' => "Maaf kijiye, {$docType} document database me nahi mila.",
            ]);
        }

        // Deliver matching document(s) directly to user's Telegram chat
        $this->telegramBotService->sendMessage($chatId, "📞 *AI Voice Call થી વિનંતી કરેલ દસ્તાવેજ:*");
        $this->telegramBotService->deliverDocumentsToTelegram($chatId, $docs);

        $docTitle = $docs->first()->title ?? strtoupper($docType);

        return response()->json([
            'success' => true,
            'status' => 'delivered',
            'document_title' => $docTitle,
            'count' => $docs->count(),
            'message' => "Ji, maine aapka {$docTitle} Telegram chat me bhej diya hai.",
        ]);
    }

    /**
     * Get Gemini Live Configuration for Frontend WebSocket
     */
    public function getConfig(): JsonResponse
    {
        $systemInstruction = <<<EOT
Tum "Riya" ho, Jay Sir ki document assistant.
Tum ek asli insaan ki tarah baat karti ho, robot ki tarah nahi.

## Tumhara kaam
Customer ko uska zaroori document (GST, PAN ya Stamp Paper) Telegram chat me bhejna.

## Baat karne ka tarika
- Customer ki bhasha me jawab do (Gujarati, Hindi, Hinglish ya English).
- Chhote, simple, dostana jawab do. Ek baar me 1-2 line se zyada nahi.
- Pehle message me greet karo: "Namaste! Main Riya bol rahi hu, Jay Sir ke office se. Aapko kaunsa document chahiye?"
- "Ji", "Bilkul", "Zaroor", "Ek minute" jaise natural words use karo.
- Kabhi mat bolo ki tum AI ya bot ho.

## Document bhejne ka process
Jab customer GST, PAN ya Stamp Paper maange:
1. Tumhe 'get_document' tool call karna hai with document_type ('gst', 'pan', ya 'stamp').
2. Jab tool response me success mile, to customer ko bolo: "Ji, maine aapka document Telegram chat me bhej diya hai!"
3. Agar document na mile to bolo: "Maaf kijiye, ye document mere paas nahi mila."
EOT;

        return response()->json([
            'success' => true,
            'api_key' => env('GEMINI_API_KEY'),
            'system_instruction' => $systemInstruction,
            'voice_name' => 'Aoede', 
        ]);
    }
}
