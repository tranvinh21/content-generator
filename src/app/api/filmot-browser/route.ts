import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {writeLocalSettings} from '../../../lib/runtime-config';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['start', 'capture']),
});

const debugPort = 43124;
const profileDir = join(tmpdir(), 'blauberry-filmot-browser-profile');
const filmotUrl = 'https://filmot.com/search/%22Moment+mal%22/1?lang=de&hideDeleted=1&gridView=1&category=18';

const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const getBrowserPath = () => browserCandidates.find((candidate) => existsSync(candidate));

const waitForWsOpen = (ws: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), {once: true});
    ws.addEventListener('error', () => reject(new Error('Failed to connect to Filmot browser debug socket')), {once: true});
  });

const cdpCall = <T>(ws: WebSocket, id: number, method: string, params?: Record<string, unknown>) =>
  new Promise<T>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const payload = JSON.parse(String(event.data)) as {id?: number; result?: T; error?: {message?: string}};
      if (payload.id !== id) {
        return;
      }
      ws.removeEventListener('message', onMessage);
      if (payload.error) {
        reject(new Error(payload.error.message ?? `${method} failed`));
      } else {
        resolve(payload.result as T);
      }
    };

    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({id, method, params}));
  });

const getFilmotTargetWebSocket = async () => {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!response.ok) {
    throw new Error('Filmot browser is not running. Start it first.');
  }

  const targets = (await response.json()) as Array<{url?: string; webSocketDebuggerUrl?: string}>;
  const target = targets.find((item) => item.url?.includes('filmot.com')) ?? targets.find((item) => item.webSocketDebuggerUrl);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error('No debuggable Filmot browser tab found.');
  }

  return target.webSocketDebuggerUrl;
};

const captureFilmotCookies = async () => {
  const ws = new WebSocket(await getFilmotTargetWebSocket());
  await waitForWsOpen(ws);

  try {
    const cookiePayload = await cdpCall<{cookies: Array<{name: string; value: string; domain: string}>}>(
      ws,
      1,
      'Network.getAllCookies',
    );
    const userAgentPayload = await cdpCall<{result: {value?: string}}>(ws, 2, 'Runtime.evaluate', {
      expression: 'navigator.userAgent',
      returnByValue: true,
    });
    const cookies = cookiePayload.cookies
      .filter((cookie) => cookie.domain.includes('filmot.com'))
      .map((cookie) => `${cookie.name}=${cookie.value}`);

    if (cookies.length === 0) {
      throw new Error('No Filmot cookies found. Open Filmot and pass captcha first.');
    }

    const filmotCookie = cookies.join('; ');
    const filmotUserAgent = userAgentPayload.result.value;
    await writeLocalSettings({filmotCookie, ...(filmotUserAgent ? {filmotUserAgent} : {})});

    return {cookieCount: cookies.length};
  } finally {
    ws.close();
  }
};

export const POST = async (request: Request) => {
  try {
    const input = schema.parse(await request.json());

    if (input.action === 'start') {
      const browserPath = getBrowserPath();
      if (!browserPath) {
        throw new Error('Chrome, Brave, or Edge was not found in /Applications.');
      }

      await mkdir(profileDir, {recursive: true});
      const child = spawn(browserPath, [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        '--no-first-run',
        '--new-window',
        filmotUrl,
      ], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      return NextResponse.json({ok: true, message: 'Filmot browser opened. Pass captcha, then capture cookies.'});
    }

    const result = await captureFilmotCookies();

    return NextResponse.json({
      ok: true,
      message: `Captured ${result.cookieCount} Filmot cookies.`,
      cookieCount: result.cookieCount,
    });
  } catch (error) {
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Filmot browser action failed'},
      {status: 400},
    );
  }
};
