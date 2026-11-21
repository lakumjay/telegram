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
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'opd_number')) {
                $table->string('opd_number', 50)->nullable()->after('name');
            }
            if (!Schema::hasColumn('patients', 'address')) {
                $table->text('address')->nullable()->after('city');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'opd_number')) {
                $table->dropColumn('opd_number');
            }
            if (Schema::hasColumn('patients', 'address')) {
                $table->dropColumn('address');
            }
        });
    }
};

