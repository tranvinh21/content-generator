import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join, normalize} from 'node:path';
import {NextResponse} from 'next/server';
import {jobsDir} from '../../../lib/job-paths';

export const runtime = 'nodejs';

const contentTypes: Record<string, string> = {
  '.aiff': 'audio/aiff',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
};

const getExtension = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index).toLowerCase();
};

export const GET = async (_request: Request, context: {params: Promise<{path: string[]}>}) => {
  const {path} = await context.params;

  if (path.length === 0) {
    return new NextResponse('Not found', {status: 404});
  }

  const safePath = normalize(join(...path));
  if (safePath.startsWith('..')) {
    return new NextResponse('Not found', {status: 404});
  }

  const assetPath = join(jobsDir, safePath);
  if (!existsSync(assetPath)) {
    return new NextResponse('Not found', {status: 404});
  }

  const body = await readFile(assetPath);
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentTypes[getExtension(assetPath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  });
};
