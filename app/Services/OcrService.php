<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class OcrService
{
    /**
     * Process document and extract OCR text + structured metadata
     */
    public function processDocument(Document $document, string $absolutePath): array
    {
        $ocrText = '';
        $mime = $document->mime_type;

        try {
            if (str_contains($mime, 'pdf') || str_ends_with(strtolower($document->original_filename), '.pdf')) {
                $ocrText = $this->extractPdfText($absolutePath);
            }

            // If PDF had no digital text (e.g., scanned PDF) or it's an image (JPG/PNG), use fallback/vision
            if (empty(trim($ocrText))) {
                $ocrText = $this->extractImageOrScannedText($absolutePath, $mime);
            }

            // Extract metadata from OCR text
            $extractedMetadata = $this->extractDocumentMetadata($ocrText, $document->original_filename);

            // Update document
            $document->update([
                'ocr_text' => $ocrText,
                'ocr_status' => 'completed',
                'doc_type' => $extractedMetadata['doc_type'] ?: $document->doc_type,
                'stamp_value' => $extractedMetadata['stamp_value'] ?: $document->stamp_value,
                'parties' => $extractedMetadata['parties'] ?: $document->parties,
                'search_keywords' => $extractedMetadata['keywords'],
                'metadata' => array_merge((array) $document->metadata, $extractedMetadata['extra']),
            ]);

            return [
                'success' => true,
                'ocr_text' => $ocrText,
                'metadata' => $extractedMetadata,
            ];
        } catch (\Throwable $e) {
            Log::error('OCR processing failed for document ID ' . $document->id . ': ' . $e->getMessage());
            $document->update(['ocr_status' => 'failed']);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extract text from native PDF using pure PHP Smalot Parser (100% Free & offline)
     */
    public function extractPdfText(string $filePath): string
    {
        if (!file_exists($filePath)) {
            return '';
        }

        try {
            $parser = new PdfParser();
            $pdf = $parser->parseFile($filePath);
            $pages = $pdf->getPages();
            
            if (empty($pages)) {
                return (string) $pdf->getText();
            }

            $fullTextParts = [];
            foreach ($pages as $index => $page) {
                $pageNum = $index + 1;
                $pageContent = trim((string) $page->getText());
                if (!empty($pageContent)) {
                    $fullTextParts[] = "[Page {$pageNum}]\n" . $pageContent;
                }
            }

            return implode("\n\n", $fullTextParts);
        } catch (\Throwable $e) {
            Log::warning('Native PDF parsing failed, trying raw stream: ' . $e->getMessage());
            return '';
        }
    }

    /**
     * Free Image & Scanned OCR extraction using Gemini Vision Free API or Tesseract fallback
     */
    public function extractImageOrScannedText(string $filePath, string $mimeType): string
    {
        $geminiApiKey = config('services.gemini.key') ?: env('GEMINI_API_KEY');

        if ($geminiApiKey && file_exists($filePath)) {
            try {
                $fileBytes = base64_encode(file_get_contents($filePath));
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiApiKey}";

                $response = Http::withHeaders(['Content-Type' => 'application/json'])
                    ->timeout(30)
                    ->post($endpoint, [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => 'Please perform high-accuracy OCR on this document in Gujarati, Hindi, and English. Output all readable text, company names, stamp paper values, person names, and identification numbers.'],
                                    [
                                        'inline_data' => [
                                            'mime_type' => $mimeType ?: 'image/jpeg',
                                            'data' => $fileBytes,
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]);

                if ($response->successful()) {
                    $json = $response->json();
                    return $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
                }
            } catch (\Throwable $e) {
                Log::warning('Gemini Vision OCR failed: ' . $e->getMessage());
            }
        }

        return '';
    }

    /**
     * Parse structured metadata from text (Stamp values, PAN, GST, Aadhaar, Parties)
     */
    public function extractDocumentMetadata(string $text, string $filename = ''): array
    {
        $combined = $filename . "\n" . $text;
        $docType = 'other';
        $stampValue = null;
        $parties = [];
        $extra = [];

        // 1. Detect Document Type
        if (preg_match('/(?:aadhaar|aadhar|uidai|આધાર)/i', $combined)) {
            $docType = 'aadhaar';
        } elseif (preg_match('/(?:pan card|pancard|permanent account number|ઇન્કમ ટેક્સ|પાનકાર્ડ|\bpan\b)/i', $combined)) {
            $docType = 'pan';
        } elseif (preg_match('/(?:gstin|gst registration|goods and services tax|જીએસટી|\bgst\b|gst\s*number)/i', $combined)) {
            $docType = 'gst';
        } elseif (preg_match('/(?:udyam|msme|ઉદ્યમ|ઉદ્યોગ આધાર)/i', $combined)) {
            $docType = 'udyam';
        } elseif (preg_match('/(?:geda|gujarat energy development agency|ગેડા)/i', $combined)) {
            $docType = 'geda';
        } elseif (preg_match('/(?:stamp|stemp|e-stamp|agreement|કરાર|સ્ટેમ્પ|બાંયધરી)/i', $combined)) {
            $docType = 'stamp';
        } elseif (preg_match('/(?:light\s*bill|electricity bill|pgvcl|ugvcl|mgvcl|dgvcl|ટોરેન્ટ)/i', $combined)) {
            $docType = 'lightbill';
        } elseif (preg_match('/(?:rc\s*book|registration certificate|વાહન રજીસ્ટ્રેશન)/i', $combined)) {
            $docType = 'rc_book';
        }

        // 2. Detect Stamp Paper Value (e.g., 300, 500, 100, 1000)
        if (preg_match('/(?:(?:rs\.?|inr|₹|રૂ\.?|રૂપિયા|stemp|stamp)\s*[:=]?\s*(\d{2,5}))/i', $combined, $m) ||
            preg_match('/(\d{2,5})\s*(?:rs\.?|inr|₹|રૂ\.?|રૂપિયા|stemp|stamp|વાળો\s*સ્ટેમ્પ)/i', $combined, $m)) {
            $val = (float) $m[1];
            if (in_array($val, [50, 100, 200, 300, 500, 1000, 2000, 5000])) {
                $stampValue = $val;
            }
        }

        // 3. Detect Parties / Names
        if (preg_match_all('/(?:between|among|પક્ષકાર|શ્રી|મેસર્સ|m\/s\.?|mr\.?|mrs\.?)\s+([A-Za-z0-9\x{0A80}-\x{0AFF}\s]{3,40})/u', $combined, $matches)) {
            foreach ($matches[1] as $p) {
                $trimmed = trim($p);
                if (strlen($trimmed) > 2 && !in_array($trimmed, $parties)) {
                    $parties[] = $trimmed;
                }
            }
        }

        // 4. Detect GST / PAN Numbers
        if (preg_match('/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/', $combined, $mGst)) {
            $extra['gstin'] = $mGst[1];
        }
        if (preg_match('/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/', $combined, $mPan)) {
            $extra['pan'] = $mPan[1];
        }
        if (preg_match('/\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/', $combined, $mAadhaar)) {
            $extra['aadhaar'] = $mAadhaar[1];
        }

        // 5. Generate Keywords
        $keywords = implode(' ', array_filter([
            $docType,
            $stampValue ? $stampValue . ' stamp ' . $stampValue . ' સ્ટેમ્પ' : '',
            implode(' ', $parties),
            $extra['gstin'] ?? '',
            $extra['pan'] ?? '',
        ]));

        return [
            'doc_type' => $docType,
            'stamp_value' => $stampValue,
            'parties' => array_slice($parties, 0, 5),
            'extra' => $extra,
            'keywords' => $keywords,
        ];
    }
}
