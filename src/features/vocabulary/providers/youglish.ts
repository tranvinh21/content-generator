import {runInNewContext} from 'node:vm';
import {normalizeYouglishResult} from '../../../providers/youglish-normalize';
import type {YouglishSearchResultInput} from '../../../providers/normalized-clip';

type YouglishRawResult = {
  display?: string;
  vid?: string;
  start?: string | number;
  end?: string | number;
  id?: string;
};

type YouglishPayload = {
  results?: YouglishRawResult[];
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const stripTags = (value: string) =>
  decodeHtmlEntities(value)
    .replace(/\\"/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeJavascriptString = (value: string) => {
  try {
    return runInNewContext(`'${value}'`, {}, {timeout: 50}) as string;
  } catch {
    return value
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\\\\\"/g, '\\"')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }
};

const parseSeconds = (value: string | number | undefined) => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return 0;
  }

  const seconds = Number.parseFloat(value);

  return Number.isFinite(seconds) ? seconds : 0;
};

const extractJsonData = (html: string): YouglishPayload | null => {
  const match = /params\.jsonData\s*=\s*'([\s\S]*?)';/.exec(html);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(decodeJavascriptString(match[1])) as YouglishPayload;
  } catch {
    return null;
  }
};

export const searchYouglish = async (query: string, language = 'de') => {
  const languagePath = language === 'de' ? 'german' : language;
  const searchUrl = new URL(`https://youglish.com/pronounce/${encodeURIComponent(query)}/${languagePath}/all/cptc=1`);
  const response = await fetch(searchUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`YouGlish failed (${response.status}): ${html.slice(0, 180)}`);
  }

  const payload = extractJsonData(html);
  const results: YouglishSearchResultInput[] = (payload?.results ?? [])
    .filter((item) => item.vid)
    .map((item) => ({
      videoId: item.vid ?? '',
      startSeconds: parseSeconds(item.start),
      endSeconds: parseSeconds(item.end) || undefined,
      displayText: stripTags(item.display ?? query),
      resultUrl: searchUrl.toString(),
      raw: item,
    }));
  const clips = results.slice(0, 10).map((result) => normalizeYouglishResult(result, query, language));

  return {
    clips,
    log: `[${query}] YouGlish found ${clips.length} clips`,
  };
};
