import { readEnvFile } from './env.js';
import { logger } from './logger.js';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

function getApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY || readEnvFile(['OPENAI_API_KEY']).OPENAI_API_KEY
  );
}

/**
 * Transcribe audio using OpenAI Whisper.
 * Returns the transcript text, or null on failure.
 */
export async function transcribeAudio(
  audio: Buffer,
  filename = 'voice.ogg',
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug('OPENAI_API_KEY not set, skipping transcription');
    return null;
  }

  const form = new FormData();
  form.append('file', new Blob([audio]), filename);
  form.append('model', 'whisper-1');

  try {
    const res = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body }, 'Whisper API error');
      return null;
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    if (text) {
      logger.info({ chars: text.length }, 'Transcribed voice message');
    }
    return text || null;
  } catch (err) {
    logger.warn({ err }, 'Whisper transcription failed');
    return null;
  }
}
