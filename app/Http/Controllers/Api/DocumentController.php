<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Document;
use App\Services\DeepSearchService;
use App\Services\OcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    protected DeepSearchService $searchService;
    protected OcrService $ocrService;

    public function __construct(DeepSearchService $searchService, OcrService $ocrService)
    {
        $this->searchService = $searchService;
        $this->ocrService = $ocrService;
    }

    /**
     * List documents with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = Document::with(['company', 'folder'])->latest();

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('folder_id')) {
            $query->where('folder_id', $request->folder_id);
        }

        if ($request->filled('doc_type')) {
            $query->where('doc_type', $request->doc_type);
        }

        if ($request->filled('search')) {
            $searchRes = $this->searchService->search(
                $request->search,
                $request->company_id ? (int)$request->company_id : null,
                $request->folder_id ? (int)$request->folder_id : null
            );

            return response()->json([
                'success' => true,
                'data' => $searchRes['documents'],
                'intent' => $searchRes['intent'],
                'disambiguation_required' => $searchRes['disambiguation_required'],
                'disambiguation_data' => $searchRes['disambiguation_data'],
                'suggestions' => $searchRes['suggestions'],
                'total' => $searchRes['total'],
            ]);
        }

        $documents = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $documents->items(),
            'total' => $documents->total(),
            'current_page' => $documents->currentPage(),
            'last_page' => $documents->lastPage(),
        ]);
    }

    /**
     * Upload Document & Run OCR
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB
            'company_id' => 'nullable|exists:companies,id',
            'folder_id' => 'nullable|exists:folders,id',
            'title' => 'nullable|string|max:255',
            'doc_type' => 'nullable|string|max:50',
        ]);

        $file = $request->file('file');
        $originalFilename = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType();
        $fileSize = $file->getSize();

        $storagePath = $file->store('documents', 'local');
        $absolutePath = storage_path('app/' . $storagePath);

        $title = $request->input('title') ?: pathinfo($originalFilename, PATHINFO_FILENAME);
        $docType = $request->input('doc_type', 'other');

        $document = Document::create([
            'company_id' => $request->company_id,
            'folder_id' => $request->folder_id,
            'title' => $title,
            'doc_type' => $docType,
            'original_filename' => $originalFilename,
            'file_path' => $storagePath,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'ocr_status' => 'processing',
        ]);

        // Run OCR and metadata extraction
        $this->ocrService->processDocument($document, $absolutePath);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded and indexed successfully!',
            'document' => $document->fresh(['company', 'folder']),
        ], 201);
    }

    /**
     * Show single document
     */
    public function show(int $id): JsonResponse
    {
        $document = Document::with(['company', 'folder'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'document' => $document,
        ]);
    }

    /**
     * Download Document
     */
    public function download(int $id)
    {
        $document = Document::findOrFail($id);
        $filePath = storage_path('app/' . $document->file_path);

        if (file_exists($filePath)) {
            return response()->download($filePath, $document->original_filename);
        }

        // Demo fallback text preview
        return response("Document: {$document->title}\nCompany: " . ($document->company?->name ?? 'N/A') . "\n\nOCR Content:\n{$document->ocr_text}", 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'inline; filename="' . Str::slug($document->title) . '.txt"',
        ]);
    }

    /**
     * Delete Document
     */
    public function destroy(int $id): JsonResponse
    {
        $document = Document::findOrFail($id);
        $filePath = storage_path('app/' . $document->file_path);
        if (file_exists($filePath)) {
            @unlink($filePath);
        }

        $document->delete();

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully',
        ]);
    }

    /**
     * Move or Copy Document between companies or folders
     */
    public function moveOrCopy(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:move,copy',
            'target_company_id' => 'required|exists:companies,id',
            'target_folder_id' => 'nullable|exists:folders,id',
        ]);

        $doc = Document::findOrFail($id);
        $action = $request->input('action');
        $targetCompanyId = $request->input('target_company_id');
        $targetFolderId = $request->input('target_folder_id');

        if ($action === 'move') {
            $doc->update([
                'company_id' => $targetCompanyId,
                'folder_id' => $targetFolderId,
            ]);
            return response()->json([
                'success' => true,
                'message' => 'દસ્તાવેજ સફળતાપૂર્વક ખસેડવામાં (Move) આવ્યો છે.',
                'document' => $doc->fresh(['company', 'folder']),
            ]);
        } else {
            // Copy
            $copyDoc = $doc->replicate();
            $copyDoc->company_id = $targetCompanyId;
            $copyDoc->folder_id = $targetFolderId;
            $copyDoc->title = $doc->title . ' (Copy)';
            $copyDoc->save();

            // Duplicate pages in document_pages
            foreach ($doc->pages as $page) {
                $copyPage = $page->replicate();
                $copyPage->document_id = $copyDoc->id;
                $copyPage->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'દસ્તાવેજની સફળતાપૂર્વક નકલ (Copy) કરવામાં આવી છે.',
                'document' => $copyDoc->fresh(['company', 'folder']),
            ]);
        }
    }

    /**
     * Direct Share Document to Telegram Chat
     */
    public function shareToTelegram(Request $request, int $id): JsonResponse
    {
        $doc = Document::with('company')->findOrFail($id);
        $telegramBot = app(\App\Services\TelegramBotService::class);

        // Find authorized telegram user
        $telegramUser = \App\Models\TelegramUser::where('is_authorized', true)->latest('id')->first()
                     ?: \App\Models\TelegramUser::latest('id')->first();

        if (!$telegramUser) {
            return response()->json([
                'success' => false,
                'message' => 'કોઈ અધિકૃત ટેલિગ્રામ યુઝર મળ્યો નથી.',
            ], 404);
        }

        $filePath = storage_path('app/' . $doc->file_path);
        if (!file_exists($filePath)) {
            $filePath = storage_path('app/private/' . $doc->file_path);
        }

        if (file_exists($filePath)) {
            $caption = "📄 *દસ્તાવેજ શેર કર્યો:* {$doc->title}\n🏢 *કંપની:* " . ($doc->company?->name ?? 'જનરલ');
            $telegramBot->sendDocument($telegramUser->telegram_id, $filePath, $caption, $doc->original_filename);

            return response()->json([
                'success' => true,
                'message' => "દસ્તાવેજ સફળતાપૂર્વક ટેલિગ્રામમાં મોકલી દીધો!",
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'દસ્તાવેજની ફાઈલ સર્વર પર મળી નથી.',
        ], 404);
    }

    /**
     * Dashboard statistics
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_documents' => Document::count(),
            'total_companies' => Company::count(),
            'total_ocr_indexed' => Document::where('ocr_status', 'completed')->count(),
            'stamp_papers_count' => Document::where('doc_type', 'stamp')->count(),
            'gst_documents_count' => Document::where('doc_type', 'gst')->count(),
            'pan_documents_count' => Document::where('doc_type', 'pan')->count(),
        ]);
    }
}
