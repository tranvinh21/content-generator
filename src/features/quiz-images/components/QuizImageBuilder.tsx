'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';
import type {QuizOption} from '../../quiz/types';

type QuizImageBlock = {
  id: string;
  questionDe: string;
  questionVi: string;
  illustrationUrl?: string;
  illustrationName?: string;
  options: QuizOption[];
};

type QuizImageResult = {
  questionDe: string;
  downloadUrl: string;
  fileName: string;
};

type DirectoryHandle = {
  getFileHandle: (name: string, options?: {create?: boolean}) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
};

const createBlock = (index: number): QuizImageBlock => ({
  id: crypto.randomUUID(),
  questionDe: index === 0 ? 'Welche Antwort passt zu "Keine Sorge"?' : '',
  questionVi: index === 0 ? 'Câu nào hợp với "Keine Sorge"?' : '',
  options:
    index === 0
      ? [
          {de: 'Mach dir keine Sorgen.', vi: 'Đừng lo.'},
          {de: 'Ich habe großen Hunger.', vi: 'Tôi rất đói.'},
          {de: 'Bis später.', vi: 'Hẹn gặp lại.'},
        ]
      : [
          {de: '', vi: ''},
          {de: '', vi: ''},
          {de: '', vi: ''},
        ],
});

export const QuizImageBuilder = () => {
  const [title, setTitle] = useState('Chọn đáp án trong comment');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [blocks, setBlocks] = useState<QuizImageBlock[]>(() => [createBlock(0)]);
  const [images, setImages] = useState<QuizImageResult[]>([]);
  const [logs, setLogs] = useState<string[]>(['Ready. Create quiz images for comment-based answers.']);
  const [exporting, setExporting] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const validBlocks = blocks.filter((block) => block.questionDe.trim() && block.options.every((option) => option.de.trim()));

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const updateBlock = (id: string, patch: Partial<QuizImageBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === id ? {...block, ...patch} : block)));
  };

  const updateOption = (blockId: string, optionIndex: number, field: keyof QuizOption, value: string) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId
          ? {...block, options: block.options.map((option, index) => (index === optionIndex ? {...option, [field]: value} : option))}
          : block,
      ),
    );
  };

  const setIllustration = (id: string, file: File | null) => {
    if (!file) {
      updateBlock(id, {illustrationUrl: undefined, illustrationName: undefined});
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(id, {
        illustrationUrl: typeof reader.result === 'string' ? reader.result : undefined,
        illustrationName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const exportImages = async () => {
    if (validBlocks.length === 0) {
      appendLogs(['Fill at least one question with three German options.']);
      return;
    }

    setExporting(true);
    setImages([]);
    appendLogs([`Exporting ${validBlocks.length} quiz image${validBlocks.length === 1 ? '' : 's'}...`]);

    try {
      const response = await fetch('/api/render-quiz-images', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          title,
          includeWatermark,
          items: validBlocks.map(({id: _id, illustrationName: _illustrationName, ...block}) => block),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        images?: QuizImageResult[];
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.images) {
        throw new Error(payload.message ?? 'Quiz image export failed');
      }

      setImages(payload.images);
    } catch (error) {
      appendLogs([`Quiz image export failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setExporting(false);
    }
  };

  const fallbackDownloadAll = () => {
    images.forEach((image, index) => {
      window.setTimeout(() => {
        const link = document.createElement('a');
        link.href = image.downloadUrl;
        link.download = image.fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }, index * 160);
    });
  };

  const downloadAllToFolder = async () => {
    if (images.length === 0) {
      return;
    }

    setDownloadingAll(true);
    appendLogs([`Downloading ${images.length} images...`]);

    try {
      const directoryPicker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
      if (!directoryPicker) {
        appendLogs(['Folder picker is not available in this browser. Downloading files one by one instead.']);
        fallbackDownloadAll();
        return;
      }

      const directory = await directoryPicker();
      for (const image of images) {
        const response = await fetch(image.downloadUrl);
        if (!response.ok) {
          throw new Error(`Could not fetch ${image.fileName}`);
        }

        const file = await directory.getFileHandle(image.fileName, {create: true});
        const writable = await file.createWritable();
        await writable.write(await response.blob());
        await writable.close();
      }

      appendLogs([`Saved ${images.length} images to selected folder.`]);
    } catch (error) {
      appendLogs([`Download all failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <main className="quizImagePage">
      <section className="panel quizComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={exporting || validBlocks.length === 0} type="button" onClick={exportImages}>
              {exporting ? 'Exporting' : `Export ${validBlocks.length || ''}`}
            </button>
          }
          eyebrow="Quiz Images"
          title="Comment answer posts"
        />

        <div className="quizForm">
          <label>
            <span>Post title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="checkboxLine">
            <input checked={includeWatermark} type="checkbox" onChange={(event) => setIncludeWatermark(event.target.checked)} />
            <span>Include watermark</span>
          </label>

          <div className="quizBlocks">
            {blocks.map((block, blockIndex) => (
              <article className="quizBlock" key={block.id}>
                <div className="quizBlockHeader">
                  <strong>Image {blockIndex + 1}</strong>
                  {blocks.length > 1 ? (
                    <button className="button secondary" type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <label>
                  <span>Question German</span>
                  <textarea value={block.questionDe} onChange={(event) => updateBlock(block.id, {questionDe: event.target.value})} />
                </label>
                <label>
                  <span>Question Vietnamese</span>
                  <textarea value={block.questionVi} onChange={(event) => updateBlock(block.id, {questionVi: event.target.value})} />
                </label>
                <label>
                  <span>Illustration optional</span>
                  <input accept="image/*" type="file" onChange={(event) => setIllustration(block.id, event.target.files?.[0] ?? null)} />
                </label>
                {block.illustrationUrl ? (
                  <div className="quizIllustrationPreview">
                    <img src={block.illustrationUrl} alt={block.illustrationName ?? 'Illustration preview'} />
                    <button className="button secondary" type="button" onClick={() => setIllustration(block.id, null)}>
                      Clear image
                    </button>
                  </div>
                ) : null}

                <div className="quizOptions">
                  {block.options.map((option, optionIndex) => (
                    <div className="quizOptionEdit" key={optionIndex}>
                      <strong>Option {optionIndex + 1}</strong>
                      <input
                        placeholder="German answer"
                        value={option.de}
                        onChange={(event) => updateOption(block.id, optionIndex, 'de', event.target.value)}
                      />
                      <input
                        placeholder="Vietnamese translation"
                        value={option.vi}
                        onChange={(event) => updateOption(block.id, optionIndex, 'vi', event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <button className="button primary" type="button" onClick={() => setBlocks((current) => [...current, createBlock(current.length)])}>
            Add image
          </button>
          <div className="postHints">
            <span>{validBlocks.length} ready images</span>
            <span>1080 x 1350 PNG</span>
            <span>{includeWatermark ? 'Includes watermark' : 'No watermark'}</span>
            <span>No correct answer shown</span>
          </div>
        </div>
      </section>

      <section className="panel postResults">
        <PanelHeader
          compact
          actions={
            images.length > 0 ? (
              <button className="button secondary" disabled={downloadingAll} type="button" onClick={downloadAllToFolder}>
                {downloadingAll ? 'Saving' : 'Download all as folder'}
              </button>
            ) : null
          }
          eyebrow="Output"
          title={`${images.length} images`}
        />
        {images.length > 0 ? (
          <div className="postGrid">
            {images.map((image) => (
              <article className="postCard" key={image.downloadUrl}>
                <img className="quizImagePreview" src={`${image.downloadUrl}?t=${Date.now()}`} alt={`${image.questionDe} quiz`} />
                <div className="postCardBody">
                  <strong>{image.questionDe}</strong>
                  <a className="download" href={image.downloadUrl} download={image.fileName}>
                    Download PNG
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty postEmpty">Exported quiz images will appear here.</div>
        )}
      </section>

      <StatusPanel logs={logs} />
    </main>
  );
};

