import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, jobsDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {generateVoice, getAssetUrl, getGermanIpa, translateBlock} from '../../../features/vocabulary/enrich';
import type {ReadAlongVideoProps} from '../../../features/read-along/types';

export const runtime = 'nodejs';

const vocabularySchema = z.object({
  term: z.string().trim().min(1).max(80),
  ipa: z.string().trim().max(100).optional().default(''),
  translationVi: z.string().trim().max(140).optional().default(''),
});

const schema = z.object({
  title: z.string().trim().min(1).max(90),
  level: z.string().trim().min(1).max(10),
  text: z.string().trim().min(20).max(4500),
  vocabulary: z.array(vocabularySchema).min(1).max(24),
  useEndCard: z.boolean().optional().default(true),
});

const runRender = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'render', 'src/index.ts', 'ReadAlongVideo', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `Read along render failed with exit code ${code}`));
      }
    });
  });

export const POST = async (request: Request) => {
  const logs: string[] = [];

  try {
    const input = schema.parse(await request.json());
    const {jobId, jobDir} = await createJobDir();
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

    logs.push(`Preparing ${input.vocabulary.length} vocabulary items...`);
    const vocabulary = [];
    for (const item of input.vocabulary) {
      const needsIpa = !item.ipa;
      const needsTranslation = !item.translationVi;
      let generatedIpa = '';
      let generatedTranslation = '';

      if (needsIpa) {
        generatedIpa = await getGermanIpa(item.term);
      }

      if (needsTranslation || (needsIpa && !generatedIpa)) {
        const translation = await translateBlock(item.term, []);
        if (translation.error) {
          logs.push(`[${item.term}] OpenAI skipped: ${translation.error}`);
        }
        generatedIpa = generatedIpa || translation.ipa || '';
        generatedTranslation = translation.termTranslation || '';
      }

      if (!(item.ipa || generatedIpa)) {
        logs.push(`[${item.term}] IPA empty. Install espeak-ng or configure OpenAI for IPA fallback.`);
      }
      if (!(item.translationVi || generatedTranslation)) {
        logs.push(`[${item.term}] Vietnamese meaning empty. Configure OpenAI in settings or .env.local.`);
      }

      vocabulary.push({
        term: item.term,
        ipa: item.ipa || generatedIpa,
        translationVi: item.translationVi || generatedTranslation,
      });
    }

    logs.push('Generating reading voice...');
    const audioPath = join(jobDir, 'audio', 'reading.mp3');
    const voice = await generateVoice(input.text, audioPath);
    if (voice.provider === 'elevenlabs') {
      logs.push('ElevenLabs reading voice ready.');
    } else {
      logs.push('ElevenLabs skipped, using macOS voice fallback.');
      if (voice.error) {
        logs.push(`ElevenLabs reason: ${voice.error}`);
      }
    }

    const durationFrames = Math.max(180, (await getAudioDurationFrames(audioPath)) ?? estimateDurationFrames(input.text));
    const props: ReadAlongVideoProps = {
      title: input.title,
      level: input.level,
      text: input.text,
      vocabulary,
      audioUrl: getServedJobUrl(voice.url, request.url),
      durationFrames,
      backgroundUrl: getServedAssetUrl(backgroundPath, request.url),
      watermarkUrl: getServedAssetUrl(watermarkPath, request.url),
      useEndCard: input.useEndCard,
    };
    const propsPath = join(jobDir, 'props', 'read-along.json');
    const outputFileName = `read-along-${slugify(input.title)}-${jobId}.mp4`;
    const outputPath = join(outDir, outputFileName);

    await writeFile(propsPath, JSON.stringify(props, null, 2));
    logs.push(`Audio duration: ${Math.round(durationFrames / 30)}s.`);
    logs.push('Rendering read along video...');
    const renderLog = await runRender(outputPath, propsPath);
    logs.push(...renderLog.split('\n').slice(-12));

    return NextResponse.json({
      ok: true,
      downloadUrl: `/out/${outputFileName}`,
      fileName: outputFileName,
      durationSeconds: Math.round(durationFrames / 30),
      audioProvider: voice.provider,
      logs,
    });
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Read along render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Read along render failed', logs},
      {status: 400},
    );
  }
};

const getAudioDurationFrames = (filePath: string) =>
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

const estimateDurationFrames = (text: string) => Math.round(Math.max(8, text.split(/\s+/).length / 2.2) * 30);

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

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'reading';
