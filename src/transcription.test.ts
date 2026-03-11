import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./env.js', () => ({
  readEnvFile: vi.fn(() => ({ OPENAI_API_KEY: 'test-key' })),
}));

vi.mock('./logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { transcribeAudio } from './transcription.js';

describe('transcribeAudio', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it('returns transcript on success', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: ' Hello world ' }),
    } as Response);

    const result = await transcribeAudio(Buffer.from('fake-audio'));

    expect(result).toBe('Hello world');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-key' },
      }),
    );
  });

  it('returns null on API error', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as Response);

    const result = await transcribeAudio(Buffer.from('fake'));
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network'));

    const result = await transcribeAudio(Buffer.from('fake'));
    expect(result).toBeNull();
  });

  it('returns null when API returns empty text', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: '  ' }),
    } as Response);

    const result = await transcribeAudio(Buffer.from('fake'));
    expect(result).toBeNull();
  });

  it('returns null when no API key is set', async () => {
    const { readEnvFile } = await import('./env.js');
    (readEnvFile as any).mockReturnValueOnce({});
    delete process.env.OPENAI_API_KEY;

    const result = await transcribeAudio(Buffer.from('fake'));
    expect(result).toBeNull();
  });

  it('uses provided filename', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'test' }),
    } as Response);

    await transcribeAudio(Buffer.from('fake'), 'audio.mp3');

    const body = fetchSpy.mock.calls[0][1]!.body as FormData;
    const file = body.get('file') as File;
    expect(file.name).toBe('audio.mp3');
  });
});
