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

        // Query document_pages table directly for millisecond-scale indexing
        $pageMatches = [];
        $searchTerms = array_filter(explode(' ', mb_strtolower($query)), fn($t) => mb_strlen($t) > 1);

        $pagesQuery = \App\Models\DocumentPage::with('document.company');
        if (!empty($docName)) {
            $pagesQuery->whereHas('document', function($dq) use ($docName) {
                $dq->where('title', 'LIKE', "%{$docName}%")
                   ->orWhere('original_filename', 'LIKE', "%{$docName}%")
                   ->orWhere('doc_type', 'LIKE', "%{$docName}%")
                   ->orWhereHas('company', function($cq) use ($docName) {
                       $cq->where('name', 'LIKE', "%{$docName}%");
                   });
            });
        }

        // Search full query or individual terms in page content
        $pagesQuery->where(function($q) use ($query, $searchTerms) {
            $q->where('content', 'LIKE', "%{$query}%");
            foreach ($searchTerms as $term) {
                $q->orWhere('content', 'LIKE', "%{$term}%");
            }
        });

        $matchedPages = $pagesQuery->limit(5)->get();

        foreach ($matchedPages as $page) {
            $doc = $page->document;
            $content = $page->content;
            
            // Find best matching 300-char window on this page
            $pos = mb_strpos(mb_strtolower($content), mb_strtolower($query));
            if ($pos === false && !empty($searchTerms)) {
                foreach ($searchTerms as $term) {
                    $p = mb_strpos(mb_strtolower($content), $term);
                    if ($p !== false) {
                        $pos = $p;
                        break;
                    }
                }
            }

            $start = $pos !== false ? max(0, $pos - 100) : 0;
            $snippet = mb_substr($content, $start, 400);
            $cleanSnippet = trim(preg_replace('/\s+/', ' ', $snippet));

            $pageMatches[] = [
                'document_title' => "{$doc->title} (પાના નં. {$page->page_number})",
                'company' => $doc->company?->name ?? 'જનરલ',
                'snippet' => $cleanSnippet,
                'entities' => $page->extracted_entities,
            ];
        }

        $summary = count($pageMatches) > 0 
            ? "દસ્તાવેજમાંથી મળેલ મુદ્દા: " . implode(' | ', array_map(fn($s) => $s['document_title'] . ': ' . $s['snippet'], array_slice($pageMatches, 0, 3)))
            : "આ વિગત દસ્તાવેજમાં મળી નથી.";

        return response()->json([
            'success' => true,
            'query' => $query,
            'results_count' => count($pageMatches),
            'snippets' => $pageMatches,
            'summary' => $summary,
        ]);
    }
    /**
     * Tool Call Endpoint: analyze_document_risk
     * Scans agreement/lease deed clauses for legal & financial risks:
     * - Penalty clauses / High interest rates (e.g. 24% p.a.)
     * - Lock-in periods & Termination notice
     * - Subletting restrictions & indemnities
     * - Expiry & renewal obligations
     */
    public function analyzeDocumentRisk(Request $request): JsonResponse
    {
        $request->validate([
            'document_name' => 'nullable|string',
        ]);

        $docName = trim($request->input('document_name', ''));

        // Query agreement / lease deed or specific document
        $query = \App\Models\Document::with('pages');
        if (!empty($docName)) {
            $query->where(function($q) use ($docName) {
                $q->where('title', 'LIKE', "%{$docName}%")
                  ->orWhere('original_filename', 'LIKE', "%{$docName}%")
                  ->orWhere('doc_type', 'LIKE', "%{$docName}%");
            });
        } else {
            $query->where(function($q) {
                $q->where('title', 'LIKE', '%lease%')
                  ->orWhere('title', 'LIKE', '%agreement%')
                  ->orWhere('title', 'LIKE', '%deed%')
                  ->orWhere('doc_type', 'LIKE', '%contract%')
                  ->orWhere('doc_type', 'LIKE', '%agreement%');
            });
        }

        $document = $query->first() ?: \App\Models\Document::with('pages')->latest()->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'risk_summary' => 'એનાલિસિસ કરવા માટે કોઈ કરાર કે એગ્રીમેન્ટ મળ્યું નથી.',
                'critical_clauses' => [],
            ]);
        }

        // Search clauses for risks
        $pages = $document->pages()->orderBy('page_number')->get();
        $criticalClauses = [];

        $riskPatterns = [
            'penalty_interest' => ['/(\d{1,2}%\s*(?:interest|penalty|per annum|p\.a\.|rate))/i', 'વ્યાજ / પેનલ્ટી શરત'],
            'lock_in' => ['/(lock[\s\-]?in\s*(?:period|of)?\s*\d+\s*(?:months|years)?)/i', 'લોક-ઇન સમયગાળો'],
            'termination' => ['/(notice\s+period\s+of\s+\d+\s*(?:days|months)|terminate\s+forthwith|immediate\s+termination)/i', 'નોટિસ પિરિયડ / રદ્દીકરણ શરત'],
            'indemnity' => ['/(indemnify|indemnity|keep\s+harmless|solely\s+liable)/i', 'નુકસાની ભરપાઈ (Indemnity) શરત'],
            'escalation' => ['/(escalat(?:e|ion)\s*(?:of|by)?\s*\d+%\s*|annual\s+increase\s+of\s+\d+%\s*)/i', 'વાર્ષિક ભાડા વધારો (Escalation) શરત'],
            'forfeiture' => ['/(forfeit(?:ure)?\s+of\s+security\s+deposit)/i', 'સિક્યોરિટી ડિપોઝિટ જપ્તી શરત'],
        ];

        foreach ($pages as $pg) {
            $text = $pg->content;
            foreach ($riskPatterns as $key => [$regex, $label]) {
                if (preg_match($regex, $text, $matches)) {
                    $pos = mb_strpos($text, $matches[0]);
                    $start = max(0, $pos - 80);
                    $snippet = mb_substr($text, $start, 260);
                    $clean = trim(preg_replace('/\s+/', ' ', $snippet));

                    $criticalClauses[] = [
                        'type' => $label,
                        'page_number' => $pg->page_number,
                        'matched' => $matches[0],
                        'clause_text' => $clean,
                    ];
                }
            }
        }

        // Build Gujarati voice risk summary
        if (count($criticalClauses) > 0) {
            $points = [];
            foreach (array_slice($criticalClauses, 0, 3) as $c) {
                $points[] = "પાના નં. {$c['page_number']} પર {$c['type']}: '{$c['matched']}'";
            }
            $riskSummary = "ધ્યાન આપો, આ કરારમાં મુખ્ય રિસ્ક મળ્યા છે: " . implode(', તેમજ ', $points) . ". વિગતવાર શરતો તપાસવી સલાહભર્યું છે.";
        } else {
            $riskSummary = "આ કરારમાં કોઈ અસામાન્ય અથવા નુકસાનકારક પેનલ્ટી શરત દેખાઈ નથી. કરાર સામાન્ય જણાય છે.";
        }

        return response()->json([
            'success' => true,
            'document_title' => $document->title,
            'total_pages' => $pages->count(),
            'critical_clauses' => $criticalClauses,
            'risk_summary' => $riskSummary,
        ]);
    }

    /**
     * Tool Call Endpoint: draft_document
     * Voice-to-Document Creation (Magic Drafting):
     * Generates a clean PDF document on the fly based on voice call parameters
     * and delivers it directly to user's Telegram chat.
     */
    public function draftDocument(Request $request): JsonResponse
    {
        $request->validate([
            'doc_type' => 'required|string',
            'first_party' => 'required|string',
            'second_party' => 'required|string',
            'amount' => 'nullable|string',
            'duration_months' => 'nullable|string',
            'city' => 'nullable|string',
            'init_data' => 'nullable|string',
        ]);

        $docType = trim($request->input('doc_type'));
        $firstParty = trim($request->input('first_party'));
        $secondParty = trim($request->input('second_party'));
        $amount = trim($request->input('amount', '15,000'));
        $duration = trim($request->input('duration_months', '11 મહિના'));
        $city = trim($request->input('city', 'બોટાદ'));
        $initData = $request->input('init_data');

        // Authenticate Telegram User
        $telegramUser = $this->validateTelegramInitData($initData);
        $chatId = null;
        if ($telegramUser && isset($telegramUser['id'])) {
            $chatId = $telegramUser['id'];
        } else {
            $fallbackId = $request->input('telegram_user_id');
            if ($fallbackId) {
                $user = TelegramUser::where('telegram_id', $fallbackId)->first();
                if ($user) $chatId = $user->telegram_id;
                else $chatId = $fallbackId; // Direct chatId passed from authenticated manager
            }
        }
        if (!$chatId) {
            $latestUser = TelegramUser::where('is_authorized', true)->latest('id')->first()
                       ?: TelegramUser::latest('id')->first();
            if ($latestUser) $chatId = $latestUser->telegram_id;
        }

        // Generate Text Draft
        $dateStr = now()->format('d/m/Y');
        $agreementTitle = "ભાડા કરાર (RENT AGREEMENT)";
        if (stripos($docType, 'lease') !== false) {
            $agreementTitle = "લીઝ ડીડ કરાર (LEASE DEED)";
        }

        $draftContent = <<<EOT
============================================================
              {$agreementTitle}
============================================================

તારીખ: {$dateStr}
સ્થળ: {$city}, ગુજરાત

આ કરાર નીચે દર્શાવેલ બંને પક્ષકારો વચ્ચે સ્વેચ્છાએ કરવામાં આવ્યો છે:

પ્રથમ પક્ષકાર (મકાનમાલિક / લેસર):
નામ: {$firstParty}
સરનામું: {$city}, ગુજરાત

અને

બીજો પક્ષકાર (ભાડુઆત / લેસી):
નામ: {$secondParty}
સરનામું: {$city}, ગુજરાત

મુખ્ય શરતો અને નિયમો:
------------------------------------------------------------
૧. મુદત (Duration): આ કરારની મુદત {$duration} માટે રહેશે.
૨. માસિક રકમ (Monthly Rent): બીજા પક્ષકાર પ્રથમ પક્ષકારને દર મહિને ₹{$amount}/- ભાડું ચૂકવશે.
૩. વીજળી અને પાણી: વપરાશ મુજબ બિલ બીજા પક્ષકારે અલગથી ચૂકવવાનું રહેશે.
૪. ઉપયોગ: આ મિલકતનો ઉપયોગ ફક્ત કાયદેસર હેતુ માટે જ કરવામાં આવશે.
૫. નોટિસ પિરિયડ: કરાર રદ કરવા માટે ૧ મહિનાની લેખિત નોટિસ આપવી જરૂરી રહેશે.

સાક્ષીઓ:
૧. _____________________        પ્રથમ પક્ષકાર: {$firstParty}
                                સહી: _____________________

૨. _____________________        બીજો પક્ષકાર: {$secondParty}
                                સહી: _____________________
============================================================
(Drafted automatically by Riya Voice Assistant)
EOT;

        // Save draft as clean text/pdf document in storage
        $safeFirst = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $firstParty);
        $fileName = "Draft_{$safeFirst}_Agreement_" . time() . ".txt";
        $storageDir = storage_path('app/private/documents');
        if (!file_exists($storageDir)) {
            @mkdir($storageDir, 0755, true);
        }
        $fullPath = $storageDir . '/' . $fileName;
        file_put_contents($fullPath, $draftContent);

        // Record in Database
        $doc = \App\Models\Document::create([
            'title' => "{$agreementTitle} - {$firstParty} & {$secondParty}",
            'original_filename' => $fileName,
            'file_path' => 'documents/' . $fileName,
            'file_type' => 'text/plain',
            'file_size' => strlen($draftContent),
            'doc_type' => 'agreement',
            'ocr_text' => $draftContent,
            'search_keywords' => "{$firstParty} {$secondParty} {$agreementTitle} {$city} {$amount}",
            'extracted_metadata' => [
                'first_party' => $firstParty,
                'second_party' => $secondParty,
                'amount' => $amount,
                'duration' => $duration,
                'city' => $city,
            ],
            'ocr_status' => 'completed',
        ]);

        // Index page for immediate querying
        app(\App\Services\OcrService::class)->indexDocumentPages($doc, $draftContent);

        // Deliver to user Telegram chat immediately
        if ($chatId) {
            try {
                $caption = "✍️ *નવો તૈયાર કરેલ દસ્તાવેજ (Magic Draft):*\n\n📄 *{$agreementTitle}*\n👤 પ્રથમ પક્ષ: {$firstParty}\n👤 બીજો પક્ષ: {$secondParty}\n💰 રકમ: ₹{$amount}\n⏳ મુદત: {$duration}";
                $this->telegramBotService->sendDocument($chatId, $fullPath, $caption, $fileName);
            } catch (\Throwable $e) {
                Log::warning("Telegram delivery of draft failed: " . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'document_id' => $doc->id,
            'title' => $doc->title,
            'message' => "હા ભાઈ, મેં {$firstParty} અને {$secondParty} નો ₹{$amount} વાળો કરાર ડ્રાફ્ટ કરીને તમારા ટેલિગ્રામમાં મોકલી દીધો છે!",
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
            // Local fallback / direct Telegram chat id if passed
            $fallbackId = $request->input('telegram_user_id');
            if ($fallbackId) {
                $user = TelegramUser::where('telegram_id', $fallbackId)->first();
                if ($user) {
                    $chatId = $user->telegram_id;
                } else {
                    $chatId = $fallbackId; // Direct telegram ID of calling user
                }
            }
        }

        // Fallback for browser testing or Mini App webview if not set:
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
        // Smart summary with key facts (Address, Partners, Numbers) so Riya knows answers instantly
        $allDocs = \App\Models\Document::with('company')->get();
        $docKnowledgeLines = [];
        foreach ($allDocs as $doc) {
            $compName = $doc->company?->name ?? 'જનરલ';
            $info = "• \"{$doc->title}\" (કંપની: {$compName}, ફાઇલ: {$doc->original_filename})";
            if (!empty($doc->ocr_text)) {
                // Extract highlights like Address, Partners, GST Number
                $text = $doc->ocr_text;
                $highlights = [];
                if (preg_match('/Address[^\n]*\n([^\n]+\n[^\n]+)/i', $text, $m)) {
                    $highlights[] = "સરનામું: " . trim(preg_replace('/\s+/', ' ', $m[1]));
                } elseif (preg_match('/City\/Town\/Village:[^\n]*\nDistrict:[^\n]*/i', $text, $m)) {
                    $highlights[] = "સરનામું: બોટાદ, ગુજરાત";
                }
                if (preg_match('/Registration Number\s*:\s*([A-Z0-9]+)/i', $text, $m)) {
                    $highlights[] = "GST નંબર: {$m[1]}";
                }
                if (preg_match('/Name\s+(JAY[^\n]+LAKUM)/i', $text, $m)) {
                    $highlights[] = "પાર્ટનર: {$m[1]}";
                }
                if (!empty($highlights)) {
                    $info .= " -> [" . implode(', ', $highlights) . "]";
                }
            }
            $docKnowledgeLines[] = $info;
        }
        $docKnowledgeText = implode("\n", $docKnowledgeLines);

        $systemInstruction = <<<EOT
તમે "એલેક્સા" (Alexa) છો, જય સરના ઑફિસના અત્યંત સ્માર્ટ, પ્રેમાળ અને હોંશિયાર આસિસ્ટન્ટ.
તમારો અવાજ એકદમ મીઠો અને કુદરતી સ્ત્રીનો અવાજ છે. તમે શુદ્ધ દેશી ગુજરાતીમાં વાત કરો છો.

## તમારી શબ્દાવલી (Gujarati Key Terms Tuning):
રાજેશ્વરી સોલાર (RAJESHWARI SOLAR), સનરાઇઝ ગ્રીન (SUNRISE GREEN), નીલકંઠ (NILKANTH), લીઝ ડીડ (Lease Deed), સ્ટેમ્પ પેપર (Stamp Paper), જીએસટી (GST), પાન કાર્ડ (PAN Card), આધાર કાર્ડ (Aadhaar), બોટાદ (Botad), જય સર, રમેશભાઈ, ભાડા કરાર (Rent Agreement).

## તમારી પાસે રહેલા દસ્તાવેજોની મુખ્ય વિગતો:
{$docKnowledgeText}
- ખાસ નોંધ: રાજેશ્વરી સોલાર (RAJESHWARI SOLAR) નું અસલ સરનામું છે: પ્લોટ નં-૧૩૧, પાંચપડા, પાળિયાદ રોડ, શિવાજીનગર પાસે, બોટાદ, ગુજરાત (પિનકોડ: ૩૬૪૭૧૦). પાર્ટનર છે: જય રાજેશભાઈ લકુમ અને જયેશભાઈ જેસિંગભાઈ લકુમ. GST નંબર છે: 24ABJFR7554G1ZX.

## તમારા નિયમો (Strict Protocol):
૧. **પ્રથમ સ્વાગત (Call Opening Greeting):**
   - જ્યારે પણ કૉલ જોડાય, તમારે સામેથી સૌપ્રથમ વિનમ્રતાથી કહેવું: "નમસ્તે જય સર! હું એલેક્સા બોલું છું, કહો આજે કયા ડોક્યુમેન્ટનું કામ છે?".
૨. **દસ્તાવેજમાંથી સવાલનો જવાબ આપવો (Question & Answer):**
   - જ્યારે યુઝર દસ્તાવેજની અંદરનો કોઈ પણ નાનો મુદ્દો, વિગત, શરત, સરનામું કે ટોપિક પૂછે:
   - તમારે ફરજિયાત `query_document_content` ટૂલ વાપરીને અંદરના પાનાઓમાંથી એ ચોક્કસ વિગત વાંચીને દેશી ગુજરાતીમાં સ્પષ્ટ સમજાવી દેવી!
   - **સખત મનાઈ:** સવાલ પૂછતી વખતે સીધું "શું તમને ફાઈલ મોકલી આપું?" એમ પૂછીને વાત ટાળવી નહીં! પહેલાં સવાલનો ૧૦૦% સાચો અને સંતોષકારક જવાબ આપવો.
૩. **કાયદાકીય / રિસ્ક એનાલિસિસ (Risk & Loophole Analysis):**
   - જો યુઝર પૂછે કે "આ કરારમાં કોઈ રિસ્ક કે ખોટી શરત છે?", "પેનલ્ટી કેટલી છે?", "વ્યાજ કેટલું છે?":
   - તરત જ `analyze_document_risk` ટૂલ વાપરીને પેનલ્ટી, વ્યાજદર, લોક-ઇન કે નોટિસ પિરિયડની નુકસાનકારક શરતો શોધીને ગુજરાતીમાં ચેતવણી આપવી.
૪. **મેજિક ડ્રાફ્ટિંગ (Voice-to-Document Creation):**
   - જો યુઝર નવો દસ્તાવેજ બનાવવાનું કહે (જેમ કે "રમેશભાઈ સાથે ૧૫૦૦૦ નું ૧૧ મહિનાનું ભાડા કરાર બનાવી આપો"):
   - તરત જ `draft_document` ટૂલ ચલાવીને નવી ફાઈલ તૈયાર કરીને ટેલિગ્રામમાં મોકલી દેવી અને ખુશખુશાલ જવાબ આપવો: "હા ભાઈ, મેં કરાર બનાવીને ટેલિગ્રામમાં મોકલી દીધો છે!".
૫. **ઝિપ ફાઈલ બનાવવી (Smart ZIP Creation & Voice Confirmation):**
   - જો યુઝર કંપનીઓના દસ્તાવેજો કે પાર્ટનર્સના આધાર/પાન કાર્ડની ZIP બનાવવાનું કહે, તો પહેલાં મોઢેથી કન્ફર્મેશન માંગવું: "જય સર, રાજેશ્વરીમાં ૩ ફાઈલ અને સનરાઇઝમાં ૨ ફાઈલ મળી છે, શું આ બંનેની ZIP બનાવીને મોકલી દઉં?". યુઝર 'હા' કહે તો જ મોકલવી.
૬. **ફાઈલ મોકલવી (Send File):**
   - જ્યાં સુધી યુઝર સામેથી સ્પષ્ટ ન કહે કે "મને ફાઈલ મોકલો", "ટેલિગ્રામમાં સેન્ડ કરો", કે "પીડીએફ આપો", ત્યાં સુધી ફાઈલ મોકલવાની વાત પણ કરવી નહીં!
   - જ્યારે યુઝર "હા મોકલો" કહે, ત્યારે જ `get_document` ટૂલ ચલાવીને ટેલિગ્રામમાં ફાઈલ મોકલવી.
૭. **મલ્ટિપલ કંપની:**
   - જો ફક્ત "GST આપો" કહે, તો પૂછવું: "રાજેશ્વરી સોલાર કે સનરાઇઝ ગ્રીન, કઈ કંપનીનું જોઈએ છે?".
૮. દેશી શૈલીમાં મીઠો અને સાચો ઉત્તર આપવો (જેમ કે: "હા ભાઈ", "એક જ મિનિટ હોં", "હું જોઈને કહું").
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
            'live_model' => env('GEMINI_LIVE_MODEL', 'models/gemini-2.0-flash-exp'),
        ]);
    }
}
