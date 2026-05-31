import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {z} from 'zod';
import {rootDir} from './job-paths';

const settingsPath = join(rootDir, 'tmp', 'local-settings.json');

const settingsSchema = z.object({
  playphraseAuthorization: z.string().optional(),
  playphraseCookie: z.string().optional(),
  playphraseCsrfToken: z.string().optional(),
  filmotCookie: z.string().optional(),
  filmotUserAgent: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  openaiUrl: z.string().optional(),
  elevenLabsApiKey: z.string().optional(),
  elevenLabsVoiceId: z.string().optional(),
  elevenLabsModelId: z.string().optional(),
  didApiKey: z.string().optional(),
  didSourceUrl: z.string().optional(),
  didVoiceId: z.string().optional(),
  didPresenterId: z.string().optional(),
});

export type LocalSettings = z.infer<typeof settingsSchema>;

const clean = (settings: LocalSettings): LocalSettings =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => typeof value === 'string' && value.trim())) as LocalSettings;

export const readLocalSettings = async (): Promise<LocalSettings> => {
  if (!existsSync(settingsPath)) {
    return {};
  }

  const text = await readFile(settingsPath, 'utf8');
  return settingsSchema.parse(JSON.parse(text));
};

export const writeLocalSettings = async (next: LocalSettings) => {
  const current = await readLocalSettings();
  const merged = clean({...current, ...next});

  await mkdir(dirname(settingsPath), {recursive: true});
  await writeFile(settingsPath, JSON.stringify(merged, null, 2));

  return merged;
};

export const getRuntimeConfig = async () => {
  const local = await readLocalSettings();

  return {
    openaiApiKey: local.openaiApiKey ?? process.env.OPENAI_API_KEY ?? '',
    openaiModel: local.openaiModel ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    openaiUrl: local.openaiUrl ?? process.env.OPENAI_URL ?? 'https://api.openai.com/v1',
    elevenLabsApiKey: local.elevenLabsApiKey ?? process.env.ELEVENLABS_API_KEY ?? '',
    elevenLabsVoiceId: local.elevenLabsVoiceId ?? process.env.ELEVENLABS_VOICE_ID ?? '',
    elevenLabsModelId: local.elevenLabsModelId ?? process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2',
    didApiKey: local.didApiKey ?? process.env.DID_API_KEY ?? '',
    didSourceUrl: local.didSourceUrl ?? process.env.DID_SOURCE_URL ?? '',
    didVoiceId: local.didVoiceId ?? process.env.DID_VOICE_ID ?? 'de-DE-KatjaNeural',
    didPresenterId: local.didPresenterId ?? process.env.DID_PRESENTER_ID ?? '',
    playphraseAuthorization: local.playphraseAuthorization ?? process.env.PLAYPHRASE_AUTHORIZATION ?? 'Token',
    playphraseCookie: local.playphraseCookie ?? process.env.PLAYPHRASE_COOKIE ?? '',
    playphraseCsrfToken: local.playphraseCsrfToken ?? process.env.PLAYPHRASE_CSRF_TOKEN ?? '',
    filmotCookie: local.filmotCookie ?? process.env.FILMOT_COOKIE ?? '',
    filmotUserAgent:
      local.filmotUserAgent ??
      process.env.FILMOT_USER_AGENT ??
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };
};

const parseCurlHeader = (curl: string, headerName: string) => {
  const headerRegex = /-H\s+(["'])(.*?)\1/g;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(curl))) {
    const [name, ...rest] = match[2].split(':');
    if (name.trim().toLowerCase() === headerName.toLowerCase()) {
      return rest.join(':').trim();
    }
  }

  return undefined;
};

export const parseProviderCurl = (curl: string): LocalSettings => {
  const settings: LocalSettings = {};
  const cookie = /(?:-b|--cookie)\s+(["'])(.*?)\1/.exec(curl)?.[2] ?? parseCurlHeader(curl, 'cookie');
  const userAgent = parseCurlHeader(curl, 'user-agent');

  if (curl.includes('playphrase.me')) {
    settings.playphraseAuthorization = parseCurlHeader(curl, 'authorization');
    settings.playphraseCookie = cookie;
    settings.playphraseCsrfToken = parseCurlHeader(curl, 'x-csrf-token');
  }

  if (curl.includes('filmot.com')) {
    settings.filmotCookie = cookie;
    settings.filmotUserAgent = userAgent;
  }

  return clean(settings);
};

export const getConfigStatus = async () => {
  const config = await getRuntimeConfig();

  return {
    openai: Boolean(config.openaiApiKey),
    elevenLabs: Boolean(config.elevenLabsApiKey && config.elevenLabsVoiceId),
    did: Boolean(config.didApiKey && (config.didPresenterId || config.didSourceUrl)),
    playphrase: Boolean(config.playphraseCookie || config.playphraseAuthorization),
    filmot: Boolean(config.filmotCookie),
    macOsVoiceFallback: true,
  };
};
