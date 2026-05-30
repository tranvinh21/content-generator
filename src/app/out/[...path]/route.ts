import {readFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {NextResponse} from 'next/server';
import {outDir} from '../../../lib/job-paths';

export const runtime = 'nodejs';

export const GET = async (_request: Request, context: {params: Promise<{path: string[]}>}) => {
  const {path} = await context.params;
  const filePath = resolve(outDir, ...path);

  if (!filePath.startsWith(resolve(outDir))) {
    return new NextResponse('Not found', {status: 404});
  }

  try {
    const bytes = await readFile(filePath);
    const headers = new Headers();

    headers.set('Cache-Control', 'no-store');
    headers.set('Content-Type', filePath.endsWith('.mp4') ? 'video/mp4' : filePath.endsWith('.png') ? 'image/png' : 'application/octet-stream');

    return new NextResponse(bytes, {headers});
  } catch {
    return new NextResponse('Not found', {status: 404});
  }
};
