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
        // 1. Telegram Users (Access Control & Whitelisting)
        Schema::create('telegram_users', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('telegram_id')->unique()->index();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('username')->nullable();
            $table->string('phone_number')->nullable();
            $table->boolean('is_authorized')->default(false)->index();
            $table->string('role')->default('user'); // admin, manager, user
            $table->string('access_pin')->nullable();
            $table->timestamp('last_interaction_at')->nullable();
            $table->json('session_state')->nullable();
            $table->timestamps();
        });

        // 2. Companies / Entities / Persons
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index(); // e.g. Rajeshwari Solar, Sunrise Green, Test Vyakti
            $table->string('slug')->unique();
            $table->string('type')->default('company'); // company, person, firm, partnership
            $table->string('owner_name')->nullable();
            $table->string('pan_number')->nullable()->index();
            $table->string('gst_number')->nullable()->index();
            $table->json('aliases')->nullable(); // Multi-language aliases and shortcuts
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 3. Folders (Hierarchical / Categorical)
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->string('name'); // e.g. "Tax & GST", "Legal Stamp Papers", "KYC & Identity"
            $table->string('slug');
            $table->string('color')->default('#3b82f6');
            $table->timestamps();
        });

        // 4. Documents (with Full Deep OCR Text & Metadata)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->string('title')->index();
            $table->string('doc_type')->default('other')->index(); // aadhaar, pan, gst, udyam, stamp, geda, lightbill, rc_book, agreement, cheque, etc.
            $table->string('original_filename');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type')->default('application/pdf');
            $table->integer('page_count')->default(1);
            $table->decimal('stamp_value', 12, 2)->nullable()->index(); // e.g. 300.00, 500.00
            $table->json('parties')->nullable(); // e.g. ["Rajeshwari Solar", "Test Vyakti"]
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable()->index();
            $table->string('ocr_status')->default('completed'); // pending, processing, completed, failed
            $table->longText('ocr_text')->nullable(); // Deep OCR Extracted Text for Content Search
            $table->text('search_keywords')->nullable(); // Gujarati, English, Phonetic keywords
            $table->json('metadata')->nullable(); // Extra key-value pairs (certificate no, etc.)
            $table->timestamps();
        });

        // 5. Voice Call Logs & Sessions
        Schema::create('voice_call_logs', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            $table->foreignId('telegram_user_id')->nullable()->constrained('telegram_users')->nullOnDelete();
            $table->longText('transcript')->nullable();
            $table->json('extracted_intent')->nullable();
            $table->json('requested_documents')->nullable();
            $table->string('status')->default('active'); // active, waiting_confirmation, confirmed, rejected, completed
            $table->text('ai_response_text')->nullable();
            $table->timestamps();
        });

        // 6. Zip Exports
        Schema::create('zip_exports', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->index();
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->json('companies_included')->nullable();
            $table->integer('documents_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 7. System Settings (API Keys, Whitelist Toggle, Bot Token)
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, boolean, json, encrypted
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('zip_exports');
        Schema::dropIfExists('voice_call_logs');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('folders');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('telegram_users');
    }
};
