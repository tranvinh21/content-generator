import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getConfigStatus, parseProviderCurl, writeLocalSettings} from '../../../lib/runtime-config';

export const runtime = 'nodejs';

const schema = z.object({
  curl: z.string().optional(),
});

export const GET = async () => {
  return NextResponse.json({ok: true, status: await getConfigStatus()});
};

export const POST = async (request: Request) => {
  const input = schema.parse(await request.json());
  const fromCurl = input.curl ? parseProviderCurl(input.curl) : {};
  const saved = await writeLocalSettings(fromCurl);
  const savedKeys = Object.keys(saved).filter((key) => Boolean(saved[key as keyof typeof saved]));

  return NextResponse.json({
    ok: true,
    savedKeys,
    status: await getConfigStatus(),
  });
};
