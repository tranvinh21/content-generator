import {relative} from 'node:path';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {materializeClip} from '../../../features/vocabulary/enrich';
import {createJobDir, jobsDir} from '../../../lib/job-paths';
import type {NormalizedClip} from '../../../providers/normalized-clip';

export const runtime = 'nodejs';

const schema = z.object({
  clip: z.unknown(),
});

export const POST = async (request: Request) => {
  try {
    const input = schema.parse(await request.json());
    const clip = input.clip as NormalizedClip;
    const {jobDir} = await createJobDir();
    const outputPath = `${jobDir}/clips/preview-${clip.id.replace(/[^a-z0-9_-]/gi, '-')}.mp4`;
    const fileUrl = await materializeClip(clip, outputPath);
    const filePath = fileUrl.startsWith('file://') ? new URL(fileUrl).pathname : fileUrl;

    if (!filePath.startsWith(jobsDir)) {
      return NextResponse.json({ok: true, previewUrl: fileUrl});
    }

    return NextResponse.json({
      ok: true,
      previewUrl: `/job-assets/${relative(jobsDir, filePath)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Preview prepare failed'},
      {status: 400},
    );
  }
};
