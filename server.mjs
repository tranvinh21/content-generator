import {createServer} from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {extname, join, resolve} from 'node:path';
import {spawn} from 'node:child_process';

const rootDir = process.cwd();
const publicDir = join(rootDir, 'public');
const outDir = join(rootDir, 'out');
const jobsDir = join(rootDir, 'render-jobs');
const port = Number(process.env.PORT ?? 43123);
const host = process.env.HOST ?? '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
};

const playphraseDefaults = {
  authorization: process.env.PLAYPHRASE_AUTHORIZATION ?? 'Token',
  cookie: process.env.PLAYPHRASE_COOKIE ?? 'ring-session=4a4441c1-c3e8-48e9-b682-49bf07382f0c',
  csrfToken:
    process.env.PLAYPHRASE_CSRF_TOKEN ??
    'cmf6ALYjeK3Xxi1Wobc1dIitdPqz+IjROylUqKHePZ+HQCkfROzIedaKmgSWlbgJogBBpd5HpkcmvFLF',
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(payload));
};

const readRequestBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
};

const normalizeSpreadsheetCell = (value) => {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('""', '"');
  }

  return trimmed.replaceAll('""', '"');
};

const tryJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseClipInput = (rawValue) => {
  const raw = rawValue.trim();

  if (!raw) {
    throw new Error('Paste video data JSON before generating.');
  }

  const direct = tryJsonParse(raw);
  if (direct) {
    return Array.isArray(direct) ? direct : [direct];
  }

  const normalized = normalizeSpreadsheetCell(raw);
  const normalizedJson = tryJsonParse(normalized);
  if (normalizedJson) {
    return Array.isArray(normalizedJson) ? normalizedJson : [normalizedJson];
  }

  const cells = raw
    .split(/\t|\n(?=\s*")/)
    .map(normalizeSpreadsheetCell)
    .map((cell) => cell.replace(/,\s*$/, ''))
    .filter((cell) => cell.startsWith('{') && cell.endsWith('}'));

  const parsedCells = cells.map(tryJsonParse).filter(Boolean);
  if (parsedCells.length > 0) {
    return parsedCells;
  }

  throw new Error('Could not parse clip data. Use a JSON object, JSON array, or pasted spreadsheet JSON cells.');
};

const ensureWords = (clip, phraseText) => {
  if (Array.isArray(clip.words) && clip.words.length > 0) {
    return clip;
  }

  const text = phraseText || clip.text || '';
  const words = text.split(/\s+/).filter(Boolean);
  const duration = Math.max(1200, Number(clip.end ?? 1200) - Number(clip.start ?? 0));
  const segment = duration / Math.max(1, words.length);

  return {
    ...clip,
    text,
    words: words.map((word, index) => ({
      start: Math.round(index * segment),
      end: Math.round((index + 0.86) * segment),
      score: 1,
      text: word,
      index,
      'searched?': true,
    })),
  };
};

const validateClips = (clips) => {
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error('At least one video clip is required.');
  }

  clips.forEach((clip, index) => {
    if (!clip || typeof clip !== 'object') {
      throw new Error(`Clip ${index + 1} is not an object.`);
    }

    if (typeof clip['video-url'] !== 'string' || clip['video-url'].length === 0) {
      throw new Error(`Clip ${index + 1} is missing video-url.`);
    }
  });
};

const extractClipsFromSearchResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of ['phrases', 'results', 'items', 'data']) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (Array.isArray(payload?.data?.phrases)) {
    return payload.data.phrases;
  }

  return [];
};

const handleSearch = async (request, response) => {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const query = String(body.query ?? '').trim();
    const limit = Math.min(50, Math.max(1, Number(body.limit ?? 10)));
    const language = String(body.language ?? 'de').trim() || 'de';

    if (!query) {
      throw new Error('Enter text before searching.');
    }

    const searchUrl = new URL('https://www.playphrase.me/api-langs/v1/phrases/search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('limit', String(limit));
    searchUrl.searchParams.set('language', language);
    searchUrl.searchParams.set('platform', 'desktop safari');
    searchUrl.searchParams.set('skip', '0');
    searchUrl.searchParams.set('hideHardOffensiveIn17Plus', 'false');
    searchUrl.searchParams.set('hideExplicitNudityIn17Plus', 'false');

    const searchResponse = await fetch(searchUrl, {
      headers: {
        accept: 'json',
        'accept-language': 'en-US,en;q=0.7',
        authorization: playphraseDefaults.authorization,
        'content-type': 'json',
        cookie: playphraseDefaults.cookie,
        priority: 'u=1, i',
        referer: 'https://www.playphrase.me/',
        'sec-ch-ua': '"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        'x-csrf-token': playphraseDefaults.csrfToken,
      },
    });

    const rawText = await searchResponse.text();
    const payload = tryJsonParse(rawText);

    if (!searchResponse.ok) {
      throw new Error(`Playphrase search failed (${searchResponse.status}): ${rawText.slice(0, 240)}`);
    }

    if (!payload) {
      throw new Error('Playphrase returned a non-JSON response.');
    }

    const clips = extractClipsFromSearchResponse(payload);

    validateClips(clips);

    sendJson(response, 200, {
      ok: true,
      clips,
      raw: payload,
      count: clips.length,
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      message: error instanceof Error ? error.message : 'Search failed.',
    });
  }
};

const runRender = ({outputPath, propsPath}) => {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'npx',
      ['remotion', 'render', 'src/index.ts', 'PhraseVideo', outputPath, '--props', propsPath],
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
        resolvePromise(log);
      } else {
        reject(new Error(log || `Render failed with exit code ${code}`));
      }
    });
  });
};

const createClipFileName = (clip, index, id) => {
  const sourceName = typeof clip['download-file-name'] === 'string' ? clip['download-file-name'] : '';
  const baseName = sourceName
    .replace(/\.mp4$/i, '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${String(index + 1).padStart(2, '0')}-${baseName || `clip-${index + 1}`}-${id}.mp4`;
};

const handleRender = async (request, response) => {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const phraseText = String(body.phraseText ?? '').trim();
    const layout = body.layout === 'vertical' ? 'vertical' : 'landscape';
    const showMovieInfo = body.showMovieInfo !== false;
    const gapMs = Number.isFinite(Number(body.gapMs)) ? Number(body.gapMs) : 360;
    const parsedClips = parseClipInput(String(body.videoData ?? ''));
    const clips = parsedClips.map((clip) => ensureWords(clip, phraseText));

    validateClips(clips);

    await mkdir(outDir, {recursive: true});
    await mkdir(jobsDir, {recursive: true});

    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const files = [];
    const logs = [];

    for (const [index, clip] of clips.entries()) {
      const propsPath = join(jobsDir, `${id}-${index + 1}.json`);
      const outputFileName = createClipFileName(clip, index, id);
      const outputPath = join(outDir, outputFileName);

      await writeFile(
        propsPath,
        JSON.stringify(
          {
            clips: [clip],
            layout,
            gapMs: 0,
            showMovieInfo,
          },
          null,
          2,
        ),
      );

      const log = await runRender({outputPath, propsPath});
      logs.push(`Clip ${index + 1}/${clips.length}\n${log.split('\n').slice(-10).join('\n')}`);
      files.push({
        clipIndex: index + 1,
        text: clip.text ?? phraseText,
        downloadUrl: `/out/${outputFileName}`,
        fileName: outputFileName,
      });
    }

    sendJson(response, 200, {
      ok: true,
      files,
      log: logs.join('\n\n').split('\n').slice(-36).join('\n'),
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      message: error instanceof Error ? error.message : 'Render failed.',
    });
  }
};

const serveFile = async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/sample') {
    const sampleClips = JSON.parse(await readFile(join(rootDir, 'src/data/sample-clips.json'), 'utf-8'));
    sendJson(response, 200, {clips: sampleClips});
    return;
  }

  if (pathname === '/api/search' && request.method === 'POST') {
    await handleSearch(request, response);
    return;
  }

  if (pathname === '/api/render' && request.method === 'POST') {
    await handleRender(request, response);
    return;
  }

  const baseDir = pathname.startsWith('/out/') ? outDir : publicDir;
  const relativePath = pathname.startsWith('/out/')
    ? pathname.replace('/out/', '')
    : pathname === '/'
      ? 'index.html'
      : pathname.slice(1);
  const filePath = resolve(baseDir, relativePath);

  if (!filePath.startsWith(resolve(baseDir)) || !existsSync(filePath)) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Not found');
    return;
  }

  const extension = extname(filePath);
  const content = await readFile(filePath);

  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
    'Cache-Control': pathname.startsWith('/out/') ? 'no-store' : 'public, max-age=60',
  });
  response.end(content);
};

createServer((request, response) => {
  serveFile(request, response).catch((error) => {
    sendJson(response, 500, {
      ok: false,
      message: error instanceof Error ? error.message : 'Server error.',
    });
  });
}).listen(port, host, () => {
  console.log(`Video generator UI: http://${host}:${port}`);
});
