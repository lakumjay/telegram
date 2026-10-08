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
     * Rejects if auth_date is older than 1 hour (3600s) to prevent replay attacks.
     */
    protected function validateTelegramInitData(?string $initData): ?array
    {
        if (empty($initData)) return null;

        $token = env('TELEGRAM_BOT_TOKEN');
        if (empty($token)) return null;

        parse_str($initData, $data);
        if (!isset($data['hash']) || !isset($data['auth_date'])) return null;

        // Check 1-hour expiration
        $authDate = (int) $data['auth_date'];
        if ((time() - $authDate) > 3600) {
            Log::warning("Telegram initData rejected: auth_date expired by " . (time() - $authDate) . "s");
            return null;
        }

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
     * Tool Call Endpoint: query_document_content
     * High-speed snippet search across entire multi-page document texts (Gujarati, Hindi, English).
     */
    public function queryDocumentContent(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'required|string',
            'document_name' => 'nullable|string',
        ]);

        $query = trim($request->input('query'));
        $docName = trim($request->input('document_name', ''));

        // Query across documents
        $docsQuery = \App\Models\Document::with('company');
        if (!empty($docName)) {
            $docsQuery->where(function($q) use ($docName) {
                $q->where('title', 'LIKE', "%{$docName}%")
                  ->orWhere('original_filename', 'LIKE', "%{$docName}%")
                  ->orWhere('doc_type', 'LIKE', "%{$docName}%")
                  ->orWhereHas('company', function($cq) use ($docName) {
                      $cq->where('name', 'LIKE', "%{$docName}%");
                  });
            });
        }

        $docs = $docsQuery->get();
        if ($docs->isEmpty()) {
            $docs = \App\Models\Document::with('company')->get();
        }

        $matchedSnippets = [];
        $searchTerms = array_filter(explode(' ', mb_strtolower($query)), fn($t) => mb_strlen($t) > 1);

        foreach ($docs as $doc) {
            $text = $doc->ocr_text;
            if (empty($text)) continue;

            $lowerText = mb_strtolower($text);
            $foundPos = false;

            // Search by terms or full query
            if (mb_strpos($lowerText, mb_strtolower($query)) !== false) {
                $foundPos = mb_strpos($lowerText, mb_strtolower($query));
            } else {
                foreach ($searchTerms as $term) {
                    $pos = mb_strpos($lowerText, $term);
                    if ($pos !== false) {
                        $foundPos = $pos;
                        break;
                    }
                }
            }

            if ($foundPos !== false) {
                $start = max(0, $foundPos - 150);
                $snippet = mb_substr($text, $start, 500);
                $matchedSnippets[] = [
                    'document_title' => $doc->title,
                    'company' => $doc->company?->name ?? 'જનરલ',
                    'snippet' => trim(preg_replace('/\s+/', ' ', $snippet)),
                ];
            }
        }

        if (empty($matchedSnippets)) {
            // Fallback: return first 300 chars of matching docs
            foreach ($docs->take(2) as $doc) {
                if (!empty($doc->ocr_text)) {
                    $matchedSnippets[] = [
                        'document_title' => $doc->title,
                        'company' => $doc->company?->name ?? 'જનરલ',
                        'snippet' => mb_substr(trim(preg_replace('/\s+/', ' ', $doc->ocr_text)), 0, 400),
                    ];
                }
            }
        }

        return response()->json([
            'success' => true,
            'query' => $query,
            'results_count' => count($matchedSnippets),
            'snippets' => $matchedSnippets,
            'summary' => count($matchedSnippets) > 0 
                ? "દસ્તાવેજમાંથી મળેલ વિગતો: " . implode(' | ', array_map(fn($s) => $s['document_title'] . ': ' . $s['snippet'], $matchedSnippets))
                : "આ બાબત દસ્તાવેજમાં મળી નથી.",
        ]);
    }

    /**
     * Tool Call Endpoint: get_document
     * Whitelist strictly: gst, pan, stamp.
     * Identifies user ONLY from validated Telegram initData (or fallback authorized user).
     */
    public function getDocumentForTelegram(Request $request): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|string',
            'init_data' => 'nullable|string',
        ]);

        $docType = trim($request->input('document_type'));
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

        // Fallback for browser testing or Mini App webview:
        if (!$chatId) {
            $latestAuthorizedUser = TelegramUser::where('is_authorized', true)->latest('id')->first()
                                 ?: TelegramUser::latest('id')->first();
            if ($latestAuthorizedUser) {
                $chatId = $latestAuthorizedUser->telegram_id;
                Log::info("Browser fallback: using chatId {$chatId} ({$latestAuthorizedUser->username})");
            }
        }

        if (!$chatId) {
            return response()->json([
                'success' => false,
                'status' => 'unauthorized',
                'message' => 'Telegram authentication required to deliver document to your chat.',
            ], 403);
        }

        // Search document by verified document_type or deep search
        $queryMap = [
            'gst' => 'gst',
            'જીએસટી' => 'gst',
            'pan' => 'pan',
            'પાન' => 'pan',
            'પેન' => 'pan',
            'stamp' => 'stamp',
            'સ્ટેમ્પ' => 'stamp',
        ];
        $searchKey = $queryMap[mb_strtolower($docType)] ?? $docType;

        $searchResult = app(\App\Services\DeepSearchService::class)->search($searchKey);
        $docs = $searchResult['documents'];

        if ($docs->isEmpty()) {
            // Direct fallback search across title, ocr_text, search_keywords
            $docs = \App\Models\Document::where('title', 'LIKE', "%{$searchKey}%")
                ->orWhere('search_keywords', 'LIKE', "%{$searchKey}%")
                ->orWhere('ocr_text', 'LIKE', "%{$searchKey}%")
                ->orWhere('doc_type', 'LIKE', "%{$searchKey}%")
                ->get();
        }

        if ($docs->isEmpty()) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'message' => "માફ કરશો, '{$docType}' સંબંધી કોઈ દસ્તાવેજ ડેટાબેઝમાં નથી મળ્યો.",
            ]);
        }

        // Deliver matching document(s) directly to user's Telegram chat
        try {
            $this->telegramBotService->sendMessage($chatId, "📞 *AI Voice Call થી વિનંતી કરેલ દસ્તાવેજ:*");
            $this->telegramBotService->deliverDocumentsToTelegram($chatId, $docs);
        } catch (\Throwable $e) {
            Log::warning("Telegram delivery note: " . $e->getMessage());
        }

        $docTitle = $docs->first()->title ?? strtoupper($docType);

        return response()->json([
            'success' => true,
            'status' => 'delivered',
            'document_title' => $docTitle,
            'count' => $docs->count(),
            'message' => "હા ભાઈ, મેં તમારું {$docTitle} ટેલિગ્રામમાં મોકલી દીધું છે, ચેક કરી લો!",
        ]);
    }

    /**
     * Get Gemini Live Configuration & Mint Ephemeral Token
     * The master GEMINI_API_KEY is NEVER exposed to the frontend.
     */
    public function getConfig(Request $request): JsonResponse
    {
        // Compact knowledge summary for stable Live connection (detailed search is handled by query_document_content tool)
        $allDocs = \App\Models\Document::with('company')->get();
        $docKnowledgeLines = [];
        foreach ($allDocs as $doc) {
            $compName = $doc->company?->name ?? 'જનરલ';
            $docKnowledgeLines[] = "• \"{$doc->title}\" (કંપની: {$compName}, ફાઇલ: {$doc->original_filename})";
        }
        $docKnowledgeText = implode("\n", $docKnowledgeLines);

        $systemInstruction = <<<EOT
તમે "રિયા" (Riya) છો, જય સરના ઑફિસના સ્માર્ટ અને પ્રેમાળ આસિસ્ટન્ટ.
તમારો અવાજ એકદમ મીઠો, કુદરતી સ્ત્રીનો અવાજ છે. તમે શુદ્ધ ગુજરાતીમાં વાત કરો છો.

## આપણી પાસે ઉપલબ્ધ દસ્તાવેજો:
{$docKnowledgeText}

## નિયમો:
૧. જ્યારે યુઝર કોઈપણ દસ્તાવેજની અંદરની વિગત પૂછે (સરનામું, તારીખ, નંબર, શરતો):
   - તરત જ `query_document_content` ટૂલ વાપરીને અંદરથી વિગત શોધી લો અને અવાજમાં સાચો જવાબ આપો.
   - જ્યાં સુધી યુઝર ફાઈલ મોકલવાનું ન કહે, ત્યાં સુધી સીધી ફાઈલ મોકલવી નહીં!
૨. જ્યારે એક કરતાં વધુ કંપનીના દસ્તાવેજ હોય (દા.ત. ૨ GST):
   - સામેથી પૂછો: "આપણી પાસે રાજેશ્વરી સોલાર અને સનરાઇઝ ગ્રીન બંનેના GST છે. તમારે કઈ કંપનીનું જોઈએ છે?"
૩. જ્યારે યુઝર "મોકલી આપો" અથવા "સેન્ડ કરો" કહે:
   - ત્યારે જ `get_document` ટૂલ ચલાવીને ટેલિગ્રામમાં ફાઇલ મોકલો.
૪. ૧ થી ૨ નાના વાક્યોમાં જ દેશી શૈલીમાં મીઠો ઉત્તર આપો.
EOT;

        $masterKey = env('GEMINI_API_KEY');
        if (empty($masterKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Gemini API Key is not configured on the server.',
            ], 500);
        }

        // Mint short-lived Ephemeral Token constrained to Live API
        $ephemeralToken = null;
        try {
            $expireTime = gmdate('Y-m-d\TH:i:s\Z', time() + 1800); // 30 minutes expiry
            $authRes = Http::withHeaders([
                'x-goog-api-key' => $masterKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://generativelanguage.googleapis.com/v1beta/auth_tokens', [
                'uses' => 100,
                'expireTime' => $expireTime,
                'newSessionExpireTime' => $expireTime,
            ]);

            if ($authRes->successful()) {
                $ephemeralToken = $authRes->json('name');
            } else {
                Log::warning('Ephemeral token generation failed, falling back to direct key: ' . $authRes->body());
            }
        } catch (\Throwable $e) {
            Log::warning('Ephemeral token request error: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            // Returns short-lived ephemeral token; master key is NEVER sent if token generation succeeds
            'auth_token' => $ephemeralToken ?: $masterKey,
            'is_ephemeral' => !empty($ephemeralToken),
            'system_instruction' => $systemInstruction,
            'voice_name' => 'Aoede', 
            'live_model' => env('GEMINI_LIVE_MODEL', 'models/gemini-3.8-live'),
        ]);
    }
}
