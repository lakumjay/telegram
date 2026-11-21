<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicBill;
use App\Models\ClinicExpense;
use App\Models\Company;
use App\Models\Document;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\SystemSetting;
use App\Models\TelegramUser;
use App\Services\PatientOcrService;
use Illuminate\Support\Facades\DB;
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
    protected PatientOcrService $patientOcrService;

    public function __construct(
        DeepSearchService $searchService,
        ZipService $zipService,
        AiVoiceAgentService $voiceAgentService,
        PatientOcrService $patientOcrService
    ) {
        $this->searchService = $searchService;
        $this->zipService = $zipService;
        $this->voiceAgentService = $voiceAgentService;
        $this->patientOcrService = $patientOcrService;

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
        $clinic = $this->resolveUserClinic($user);
        $isSuperAdmin = ($user->role === 'admin' || $user->telegram_id == 999888777);

        $whitelistActive = SystemSetting::get('whitelist_enabled', true);
        if ($whitelistActive && !$user->is_authorized && !$isSuperAdmin) {
            $text = trim($message['text'] ?? '');
            if (str_starts_with($text, '/pin ') || str_starts_with($text, '/start pin_')) {
                return $this->verifyUserPin($user, $chatId, $text);
            }

            $userHandle = $user->username ? "@{$user->username}" : "No Username";
            $this->sendMessage($chatId, "⛔ *Access Denied!*\n\nતમે આ ક્લિનિક બોટ વાપરવા માટે અધિકૃત (Authorized) નથી.\n\n👤 *તમારું Telegram ID:* `{$telegramId}`\n🔗 *યુઝરનેમ:* `{$userHandle}`\n\n🔐 ફક્ત અધિકૃત ડૉક્ટર્સ જ ઉપયોગ કરી શકે છે. એડમિન ડૉ. જય લાકુમનો સંપર્ક કરો અથવા તમારા ડેશબોર્ડમાં ટેલિગ્રામ યુઝરનેમ સેટ કરાવો.");
            return ['status' => 'unauthorized'];
        }

        // Update interaction timestamp
        $user->update(['last_interaction_at' => now()]);

        // 2. Handle Photo / Prescription Image Upload (Gemini Vision OCR & Auto Clinic Isolation)
        if (isset($message['photo'])) {
            return $this->handlePrescriptionPhoto($message, $user, $chatId);
        }

        // 3. Handle Voice Notes / Audio Messages
        if (isset($message['voice']) || isset($message['audio'])) {
            return $this->handleVoiceMessage($message, $user, $chatId);
        }

        // 4. Handle Text Messages & Commands
        $text = trim($message['text'] ?? '');

        // Check for 1, 2, 3, 4 numbered selection from previous suggestions
        if (is_numeric($text)) {
            $num = (int) $text;
            $session = (array) $user->session_state;
            if (isset($session['numbered_docs'][$num])) {
                $docId = $session['numbered_docs'][$num];
                $doc = Document::with('company')->find($docId);
                if ($doc) {
                    $this->sendMessage($chatId, "✅ *તમે પસંદ કરેલ દસ્તાવેજ (#{$num}) મોકલી રહી છું:*");
                    $this->deliverDocumentsToTelegram($chatId, collect([$doc]));
                    return ['status' => 'numbered_doc_delivered'];
                }
            }
        }

        if ($text === '/start') {
            return $this->handleStartCommand($chatId, $user);
        }

        if ($text === '/today' || $text === 'આજનો હિસાબ' || $text === 'હિસાબ' || strtolower($text) === 'summary') {
            return $this->handleTodayAccounts($chatId, $user);
        }

        if ($text === '/clinics') {
            return $this->handleClinicsCommand($chatId, $user);
        }

        if (str_starts_with($text, '/switch')) {
            return $this->handleSwitchClinicCommand($chatId, $user, $text);
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

        // 5. Default: Intelligent Patient Lookup (Scoped strictly to clinic) or Document Search
        return $this->handleSearchMessage($chatId, $text, $user);
    }

    /**
     * Resolve which clinic a Telegram user belongs to
     */
    public function resolveUserClinic(TelegramUser $user): ?Clinic
    {
        // 1. Explicit clinic assignment
        if (!empty($user->clinic_id)) {
            $c = Clinic::find($user->clinic_id);
            if ($c) return $c;
        }

        // 2. Match by Telegram Username
        if (!empty($user->username)) {
            $cleanUser = ltrim($user->username, '@');
            $c = Clinic::where('telegram_username', $cleanUser)->first();
            if ($c) {
                $user->update(['clinic_id' => $c->id, 'is_authorized' => true, 'role' => 'doctor']);
                return $c;
            }
        }

        // 3. Super Admin default session clinic
        if ($user->role === 'admin' || $user->telegram_id == 999888777) {
            $session = (array) $user->session_state;
            $activeId = $session['active_clinic_id'] ?? 1;
            return Clinic::find($activeId) ?: Clinic::first();
        }

        return null;
    }

    /**
     * Handle Start Command
     */
    protected function handleStartCommand(int $chatId, TelegramUser $user): array
    {
        $clinic = $this->resolveUserClinic($user);
        $clinicName = $clinic ? $clinic->name : 'શ્રીરામ ક્લિનિક';
        $docName = $clinic ? $clinic->doctor_name : 'Dr. Jay Lakum';

        $appUrl = config('app.url');
        $miniAppUrl = "{$appUrl}/miniapp?user_id={$user->telegram_id}";

        $welcomeText = "👋 *નમસ્તે {$user->first_name}!* \n\n"
                     . "🏥 *{$clinicName}*\n"
                     . "👨‍⚕️ *ડૉક્ટર:* {$docName}\n\n"
                     . "હું તમારી *AI ક્લિનિકલ સહાયક* છું.\n\n"
                     . "📁 *તમે શું કરી શકો છો?*\n"
                     . "• 📸 **પ્રિસ્ક્રિપ્શનનો ફોટો મોકલો:** AI ઓટોમેટિક દવાઓ અને દર્દી તમારા ક્લિનિકમાં સેવ કરશે.\n"
                     . "• 🔍 **દર્દીનું નામ લખો:** (દા.ત. `Jay`, `Rakesh`) દર્દીની છેલ્લી દવા અને હિસ્ટ્રી જોવા.\n"
                     . "• 📊 **/today અથવા 'આજનો હિસાબ':** આજના ઓપીડી દર્દીઓ અને કમાણી.\n"
                     . "• 🎙️ **વૉઇસ નોટ મોકલો:** બોલીને કોઈપણ દર્દીની વિગત પૂછો.\n\n"
                     . "👇 *લાઇવ કૉલ શરૂ કરવા નીચે બટન દબાવો:*";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📞 Voice Call AI Assistant (Live Call)', 'web_app' => ['url' => $miniAppUrl]],
                ],
                [
                    ['text' => '📊 આજનો ઓપીડી હિસાબ', 'callback_data' => 'clinic_today_accounts'],
                    ['text' => '📂 દર્દી રેકોર્ડ્સ ગાઇડ', 'callback_data' => 'clinic_patients_guide'],
                ]
            ]
        ];

        $this->sendMessage($chatId, $welcomeText, $keyboard);
        return ['status' => 'start_sent'];
    }

    /**
     * Handle Today's OPD & Financial Summary strictly for user's clinic
     */
    protected function handleTodayAccounts(int $chatId, TelegramUser $user): array
    {
        $clinic = $this->resolveUserClinic($user);
        if (!$clinic) {
            $this->sendMessage($chatId, "❌ ક્લિનિક વિગત મળી નથી.");
            return ['status' => 'no_clinic'];
        }

        $today = date('Y-m-d');
        $todayBills = ClinicBill::where('clinic_id', $clinic->id)->whereDate('bill_date', $today)->get();
        $todayIncome = (float)$todayBills->sum('total_amount');
        $todayPatients = $todayBills->count();

        $todayExpenses = ClinicExpense::where('clinic_id', $clinic->id)->whereDate('expense_date', $today)->sum('amount');
        $netProfit = $todayIncome - (float)$todayExpenses;

        $msg = "📊 *આજનો ઓપીડી હિસાબ*\n\n"
             . "🏥 *ક્લિનિક:* {$clinic->name}\n"
             . "👨‍⚕️ *ડૉક્ટર:* {$clinic->doctor_name}\n"
             . "📅 *તારીખ:* " . date('d-m-Y') . "\n\n"
             . "👥 *આજના કુલ દર્દીઓ:* {$todayPatients}\n"
             . "💰 *કુલ ઓપીડી આવક:* ₹" . number_format($todayIncome, 2) . "\n"
             . "📉 *કુલ ખર્ચ:* ₹" . number_format($todayExpenses, 2) . "\n"
             . "💵 *ચોખ્ખો નફો (Net Profit):* ₹" . number_format($netProfit, 2);

        $this->sendMessage($chatId, $msg);
        return ['status' => 'today_accounts_sent'];
    }

    /**
     * Handle Super Admin Clinics List
     */
    protected function handleClinicsCommand(int $chatId, TelegramUser $user): array
    {
        if ($user->role !== 'admin' && $user->telegram_id != 999888777) {
            $this->sendMessage($chatId, "⛔ આ કમાન્ડ ફક્ત Super Admin (Dr. Jay Lakum) માટે જ છે.");
            return ['status' => 'forbidden'];
        }

        $clinics = Clinic::all();
        $msg = "🏥 *તમામ ક્લિનિક્સ મેનેજમેન્ટ (Super Admin View):*\n\n";
        foreach ($clinics as $c) {
            $ptCount = Patient::where('clinic_id', $c->id)->count();
            $tgUser = $c->telegram_username ? "@{$c->telegram_username}" : "લિંક નથી";
            $msg .= "• *[ID: {$c->id}] {$c->name}*\n"
                  . "  👨‍⚕️ ડૉક્ટર: {$c->doctor_name}\n"
                  . "  👥 દર્દીઓ: {$ptCount}\n"
                  . "  🔗 ટેલિગ્રામ: {$tgUser}\n\n";
        }
        $msg .= "👉 કોઈપણ ક્લિનિક સ્વિચ કરવા `/switch <ID>` લખો.";

        $this->sendMessage($chatId, $msg);
        return ['status' => 'clinics_sent'];
    }

    /**
     * Handle Switch Clinic for Super Admin
     */
    protected function handleSwitchClinicCommand(int $chatId, TelegramUser $user, string $text): array
    {
        if ($user->role !== 'admin' && $user->telegram_id != 999888777) {
            $this->sendMessage($chatId, "⛔ આ કમાન્ડ ફક્ત Super Admin માટે જ છે.");
            return ['status' => 'forbidden'];
        }

        $targetId = (int) trim(str_replace('/switch', '', $text));
        $targetClinic = Clinic::find($targetId);
        if (!$targetClinic) {
            $this->sendMessage($chatId, "❌ અમાન્ય ક્લિનિક ID.");
            return ['status' => 'invalid_id'];
        }

        $session = (array) $user->session_state;
        $session['active_clinic_id'] = $targetClinic->id;
        $user->update(['session_state' => $session]);

        $this->sendMessage($chatId, "🔄 *ક્લિનિક સફળતાપૂર્વક સ્વિચ થયું!*\n\n🏥 હવે સક્રિય ક્લિનિક: *{$targetClinic->name}* ({$targetClinic->doctor_name})");
        return ['status' => 'switched'];
    }

    /**
     * Handle Prescription Photo Upload via Telegram (Full OCR + Auto Save in Clinic)
     */
    protected function handlePrescriptionPhoto(array $message, TelegramUser $user, int $chatId): array
    {
        $clinic = $this->resolveUserClinic($user);
        if (!$clinic) {
            $this->sendMessage($chatId, "⛔ *ક્ષતિ:* તમારું એકાઉન્ટ કોઈ ક્લિનિક સાથે જોડાયેલ નથી. એડમિન ડૉ. જય લાકુમનો સંપર્ક કરો.");
            return ['status' => 'no_clinic'];
        }

        $this->sendMessage($chatId, "📸 *પ્રિસ્ક્રિપ્શન મળ્યું છે!* \n🤖 Google Gemini AI વડે વાંચી રહી છું, કૃપા કરીને થોડી સેકન્ડ રાહ જુઓ...");

        $photos = $message['photo'] ?? [];
        if (empty($photos)) {
            $this->sendMessage($chatId, "❌ ફોટો મળી શક્યો નહીં.");
            return ['status' => 'no_photo'];
        }
        $bestPhoto = end($photos); // highest resolution photo
        $fileId = $bestPhoto['file_id'];

        try {
            $fileRes = Http::get("{$this->apiUrl}/getFile", ['file_id' => $fileId]);
            if (!$fileRes->successful()) {
                $this->sendMessage($chatId, "❌ ફોટો ડાઉનલોડ કરવામાં ભૂલ આવી.");
                return ['status' => 'download_failed'];
            }

            $filePathOnTelegram = $fileRes->json()['result']['file_path'] ?? '';
            $downloadUrl = "https://api.telegram.org/file/bot{$this->botToken}/{$filePathOnTelegram}";
            $imageBytes = Http::get($downloadUrl)->body();

            $filename = 'rx_tg_' . date('Ymd_His') . '_' . Str::random(6) . '.jpg';
            Storage::disk('public')->put('prescriptions/' . $filename, $imageBytes);
            $fullPath = storage_path('app/public/prescriptions/' . $filename);

            // Run AI OCR
            $extracted = $this->patientOcrService->analyzePrescription($fullPath, 'image/jpeg');

            $finalName = trim($extracted['patient_name'] ?? 'અજ્ઞાત દર્દી');
            if (empty($finalName) || $finalName === 'અજ્ઞાત દર્દી') {
                $finalName = 'દર્દી ' . date('d/m H:i');
            }
            $finalGujarati = trim($extracted['patient_name_gujarati'] ?? $finalName);
            $normalizedName = Str::slug(mb_strtolower($finalName), '');

            $phone = trim($extracted['phone'] ?? null);
            $city = trim($extracted['city'] ?? $clinic->city ?? null);
            $age = !empty($extracted['age']) ? (int)$extracted['age'] : null;
            $gender = $extracted['gender'] ?? null;
            $visitDate = $extracted['visit_date'] ?? date('Y-m-d');

            $diagnosis = $extracted['diagnosis'] ?: 'ઓપીડી તપાસ';
            $medicines = $extracted['medicines'] ?: 'જરૂર મુજબ દવાઓ';
            $symptoms = $extracted['symptoms'] ?: '';
            $summary = $extracted['summary'] ?: ($diagnosis . ($medicines ? " ({$medicines})" : ""));

            // Match or create patient in this clinic
            $patient = null;
            if (!empty($phone)) {
                $patient = Patient::where('clinic_id', $clinic->id)->where('phone', $phone)->first();
            }
            if (!$patient && !empty($finalName)) {
                $patient = Patient::where('clinic_id', $clinic->id)
                    ->where(function($q) use ($finalName, $normalizedName) {
                        $q->where('name', $finalName)
                          ->orWhere('name_normalized', $normalizedName);
                    })->first();
            }

            DB::beginTransaction();
            if (!$patient) {
                $patient = Patient::create([
                    'clinic_id' => $clinic->id,
                    'name' => $finalName,
                    'name_normalized' => $normalizedName,
                    'name_gujarati' => $finalGujarati,
                    'phone' => $phone,
                    'age' => $age,
                    'gender' => $gender,
                    'city' => $city,
                    'last_diagnosis' => $diagnosis,
                    'last_medicines' => $medicines,
                    'last_summary' => $summary,
                    'last_visit_date' => $visitDate,
                    'total_visits' => 1,
                ]);
            } else {
                $patient->update([
                    'age' => $age ?: $patient->age,
                    'gender' => $gender ?: $patient->gender,
                    'city' => $city ?: $patient->city,
                    'phone' => $phone ?: $patient->phone,
                    'last_diagnosis' => $diagnosis,
                    'last_medicines' => $medicines,
                    'last_summary' => $summary,
                    'last_visit_date' => $visitDate,
                    'total_visits' => $patient->total_visits + 1,
                ]);
            }

            // Create visit
            PatientVisit::create([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->id,
                'visit_date' => $visitDate,
                'photo_path' => '/storage/prescriptions/' . $filename,
                'diagnosis' => $diagnosis,
                'medicines' => $medicines,
                'symptoms' => $symptoms,
                'notes' => 'Telegram Upload',
                'raw_ocr_text' => $extracted['raw_text'] ?? null,
                'extracted_data' => $extracted,
            ]);

            DB::commit();

            $reply = "✅ *પ્રિસ્ક્રિપ્શન સફળતાપૂર્વક સ્કેન થયું!*\n\n"
                   . "🏥 *ક્લિનિક:* {$clinic->name}\n"
                   . "👤 *દર્દીનું નામ:* {$patient->name}\n"
                   . ($patient->phone ? "📱 *મોબાઇલ:* `{$patient->phone}`\n" : "")
                   . ($patient->age ? "🎂 *ઉંમર:* {$patient->age} વર્ષ\n" : "")
                   . "🩺 *નિદાન:* {$diagnosis}\n"
                   . "💊 *લખેલ દવાઓ:* {$medicines}\n\n"
                   . "💾 આ દર્દી તમારા પોર્ટલ ડેશબોર્ડમાં સેવ થઈ ગયો છે.";

            $this->sendMessage($chatId, $reply);
            return ['status' => 'prescription_saved', 'patient_id' => $patient->id];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Telegram prescription save error: ' . $e->getMessage());
            $this->sendMessage($chatId, "❌ પ્રિસ્ક્રિપ્શન વાંચવામાં ક્ષતિ આવી: " . $e->getMessage());
            return ['status' => 'ocr_error'];
        }
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
     * Handle text search query (Scoped strictly to user's clinic)
     */
    protected function handleSearchMessage(int $chatId, string $query, TelegramUser $user): array
    {
        $clinic = $this->resolveUserClinic($user);
        $clinicId = $clinic ? $clinic->id : 1;

        // 1. Patient Lookup: Strictly scoped to this doctor's clinic!
        $patientMatches = Patient::where('clinic_id', $clinicId)
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                  ->orWhere('name_gujarati', 'LIKE', "%{$query}%")
                  ->orWhere('phone', 'LIKE', "%{$query}%")
                  ->orWhere('last_diagnosis', 'LIKE', "%{$query}%")
                  ->orWhere('last_medicines', 'LIKE', "%{$query}%");
            })
            ->take(3)
            ->get();

        if ($patientMatches->isNotEmpty()) {
            $clinicTitle = $clinic ? $clinic->name : 'ક્લિનિક';
            $resText = "👤 *દર્દીની હિસ્ટ્રી ({$clinicTitle}):*\n\n";
            foreach ($patientMatches as $pt) {
                $vDate = $pt->last_visit_date 
                    ? (is_string($pt->last_visit_date) ? date('d-m-Y', strtotime($pt->last_visit_date)) : $pt->last_visit_date->format('d-m-Y'))
                    : date('d-m-Y');

                $resText .= "• *નામ:* {$pt->name}" . ($pt->name_gujarati ? " ({$pt->name_gujarati})" : "") . "\n"
                          . ($pt->phone ? "  📱 મોબાઇલ: `{$pt->phone}`\n" : "")
                          . ($pt->age ? "  🎂 ઉંમર: {$pt->age} વર્ષ" . ($pt->gender ? " | {$pt->gender}" : "") . "\n" : "")
                          . "  🩺 *નિદાન:* " . ($pt->last_diagnosis ?: 'સામાન્ય તપાસ') . "\n"
                          . "  💊 *દવાઓ:* " . ($pt->last_medicines ?: 'રેકોર્ડ નથી') . "\n"
                          . "  📅 *મુલાકાત:* {$vDate}\n\n";
            }
            $this->sendMessage($chatId, $resText);
            return ['status' => 'patient_found'];
        }

        $result = $this->searchService->search($query);

        // 2. Check for Disambiguation (e.g. GST or PAN present in multiple companies)
        if ($result['disambiguation_required']) {
            $disData = $result['disambiguation_data'];
            $numberedDocs = [];
            $numListText = "❓ *કન્ફર્મેશન: કઈ કંપનીનું જોઈએ છે?*\nતમે `{$disData['doc_type']}` માંગ્યું છે, તે નીચેની કંપનીઓમાં ઉપલબ્ધ છે:\n\n";

            $buttons = [];
            $i = 1;
            foreach ($disData['companies'] as $c) {
                // Find matching document id if available
                $matchingDoc = Document::where('company_id', $c['id'])->where(function($q) use ($disData) {
                    $q->where('doc_type', $disData['doc_type'])
                      ->orWhere('title', 'LIKE', "%{$disData['doc_type']}%");
                })->first();

                if ($matchingDoc) {
                    $numberedDocs[$i] = $matchingDoc->id;
                }
                $numListText .= "{$i}️⃣ *{$c['name']}* ({$disData['doc_type']})\n";
                $buttons[] = ['text' => "{$i}. " . $c['name'], 'callback_data' => 'search_q_' . substr(md5($c['query']), 0, 10)];
                $i++;
            }
            $numListText .= "\n💡 *ચેટમાં ફક્ત નંબર (જેમ કે {$i}) લખો અથવા નીચે બટન દબાવો:*";

            // Save state for single number reply
            $session = (array) $user->session_state;
            $session['numbered_docs'] = $numberedDocs;
            $user->update(['session_state' => $session]);

            $keyboard = ['inline_keyboard' => array_chunk($buttons, 2)];
            $this->sendMessage($chatId, $numListText, $keyboard);
            return ['status' => 'disambiguation_sent'];
        }

        $docs = $result['documents'];

        if ($docs->isEmpty()) {
            $clinicTitle = $clinic ? $clinic->name : 'તમારા ક્લિનિક';
            $msg = "🔍 *'{$query}'* માટે {$clinicTitle} માં કોઈ દર્દી મળ્યો નથી.\n\n"
                 . "💡 *ટિપ્સ:*\n"
                 . "• દર્દી શોધવા માટે દર્દીનું નામ અથવા મોબાઇલ નંબર લખો.\n"
                 . "• નવો દર્દી ઉમેરવા માટે પ્રિસ્ક્રિપ્શનનો ફોટો મોકલો.\n"
                 . "• આજનો ઓપીડી હિસાબ જોવા `/today` લખો.";

            $this->sendMessage($chatId, $msg);
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
        } elseif ($data === 'clinic_today_accounts') {
            $user = TelegramUser::where('telegram_id', $chatId)->first();
            if ($user) {
                $this->handleTodayAccounts($chatId, $user);
            }
        } elseif ($data === 'clinic_patients_guide') {
            $msg = "📋 *દર્દી રેકોર્ડ્સ કેવી રીતે વાપરવા:*\n\n"
                 . "1. 📸 **પ્રિસ્ક્રિપ્શનનો ફોટો મોકલો:** બોટ ઓટોમેટિક દવાઓ વાંચીને દર્દીની નવી મુલાકાત તમારા ક્લિનિકમાં સેવ કરશે.\n"
                 . "2. 🔍 **દર્દી શોધવા:** ચેટમાં દર્દીનું નામ (દા.ત. `Hetal` કે `જય`) અથવા મોબાઇલ નંબર લખો.\n"
                 . "3. 📊 **આજનો હિસાબ:** `/today` લખો અથવા બટન દબાવો.";
            $this->sendMessage($chatId, $msg);
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
     * Get or create Telegram User & Auto-Link to Clinic by Username
     */
    protected function getOrCreateUser(array $from): TelegramUser
    {
        $user = TelegramUser::firstOrCreate(
            ['telegram_id' => $from['id']],
            [
                'first_name' => $from['first_name'] ?? 'User',
                'last_name' => $from['last_name'] ?? '',
                'username' => $from['username'] ?? '',
                'is_authorized' => false,
                'role' => 'user',
            ]
        );

        // Update username if changed
        if (!empty($from['username']) && $user->username !== $from['username']) {
            $user->update(['username' => $from['username']]);
        }

        // Auto-link to clinic by matching Telegram username
        if (!$user->clinic_id && !empty($user->username)) {
            $cleanUser = ltrim($user->username, '@');
            $matchingClinic = Clinic::where('telegram_username', $cleanUser)->first();
            if ($matchingClinic) {
                $user->update([
                    'clinic_id' => $matchingClinic->id,
                    'is_authorized' => true,
                    'role' => 'doctor',
                ]);
            }
        }

        // Super Admin (Dr. Jay Lakum) auto-authorization
        $uName = strtolower($user->username ?? '');
        if (in_array($uName, ['jaylakum', 'jay_lakum', 'lakumjay']) || $user->telegram_id == 999888777) {
            $user->update([
                'is_authorized' => true,
                'role' => 'admin',
                'clinic_id' => 1,
            ]);
        }

        return $user;
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
