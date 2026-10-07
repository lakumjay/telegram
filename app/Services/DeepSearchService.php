<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Document;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DeepSearchService
{
    /**
     * Search documents with deep OCR content inspection, multi-entity parsing, and suggestions
     */
    public function search(string $rawQuery, ?int $companyId = null, ?int $folderId = null): array
    {
        $normalizedQuery = trim($rawQuery);
        if (empty($normalizedQuery)) {
            return [
                'documents' => [],
                'total' => 0,
                'intent' => null,
                'disambiguation_required' => false,
                'suggestions' => [],
            ];
        }

        // 1. Parse Entities & Intent from Query
        $parsedIntent = $this->parseQueryIntent($normalizedQuery);

        // If no recognizable entities or keywords found
        if (empty($parsedIntent['company_ids']) && 
            empty($parsedIntent['doc_types']) && 
            empty($parsedIntent['stamp_values']) && 
            empty($parsedIntent['keywords']) && 
            !$companyId && !$folderId) {
            return [
                'query' => $rawQuery,
                'intent' => $parsedIntent,
                'documents' => collect([]),
                'total' => 0,
                'disambiguation_required' => false,
                'disambiguation_data' => null,
                'suggestions' => $this->generateSuggestions($normalizedQuery),
            ];
        }

        // 2. Perform deep search query
        $queryBuilder = Document::query()->with(['company', 'folder']);
        $hasAnyFilter = false;

        if ($companyId) {
            $queryBuilder->where('company_id', $companyId);
            $hasAnyFilter = true;
        }

        if ($folderId) {
            $queryBuilder->where('folder_id', $folderId);
            $hasAnyFilter = true;
        }

        // Apply filters derived from intent
        if (!empty($parsedIntent['company_ids'])) {
            $queryBuilder->whereIn('company_id', $parsedIntent['company_ids']);
            $hasAnyFilter = true;
        }

        if (!empty($parsedIntent['doc_types'])) {
            $queryBuilder->whereIn('doc_type', $parsedIntent['doc_types']);
            $hasAnyFilter = true;
        }

        if (!empty($parsedIntent['stamp_values'])) {
            $queryBuilder->whereIn('stamp_value', $parsedIntent['stamp_values']);
            $hasAnyFilter = true;
        }

        // Deep content matching & title matching
        $searchTerms = $parsedIntent['keywords'];
        if (!empty($searchTerms)) {
            $hasAnyFilter = true;
            $queryBuilder->where(function (Builder $q) use ($searchTerms) {
                foreach ($searchTerms as $term) {
                    if (mb_strlen($term) < 2) continue;
                    $q->orWhere('title', 'LIKE', "%{$term}%")
                      ->orWhere('original_filename', 'LIKE', "%{$term}%")
                      ->orWhere('search_keywords', 'LIKE', "%{$term}%")
                      ->orWhere('ocr_text', 'LIKE', "%{$term}%")
                      ->orWhereHas('company', function ($cq) use ($term) {
                          $cq->where('name', 'LIKE', "%{$term}%");
                      });
                }
            });
        }

        if (!$hasAnyFilter) {
            return [
                'query' => $rawQuery,
                'intent' => $parsedIntent,
                'documents' => collect([]),
                'total' => 0,
                'disambiguation_required' => false,
                'disambiguation_data' => null,
                'suggestions' => $this->generateSuggestions($normalizedQuery),
            ];
        }

        $results = $queryBuilder->limit(20)->get();

        // 3. Check for Disambiguation (e.g., user asks for "geda document" and there are multiple companies)
        $disambiguation = $this->checkDisambiguation($parsedIntent, $results);

        // 4. Generate Suggestions if no exact match found
        $suggestions = [];
        if ($results->isEmpty()) {
            $suggestions = $this->generateSuggestions($normalizedQuery);
        }

        return [
            'query' => $rawQuery,
            'intent' => $parsedIntent,
            'documents' => $results,
            'total' => $results->count(),
            'disambiguation_required' => $disambiguation['required'],
            'disambiguation_data' => $disambiguation['data'],
            'suggestions' => $suggestions,
        ];
    }

    /**
     * Parse Gujarati/English mixed query for companies, doc types, stamp amounts, and person names
     */
    public function parseQueryIntent(string $query): array
    {
        $q = mb_strtolower($query);
        $foundCompanyIds = [];
        $foundDocTypes = [];
        $foundStampValues = [];
        $keywords = [];

        // 1. Identify Companies / Persons in query
        $allCompanies = Company::all();
        foreach ($allCompanies as $comp) {
            $match = false;
            $compNameLower = mb_strtolower($comp->name);

            if (str_contains($q, $compNameLower) || str_contains($q, Str::slug($comp->name, ' '))) {
                $match = true;
            } else {
                // Check aliases
                $aliases = (array) $comp->aliases;
                foreach ($aliases as $alias) {
                    if (!empty($alias) && str_contains($q, mb_strtolower($alias))) {
                        $match = true;
                        break;
                    }
                }
            }

            if ($match) {
                $foundCompanyIds[] = $comp->id;
            }
        }

        // 2. Identify Document Types
        $typePatterns = [
            'aadhaar' => ['aadhaar', 'aadhar', 'adhar', 'આધાર', 'uidai'],
            'pan' => ['pan', 'pancard', 'pan card', 'પાનકાર્ડ', 'પાન'],
            'gst' => ['gst', 'gstin', 'gst registration', 'જીએસટી'],
            'udyam' => ['udyam', 'msme', 'ઉદ્યમ', 'ઉદ્યોગ આધાર'],
            'stamp' => ['stamp', 'stemp', 'સ્ટેમ્પ', 'agreement', 'કરાર', 'બાંયધરી'],
            'geda' => ['geda', 'ગેડા', 'geda document', 'geda letter'],
            'lightbill' => ['lightbill', 'light bill', 'લાઈટબિલ', 'વીજળી બિલ', 'pgvcl', 'ugvcl', 'mgvcl', 'dgvcl'],
            'rc_book' => ['rc book', 'rc', 'આરસી બુક', 'vehicle rc'],
        ];

        foreach ($typePatterns as $type => $patterns) {
            foreach ($patterns as $pat) {
                if (preg_match('/\b' . preg_quote($pat, '/') . '\b/u', $q) || str_contains($q, $pat)) {
                    $foundDocTypes[] = $type;
                    break;
                }
            }
        }

        // 3. Identify Stamp Values (300, 500, 100, etc.)
        if (preg_match_all('/(?:rs\.?|₹|રૂ\.?|stemp|stamp)?\s*(\d{2,5})\s*(?:rs\.?|₹|રૂ\.?|stemp|stamp|વાળો)?/iu', $q, $stampMatches)) {
            foreach ($stampMatches[1] as $num) {
                $val = (float) $num;
                if (in_array($val, [50, 100, 200, 300, 500, 1000, 2000, 5000])) {
                    $foundStampValues[] = $val;
                }
            }
        }

        // Stop words list in Gujarati / English
        $stopWords = [
            'apo', 'api', 'dyo', 'de', 'joye', 'che', 'mane', 'and', 'ma', 'je', 'hat', 
            'hato', 'karyo', 'karyo_hat', 'su', 'kay', 'pan', 'biju', 'nathi', 'aaj', 'aaje',
            'tamaru', 'nam', 'tamaro', 'shu', 'shun', 'kahe', 'bol', 'bolo', 'hello', 'hi',
            'kem', 'cho', 'chho', 'khatam', 'the', 'is', 'are', 'give', 'me', 'please'
        ];

        // 4. Tokenize remaining query into keywords
        $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $q);
        $words = array_filter(explode(' ', $clean), function ($w) use ($stopWords) {
            $trimmed = trim($w);
            return mb_strlen($trimmed) > 1 && !in_array($trimmed, $stopWords);
        });

        return [
            'company_ids' => array_unique($foundCompanyIds),
            'doc_types' => array_unique($foundDocTypes),
            'stamp_values' => array_unique($foundStampValues),
            'keywords' => array_values(array_unique($words)),
        ];
    }

    /**
     * Disambiguation: Detect when query is ambiguous across companies (e.g. "GEDA doc" or "PAN card" without company specified)
     */
    protected function checkDisambiguation(array $intent, Collection $results): array
    {
        if (empty($intent['company_ids']) && !empty($intent['doc_types']) && $results->count() > 1) {
            $uniqueCompanies = $results->pluck('company')->filter()->unique('id');

            if ($uniqueCompanies->count() > 1) {
                return [
                    'required' => true,
                    'data' => [
                        'doc_type' => $intent['doc_types'][0],
                        'companies' => $uniqueCompanies->map(function ($comp) use ($intent) {
                            return [
                                'id' => $comp->id,
                                'name' => $comp->name,
                                'query' => $comp->name . ' ' . $intent['doc_types'][0],
                            ];
                        })->values(),
                    ]
                ];
            }
        }

        return ['required' => false, 'data' => null];
    }

    /**
     * Generate smart suggestions based on popular doc types and company names
     */
    protected function generateSuggestions(string $query): array
    {
        $suggestions = [];
        $companies = Company::take(5)->get();

        foreach ($companies as $comp) {
            $suggestions[] = [
                'title' => $comp->name . ' - PAN Card',
                'query' => $comp->name . ' PAN Card',
            ];
            $suggestions[] = [
                'title' => $comp->name . ' - GST Certificate',
                'query' => $comp->name . ' GST',
            ];
            $suggestions[] = [
                'title' => $comp->name . ' - ₹300 Stamp Paper',
                'query' => $comp->name . ' 300 Stamp',
            ];
        }

        return array_slice($suggestions, 0, 6);
    }
}
