<?php

use App\Http\Controllers\Api\ClinicAccountsController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TelegramUserController;
use App\Http\Controllers\Api\TelegramWebhookController;
use App\Http\Controllers\Api\VoiceAgentController;
use App\Http\Controllers\Api\ZipExportController;
use Illuminate\Support\Facades\Route;

// 1. Documents API
Route::prefix('documents')->group(function () {
    Route::get('/', [DocumentController::class, 'index']);
    Route::post('/', [DocumentController::class, 'store']);
    Route::get('/stats', [DocumentController::class, 'stats']);
    Route::get('/{id}', [DocumentController::class, 'show']);
    Route::get('/{id}/download', [DocumentController::class, 'download']);
    Route::post('/{id}/rename', [DocumentController::class, 'rename']);
    Route::post('/{id}/move-or-copy', [DocumentController::class, 'moveOrCopy']);
    Route::post('/{id}/share-telegram', [DocumentController::class, 'shareToTelegram']);
    Route::delete('/{id}', [DocumentController::class, 'destroy']);
});

// 2. Companies & Folders API
Route::prefix('companies')->group(function () {
    Route::get('/', [CompanyController::class, 'index']);
    Route::post('/', [CompanyController::class, 'store']);
    Route::delete('/{id}', [CompanyController::class, 'destroyCompany']);
});
Route::post('/folders', [CompanyController::class, 'storeFolder']);
Route::delete('/folders/{id}', [CompanyController::class, 'destroyFolder']);

// 3. AI Voice Agent API
Route::prefix('voice')->group(function () {
    Route::post('/talk', [VoiceAgentController::class, 'talk']);
    Route::get('/tts', [VoiceAgentController::class, 'textToSpeech']);
    Route::post('/transcribe', [VoiceAgentController::class, 'transcribeAudio']);
    Route::get('/config', [VoiceAgentController::class, 'getConfig'])->middleware('throttle:30,1');
    Route::post('/get-document', [VoiceAgentController::class, 'getDocumentForTelegram'])->middleware('throttle:10,1');
    Route::post('/query-content', [VoiceAgentController::class, 'queryDocumentContent'])->middleware('throttle:30,1');
    Route::post('/analyze-risk', [VoiceAgentController::class, 'analyzeDocumentRisk'])->middleware('throttle:15,1');
    Route::post('/draft-document', [VoiceAgentController::class, 'draftDocument'])->middleware('throttle:10,1');
    Route::post('/patient-history', [VoiceAgentController::class, 'getPatientHistory'])->middleware('throttle:30,1');
    Route::post('/clinic-daily-accounts', [VoiceAgentController::class, 'getClinicDailyAccounts'])->middleware('throttle:30,1');
});

// 4. ZIP Archive API
Route::prefix('zip')->group(function () {
    Route::post('/create', [ZipExportController::class, 'create']);
    Route::get('/{id}/download', [ZipExportController::class, 'download']);
});

// 5. Telegram Bot & Webhook
Route::prefix('telegram')->group(function () {
    Route::post('/webhook', [TelegramWebhookController::class, 'handle']);
    Route::post('/set-webhook', [TelegramWebhookController::class, 'setWebhook']);
    Route::post('/simulate', [TelegramWebhookController::class, 'simulate']);
    Route::get('/users', [TelegramUserController::class, 'index']);
    Route::post('/users', [TelegramUserController::class, 'store']);
    Route::post('/users/{id}/toggle-auth', [TelegramUserController::class, 'toggleAuth']);
    Route::delete('/users/{id}', [TelegramUserController::class, 'destroy']);
});

// 6. Settings
Route::prefix('settings')->group(function () {
    Route::get('/', [SettingController::class, 'index']);
    Route::post('/', [SettingController::class, 'update']);
});

// 7. Doctor & Clinic Patients API (Ultra-Fast Search & OCR Records)
Route::prefix('patients')->group(function () {
    Route::get('/search', [PatientController::class, 'search'])->middleware('throttle:120,1');
    Route::get('/', [PatientController::class, 'index']);
    Route::post('/upload-prescription', [PatientController::class, 'uploadPrescription']);
    Route::get('/{id}', [PatientController::class, 'show']);
    Route::post('/{id}', [PatientController::class, 'update']);
    Route::delete('/{id}', [PatientController::class, 'destroy']);
});

// 8. Multi-Clinic Accounts, Daily Billing, Medicine Stock & Expenses
Route::prefix('clinic-accounts')->group(function () {
    Route::get('/clinics', [ClinicAccountsController::class, 'getClinics']);
    Route::get('/summary', [ClinicAccountsController::class, 'getFinancialSummary']);
    Route::post('/bills', [ClinicAccountsController::class, 'storeBill']);
    Route::post('/expenses', [ClinicAccountsController::class, 'storeExpense']);
    Route::get('/medicines', [ClinicAccountsController::class, 'getMedicines']);
    Route::post('/medicines', [ClinicAccountsController::class, 'storeMedicine']);
});


