<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramUser extends Model
{
    protected $fillable = [
        'telegram_id',
        'clinic_id',
        'first_name',
        'last_name',
        'username',
        'phone_number',
        'is_authorized',
        'role',
        'access_pin',
        'last_interaction_at',
        'session_state',
    ];

    protected $casts = [
        'is_authorized' => 'boolean',
        'session_state' => 'array',
        'last_interaction_at' => 'datetime',
        'clinic_id' => 'integer',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function voiceCallLogs(): HasMany
    {
        return $this->hasMany(VoiceCallLog::class);
    }
}
