import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {getAssetUrl, getGermanIpa, translateBlock} from '../../../features/vocabulary/enrich';

export const runtime = 'nodejs';

const schema = z.object({
  terms: z.array(z.string().min(1)).min(1).max(100),
  includeWatermark: z.boolean().optional().default(true),
});

const runStill = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'still', 'src/index.ts', 'VocabularyPostImage', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `Post image render failed with exit code ${code}`));
      }
    });
  });

export const POST = async (request: Request) => {
  const logs: string[] = [];

  try {
    const input = schema.parse(await request.json());
    const uniqueTerms = Array.from(new Set(input.terms.map((term) => term.trim()).filter(Boolean)));
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

    for (const [index, term] of uniqueTerms.entries()) {
      logs.push(`[${term}] Generating IPA + Vietnamese meaning...`);
      const [localIpa, translation] = await Promise.all([getGermanIpa(term), translateBlock(term, [])]);
      if (translation.error) {
        logs.push(`[${term}] OpenAI skipped: ${translation.error}`);
      }
      if (!localIpa && !translation.ipa) {
        logs.push(`[${term}] IPA empty. Install espeak-ng or configure OpenAI for IPA fallback.`);
      }
      if (!translation.termTranslation) {
        logs.push(`[${term}] Vietnamese translation empty. Check OpenAI credentials/model/url.`);
      }
      const props = {
        term,
        ipa: localIpa || translation.ipa || '',
        translationVi: translation.termTranslation || '',
        backgroundUrl,
        watermarkUrl,
      };
      const propsPath = join(jobDir, 'props', `post-image-${index + 1}.json`);
      const outputFileName = `vocab-post-${String(index + 1).padStart(2, '0')}-${slugify(term)}-${jobId}.png`;
      const outputPath = join(outDir, outputFileName);

      await writeFile(propsPath, JSON.stringify(props, null, 2));
      logs.push(`[${term}] Rendering post image...`);
      await runStill(outputPath, propsPath);
      images.push({
        term,
        downloadUrl: `/out/${outputFileName}`,
        fileName: outputFileName,
        ipa: props.ipa,
        translationVi: props.translationVi,
      });
    }

    return NextResponse.json({ok: true, images, logs});
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Post image render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Post image render failed', logs},
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
    .slice(0, 48) || 'word';
