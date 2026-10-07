#!/usr/bin/env python3
import sys
import asyncio
import os
import hashlib
import edge_tts

# Voice mapping: Sneha -> High-clarity Indian regional female voice
VOICE_GU = "gu-IN-DhwaniNeural"
VOICE_HI = "hi-IN-SwaraNeural"

async def generate_speech(text, output_file, voice=VOICE_GU, rate="+10%", pitch="+2Hz"):
    # Clean text of markdown characters
    clean_text = text.replace('*', '').replace('_', '').replace('`', '').replace('#', '').strip()
    if not clean_text:
        return False

    communicate = edge_tts.Communicate(clean_text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_file)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 sneha_tts.py <text> <output_file> [lang]")
        sys.exit(1)

    text_input = sys.argv[1]
    out_path = sys.argv[2]
    lang_input = sys.argv[3] if len(sys.argv) > 3 else "gu"

    selected_voice = VOICE_HI if lang_input in ["hi", "hindi"] else VOICE_GU

    # Ensure parent dir exists
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

    try:
        asyncio.run(generate_speech(text_input, out_path, selected_voice))
        print("OK")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
