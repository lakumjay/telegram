<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('clinics')) {
            Schema::table('clinics', function (Blueprint $table) {
                if (!Schema::hasColumn('clinics', 'telegram_username')) {
                    $table->string('telegram_username')->nullable()->after('email');
                }
                if (!Schema::hasColumn('clinics', 'status')) {
                    $table->string('status')->default('active')->after('telegram_username');
                }
            });
        }

        if (Schema::hasTable('telegram_users')) {
            Schema::table('telegram_users', function (Blueprint $table) {
                if (!Schema::hasColumn('telegram_users', 'clinic_id')) {
                    $table->unsignedBigInteger('clinic_id')->nullable()->after('id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('clinics')) {
            Schema::table('clinics', function (Blueprint $table) {
                if (Schema::hasColumn('clinics', 'telegram_username')) {
                    $table->dropColumn('telegram_username');
                }
                if (Schema::hasColumn('clinics', 'status')) {
                    $table->dropColumn('status');
                }
            });
        }

        if (Schema::hasTable('telegram_users')) {
            Schema::table('telegram_users', function (Blueprint $table) {
                if (Schema::hasColumn('telegram_users', 'clinic_id')) {
                    $table->dropColumn('clinic_id');
                }
            });
        }
    }
};
