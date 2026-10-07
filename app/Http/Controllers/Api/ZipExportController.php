<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ZipExport;
use App\Services\ZipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZipExportController extends Controller
{
    protected ZipService $zipService;

    public function __construct(ZipService $zipService)
    {
        $this->zipService = $zipService;
    }

    /**
     * Create ZIP archive on demand from document IDs
     */
    public function create(Request $request): JsonResponse
    {
        $request->validate([
            'document_ids' => 'required|array|min:1',
            'document_ids.*' => 'exists:documents,id',
            'mode' => 'nullable|string|in:single_master_zip,separate_company_zips',
        ]);

        $mode = $request->input('mode', 'single_master_zip');
        $result = $this->zipService->createZipFromDocuments($request->document_ids, $mode);

        return response()->json($result);
    }

    /**
     * Download generated ZIP archive
     */
    public function download(int $id)
    {
        $export = ZipExport::findOrFail($id);
        $filePath = storage_path('app/' . $export->file_path);

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'ZIP file expired or not found'], 404);
        }

        return response()->download($filePath, $export->file_name);
    }
}
