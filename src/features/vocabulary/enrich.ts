import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {getRuntimeConfig} from '../../lib/runtime-config';
import type {NormalizedClip} from '../../providers/normalized-clip';

type TranslationResult = {
  ipa?: string;
  termTranslation: string;
  termTranslations?: string[];
  exampleTranslations: Array<{de: string; vi: string}>;
  error?: string;
};

const emptyTranslation = (examples: string[], error?: string): TranslationResult => ({
  ipa: '',
  termTranslation: '',
  termTranslations: [],
  exampleTranslations: examples.map((text) => ({de: text, vi: ''})),
  error,
});

const censorVietnameseProfanity = (text: string) => {
  const replacements: Array<[RegExp, string]> = [
    [/(?<![\p{L}\p{N}_])đéo(?![\p{L}\p{N}_])/giu, 'đ*o'],
    [/(?<![\p{L}\p{N}_])địt(?![\p{L}\p{N}_])/giu, 'đ*t'],
    [/(?<![\p{L}\p{N}_])đụ(?![\p{L}\p{N}_])/giu, 'đ*'],
    [/(?<![\p{L}\p{N}_])lồn(?![\p{L}\p{N}_])/giu, 'l*n'],
    [/(?<![\p{L}\p{N}_])cặc(?![\p{L}\p{N}_])/giu, 'c*c'],
    [/(?<![\p{L}\p{N}_])buồi(?![\p{L}\p{N}_])/giu, 'b*i'],
    [/(?<![\p{L}\p{N}_])đĩ(?![\p{L}\p{N}_])/giu, 'đ*'],
    [/(?<![\p{L}\p{N}_])đm(?![\p{L}\p{N}_])/giu, 'đ*m'],
    [/(?<![\p{L}\p{N}_])đmm(?![\p{L}\p{N}_])/giu, 'đ*m'],
    [/(?<![\p{L}\p{N}_])fuck(?![\p{L}\p{N}_])/giu, 'f*ck'],
    [/(?<![\p{L}\p{N}_])fucking(?![\p{L}\p{N}_])/giu, 'f*cking'],
    [/(?<![\p{L}\p{N}_])shit(?![\p{L}\p{N}_])/giu, 'sh*t'],
  ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
};

const normalizeTranslationResult = (result: TranslationResult, examples: string[]): TranslationResult => {
  const termTranslations = Array.isArray(result.termTranslations)
    ? result.termTranslations.map((item) => censorVietnameseProfanity(item.trim())).filter(Boolean).slice(0, 2)
    : [];
  const termTranslation =
    termTranslations.length > 0 ? termTranslations.join(' / ') : censorVietnameseProfanity(result.termTranslation?.trim() ?? '');

  return {
    ...result,
    termTranslations,
    termTranslation,
    exampleTranslations: examples.map((de, index) => ({
      de,
      vi: censorVietnameseProfanity(
        result.exampleTranslations?.find((item) => item.de === de)?.vi ??
        result.exampleTranslations?.[index]?.vi ??
        '',
      ),
    })),
  };
};

const run = (command: string, args: string[], options?: {cwd?: string}) =>
  new Promise<{stdout: string; stderr: string}>((resolve, reject) => {
    const child = spawn(command, args, {cwd: options?.cwd});
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({stdout, stderr});
      } else {
        reject(new Error(`${command} failed: ${stderr || stdout}`));
      }
    });
  });

export const getGermanIpa = async (term: string) => {
  try {
    const result = await run('espeak-ng', ['-q', '--ipa=3', '-v', 'de', term]);
    const ipa = result.stdout.replace(/\s+/g, ' ').trim();

    return ipa ? `/${ipa.replace(/^\/|\/$/g, '')}/` : '';
  } catch {
    return '';
  }
};

export const translateBlock = async (term: string, examples: string[]) => {
  const config = await getRuntimeConfig();

  if (!config.openaiApiKey) {
    return emptyTranslation(examples, 'OpenAI API key is not configured');
  }

  try {
    const openaiUrl = new URL('chat/completions', `${config.openaiUrl.replace(/\/+$/g, '')}/`);
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.openaiApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.2,
        response_format: {type: 'json_object'},
        messages: [
          {
            role: 'system',
            content:
              [
                'You help Vietnamese beginners learn German. Return strict JSON.',
                'Provide IPA for the German term or phrase.',
                'Translate naturally into Vietnamese, not word-by-word.',
                'For the term, return the 1 most common Vietnamese meaning, or 2 meanings if both are genuinely common and useful for beginners.',
                'Use short natural labels, for example "Xin chào / Chào buổi chiều" for "Guten Tag!".',
                'Do not include literal component translations unless they are also common meanings.',
                'Censor strong profanity in Vietnamese with a middle asterisk, for example "đ*o", "đ*t", "l*n"; keep the sentence natural.',
                'Translate examples as natural Vietnamese subtitles.',
              ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              schema: {
                ipa: '/German IPA/',
                termTranslations: ['most common Vietnamese meaning', 'optional second common meaning'],
                termTranslation: 'same meanings joined by " / "',
                exampleTranslations: [{de: 'German example', vi: 'natural Vietnamese translation'}],
              },
              term,
              examples,
            }),
          },
        ],
      }),
    });
    const payload = (await response.json()) as {
      choices?: Array<{message?: {content?: string}}>;
      error?: {message?: string};
    };

    if (!response.ok) {
      return emptyTranslation(examples, payload.error?.message ?? `OpenAI translation failed (${response.status})`);
    }

    const content = payload.choices?.[0]?.message?.content ?? '{}';
    return normalizeTranslationResult(JSON.parse(content) as TranslationResult, examples);
  } catch (error) {
    return emptyTranslation(examples, error instanceof Error ? error.message : 'OpenAI translation failed');
  }
};

const generateMacOsVoice = async (term: string, outputPath: string) => {
  const aiffPath = outputPath.replace(/\.mp3$/, '.aiff');

  await run('say', ['-v', 'Anna', '-o', aiffPath, term]);
  await run('ffmpeg', ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-q:a', '3', outputPath]);

  return pathToFileURL(outputPath).toString();
};

export const generateVoice = async (term: string, outputPath: string) => {
  const config = await getRuntimeConfig();
  const fallback = async (error?: string) => ({
    provider: 'macos' as const,
    url: await generateMacOsVoice(term, outputPath),
    error,
  });

  if (!config.elevenLabsApiKey || !config.elevenLabsVoiceId) {
    return fallback('ElevenLabs API key or voice id is not configured');
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': config.elevenLabsApiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: term,
        model_id: config.elevenLabsModelId,
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.85,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs failed (${response.status}): ${await response.text()}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return {
      provider: 'elevenlabs' as const,
      url: pathToFileURL(outputPath).toString(),
    };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : 'ElevenLabs failed');
  }
};

export const materializeClip = async (clip: NormalizedClip, outputPath: string) => {
  if (clip.media.kind === 'direct-mp4' && clip.media.renderUrl) {
    const response = await fetch(clip.media.renderUrl);
    if (!response.ok) {
      throw new Error(`Failed to download clip ${clip.id} (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return pathToFileURL(outputPath).toString();
  }

  if (!clip.media.requiresMaterialization && clip.media.renderUrl) {
    return clip.media.renderUrl;
  }

  if (clip.media.kind !== 'youtube-segment' || !clip.media.youtubeWatchUrl) {
    throw new Error(`Clip ${clip.id} has no renderable media`);
  }

  const sourcePath = outputPath.replace(/\.mp4$/, '.source.mp4');
  await run('yt-dlp', ['-f', 'mp4/best', '-o', sourcePath, clip.media.youtubeWatchUrl]);
  const startSeconds = Math.max(0, clip.startMs / 1000);
  const durationSeconds = Math.max(1.5, (clip.endMs - clip.startMs) / 1000);
  await run('ffmpeg', [
    '-y',
    '-ss',
    String(startSeconds),
    '-i',
    sourcePath,
    '-t',
    String(durationSeconds),
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    outputPath,
  ]);

  if (!existsSync(outputPath)) {
    throw new Error(`Failed to create ${outputPath}`);
  }

  return pathToFileURL(outputPath).toString();
};

export const getAssetUrl = (assetPath: string) => (existsSync(assetPath) ? pathToFileURL(assetPath).toString() : undefined);

export const getClipOutputPath = (jobDir: string, blockIndex: number, clipIndex: number) =>
  join(jobDir, 'clips', `block-${blockIndex + 1}-clip-${clipIndex + 1}.mp4`);
