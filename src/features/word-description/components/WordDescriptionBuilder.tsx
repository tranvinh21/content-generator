'use client';

import {useState} from 'react';

type WordDescriptionBlock = {
  id: string;
  german: string;
  vietnamese: string;
  example: string;
  exampleVi: string;
  illustrationUrl?: string;
  illustrationName?: string;
};

type WordDescriptionResult = Omit<WordDescriptionBlock, 'id'> & {
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

const createBlock = (index: number): WordDescriptionBlock => ({
  id: crypto.randomUUID(),
  german: index === 0 ? 'die Bank' : '',
  vietnamese: index === 0 ? 'ngân hàng / ghế dài' : '',
  example: index === 0 ? 'Ich sitze auf der Bank im Park.' : '',
  exampleVi: index === 0 ? 'Tôi ngồi trên chiếc ghế dài trong công viên.' : '',
});

export const WordDescriptionBuilder = () => {
  const [blocks, setBlocks] = useState<WordDescriptionBlock[]>(() => [createBlock(0)]);
  const [images, setImages] = useState<WordDescriptionResult[]>([]);
  const [logs, setLogs] = useState<string[]>(['Ready. Each block will generate one word example image.']);
  const [rendering, setRendering] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  const validBlocks = blocks.filter(
    (block) => block.german.trim() && block.vietnamese.trim() && block.example.trim() && block.exampleVi.trim(),
  );

  const updateBlock = (id: string, patch: Partial<WordDescriptionBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === id ? {...block, ...patch} : block)));
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

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const generate = async () => {
    if (validBlocks.length === 0) {
      appendLogs(['Fill German word, Vietnamese sense, example, and example translation in at least one block.']);
      return;
    }

    setRendering(true);
    setImages([]);
    appendLogs([`Preparing ${validBlocks.length} word example image${validBlocks.length === 1 ? '' : 's'}...`]);

    try {
      const response = await fetch('/api/render-word-description', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          blocks: validBlocks.map(({id: _id, illustrationName: _illustrationName, ...block}) => block),
          includeWatermark,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        images?: WordDescriptionResult[];
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.images) {
        throw new Error(payload.message ?? 'Word example generation failed');
      }

      setImages(payload.images);
    } catch (error) {
      appendLogs([`Word example generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
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
    <main className="contrastPage">
      <section className="panel contrastComposer">
        <header className="header">
          <div>
            <p className="eyebrow">Word example posts</p>
            <h1>Word, sense, example</h1>
          </div>
          <div className="toolbar">
            <button className="button secondary" type="button" onClick={() => setBlocks((current) => [...current, createBlock(current.length)])}>
              Add block
            </button>
            <button className="button accent" disabled={rendering || validBlocks.length === 0} type="button" onClick={generate}>
              {rendering ? 'Generating' : `Generate ${validBlocks.length || ''}`}
            </button>
          </div>
        </header>

        <div className="contrastOptions">
          <label className="checkboxLine">
            <input checked={includeWatermark} type="checkbox" onChange={(event) => setIncludeWatermark(event.target.checked)} />
            <span>Include watermark</span>
          </label>
        </div>

        <div className="contrastBlocks">
          {blocks.map((block, index) => (
            <article className="contrastBlock" key={block.id}>
              <div className="contrastBlockHeader">
                <div className="index">{index + 1}</div>
                <strong>One image block</strong>
                {blocks.length > 1 ? (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="contrastFields wordDescriptionFields">
                <label className="illustrationField">
                  <span>Illustration image</span>
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => setIllustration(block.id, event.target.files?.[0] ?? null)}
                  />
                  {block.illustrationUrl ? (
                    <div className="illustrationPreview">
                      <img src={block.illustrationUrl} alt={block.illustrationName ?? 'Illustration preview'} />
                      <button className="button secondary" type="button" onClick={() => setIllustration(block.id, null)}>
                        Clear image
                      </button>
                    </div>
                  ) : (
                    <div className="illustrationPlaceholder">Uses default illustration</div>
                  )}
                </label>
                <label>
                  <span>German word</span>
                  <input value={block.german} onChange={(event) => updateBlock(block.id, {german: event.target.value})} />
                </label>
                <label>
                  <span>Vietnamese sense</span>
                  <input value={block.vietnamese} onChange={(event) => updateBlock(block.id, {vietnamese: event.target.value})} />
                </label>
                <label className="wideField">
                  <span>German example</span>
                  <textarea
                    value={block.example}
                    onChange={(event) => updateBlock(block.id, {example: event.target.value})}
                  />
                </label>
                <label className="wideField">
                  <span>Vietnamese example translation</span>
                  <textarea
                    value={block.exampleVi}
                    onChange={(event) => updateBlock(block.id, {exampleVi: event.target.value})}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel contrastResults">
        <header className="header compactHeader">
          <div>
            <p className="eyebrow">Output</p>
            <h1>{images.length} images</h1>
          </div>
          {images.length > 0 ? (
            <button className="button secondary" disabled={downloadingAll} type="button" onClick={downloadAllToFolder}>
              {downloadingAll ? 'Saving' : 'Download all as folder'}
            </button>
          ) : null}
        </header>

        {images.length > 0 ? (
          <div className="postGrid">
            {images.map((image) => (
              <article className="postCard" key={image.downloadUrl}>
                <img src={`${image.downloadUrl}?t=${Date.now()}`} alt={`${image.german} word example`} />
                <div className="postCardBody">
                  <strong>{image.german}</strong>
                  <span>{image.vietnamese}</span>
                  <a className="download" href={image.downloadUrl} download={image.fileName}>
                    Download PNG
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty postEmpty">Generated images will appear here.</div>
        )}
      </section>

      <aside className="panel postLog">
        <header className="header compactHeader">
          <div>
            <p className="eyebrow">Log</p>
            <h1>Status</h1>
          </div>
        </header>
        <pre className="log">{logs.join('\n')}</pre>
      </aside>
    </main>
  );
};
