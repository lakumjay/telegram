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
You are an expert Indian Medical OCR Assistant analyzing a handwritten or printed clinic doctor's prescription or patient case sheet.
Doctors in Gujarat frequently write in a mix of Gujarati script and English medical cursive handwriting:
- Patient Name: often handwritten in Gujarati script (e.g. 'એકતાબેન દુધરેજીયા' -> Ektaben Dudhrejiya, 'કમલેશભાઈ ડાભી') or English. ALWAYS capture both English and Gujarati name.
- Address / City / Religion / Occupation: often in Gujarati (e.g. 'ધંધુકા', 'બોટાદ', 'ઘરકામ', 'હિન્દુ').
- Date: written as DD/MM/YY or DD/MM/YYYY (e.g. '12/03/20' -> '2020-03-12', '08/12/22' -> '2022-12-08'). ALWAYS convert 2-digit years to valid YYYY-MM-DD.
- OPD / Case No: written at top right or OPD No (e.g. '157', '187').
- Age & Sex: e.g. '18 / Female', '40 / Male'.
- Present Complaints & Symptoms: medical shorthand in English (e.g. 'White Patch on Right side upper lip since 1 month, No H/O pain, Itching, Discharge').
- Medicines (Rx): list of remedies/medicines with dosage & frequency (e.g. 'AFS 30 x TDS, Nit Acid 200 (2) weekly, W.S Ointment' or 'Tab. Bilast 20mg OD').

Analyze the image carefully, read every Gujarati word and English medical handwriting accurately. Output ONLY a valid JSON object:
{
  "patient_name": "Full English name (e.g. Ektaben Dudhrejiya or Kamleshbhai Dabhi)",
  "patient_name_gujarati": "Full Gujarati name (e.g. એકતાબેન દુધરેજીયા or કમલેશભાઈ ડાભી)",
  "opd_number": "OPD or Case number (e.g. 157 or 187)",
  "age": 18, // integer number or null
  "gender": "Female", // "Male", "Female", or null
  "city": "Patient city/village (e.g. ધંધુકા / Dhandhuka or બોટાદ / Botad)",
  "address": "Full address or village if written",
  "phone": "Phone number if written or null",
  "visit_date": "YYYY-MM-DD", // Exact date from case paper, e.g. 2020-03-12 or 2022-12-08
  "diagnosis": "Short English primary complaint/symptom (e.g., White Patch on Right side upper lip)",
  "diagnosis_gujarati": "Short Gujarati explanation of complaints (e.g., ઉપલા હોઠની જમણી બાજુ સફેદ ડાઘ (૧ મહિનાથી))",
  "medicines": "List of prescribed medicines/remedies with dosage (e.g., AFS 30 TDS, Nit Acid 200 weekly, W.S Ointment)",
  "symptoms": "Detailed symptoms and complaints mentioned",
  "summary": "Brief 1-line doctor reminder summary in Gujarati (e.g., એકતાબેન દુધરેજીયા - હોઠ પર સફેદ ડાઘ (૧ મહિનો) - દવા: AFS 30, Nit Acid, W.S મલમ)",
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
