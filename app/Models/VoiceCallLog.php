<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoiceCallLog extends Model
{
    protected $fillable = [
        'session_id',
        'telegram_user_id',
        'transcript',
        'extracted_intent',
        'requested_documents',
        'status',
        'ai_response_text',
    ];

    protected $casts = [
        'extracted_intent' => 'array',
        'requested_documents' => 'array',
    ];

    public function telegramUser(): BelongsTo
    {
        return $this->belongsTo(TelegramUser::class);
    }
}
