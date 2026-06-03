import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {getAssetUrl} from '../../../features/vocabulary/enrich';

export const runtime = 'nodejs';

const schema = z.object({
  title: z.string().trim().min(1).max(180),
  eyebrow: z.string().trim().max(50).optional().default('German learning note'),
  subtitle: z.string().trim().max(150).optional().default('Một ghi chú ngắn để hiểu đúng sắc thái tiếng Đức.'),
  footer: z.string().trim().max(60).optional().default('BlauBerry Deutsch'),
});

const runStill = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'still', 'src/index.ts', 'OpenGraphBlogImage', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `OpenGraph render failed with exit code ${code}`));
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
    const terms = extractQuotedTerms(input.title);
    const props = {
      ...input,
      leftTerm: terms[0] ?? '',
      rightTerm: terms[1] ?? '',
      backgroundUrl: getServedAssetUrl(backgroundPath, request.url),
      watermarkUrl: getServedAssetUrl(watermarkPath, request.url),
    };
    const propsPath = join(jobDir, 'props', 'opengraph.json');
    const outputFileName = `opengraph-${slugify(input.title)}-${jobId}.png`;
    const outputPath = join(outDir, outputFileName);

    await writeFile(propsPath, JSON.stringify(props, null, 2));
    logs.push('Rendering OpenGraph image...');
    if (terms.length >= 2) {
      logs.push(`Detected comparison terms: ${terms[0]} / ${terms[1]}`);
    }
    await runStill(outputPath, propsPath);

    return NextResponse.json({
      ok: true,
      image: {
        downloadUrl: `/out/${outputFileName}`,
        fileName: outputFileName,
      },
      logs,
    });
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'OpenGraph render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'OpenGraph render failed', logs},
      {status: 400},
    );
  }
};

const extractQuotedTerms = (value: string) =>
  Array.from(value.matchAll(/["“”']([^"“”']+)["“”']/g))
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .slice(0, 2);

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
    .slice(0, 56) || 'blog';
