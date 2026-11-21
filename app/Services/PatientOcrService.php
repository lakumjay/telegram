<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PatientOcrService
{
    /**
     * Analyze a handwritten or printed doctor prescription/note page
     * and extract patient name, age, gender, date, diagnosis, medicines, and key symptoms.
     */
    public function analyzePrescription(string $filePath, string $mimeType = 'image/jpeg'): array
    {
        $geminiApiKey = config('services.gemini.key') ?: env('GEMINI_API_KEY');

        if (!$geminiApiKey || !file_exists($filePath)) {
            return $this->fallbackExtraction();
        }

        try {
            $fileBytes = base64_encode(file_get_contents($filePath));
            
            // System prompt tailored for medical prescription recognition (handwritten / English / Gujarati / Hindi)
            $prompt = <<<EOT
You are an expert Medical AI Assistant analyzing a handwritten or printed clinic doctor's prescription or patient case sheet page.
The doctor writes clinic header, case number/OPD number, patient name, date, address/village, age, gender, symptoms/complaints, diagnosis, and prescribed medicines in English, Gujarati or Hindi.

Analyze the image carefully, read the handwritten and printed text, and output ONLY a valid JSON object with the following fields:
{
  "patient_name": "Full name of the patient (e.g. Kamleshbhai Dabhi, Jay Lakum or રમેશ પટેલ). Never return 'અજ્ઞાત દર્દી' if a name or label is visible.",
  "patient_name_gujarati": "Name in Gujarati script if present or transliterated (e.g. કમલેશભાઈ ડાભી)",
  "opd_number": "Case No or OPD number written at top (e.g. 187)",
  "age": 40, // integer number or null
  "gender": "Male", // "Male", "Female", or null
  "city": "Patient city/village if mentioned (e.g. Botad)",
  "address": "Full address or village name if written",
  "phone": "Phone number if written or null",
  "visit_date": "YYYY-MM-DD", // Date of prescription if visible, otherwise null
  "diagnosis": "Short primary illness/complaint/symptom (e.g., White patch on right toe, તાવ, શરદી, ચામડીની તકલીફ)",
  "medicines": "Summary list of medicines written with dosage (e.g., Paracetamol 650 TDS, Azithromycin 500 OD)",
  "symptoms": "Detailed symptoms and complaints mentioned (e.g., White patch on right toe for 10 months, itching)",
  "summary": "Brief 1-line doctor reminder summary in Gujarati (e.g., કમલેશભાઈ ડાભી - જમણા પગના અંગૂઠા પર સફેદ ડાઘ (૧૦ મહિનાથી))",
  "raw_text": "Full extracted readable text from the page"
}

Ensure the JSON is strictly valid. Do NOT wrap in markdown code blocks if possible.
EOT;

            $modelsToTry = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-flash-latest'];
            $response = null;

            foreach ($modelsToTry as $modelName) {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key={$geminiApiKey}";
                try {
                    $response = Http::withHeaders(['Content-Type' => 'application/json'])
                        ->timeout(25)
                        ->post($endpoint, [
                            'contents' => [
                                [
                                    'parts' => [
                                        ['text' => $prompt],
                                        [
                                            'inline_data' => [
                                                'mime_type' => $mimeType ?: 'image/jpeg',
                                                'data' => $fileBytes,
                                            ]
                                        ]
                                    ]
                                ]
                            ],
                            'generationConfig' => [
                                'responseMimeType' => 'application/json',
                                'temperature' => 0.1,
                            ]
                        ]);

                    if ($response->successful()) {
                        break;
                    }
                } catch (\Throwable $err) {
                    Log::warning("Model {$modelName} failed: " . $err->getMessage());
                }
            }

            if ($response->successful()) {
                $body = $response->json();
                $rawContent = $body['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                
                // Clean potential backticks
                $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($rawContent));
                $cleaned = preg_replace('/\s*```$/', '', $cleaned);
                
                $data = json_decode($cleaned, true);
                if (is_array($data) && !empty($data['patient_name'])) {
                    return $data;
                }
            } else {
                Log::warning('Gemini Medical OCR failed with status: ' . $response->status() . ' - ' . $response->body());
            }
        } catch (\Throwable $e) {
            Log::error('PatientOcrService Exception: ' . $e->getMessage());
        }

        return $this->fallbackExtraction();
    }

    protected function fallbackExtraction(): array
    {
        return [
            'patient_name' => 'ઓપીડી દર્દી ' . date('d-m H:i'),
            'patient_name_gujarati' => null,
            'opd_number' => null,
            'age' => null,
            'gender' => null,
            'city' => null,
            'address' => null,
            'phone' => null,
            'visit_date' => date('Y-m-d'),
            'diagnosis' => 'સામાન્ય તપાસ (General Checkup)',
            'medicines' => '',
            'symptoms' => '',
            'summary' => 'સામાન્ય તપાસ (વિઝિટ નોંધાયેલ)',
            'raw_text' => '',
        ];
    }
}
