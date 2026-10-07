<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use App\Services\TelegramBotService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TelegramBotPollCommand extends Command
{
    protected $signature = 'bot:poll';
    protected $description = 'Run Telegram Bot in Long Polling mode for local testing';

    public function handle(TelegramBotService $botService)
    {
        $token = SystemSetting::get('telegram_bot_token', env('TELEGRAM_BOT_TOKEN'));

        if (!$token) {
            $this->error('Telegram Bot Token not configured! Please set TELEGRAM_BOT_TOKEN in .env or via Web Dashboard Settings.');
            return 1;
        }

        $this->info("🚀 Starting Telegram Bot polling (Token: " . substr($token, 0, 8) . "...)...");
        $this->info("Press Ctrl+C to stop.");

        $offset = 0;

        while (true) {
            try {
                $response = Http::timeout(40)->get("https://api.telegram.org/bot{$token}/getUpdates", [
                    'offset' => $offset,
                    'timeout' => 30,
                ]);

                if ($response->successful()) {
                    $updates = $response->json()['result'] ?? [];

                    foreach ($updates as $update) {
                        $offset = $update['update_id'] + 1;
                        $this->line("📩 Processing Update #{$update['update_id']}");
                        $res = $botService->handleUpdate($update);
                        $this->info("✅ Handled: " . json_encode($res));
                    }
                }
            } catch (\Throwable $e) {
                $this->warn("Polling warning: " . $e->getMessage());
                sleep(2);
            }

            usleep(500000); // 0.5s pause
        }
    }
}
