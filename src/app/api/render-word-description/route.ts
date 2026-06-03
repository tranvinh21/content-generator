import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, jobsDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {getAssetUrl} from '../../../features/vocabulary/enrich';

export const runtime = 'nodejs';

const blockSchema = z.object({
  german: z.string().trim().min(1).max(80),
  vietnamese: z.string().trim().min(1).max(120),
  example: z.string().trim().min(1).max(220),
  exampleVi: z.string().trim().min(1).max(220),
  illustrationUrl: z.string().max(16_000_000).optional(),
});

const schema = z.object({
  blocks: z.array(blockSchema).min(1).max(50),
  includeWatermark: z.boolean().optional().default(true),
});

const runStill = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['remotion', 'still', 'src/index.ts', 'WordDescriptionImage', outputPath, '--props', propsPath, '--scale', '2'],
      {
        cwd: rootDir,
        env: process.env,
      },
    );
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
        reject(new Error(log || `Word example render failed with exit code ${code}`));
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
      'background.mp4',
      'background.mov',
    );
    const watermarkPath = firstExistingAsset('water-mark-new.png', 'watermark.png', 'watermark.webp', 'watermark.jpg', 'watermark.jpeg');
    const backgroundUrl = getServedAssetUrl(backgroundPath, request.url);
    const watermarkUrl = input.includeWatermark ? getServedAssetUrl(watermarkPath, request.url) : undefined;
    const images = [];

    for (const [index, block] of input.blocks.entries()) {
      const illustrationUrl = block.illustrationUrl?.startsWith('data:')
        ? await materializeDataUrl(block.illustrationUrl, jobDir, request.url, `word-description-${index + 1}`)
        : block.illustrationUrl;
      const props = {...block, illustrationUrl, backgroundUrl, watermarkUrl};
      const propsPath = join(jobDir, 'props', `word-description-${index + 1}.json`);
      const outputFileName = `word-description-${String(index + 1).padStart(2, '0')}-${slugify(block.german)}-${jobId}.png`;
      const outputPath = join(outDir, outputFileName);

      await writeFile(propsPath, JSON.stringify(props, null, 2));
      logs.push(`[${block.german}] Rendering word example image...`);
      await runStill(outputPath, propsPath);
      images.push({
        ...block,
        illustrationUrl,
        downloadUrl: `/out/${outputFileName}`,
        fileName: outputFileName,
      });
    }

    return NextResponse.json({ok: true, images, logs});
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Word example render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Word example render failed', logs},
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

const dataUrlExtensions: Record<string, string> = {
  'image/avif': '.avif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

const materializeDataUrl = async (dataUrl: string, jobDir: string, requestUrl: string, baseName: string) => {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Uploaded illustration is not a supported data URL.');
  }

  const mimeType = match[1];
  const extension = dataUrlExtensions[mimeType];
  if (!extension) {
    throw new Error(`Unsupported illustration type: ${mimeType}`);
  }

  const imageDir = join(jobDir, 'images');
  await mkdir(imageDir, {recursive: true});

  const outputPath = join(imageDir, `${baseName}${extension}`);
  await writeFile(outputPath, Buffer.from(match[2], 'base64'));

  return new URL(`/job-assets/${relative(jobsDir, outputPath)}`, requestUrl).toString();
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'word';
