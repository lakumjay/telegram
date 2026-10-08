<?php

use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DocumentController;
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
    Route::delete('/{id}', [DocumentController::class, 'destroy']);
});

// 2. Companies & Folders API
Route::prefix('companies')->group(function () {
    Route::get('/', [CompanyController::class, 'index']);
    Route::post('/', [CompanyController::class, 'store']);
});
Route::post('/folders', [CompanyController::class, 'storeFolder']);

// 3. AI Voice Agent API
Route::prefix('voice')->group(function () {
    Route::post('/talk', [VoiceAgentController::class, 'talk']);
    Route::get('/tts', [VoiceAgentController::class, 'textToSpeech']);
    Route::post('/transcribe', [VoiceAgentController::class, 'transcribeAudio']);
    Route::get('/config', [VoiceAgentController::class, 'getConfig'])->middleware('throttle:30,1');
    Route::post('/get-document', [VoiceAgentController::class, 'getDocumentForTelegram'])->middleware('throttle:10,1');
    Route::post('/query-content', [VoiceAgentController::class, 'queryDocumentContent'])->middleware('throttle:30,1');
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
