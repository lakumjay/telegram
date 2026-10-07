<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\TelegramBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    protected TelegramBotService $botService;

    public function __construct(TelegramBotService $botService)
    {
        $this->botService = $botService;
    }

    /**
     * Webhook endpoint from Telegram
     */
    public function handle(Request $request): JsonResponse
    {
        $update = $request->all();
        Log::info('Telegram Webhook received', ['update_id' => $update['update_id'] ?? null]);

        $result = $this->botService->handleUpdate($update);

        return response()->json(['ok' => true, 'result' => $result]);
    }

    /**
     * Set Webhook URL to Telegram
     */
    public function setWebhook(Request $request): JsonResponse
    {
        $webhookUrl = $request->input('url', url('/api/telegram/webhook'));
        $token = SystemSetting::get('telegram_bot_token', env('TELEGRAM_BOT_TOKEN'));

        if (!$token) {
            return response()->json(['success' => false, 'message' => 'Telegram Bot Token not configured'], 400);
        }

        $res = Http::post("https://api.telegram.org/bot{$token}/setWebhook", [
            'url' => $webhookUrl,
            'allowed_updates' => ['message', 'callback_query'],
        ])->json();

        return response()->json([
            'success' => $res['ok'] ?? false,
            'telegram_response' => $res,
        ]);
    }

    /**
     * Test / Simulate bot message from dashboard (Super handy for local testing without ngrok!)
     */
    public function simulate(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string',
            'telegram_id' => 'nullable|numeric',
            'first_name' => 'nullable|string',
        ]);

        $telegramId = $request->input('telegram_id', 999888777);
        $firstName = $request->input('first_name', 'Jay Admin');

        $fakeUpdate = [
            'update_id' => rand(100000, 999999),
            'message' => [
                'message_id' => rand(1000, 9999),
                'from' => [
                    'id' => $telegramId,
                    'is_bot' => false,
                    'first_name' => $firstName,
                    'username' => 'jay_admin',
                ],
                'chat' => [
                    'id' => $telegramId,
                    'type' => 'private',
                    'first_name' => $firstName,
                ],
                'date' => time(),
                'text' => $request->message,
            ]
        ];

        $res = $this->botService->handleUpdate($fakeUpdate);

        return response()->json([
            'success' => true,
            'simulated_update' => $fakeUpdate,
            'bot_result' => $res,
        ]);
    }
}
