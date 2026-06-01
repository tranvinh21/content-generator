import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, jobsDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {
  generateVoice,
  getAssetUrl,
  getClipOutputPath,
  getGermanIpa,
  materializeClip,
  translateBlock,
} from '../../../features/vocabulary/enrich';
import {generateDidAvatarIntro} from '../../../features/vocabulary/avatar';
import type {NormalizedClip} from '../../../providers/normalized-clip';
import type {RenderableWordBlock, VocabularyTikTokProps} from '../../../features/vocabulary/types';

export const runtime = 'nodejs';

export const renderInputSchema = z.object({
  includeAvatar: z.boolean().optional().default(true),
  blocks: z.array(
    z.object({
      id: z.string(),
      term: z.string().min(1),
      selectedClips: z.array(z.unknown()).min(1).max(3),
    }),
  ),
});

const schema = renderInputSchema;

const runRender = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'render', 'src/index.ts', 'VocabularyTikTok', outputPath, '--props', propsPath], {
      cwd: rootDir,
      env: process.env,
    });
    let log = '';

    child.stdout.on('data', (data) => {
      log += data.toString();
    });
    child.stderr.on('data', (data) => {
      log += data.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(log);
      } else {
        reject(new Error(log || `Render failed with exit code ${code}`));
      }
    });
  });

export const buildRenderableProps = async (
  input: z.infer<typeof schema>,
  jobDir: string,
  requestUrl: string,
  logs: string[],
): Promise<VocabularyTikTokProps> => {
  const blocks: RenderableWordBlock[] = [];

  for (const [blockIndex, block] of input.blocks.entries()) {
    logs.push(`[${block.term}] Generating IPA...`);
    const localIpa = await getGermanIpa(block.term);
    const selectedClips = block.selectedClips as NormalizedClip[];
    const exampleTexts = selectedClips.map((clip) => clip.text);

    logs.push(`[${block.term}] Translating...`);
    const translation = await translateBlock(block.term, exampleTexts);
    if (translation.error) {
      logs.push(`[${block.term}] OpenAI skipped: ${translation.error}`);
    }
    const ipa = localIpa || translation.ipa || '';
    if (!ipa) {
      logs.push(`[${block.term}] IPA empty. Install espeak-ng or configure OpenAI for IPA fallback.`);
    }
    if (!translation.termTranslation || translation.exampleTranslations.every((item) => !item.vi)) {
      logs.push(`[${block.term}] Vietnamese translation empty. Configure OpenAI in settings or .env.local.`);
    }

    logs.push(`[${block.term}] Generating intro voice...`);
    const voice = await generateVoice(block.term, join(jobDir, 'audio', `block-${blockIndex + 1}.mp3`));
    if (voice.provider === 'elevenlabs') {
      logs.push(`[${block.term}] ElevenLabs voice ready.`);
    } else {
      logs.push(`[${block.term}] ElevenLabs skipped, using macOS voice fallback.`);
      if (voice.error) {
        logs.push(`[${block.term}] ElevenLabs reason: ${voice.error}`);
      }
    }
    const voiceUrl = getServedJobUrl(voice.url, requestUrl);

    let avatarIntro: RenderableWordBlock['avatarIntro'] | undefined;
    if (input.includeAvatar) {
      logs.push(`[${block.term}] Preparing avatar intro...`);
      const avatarOutputPath = join(jobDir, 'avatar', `block-${blockIndex + 1}.mp4`);
      await mkdir(join(jobDir, 'avatar'), {recursive: true});
      const didAvatar = await generateDidAvatarIntro({text: block.term, outputPath: avatarOutputPath});
      avatarIntro =
        didAvatar.ok
          ? {
              provider: 'did' as const,
              videoUrl: getRequiredServedJobUrl(didAvatar.outputPath, requestUrl),
              durationFrames: (await getVideoDurationFrames(didAvatar.outputPath)) ?? 90,
            }
          : {
              provider: 'remotion-basic' as const,
              durationFrames: 90,
            };
      if (didAvatar.ok) {
        logs.push(`[${block.term}] D-ID avatar ready.`);
      } else {
        logs.push(`[${block.term}] D-ID skipped, using Remotion avatar fallback.`);
        logs.push(`[${block.term}] D-ID reason: ${didAvatar.error}`);
      }
    } else {
      logs.push(`[${block.term}] Avatar intro skipped by render option.`);
    }

    const clips = [];
    for (const [clipIndex, clip] of selectedClips.entries()) {
      logs.push(`[${block.term}] Preparing clip ${clipIndex + 1}/${selectedClips.length} (${clip.provider})...`);
      const renderUrl = getRequiredServedJobUrl(await materializeClip(clip, getClipOutputPath(jobDir, blockIndex, clipIndex)), requestUrl);
      const exampleTranslation =
        translation.exampleTranslations.find((item) => item.de === clip.text)?.vi ??
        translation.exampleTranslations[clipIndex]?.vi ??
        '';

      clips.push({
        ...clip,
        media: {
          ...clip.media,
          renderUrl,
          requiresMaterialization: false as const,
        },
        exampleTranslation,
      });
    }

    blocks.push({
      id: block.id,
      term: block.term,
      ipa,
      translationVi: translation.termTranslation,
      voiceUrl,
      avatarIntro,
      clips,
    });
  }

  if (blocks.length === 0) {
    throw new Error('No selected clips to render.');
  }

  const backgroundPath = firstExistingAsset(
    'background-img.png',
    'background-img.jpg',
    'background-img.jpeg',
    'background-img.webp',
    'background-img.avif',
    'background.png',
    'background.jpg',
    'background.jpeg',
    'background.webp',
    'background.avif',
    'background.mp4',
    'background.mov',
  );
  const watermarkPath = firstExistingAsset('water-mark-new.png', 'watermark.png', 'watermark.webp', 'watermark.jpg', 'watermark.jpeg');
  const avatarPath = firstExistingAsset('avatar.png', 'avatar.webp', 'avatar.jpg', 'avatar.jpeg');
  const outroPath = firstExistingAsset('outro.mp4', 'outtro.mp4', 'outro-background.mp4', 'outtro-background.mp4', 'out.mp4');

  return {
    title: '100 câu tiếng Đức cơ bản 🇩🇪',
    blocks,
    backgroundUrl: getServedAssetUrl(backgroundPath, requestUrl),
    watermarkUrl: getServedAssetUrl(watermarkPath, requestUrl),
    avatarUrl: getServedAssetUrl(avatarPath, requestUrl),
    includeAvatar: input.includeAvatar,
    outroUrl: getServedAssetUrl(outroPath, requestUrl),
    outroFrames: outroPath ? await getVideoDurationFrames(outroPath) : undefined,
  };
};

const firstExistingAsset = (...names: string[]) => {
  for (const dir of [assetsDir, sourceAssetsDir]) {
    for (const name of names) {
      const assetPath = join(dir, name);
      if (existsSync(assetPath)) {
        return assetPath;
      }
    }
  }

  return undefined;
};

const getServedAssetUrl = (assetPath: string | undefined, requestUrl: string) => {
  if (!assetPath) {
    return undefined;
  }

  if (assetPath.startsWith(sourceAssetsDir)) {
    return new URL(`/local-assets/source/${relative(sourceAssetsDir, assetPath)}`, requestUrl).toString();
  }

  if (assetPath.startsWith(assetsDir)) {
    return new URL(`/local-assets/root/${relative(assetsDir, assetPath)}`, requestUrl).toString();
  }

  return getAssetUrl(assetPath);
};

const getServedJobUrl = (fileUrlOrPath: string | undefined, requestUrl: string) => {
  if (!fileUrlOrPath) {
    return undefined;
  }

  const filePath = fileUrlOrPath.startsWith('file://') ? new URL(fileUrlOrPath).pathname : fileUrlOrPath;
  if (filePath.startsWith(jobsDir)) {
    return new URL(`/job-assets/${relative(jobsDir, filePath)}`, requestUrl).toString();
  }

  return fileUrlOrPath;
};

const getRequiredServedJobUrl = (fileUrlOrPath: string, requestUrl: string) => getServedJobUrl(fileUrlOrPath, requestUrl) ?? fileUrlOrPath;

const getVideoDurationFrames = (filePath: string) =>
  new Promise<number | undefined>((resolve) => {
    const child = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.on('error', () => resolve(undefined));
    child.on('close', (code) => {
      const durationSeconds = Number.parseFloat(output.trim());
      resolve(code === 0 && Number.isFinite(durationSeconds) ? Math.max(1, Math.round(durationSeconds * 30)) : undefined);
    });
  });

export const POST = async (request: Request) => {
  const logs: string[] = [];

  try {
    const input = schema.parse(await request.json());
    const {jobId, jobDir} = await createJobDir();
    const props = await buildRenderableProps(input, jobDir, request.url, logs);
    const propsPath = join(jobDir, 'props', 'vocabulary-tiktok.json');
    const outputFileName = `german-vocab-${jobId}.mp4`;
    const outputPath = join(outDir, outputFileName);

    await writeFile(propsPath, JSON.stringify(props, null, 2));
    logs.push('Rendering final TikTok video...');
    const renderLog = await runRender(outputPath, propsPath);
    logs.push(...renderLog.split('\n').slice(-12));

    return NextResponse.json({
      ok: true,
      downloadUrl: `/out/${outputFileName}`,
      fileName: outputFileName,
      logs,
    });
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Render failed', logs},
      {status: 400},
    );
  }
};
