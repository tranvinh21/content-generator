import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {assetsDir, createJobDir, jobsDir, outDir, rootDir, sourceAssetsDir} from '../../../lib/job-paths';
import {generateVoice, getAssetUrl} from '../../../features/vocabulary/enrich';
import type {QuizVideoProps} from '../../../features/quiz/types';

export const runtime = 'nodejs';

const optionSchema = z.object({
  de: z.string().trim().min(1).max(140),
  vi: z.string().trim().max(180).default(''),
});

const itemSchema = z.object({
  questionDe: z.string().trim().min(1).max(220),
  questionVi: z.string().trim().max(260).default(''),
  illustrationUrl: z.string().max(8_000_000).optional(),
  options: z.array(optionSchema).length(3),
  correctIndex: z.number().int().min(0).max(2),
});

const schema = z.object({
  title: z.string().trim().min(1).max(90),
  items: z.array(itemSchema).min(1).max(30),
});

const runRender = (outputPath: string, propsPath: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'render', 'src/index.ts', 'QuizVideo', outputPath, '--props', propsPath], {
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
        reject(new Error(log || `Quiz render failed with exit code ${code}`));
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
    const outroPath = firstExistingAsset('out.mp4', 'outro.mp4', 'out.mov', 'outro.mov');
    const tickAssetPath = firstExistingAsset('ticktick.mp3', 'tick-tick.mp3', 'tick.mp3', 'ticktock.mp3', 'tick-tock.wav');
    const successAssetPath = firstExistingAsset('success.mp3', 'success.wav', 'correct.mp3', 'correct.wav', 'ding.mp3');

    logs.push(`Preparing ${input.items.length} quiz questions...`);
    const renderedItems = [];
    for (const [index, item] of input.items.entries()) {
      const audioPath = join(jobDir, 'audio', `question-${index + 1}.mp3`);
      logs.push(`[${index + 1}] Generating German question voice...`);
      const voice = await generateVoice(item.questionDe, audioPath);
      const audioFrames = Math.max(42, (await getAudioDurationFrames(audioPath)) ?? estimateQuestionFrames(item.questionDe));
      if (voice.provider !== 'elevenlabs' && voice.error) {
        logs.push(`[${index + 1}] ElevenLabs fallback: ${voice.error}`);
      }
      const correctAnswer = item.options[item.correctIndex]?.de ?? '';
      const correctAudioPath = join(jobDir, 'audio', `answer-${index + 1}.mp3`);
      logs.push(`[${index + 1}] Generating correct answer voice...`);
      const correctVoice = await generateVoice(correctAnswer, correctAudioPath);
      const correctAudioFrames = Math.max(24, (await getAudioDurationFrames(correctAudioPath)) ?? estimateQuestionFrames(correctAnswer));
      if (correctVoice.provider !== 'elevenlabs' && correctVoice.error) {
        logs.push(`[${index + 1}] Correct answer fallback: ${correctVoice.error}`);
      }

      renderedItems.push({
        ...item,
        audioUrl: getServedJobUrl(voice.url, request.url),
        audioFrames,
        correctAudioUrl: getServedJobUrl(correctVoice.url, request.url),
        correctAudioFrames,
      });
    }

    let tickAudioUrl = getServedAssetUrl(tickAssetPath, request.url);
    if (tickAudioUrl) {
      logs.push('Tick audio ready from ticktick asset.');
    } else {
      const tickPath = join(jobDir, 'audio', 'tick.wav');
      await writeTickWav(tickPath, 2.5);
      tickAudioUrl = getServedJobUrl(tickPath, request.url);
      logs.push('Tick audio ready from generated fallback.');
    }
    if (successAssetPath) {
      logs.push('Success audio ready from success asset.');
    }

    const props: QuizVideoProps = {
      title: input.title,
      items: renderedItems,
      tickAudioUrl,
      successAudioUrl: getServedAssetUrl(successAssetPath, request.url),
      backgroundUrl: getServedAssetUrl(backgroundPath, request.url),
      watermarkUrl: getServedAssetUrl(watermarkPath, request.url),
      outroUrl: getServedAssetUrl(outroPath, request.url),
      outroFrames: outroPath ? await getVideoDurationFrames(outroPath) : undefined,
    };
    const propsPath = join(jobDir, 'props', 'quiz.json');
    const outputFileName = `quiz-${slugify(input.title)}-${jobId}.mp4`;
    const outputPath = join(outDir, outputFileName);

    await writeFile(propsPath, JSON.stringify(props, null, 2));
    logs.push('Rendering quiz video...');
    const renderLog = await runRender(outputPath, propsPath);
    logs.push(...renderLog.split('\n').slice(-12));

    return NextResponse.json({
      ok: true,
      downloadUrl: `/out/${outputFileName}`,
      fileName: outputFileName,
      durationSeconds: Math.round((props.items.reduce((total, item) => total + Math.max(42, item.audioFrames) + 90 + Math.max(36, (item.correctAudioFrames ?? 0) + 30) + 18, 0) + (props.outroUrl ? props.outroFrames ?? 90 : 0)) / 30),
      audioProvider: 'elevenlabs/macos',
      logs,
    });
  } catch (error) {
    logs.push(error instanceof Error ? error.message : 'Quiz render failed');
    return NextResponse.json(
      {ok: false, message: error instanceof Error ? error.message : 'Quiz render failed', logs},
      {status: 400},
    );
  }
};

const writeTickWav = async (filePath: string, durationSeconds: number) => {
  const sampleRate = 44100;
  const samples = Math.floor(durationSeconds * sampleRate);
  const data = Buffer.alloc(samples * 2);
  const pulseStarts = [0, 0.5, 1, 1.5, 2];

  for (let i = 0; i < samples; i += 1) {
    const time = i / sampleRate;
    const pulseStart = pulseStarts.find((start) => time >= start && time < start + 0.055);
    const pulseTime = pulseStart === undefined ? -1 : time - pulseStart;
    const envelope = pulseTime >= 0 ? Math.exp(-pulseTime * 38) : 0;
    const click = Math.sin(2 * Math.PI * 1320 * time) * 0.34 + Math.sin(2 * Math.PI * 660 * time) * 0.16;
    const sample = Math.round(click * envelope * 32767);
    data.writeInt16LE(sample, i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  await writeFile(filePath, Buffer.concat([header, data]));
};

const getAudioDurationFrames = (filePath: string) =>
  new Promise<number | undefined>((resolve) => {
    const child = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.on('error', () => resolve(undefined));
    child.on('close', (code) => {
      const durationSeconds = Number.parseFloat(output.trim());
      resolve(code === 0 && Number.isFinite(durationSeconds) ? Math.max(1, Math.round(durationSeconds * 30)) : undefined);
    });
  });

const getVideoDurationFrames = (filePath: string) =>
  new Promise<number | undefined>((resolve) => {
    const child = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.on('error', () => resolve(undefined));
    child.on('close', (code) => {
      const durationSeconds = Number.parseFloat(output.trim());
      resolve(code === 0 && Number.isFinite(durationSeconds) ? Math.max(30, Math.round(durationSeconds * 30)) : undefined);
    });
  });

const estimateQuestionFrames = (text: string) => Math.round(Math.max(1.4, text.split(/\s+/).length / 2.25) * 30);

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

const getServedJobUrl = (fileUrlOrPath: string | undefined, requestUrl: string) => {
  if (!fileUrlOrPath) {
    return undefined;
  }

  const filePath = fileUrlOrPath.startsWith('file://') ? new URL(fileUrlOrPath).pathname : fileUrlOrPath;
  if (filePath.startsWith(jobsDir)) {
    return new URL(`/job-assets/${relative(jobsDir, filePath)}`, requestUrl).toString();
  }

  return fileUrlOrPath;
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'quiz';
