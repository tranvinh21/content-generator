import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, jobsDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';

export const runtime = 'nodejs';

const schema = z.object({
  title: z.string().min(1).max(120).default('100 câu tiếng Đức cơ bản 🇩🇪'),
  coverTemplate: z.enum(['photo', 'myth']).optional(),
  coverImageUrl: z.string().max(16_000_000).optional(),
  coverMascotUrl: z.string().max(16_000_000).optional(),
  coverLayout: z.enum(['balanced', 'stacked']).optional(),
  coverLines: z
    .array(
      z.object({
        text: z.string().max(80),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .max(3)
    .optional(),
  coverTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  coverOverlayColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  coverOverlayOpacity: z.number().min(0).max(0.78).optional(),
  coverSubtitle: z.string().max(60).optional(),
  coverMythMain: z.string().max(40).optional(),
  coverMythMeaning: z.string().max(70).optional(),
  coverMythTwist: z.string().max(90).optional(),
});

const runStill = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'still', 'src/index.ts', 'VocabularyCover', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `Cover render failed with exit code ${code}`));
      }
    });
  });

export const POST = async (request: Request) => {
  const logs: string[] = [];

  try {
    const input = schema.parse(await request.json().catch(() => ({})));
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
    const macosMascotPath = firstExistingAsset('macos.svg');
    const coverImageUrl = input.coverImageUrl?.startsWith('data:')
      ? await materializeDataUrl(input.coverImageUrl, jobDir, request.url)
      : input.coverImageUrl;
    const coverMascotUrl = input.coverMascotUrl?.startsWith('data:')
      ? await materializeDataUrl(input.coverMascotUrl, jobDir, request.url, 'cover-mascot')
      : input.coverMascotUrl || getServedAssetUrl(macosMascotPath, request.url);
    const props = {
      title: input.title,
      blocks: [],
      backgroundUrl: getServedAssetUrl(backgroundPath, request.url),
      watermarkUrl: getServedAssetUrl(watermarkPath, request.url),
      coverTemplate: input.coverTemplate,
      coverImageUrl,
      coverMascotUrl,
      coverLayout: input.coverLayout,
      coverLines: input.coverLines,
      coverTextColor: input.coverTextColor,
      coverOverlayColor: input.coverOverlayColor,
      coverOverlayOpacity: input.coverOverlayOpacity,
      coverSubtitle: input.coverSubtitle,
      coverMythMain: input.coverMythMain,
      coverMythMeaning: input.coverMythMeaning,
      coverMythTwist: input.coverMythTwist,
    };
    const propsPath = join(jobDir, 'props', 'vocabulary-cover.json');
    const outputFileName = `german-vocab-cover-${jobId}.png`;
    const outputPath = join(outDir, outputFileName);

    await writeFile(propsPath, JSON.stringify(props, null, 2));
    logs.push('Rendering reusable cover PNG from local assets...');
    logs.push('Rendering cover PNG...');
    const renderLog = await runStill(outputPath, propsPath);
    logs.push(...renderLog.split('\n').slice(-8));

    return NextResponse.json({
      ok: true,
      downloadUrl: `/out/${outputFileName}`,
      fileName: outputFileName,
      logs,
    });
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Cover render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Cover render failed', logs},
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

  return undefined;
};

const dataUrlExtensions: Record<string, string> = {
  'image/avif': '.avif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const materializeDataUrl = async (dataUrl: string, jobDir: string, requestUrl: string, baseName = 'cover-image') => {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Uploaded cover image is not a supported data URL.');
  }

  const mimeType = match[1];
  const extension = dataUrlExtensions[mimeType];
  if (!extension) {
    throw new Error(`Unsupported cover image type: ${mimeType}`);
  }

  const coverDir = join(jobDir, 'cover');
  await mkdir(coverDir, {recursive: true});

  const outputPath = join(coverDir, `${baseName}${extension}`);
  await writeFile(outputPath, Buffer.from(match[2], 'base64'));

  return new URL(`/job-assets/${relative(jobsDir, outputPath)}`, requestUrl).toString();
};
