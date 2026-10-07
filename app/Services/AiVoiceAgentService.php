<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Document;
use App\Models\SystemSetting;
use App\Models\VoiceCallLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiVoiceAgentService
{
    protected DeepSearchService $searchService;
    protected ZipService $zipService;

    public function __construct(DeepSearchService $searchService, ZipService $zipService)
    {
        $this->searchService = $searchService;
        $this->zipService = $zipService;
    }

    /**
     * Process human-like conversational turn using Gemini Pro & Jay Sir Kathiyawadi Persona
     */
    public function processTurn(string $transcript, ?string $sessionId = null, ?int $telegramUserId = null): array
    {
        $sessionId = $sessionId ?: Str::uuid()->toString();

        $log = VoiceCallLog::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'telegram_user_id' => $telegramUserId,
                'status' => 'active',
                'transcript' => '',
                'requested_documents' => [],
            ]
        );

        $currentTranscript = trim(($log->transcript ? $log->transcript . "\nUser: " : "User: ") . $transcript);
        $userText = mb_strtolower(trim($transcript));

        // 1. Inaudible / Muffled speech check
        $cleanAlpha = preg_replace('/[^\p{L}\p{N}]/u', '', $userText);
        if (mb_strlen($cleanAlpha) < 2 || in_array($userText, ['...', 'aa', 'ee', 'uh', 'hmm', 'ah', 'ha?'])) {
            $responseMessage = "માફ કરશો, તમારો અવાજ સ્પષ્ટ સંભળાયો નથી. ફરી વાર મને જણાવશો?";
            $this->updateLog($log, $currentTranscript, $responseMessage, 'active');

            return [
                'session_id' => $sessionId,
                'status' => 'active',
                'voice_response' => $responseMessage,
                'action' => 'speak_and_listen',
                'documents' => [],
            ];
        }

        // 2. Greetings
        $greetingPatterns = ['hello', 'helo', 'hii', 'hi', 'kem cho', 'કેમ છો', 'નમસ્તે', 'નમસ્કાર', 'sunao', 'hey', 'હેલ્લો', 'રામ રામ', 'જય શ્રી કૃષ્ણ'];
        foreach ($greetingPatterns as $greet) {
            if ($userText === $greet || str_starts_with($userText, $greet . ' ') || str_ends_with($userText, ' ' . $greet)) {
                $responseMessage = "નમસ્તે! હેલ્લો, હા બોલો ને! હું તમારી શું મદદ કરી શકું? તમારે કયા ડોક્યુમેન્ટ જોઈએ છે?";
                $this->updateLog($log, $currentTranscript, $responseMessage, 'active');

                return [
                    'session_id' => $sessionId,
                    'status' => 'active',
                    'voice_response' => $responseMessage,
                    'action' => 'speak_and_listen',
                    'documents' => [],
                ];
            }
        }

        // 3. User says "Only this / Biju kai nathi jotu / Bas aatlu j" (Wrap-up)
        $wrapUpPatterns = [
            'બસ', 'આટલું જ', 'બીજું કંઈ નથી', 'બીજું કંઈ નથી જોઈતું', 'કંઈ નહિ', 
            'nathi joytu', 'khatam', 'bas', 'aatlu j', 'bye', 'thank you', 
            'aabhar', 'call cut', 'કૉલ કટ', 'થેંક યુ', 'થેન્ક યુ', 'ઓન્લી', 'only'
        ];
        foreach ($wrapUpPatterns as $wrap) {
            if (str_contains($userText, $wrap) || $userText === $wrap) {
                $docIds = (array) ($log->requested_documents ?: []);
                $documents = Document::with('company')->whereIn('id', $docIds)->get();
                $docCount = count($documents);

                if ($docCount > 0) {
                    $docTitles = $documents->map(fn($d) => ($d->company ? $d->company->name . ' નું ' : '') . $d->title)->join(', ');
                    $responseMessage = "ઓકે, તો તમે કૉલ કટ કરી શકો છો, હું {$docTitles} તમારી ચેટ પર મોકલી આપું છું. થેંક યુ!";
                } else {
                    $responseMessage = "ઓકે, તો તમે કૉલ કટ કરી શકો છો. તમારો ખૂબ ખૂબ આભાર!";
                }

                $zipData = null;
                if ($docCount > 0) {
                    $zipData = $this->zipService->createZipFromDocuments($docIds, 'single_master_zip');
                }

                $this->updateLog($log, $currentTranscript, $responseMessage, 'completed');

                return [
                    'session_id' => $sessionId,
                    'status' => 'completed',
                    'voice_response' => $responseMessage,
                    'action' => 'deliver_files_and_end_call',
                    'documents' => $documents,
                    'zip' => $zipData,
                ];
            }
        }

        // 4. Document Search in Database (Deep OCR + Semantic Search)
        $searchResults = $this->searchService->search($transcript);
        $foundDocs = $searchResults['documents'];
        $docCount = count($foundDocs);

        if ($docCount > 0) {
            $docNames = [];
            $newDocIds = [];
            foreach ($foundDocs as $doc) {
                $compName = $doc->company ? $doc->company->name : '';
                $docNames[] = ($compName ? "{$compName} નું " : "") . $doc->title;
                $newDocIds[] = $doc->id;
            }

            $formattedList = implode(" અને ", $docNames);

            $existingDocIds = (array) ($log->requested_documents ?: []);
            $allDocIds = array_values(array_unique(array_merge($existingDocIds, $newDocIds)));

            $responseMessage = "હા, {$formattedList}... આ સિવાય બીજું કંઈ જોઈએ છે?";

            $log->update([
                'transcript' => $currentTranscript . "\nAI: " . $responseMessage,
                'extracted_intent' => $searchResults['intent'],
                'requested_documents' => $allDocIds,
                'status' => 'waiting_confirmation',
                'ai_response_text' => $responseMessage,
            ]);

            return [
                'session_id' => $sessionId,
                'status' => 'waiting_confirmation',
                'voice_response' => $responseMessage,
                'documents' => Document::with('company')->whereIn('id', $allDocIds)->get(),
                'doc_ids' => $allDocIds,
                'action' => 'ask_next',
            ];
        }

        // 5. Query Gemini Pro API for Out-of-Scope / Intelligent Handling
        $geminiResponse = $this->queryGeminiAssistant($transcript, $currentTranscript);
        if (!empty($geminiResponse)) {
            $this->updateLog($log, $currentTranscript, $geminiResponse, 'active');

            return [
                'session_id' => $sessionId,
                'status' => 'active',
                'voice_response' => $geminiResponse,
                'action' => 'speak_and_listen',
                'documents' => [],
            ];
        }

        // 6. Default Jay Sir Out-of-Scope Response
        $responseMessage = "માફ કરશો, જય સરે મને આ બાબતે કીધેલું નથી, હું ચોક્કસ જય સર જોડે વાત કરીશ.";
        $this->updateLog($log, $currentTranscript, $responseMessage, 'active');

        return [
            'session_id' => $sessionId,
            'status' => 'active',
            'voice_response' => $responseMessage,
            'action' => 'speak_and_listen',
            'documents' => [],
        ];
    }

    /**
     * Query Google Gemini Pro Assistant with Jay Sir Kathiyawadi System Persona
     */
    protected function queryGeminiAssistant(string $userPrompt, string $chatHistory): string
    {
        $apiKey = SystemSetting::get('gemini_api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) return '';

        $systemInstruction = "Tum 'Riya' ho, Jay Sir ki document assistant. Tum ek asli insaan ki tarah baat karti ho, robot ki tarah nahi. Customer ki bhasha (Hindi/Gujarati/Hinglish) me chhote, simple aur dostana jawab do. Agar koi document maange to kaho 'Ji, abhi bhej rahi hu' aur end me [SEND_DOC: document_name] likho. Agar document na ho to maafi maango aur Jay Sir ka contact do. Apni taraf se koi jankari mat banao.";

        try {
            $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->timeout(8)
                ->post($endpoint, [
                    'system_instruction' => [
                        'parts' => [
                            ['text' => $systemInstruction]
                        ]
                    ],
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $userPrompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.4,
                        'maxOutputTokens' => 100,
                    ]
                ]);

            if ($response->successful()) {
                $candidates = $response->json()['candidates'] ?? [];
                if (!empty($candidates[0]['content']['parts'][0]['text'])) {
                    return trim($candidates[0]['content']['parts'][0]['text']);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Gemini API call warning: ' . $e->getMessage());
        }

        return "માફ કરશો, જય સરે મને આ બાબતે કીધેલું નથી, હું ચોક્કસ વાત કરીશ એમને.";
    }

    protected function updateLog(VoiceCallLog $log, string $transcript, string $aiMessage, string $status): void
    {
        $log->update([
            'transcript' => $transcript . "\nAI: " . $aiMessage,
            'status' => $status,
            'ai_response_text' => $aiMessage,
        ]);
    }
}
