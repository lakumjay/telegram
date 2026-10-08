<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Document;
use App\Models\SystemSetting;
use App\Models\TelegramUser;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TelegramBotService
{
    protected string $botToken;
    protected string $apiUrl;
    protected DeepSearchService $searchService;
    protected ZipService $zipService;
    protected AiVoiceAgentService $voiceAgentService;

    public function __construct(
        DeepSearchService $searchService,
        ZipService $zipService,
        AiVoiceAgentService $voiceAgentService
    ) {
        $this->searchService = $searchService;
        $this->zipService = $zipService;
        $this->voiceAgentService = $voiceAgentService;

        $token = SystemSetting::get('telegram_bot_token', env('TELEGRAM_BOT_TOKEN', ''));
        $this->botToken = (string) $token;
        $this->apiUrl = "https://api.telegram.org/bot{$this->botToken}";
    }

    /**
     * Handle incoming Telegram webhook update
     */
    public function handleUpdate(array $update): array
    {
        if (isset($update['callback_query'])) {
            return $this->handleCallbackQuery($update['callback_query']);
        }

        if (!isset($update['message'])) {
            return ['status' => 'ignored'];
        }

        $message = $update['message'];
        $chatId = $message['chat']['id'] ?? null;
        $from = $message['from'] ?? [];
        $telegramId = $from['id'] ?? null;

        if (!$chatId || !$telegramId) {
            return ['status' => 'invalid_message'];
        }

        // 1. Security Check: Authenticate user & Whitelist
        $user = $this->getOrCreateUser($from);

        $whitelistActive = SystemSetting::get('whitelist_enabled', true);
        if ($whitelistActive && !$user->is_authorized) {
            $text = trim($message['text'] ?? '');
            if (str_starts_with($text, '/pin ') || str_starts_with($text, '/start pin_')) {
                return $this->verifyUserPin($user, $chatId, $text);
            }

            $this->sendMessage($chatId, "⛔ *Access Denied!*\n\nતમે આ બોટ વાપરવા માટે અધિકૃત (Authorized) નથી.\n\n👤 *તમારું Telegram ID:* `{$telegramId}`\n🔐 એડમિન પોર્ટલમાંથી આ ID ને Allow કરાવો અથવા `/pin <તમારો_પીન>` દાખલ કરો.");
            return ['status' => 'unauthorized'];
        }

        // Update interaction timestamp
        $user->update(['last_interaction_at' => now()]);

        // 2. Handle Voice Notes / Audio Messages
        if (isset($message['voice']) || isset($message['audio'])) {
            return $this->handleVoiceMessage($message, $user, $chatId);
        }

        // 3. Handle Text Messages & Commands
        $text = trim($message['text'] ?? '');

        if ($text === '/start') {
            return $this->handleStartCommand($chatId, $user);
        }

        if ($text === '/call') {
            return $this->handleCallCommand($chatId);
        }

        if (str_starts_with($text, '/zip')) {
            $query = trim(substr($text, 4));
            return $this->handleZipCommand($chatId, $query);
        }

        if ($text === '/help') {
            return $this->handleHelpCommand($chatId);
        }

        // 4. Default: Intelligent Document Deep Search
        return $this->handleSearchMessage($chatId, $text, $user);
    }

    /**
     * Handle Start Command
     */
    protected function handleStartCommand(int $chatId, TelegramUser $user): array
    {
        $appUrl = config('app.url');
        $miniAppUrl = "{$appUrl}/miniapp?user_id={$user->telegram_id}";

        $welcomeText = "👋 *નમસ્તે {$user->first_name}!* \n\nહું તમારી *AI Document Assistant (ધ્વનિ)* છું.\n\n📁 *તમે શું કરી શકો છો?*\n• કોઈપણ દસ્તાવેજનું નામ લખો (દા.ત. `Rajeshwari Solar PAN`, `Sunrise GST`)\n• ફાઇલની અંદરની વિગત લખો (દા.ત. `₹300 વાળો સ્ટેમ્પ પેપર ટેસ્ટ વ્યક્તિ`)\n• વૉઇસ નોટ (Voice Note) રેકોર્ડ કરીને મોકલો\n• એકસાથે મલ્ટીપલ કંપનીના ડોક્યુમેન્ટ્સ માંગો\n\n👇 *નીચે આપેલા બટન પર ક્લિક કરીને લાઇવ કૉલ શરૂ કરો:*";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📞 Voice Call AI Assistant (Live Call)', 'web_app' => ['url' => $miniAppUrl]],
                ],
                [
                    ['text' => '📂 બધા દસ્તાવેજો જુઓ', 'callback_data' => 'view_all_companies'],
                    ['text' => '📦 ZIP ફાઇલ બનાવો', 'callback_data' => 'make_zip_guide'],
                ]
            ]
        ];

        $this->sendMessage($chatId, $welcomeText, $keyboard);
        return ['status' => 'start_sent'];
    }

    /**
     * Handle Call Command
     */
    protected function handleCallCommand(int $chatId): array
    {
        $appUrl = config('app.url');
        $miniAppUrl = "{$appUrl}/miniapp";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📞 AI Voice Call શરૂ કરો', 'web_app' => ['url' => $miniAppUrl]],
                ]
            ]
        ];

        $this->sendMessage($chatId, "📲 *AI Voice Call Assistant:*\n\nનીચેના બટન પર ક્લિક કરો જેથી લાઇવ કૉલ શરૂ થશે. તમે ગુજરાતીમાં બોલીને કોઈપણ ફાઇલ માંગી શકશો.", $keyboard);
        return ['status' => 'call_sent'];
    }

    /**
     * Handle Voice Notes
     */
    protected function handleVoiceMessage(array $message, TelegramUser $user, int $chatId): array
    {
        $this->sendMessage($chatId, "🎙️ *તમારો વૉઇસ સાંભળી રહી છું...*");

        $fileId = $message['voice']['file_id'] ?? $message['audio']['file_id'] ?? null;
        if (!$fileId) {
            $this->sendMessage($chatId, "❌ વૉઇસ ફાઇલ વાંચવામાં ભૂલ આવી.");
            return ['status' => 'error'];
        }

        $transcription = $this->transcribeTelegramAudio($fileId);
        if (empty($transcription)) {
            $this->sendMessage($chatId, "❌ અવાજ સ્પષ્ટ સંભળાયો નથી. કૃપા કરીને ફરીથી મોકલો અથવા ટેક્સ્ટમાં લખો.");
            return ['status' => 'transcribe_failed'];
        }

        $this->sendMessage($chatId, "🗣️ *તમે બોલ્યા:* \"{$transcription}\"");

        // Process turn with AI Voice Agent
        $turn = $this->voiceAgentService->processTurn($transcription, null, $user->id);

        $reply = $turn['voice_response'];

        if ($turn['action'] === 'ask_confirmation') {
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '✅ હા, આ જ ફાઇલો આપો', 'callback_data' => 'confirm_voice_' . $turn['session_id']],
                        ['text' => '❌ ના, ખોટી ફાઇલ છે', 'callback_data' => 'reject_voice_' . $turn['session_id']],
                    ]
                ]
            ];
            $this->sendMessage($chatId, "🤖 {$reply}", $keyboard);
        } elseif ($turn['action'] === 'deliver_files_and_end_call') {
            $this->sendMessage($chatId, "🤖 {$reply}");
            $this->deliverDocumentsToTelegram($chatId, $turn['documents']);
            if (!empty($turn['zip'])) {
                $this->deliverZipToTelegram($chatId, $turn['zip']);
            }
        } else {
            $this->sendMessage($chatId, "🤖 {$reply}");
        }

        return ['status' => 'voice_processed'];
    }

    /**
     * Handle text search query
     */
    protected function handleSearchMessage(int $chatId, string $query, TelegramUser $user): array
    {
        $result = $this->searchService->search($query);

        // 1. Check for Disambiguation (e.g. GEDA document present in multiple companies)
        if ($result['disambiguation_required']) {
            $disData = $result['disambiguation_data'];
            $buttons = [];
            foreach ($disData['companies'] as $c) {
                $buttons[] = [['text' => "🏢 " . $c['name'], 'callback_data' => 'search_q_' . substr(md5($c['query']), 0, 10)]];
            }

            $keyboard = ['inline_keyboard' => $buttons];
            $this->sendMessage($chatId, "❓ *કન્ફર્મેશન જરૂરી છે:*\nતમે `{$disData['doc_type']}` માંગ્યું છે, પરંતુ આ દસ્તાવેજ નીચેની કંપનીઓમાં ઉપલબ્ધ છે. તમારે કઈ કંપનીનું જોઈએ છે?", $keyboard);
            return ['status' => 'disambiguation_sent'];
        }

        $docs = $result['documents'];

        if ($docs->isEmpty()) {
            $msg = "🔍 *'{$query}'* માટે કોઈ દસ્તાવેજ મળ્યો નથી.\n\n💡 *શું તમે આમાંથી કંઈક શોધી રહ્યા છો?*";
            $buttons = [];
            foreach ($result['suggestions'] as $sug) {
                $buttons[] = [['text' => $sug['title'], 'callback_data' => 'sug_' . urlencode(substr($sug['query'], 0, 30))]];
            }
            $keyboard = !empty($buttons) ? ['inline_keyboard' => array_chunk($buttons, 2)[0] ?? []] : null;

            $this->sendMessage($chatId, $msg, $keyboard);
            return ['status' => 'no_results'];
        }

        // Deliver found documents
        $count = $docs->count();
        $this->sendMessage($chatId, "✅ *મને {$count} દસ્તાવેજ મળ્યા છે:*");

        $this->deliverDocumentsToTelegram($chatId, $docs);

        // If multiple documents found, offer instant ZIP bundle
        if ($count > 1) {
            $docIds = $docs->pluck('id')->toArray();
            $zipResult = $this->zipService->createZipFromDocuments($docIds, 'single_master_zip');
            if ($zipResult['success']) {
                $this->deliverZipToTelegram($chatId, $zipResult);
            }
        }

        return ['status' => 'docs_delivered'];
    }

    /**
     * Handle ZIP Command
     */
    protected function handleZipCommand(int $chatId, string $query): array
    {
        if (empty($query)) {
            $this->sendMessage($chatId, "ℹ️ કૃપા કરીને કંપની કે ફાઇલનું નામ લખો.\nદા.ત. `/zip Rajeshwari Solar` અથવા `/zip all`");
            return ['status' => 'zip_empty'];
        }

        $docs = $query === 'all'
            ? Document::with('company')->get()
            : $this->searchService->search($query)['documents'];

        if ($docs->isEmpty()) {
            $this->sendMessage($chatId, "❌ '{$query}' માટે કોઈ ફાઇલ મળી નથી જેથી ZIP બનાવી શકાતી નથી.");
            return ['status' => 'no_docs'];
        }

        $zipResult = $this->zipService->createZipFromDocuments($docs->pluck('id')->toArray(), 'single_master_zip');
        if ($zipResult['success']) {
            $this->deliverZipToTelegram($chatId, $zipResult);
        }

        return ['status' => 'zip_sent'];
    }

    /**
     * Deliver documents to user in Telegram
     */
    public function deliverDocumentsToTelegram(int $chatId, $documents): void
    {
        foreach ($documents as $doc) {
            $caption = "📄 *{$doc->title}*\n🏢 કંપની: " . ($doc->company?->name ?? 'જનરલ') . "\n🏷️ પ્રકાર: " . strtoupper($doc->doc_type);
            if ($doc->stamp_value) {
                $caption .= "\n💰 સ્ટેમ્પ કિંમત: ₹{$doc->stamp_value}";
            }

            $possiblePaths = [
                storage_path('app/' . $doc->file_path),
                storage_path('app/private/' . $doc->file_path),
                storage_path('app/public/' . $doc->file_path),
                storage_path('app/private/' . ltrim($doc->file_path, '/')),
            ];

            $actualFilePath = null;
            foreach ($possiblePaths as $p) {
                if (file_exists($p)) {
                    $actualFilePath = $p;
                    break;
                }
            }

            if ($actualFilePath) {
                Log::info("Delivering actual file to Telegram: {$actualFilePath} with original name: " . ($doc->original_filename ?? basename($actualFilePath)));
                $this->sendDocument($chatId, $actualFilePath, $caption, $doc->original_filename ?: null);
            } else {
                Log::warning("Document file not found at any candidate path for {$doc->file_path}");
                // If demo file, send card message with summary
                $card = $caption . "\n\n📝 *OCR Content Preview:*\n" . substr($doc->ocr_text, 0, 300) . "...";
                $this->sendMessage($chatId, $card);
            }
        }
    }

    /**
     * Deliver ZIP bundle to user
     */
    public function deliverZipToTelegram(int $chatId, array $zipResult): void
    {
        $export = $zipResult['export'] ?? null;
        if (!$export) return;

        $zipPath = storage_path('app/' . $export->file_path);
        $caption = "📦 *ZIP Bundle તૈયાર છે!*\n\n📁 કુલ ફાઇલો: {$export->documents_count}\n📊 સાઇઝ: {$export->file_size_formatted}\n\nઆ ZIP ફાઇલ તમે સીધી કોઈને પણ ફોરવર્ડ કરી શકો છો.";

        if (file_exists($zipPath)) {
            $this->sendDocument($chatId, $zipPath, $caption);
        } else {
            $this->sendMessage($chatId, $caption . "\n🔗 [ડાઉનલોડ લિંક]({$export->download_url})");
        }
    }

    /**
     * Transcribe Telegram Audio using Groq Whisper API (Free & blazing fast)
     */
    public function transcribeTelegramAudio(string $fileId): string
    {
        try {
            // Get file path from Telegram
            $fileRes = Http::get("{$this->apiUrl}/getFile", ['file_id' => $fileId]);
            if (!$fileRes->successful()) return '';

            $filePathOnTelegram = $fileRes->json()['result']['file_path'] ?? '';
            if (!$filePathOnTelegram) return '';

            $downloadUrl = "https://api.telegram.org/file/bot{$this->botToken}/{$filePathOnTelegram}";
            $audioBytes = Http::get($downloadUrl)->body();

            $groqApiKey = config('services.groq.key') ?: env('GROQ_API_KEY');

            if ($groqApiKey) {
                $tempAudio = tempnam(sys_get_temp_dir(), 'tg_audio_') . '.oga';
                file_put_contents($tempAudio, $audioBytes);

                $response = Http::withHeaders(['Authorization' => "Bearer {$groqApiKey}"])
                    ->attach('file', file_get_contents($tempAudio), 'audio.oga')
                    ->post('https://api.groq.com/openai/v1/audio/transcriptions', [
                        'model' => 'whisper-large-v3',
                        'language' => 'gu', // Gujarati or Multilingual
                        'response_format' => 'json',
                    ]);

                @unlink($tempAudio);

                if ($response->successful()) {
                    return $response->json()['text'] ?? '';
                }
            }
        } catch (\Throwable $e) {
            Log::error('Voice transcription error: ' . $e->getMessage());
        }

        return '';
    }

    /**
     * Send Markdown Message
     */
    public function sendMessage(int $chatId, string $text, ?array $replyMarkup = null): array
    {
        $payload = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'Markdown',
        ];

        if ($replyMarkup) {
            $payload['reply_markup'] = json_encode($replyMarkup);
        }

        return Http::post("{$this->apiUrl}/sendMessage", $payload)->json() ?: [];
    }

    /**
     * Send Document file
     */
    public function sendDocument(int $chatId, string $filePath, string $caption = '', ?string $customFileName = null): array
    {
        $fileName = $customFileName ?: basename($filePath);
        return Http::attach('document', file_get_contents($filePath), $fileName)
            ->post("{$this->apiUrl}/sendDocument", [
                'chat_id' => $chatId,
                'caption' => $caption,
                'parse_mode' => 'Markdown',
            ])->json() ?: [];
    }

    /**
     * Handle Inline Callback Queries
     */
    protected function handleCallbackQuery(array $callbackQuery): array
    {
        $chatId = $callbackQuery['message']['chat']['id'] ?? null;
        $data = $callbackQuery['data'] ?? '';
        $callbackId = $callbackQuery['id'] ?? null;

        // Answer callback query to remove spinner
        Http::post("{$this->apiUrl}/answerCallbackQuery", ['callback_query_id' => $callbackId]);

        if (str_starts_with($data, 'confirm_voice_')) {
            $sessionId = substr($data, 14);
            $log = \App\Models\VoiceCallLog::where('session_id', $sessionId)->first();
            if ($log && $log->requested_documents) {
                $docs = Document::with('company')->whereIn('id', (array) $log->requested_documents)->get();
                $this->sendMessage($chatId, "✅ *ફાઇલો કન્ફર્મ થઈ ગઈ છે! નીચે મોકલી રહી છું:*");
                $this->deliverDocumentsToTelegram($chatId, $docs);
                $zipRes = $this->zipService->createZipFromDocuments($docs->pluck('id')->toArray());
                if ($zipRes['success']) {
                    $this->deliverZipToTelegram($chatId, $zipRes);
                }
            }
        } elseif (str_starts_with($data, 'reject_voice_')) {
            $this->sendMessage($chatId, "👌 *ઓકે, કોઈ વાંધો નહીં.* તમે શાંતિથી વિચારીને કહો કે તમારે કઈ ફાઇલ જોઈએ છે.");
        }

        return ['status' => 'callback_handled'];
    }

    /**
     * Verify user PIN
     */
    protected function verifyUserPin(TelegramUser $user, int $chatId, string $text): array
    {
        $pin = trim(str_replace(['/pin', '/start pin_'], '', $text));
        $masterPin = SystemSetting::get('master_security_pin', '123456');

        if ($pin === $masterPin || ($user->access_pin && $pin === $user->access_pin)) {
            $user->update(['is_authorized' => true]);
            $this->sendMessage($chatId, "🎉 *અભિનંદન!* તમારું એકાઉન્ટ સફળતાપૂર્વક Authorize થઈ ગયું છે. હવે તમે બોટ વાપરી શકો છો.\n\nશરૂ કરવા માટે `/start` લખો.");
            return ['status' => 'authorized'];
        }

        $this->sendMessage($chatId, "❌ *ખોટો PIN!* કૃપા કરીને સાચો PIN દાખલ કરો.");
        return ['status' => 'invalid_pin'];
    }

    /**
     * Get or create Telegram User
     */
    protected function getOrCreateUser(array $from): TelegramUser
    {
        return TelegramUser::firstOrCreate(
            ['telegram_id' => $from['id']],
            [
                'first_name' => $from['first_name'] ?? 'User',
                'last_name' => $from['last_name'] ?? '',
                'username' => $from['username'] ?? '',
                'is_authorized' => false,
                'role' => 'user',
            ]
        );
    }

    /**
     * Help command
     */
    protected function handleHelpCommand(int $chatId): array
    {
        $help = "ℹ️ *બોટનો ઉપયોગ કેવી રીતે કરવો?*\n\n"
              . "1️⃣ *ફાઇલ શોધવા:* કંપની અને ફાઇલનું નામ લખો.\n"
              . "   _દા.ત._ `Rajeshwari Solar PAN`\n\n"
              . "2️⃣ *અંદરનું લખાણ શોધવા (OCR):*\n"
              . "   _દા.ત._ `₹300 વાળો સ્ટેમ્પ પેપર ટેસ્ટ વ્યક્તિ`\n\n"
              . "3️⃣ *ZIP ફાઇલ ડાઉનલોડ કરવા:*\n"
              . "   _દા.ત._ `/zip Rajeshwari Solar` અથવા `/zip all`\n\n"
              . "4️⃣ *AI Voice Call:* `/call` લખીને લાઇવ AI સાથે કૉલ પર વાત કરો.";

        $this->sendMessage($chatId, $help);
        return ['status' => 'help_sent'];
    }
}
