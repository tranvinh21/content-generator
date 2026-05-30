import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';

export const rootDir = process.cwd();
export const outDir = join(rootDir, 'out');
export const jobsDir = join(rootDir, 'tmp', 'jobs');
export const assetsDir = join(rootDir, 'assets');
export const sourceAssetsDir = join(rootDir, 'src', 'asset');

export const createJobDir = async () => {
  const jobId = new Date().toISOString().replace(/[:.]/g, '-');
  const jobDir = join(jobsDir, jobId);

  await mkdir(join(jobDir, 'audio'), {recursive: true});
  await mkdir(join(jobDir, 'clips'), {recursive: true});
  await mkdir(join(jobDir, 'props'), {recursive: true});
  await mkdir(outDir, {recursive: true});

  return {jobId, jobDir};
};
