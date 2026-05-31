import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getConfigStatus, getRuntimeConfig, parseProviderCurl, writeLocalSettings} from '../../../lib/runtime-config';

export const runtime = 'nodejs';

const schema = z.object({
  playphraseCurl: z.string().optional(),
  filmotCurl: z.string().optional(),
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

export const GET = async () => {
  const config = await getRuntimeConfig();

  return NextResponse.json({
    ok: true,
    status: await getConfigStatus(),
    openaiSettings: {
      hasApiKey: Boolean(config.openaiApiKey),
      model: config.openaiModel,
      url: config.openaiUrl,
    },
    elevenLabsSettings: {
      hasApiKey: Boolean(config.elevenLabsApiKey),
      voiceId: config.elevenLabsVoiceId,
      modelId: config.elevenLabsModelId,
    },
    didSettings: {
      hasApiKey: Boolean(config.didApiKey),
      sourceUrl: config.didSourceUrl,
      voiceId: config.didVoiceId,
      presenterId: config.didPresenterId,
    },
  });
};

export const POST = async (request: Request) => {
  const input = schema.parse(await request.json());
  const playphraseSettings = input.playphraseCurl ? parseProviderCurl(input.playphraseCurl) : {};
  const filmotSettings = input.filmotCurl ? parseProviderCurl(input.filmotCurl) : {};
  const explicitSettings = {
    ...(input.openaiApiKey !== undefined ? {openaiApiKey: input.openaiApiKey} : {}),
    ...(input.openaiModel !== undefined ? {openaiModel: input.openaiModel} : {}),
    ...(input.openaiUrl !== undefined ? {openaiUrl: input.openaiUrl} : {}),
    ...(input.elevenLabsApiKey !== undefined ? {elevenLabsApiKey: input.elevenLabsApiKey} : {}),
    ...(input.elevenLabsVoiceId !== undefined ? {elevenLabsVoiceId: input.elevenLabsVoiceId} : {}),
    ...(input.elevenLabsModelId !== undefined ? {elevenLabsModelId: input.elevenLabsModelId} : {}),
    ...(input.didApiKey !== undefined ? {didApiKey: input.didApiKey} : {}),
    ...(input.didSourceUrl !== undefined ? {didSourceUrl: input.didSourceUrl} : {}),
    ...(input.didVoiceId !== undefined ? {didVoiceId: input.didVoiceId} : {}),
    ...(input.didPresenterId !== undefined ? {didPresenterId: input.didPresenterId} : {}),
  };
  const saved = await writeLocalSettings({...playphraseSettings, ...filmotSettings, ...explicitSettings});
  const savedKeys = Object.keys(saved).filter((key) => Boolean(saved[key as keyof typeof saved]));

  return NextResponse.json({
    ok: true,
    savedKeys,
    status: await getConfigStatus(),
  });
};
