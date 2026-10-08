<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get system settings
     */
    public function index(): JsonResponse
    {
        $hasGemini = !empty(SystemSetting::get('gemini_api_key', env('GEMINI_API_KEY', '')));
        $hasGroq = !empty(SystemSetting::get('groq_api_key', env('GROQ_API_KEY', '')));
        $hasBot = !empty(SystemSetting::get('telegram_bot_token', env('TELEGRAM_BOT_TOKEN', '')));

        return response()->json([
            'success' => true,
            'settings' => [
                'telegram_bot_token' => $hasBot ? '••••••••' : '',
                'bot_username' => SystemSetting::get('bot_username', 'MyDocAssistantBot'),
                'whitelist_enabled' => SystemSetting::get('whitelist_enabled', true),
                'master_security_pin' => SystemSetting::get('master_security_pin', '123456'),
                'groq_api_key' => $hasGroq ? '••••••••' : '',
                'gemini_api_key' => $hasGemini ? '••••••••' : '',
            ]
        ]);
    }

    /**
     * Save settings
     */
    public function update(Request $request): JsonResponse
    {
        $settings = $request->only([
            'telegram_bot_token',
            'bot_username',
            'whitelist_enabled',
            'master_security_pin',
            'groq_api_key',
            'gemini_api_key',
        ]);

        foreach ($settings as $key => $value) {
            $type = is_bool($value) ? 'boolean' : 'string';
            SystemSetting::set($key, $value, $type);
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings saved successfully',
        ]);
    }
}
