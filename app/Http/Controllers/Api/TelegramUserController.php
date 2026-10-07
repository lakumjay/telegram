<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramUserController extends Controller
{
    /**
     * List all telegram users
     */
    public function index(): JsonResponse
    {
        $users = TelegramUser::latest()->get();

        return response()->json([
            'success' => true,
            'users' => $users,
        ]);
    }

    /**
     * Store / Whitelist a user manually
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'telegram_id' => 'required|numeric|unique:telegram_users,telegram_id',
            'first_name' => 'required|string|max:255',
            'role' => 'nullable|string|in:admin,manager,user',
            'is_authorized' => 'nullable|boolean',
            'access_pin' => 'nullable|string',
        ]);

        $validated['is_authorized'] = $request->input('is_authorized', true);
        $user = TelegramUser::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Telegram user whitelisted successfully',
            'user' => $user,
        ], 201);
    }

    /**
     * Toggle authorization status
     */
    public function toggleAuth(int $id): JsonResponse
    {
        $user = TelegramUser::findOrFail($id);
        $user->update(['is_authorized' => !$user->is_authorized]);

        return response()->json([
            'success' => true,
            'message' => $user->is_authorized ? 'User authorized successfully' : 'User access revoked',
            'user' => $user,
        ]);
    }

    /**
     * Delete user
     */
    public function destroy(int $id): JsonResponse
    {
        $user = TelegramUser::findOrFail($id);
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User removed',
        ]);
    }
}
