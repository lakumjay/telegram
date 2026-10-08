<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/miniapp', function () {
    return view('welcome'); // React handles miniapp mode based on pathname or window.Telegram.WebApp
});

Route::get('/voice-test', function () {
    return view('welcome'); // Standalone Voice Test Page (No tools, no Telegram)
});
