'use client';

import {useState} from 'react';

type PhraseBlock = {
  id: string;
  informalGerman: string;
  informalVi: string;
  formalGerman: string;
  formalVi: string;
  illustrationUrl?: string;
  illustrationName?: string;
};

type FormalContrastResult = Omit<PhraseBlock, 'id'> & {
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

const createBlock = (index: number): PhraseBlock => ({
  id: crypto.randomUUID(),
  informalGerman: index === 0 ? 'Kannst du mir helfen?' : '',
  informalVi: index === 0 ? 'Bạn giúp tôi được không?' : '',
  formalGerman: index === 0 ? 'Könnten Sie mir bitte helfen?' : '',
  formalVi: index === 0 ? 'Bạn có thể vui lòng giúp tôi không?' : '',
});

export const FormalContrastBuilder = () => {
  const [blocks, setBlocks] = useState<PhraseBlock[]>(() => [createBlock(0)]);
  const [images, setImages] = useState<FormalContrastResult[]>([]);
  const [logs, setLogs] = useState<string[]>(['Ready. Each block will generate one formal contrast image.']);
  const [rendering, setRendering] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  const validBlocks = blocks.filter(
    (block) => block.informalGerman.trim() && block.informalVi.trim() && block.formalGerman.trim() && block.formalVi.trim(),
  );

  const updateBlock = (id: string, patch: Partial<PhraseBlock>) => {
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
      appendLogs(['Fill all four fields in at least one block.']);
      return;
    }

    setRendering(true);
    setImages([]);
    appendLogs([`Preparing ${validBlocks.length} formal contrast image${validBlocks.length === 1 ? '' : 's'}...`]);

    try {
      const response = await fetch('/api/render-formal-contrast', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          blocks: validBlocks.map(({id: _id, illustrationName: _illustrationName, ...block}) => block),
          includeWatermark,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        images?: FormalContrastResult[];
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.images) {
        throw new Error(payload.message ?? 'Formal contrast generation failed');
      }

      setImages(payload.images);
    } catch (error) {
      appendLogs([`Formal contrast generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
            <p className="eyebrow">Formal contrast posts</p>
            <h1>Describe the same act</h1>
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

              <div className="contrastFields">
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
                  <span>Informal German</span>
                  <input
                    value={block.informalGerman}
                    onChange={(event) => updateBlock(block.id, {informalGerman: event.target.value})}
                  />
                </label>
                <label>
                  <span>Informal Vietnamese</span>
                  <input value={block.informalVi} onChange={(event) => updateBlock(block.id, {informalVi: event.target.value})} />
                </label>
                <label>
                  <span>Formal German</span>
                  <input value={block.formalGerman} onChange={(event) => updateBlock(block.id, {formalGerman: event.target.value})} />
                </label>
                <label>
                  <span>Formal Vietnamese</span>
                  <input value={block.formalVi} onChange={(event) => updateBlock(block.id, {formalVi: event.target.value})} />
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
                <img src={`${image.downloadUrl}?t=${Date.now()}`} alt={`${image.formalGerman} formal contrast`} />
                <div className="postCardBody">
                  <strong>{image.formalGerman}</strong>
                  <span>{image.formalVi}</span>
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
