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
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('logo_url')->nullable()->after('name');
            $table->string('qualification')->nullable()->default('MBBS, MD')->after('specialization');
            $table->string('registration_number')->nullable()->after('qualification');
            $table->text('clinic_address')->nullable()->after('city');
            $table->string('email')->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn([
                'logo_url',
                'qualification',
                'registration_number',
                'clinic_address',
                'email',
            ]);
        });
    }
};
