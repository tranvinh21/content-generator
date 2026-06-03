import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {getAssetUrl} from '../../../features/vocabulary/enrich';

export const runtime = 'nodejs';

const optionSchema = z.object({
  de: z.string().trim().min(1).max(140),
  vi: z.string().trim().max(180).default(''),
});

const itemSchema = z.object({
  questionDe: z.string().trim().min(1).max(220),
  questionVi: z.string().trim().max(260).default(''),
  illustrationUrl: z.string().max(8_000_000).optional(),
  options: z.array(optionSchema).length(3),
});

const schema = z.object({
  title: z.string().trim().min(1).max(90),
  includeWatermark: z.boolean().optional().default(true),
  items: z.array(itemSchema).min(1).max(50),
});

const runStill = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'still', 'src/index.ts', 'QuizChoiceImage', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `Quiz image render failed with exit code ${code}`));
      }
    });
  });

export const POST = async (request: Request) => {
  const logs: string[] = [];

  try {
    const input = schema.parse(await request.json());
    const {jobId, jobDir} = await createJobDir();
    const backgroundPath = firstExistingAsset(
      'grid-caro-background.png',
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
    );
    const watermarkPath = firstExistingAsset('water-mark-new.png', 'watermark.png', 'watermark.webp', 'watermark.jpg', 'watermark.jpeg');
    const backgroundUrl = getServedAssetUrl(backgroundPath, request.url);
    const watermarkUrl = input.includeWatermark ? getServedAssetUrl(watermarkPath, request.url) : undefined;
    const images = [];

    for (const [index, item] of input.items.entries()) {
      const props = {
        title: input.title,
        ...item,
        backgroundUrl,
        watermarkUrl,
      };
      const propsPath = join(jobDir, 'props', `quiz-choice-${index + 1}.json`);
      const outputFileName = `quiz-choice-${String(index + 1).padStart(2, '0')}-${slugify(item.questionDe)}-${jobId}.png`;
      const outputPath = join(outDir, outputFileName);

      await writeFile(propsPath, JSON.stringify(props, null, 2));
      logs.push(`[${item.questionDe}] Rendering quiz image...`);
      await runStill(outputPath, propsPath);
      images.push({
        questionDe: item.questionDe,
        downloadUrl: `/out/${outputFileName}`,
        fileName: outputFileName,
      });
    }

    return NextResponse.json({ok: true, images, logs});
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Quiz image export failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Quiz image export failed', logs},
      {status: 400},
    );
  }
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

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'quiz';
