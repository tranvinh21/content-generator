import {writeFile} from 'node:fs/promises';
import {getRuntimeConfig} from '../../lib/runtime-config';

type DidTalkResponse = {
  id?: string;
  status?: string;
  result_url?: string;
  error?: unknown;
};

export type DidPresenter = {
  id: string;
  name: string;
  gender?: string;
  imageUrl?: string;
};

type GenerateDidAvatarInput = {
  text: string;
  outputPath: string;
};

const didBaseUrl = 'https://api.d-id.com';
const recommendedFemalePresenters: DidPresenter[] = [
  {id: 'v2_public_Amber@0zSz8kflCN', name: 'Amber', gender: 'female'},
  {id: 'v2_public_alyssa@VNZgl_DF_x', name: 'Alyssa', gender: 'female'},
  {id: 'v2_public_anita@Os4oKCBIgZ', name: 'Anita', gender: 'female'},
  {id: 'v2_public_diana@so9Pg73d6N', name: 'Diana', gender: 'female'},
  {id: 'v2_public_ella@p9l_fpg2_k', name: 'Ella', gender: 'female'},
  {id: 'v2_public_fiona_black_jacket_classroom@oVIoDEHlh1', name: 'Fiona classroom', gender: 'female'},
  {id: 'v2_public_kayla@gBAHXrHWYT', name: 'Kayla', gender: 'female'},
  {id: 'v2_public_lana@TtreMLgSnL', name: 'Lana', gender: 'female'},
  {id: 'v2_public_lily@addf3c9auh', name: 'Lily', gender: 'female'},
  {id: 'v2_public_mary@aVWeRviTFX', name: 'Mary', gender: 'female'},
];

const getAuthorization = (apiKey: string) => (apiKey.toLowerCase().startsWith('basic ') ? apiKey : `Basic ${apiKey}`);

const didHeaders = (apiKey: string) => ({
  accept: 'application/json',
  authorization: getAuthorization(apiKey),
  'content-type': 'application/json',
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePresenter = (presenter: Record<string, unknown>): DidPresenter | null => {
  const id = presenter.presenter_id ?? presenter.id ?? presenter.presenterId;
  if (typeof id !== 'string' || !id) {
    return null;
  }

  const name = presenter.name ?? presenter.display_name ?? id.split('@')[0].replace(/^v2_public_/, '').replaceAll('_', ' ');
  const imageUrl = presenter.thumbnail_url ?? presenter.image_url ?? presenter.preview_url ?? presenter.preview;
  const gender = presenter.gender;

  return {
    id,
    name: typeof name === 'string' && name ? name : id,
    gender: typeof gender === 'string' ? gender : undefined,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
  };
};

export const getDidPresenters = async () => {
  const config = await getRuntimeConfig();
  if (!config.didApiKey) {
    return {ok: false as const, error: 'D-ID API key is not configured', presenters: []};
  }

  const response = await fetch(`${didBaseUrl}/clips/presenters?limit=100`, {
    headers: didHeaders(config.didApiKey),
  });

  if (!response.ok) {
    return {ok: false as const, error: `D-ID presenters failed (${response.status}): ${await response.text()}`, presenters: []};
  }

  const payload = (await response.json()) as unknown;
  const rawPresenters = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as {presenters?: unknown[]}).presenters)
      ? (payload as {presenters: unknown[]}).presenters
      : Array.isArray((payload as {items?: unknown[]}).items)
        ? (payload as {items: unknown[]}).items
        : [];
  const presenters = rawPresenters
    .map((item) => (item && typeof item === 'object' ? normalizePresenter(item as Record<string, unknown>) : null))
    .filter((item): item is DidPresenter => Boolean(item));
  const merged = [...recommendedFemalePresenters, ...presenters].filter(
    (presenter, index, all) => all.findIndex((item) => item.id === presenter.id) === index,
  );
  merged.sort((left, right) => {
    const leftFemale = left.gender?.toLowerCase() === 'female' ? 0 : 1;
    const rightFemale = right.gender?.toLowerCase() === 'female' ? 0 : 1;

    return leftFemale - rightFemale || left.name.localeCompare(right.name);
  });

  return {ok: true as const, presenters: merged};
};

export const getDidCredits = async () => {
  const config = await getRuntimeConfig();
  if (!config.didApiKey) {
    return {ok: false as const, error: 'D-ID API key is not configured'};
  }

  const response = await fetch(`${didBaseUrl}/credits`, {
    headers: didHeaders(config.didApiKey),
  });

  if (!response.ok) {
    return {ok: false as const, error: `D-ID credits failed (${response.status}): ${await response.text()}`};
  }

  return {ok: true as const, credits: await response.json()};
};

const downloadResultVideo = async (resultUrl: string, outputPath: string) => {
  const videoResponse = await fetch(resultUrl);
  if (!videoResponse.ok) {
    return {ok: false as const, error: `D-ID video download failed (${videoResponse.status})`};
  }

  await writeFile(outputPath, Buffer.from(await videoResponse.arrayBuffer()));
  return {ok: true as const, outputPath};
};

const pollDidVideo = async (endpoint: 'clips' | 'talks', id: string, apiKey: string, outputPath: string) => {
  for (let attempt = 0; attempt < 36; attempt += 1) {
    await sleep(2500);

    const pollResponse = await fetch(`${didBaseUrl}/${endpoint}/${id}`, {
      headers: didHeaders(apiKey),
    });

    if (!pollResponse.ok) {
      return {ok: false as const, error: `D-ID poll failed (${pollResponse.status}): ${await pollResponse.text()}`};
    }

    const video = (await pollResponse.json()) as DidTalkResponse;
    if (video.status === 'done' && video.result_url) {
      return downloadResultVideo(video.result_url, outputPath);
    }

    if (video.status === 'error' || video.status === 'rejected' || video.status === 'failed') {
      return {ok: false as const, error: `D-ID failed: ${JSON.stringify(video.error ?? video)}`};
    }
  }

  return {ok: false as const, error: 'D-ID timed out while generating avatar video'};
};

export const generateDidAvatarIntro = async ({text, outputPath}: GenerateDidAvatarInput) => {
  const config = await getRuntimeConfig();

  if (!config.didApiKey || (!config.didPresenterId && !config.didSourceUrl)) {
    return {ok: false as const, error: 'D-ID API key, presenter id, or source URL is not configured'};
  }

  if (config.didPresenterId) {
    const createClipResponse = await fetch(`${didBaseUrl}/clips`, {
      method: 'POST',
      headers: didHeaders(config.didApiKey),
      body: JSON.stringify({
        presenter_id: config.didPresenterId,
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: config.didVoiceId,
          },
        },
      }),
    });

    if (!createClipResponse.ok) {
      return {ok: false as const, error: `D-ID clip create failed (${createClipResponse.status}): ${await createClipResponse.text()}`};
    }

    const createdClip = (await createClipResponse.json()) as DidTalkResponse;
    if (!createdClip.id) {
      return {ok: false as const, error: 'D-ID did not return a clip id'};
    }

    return pollDidVideo('clips', createdClip.id, config.didApiKey, outputPath);
  }

  const createResponse = await fetch(`${didBaseUrl}/talks`, {
    method: 'POST',
    headers: didHeaders(config.didApiKey),
    body: JSON.stringify({
      source_url: config.didSourceUrl,
      script: {
        type: 'text',
        input: text,
        provider: {
          type: 'microsoft',
          voice_id: config.didVoiceId,
        },
      },
      config: {
        fluent: true,
        pad_audio: 0.25,
      },
    }),
  });

  if (!createResponse.ok) {
    return {ok: false as const, error: `D-ID create failed (${createResponse.status}): ${await createResponse.text()}`};
  }

  const created = (await createResponse.json()) as DidTalkResponse;
  if (!created.id) {
    return {ok: false as const, error: 'D-ID did not return a talk id'};
  }

  return pollDidVideo('talks', created.id, config.didApiKey, outputPath);
};
