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
You are an expert Medical AI Assistant analyzing a handwritten or printed clinic doctor's prescription or patient notes page.
The doctor writes patient details, symptoms/diagnosis, and prescribed medicines in English, Gujarati or Hindi.

Analyze the image carefully and output ONLY a valid JSON object with the following fields:
{
  "patient_name": "Full name of the patient (e.g., Jay Lakum or રમેશ પટેલ)",
  "patient_name_gujarati": "Name in Gujarati script if present or transliterated (e.g. જય લાકુમ)",
  "age": 28, // number or null
  "gender": "Male", // "Male", "Female", or null
  "city": "Patient city/village if mentioned or null",
  "phone": "Phone number if written or null",
  "visit_date": "YYYY-MM-DD", // Date of prescription if visible, otherwise null
  "diagnosis": "Short primary illness/complaint (e.g., તાવ અને માથાનો દુખાવો / High Fever & Headache, or ઉધરસ અને શરદી / Severe Cough & Cold)",
  "medicines": "Summary list of medicines written with dosage (e.g., Paracetamol 650 TDS, Azithromycin 500 OD, Cough Syrup)",
  "symptoms": "Symptoms mentioned (e.g., fever for 3 days, dry cough, weakness)",
  "summary": "Brief 1-line doctor reminder summary in Gujarati (e.g., તાવ અને માથાનો દુખાવો (દવા: Paracetamol, Azithro))",
  "raw_text": "Full extracted readable text from the page"
}

Ensure the JSON is strictly valid. Do NOT wrap in markdown code blocks if possible.
EOT;

            $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiApiKey}";

            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->timeout(35)
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
            'patient_name' => 'અજ્ઞાત દર્દી (New Patient)',
            'patient_name_gujarati' => null,
            'age' => null,
            'gender' => null,
            'city' => null,
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
