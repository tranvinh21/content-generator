'use client';

import {useState} from 'react';

type PostImageResult = {
  term: string;
  downloadUrl: string;
  fileName: string;
  ipa: string;
  translationVi: string;
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

const parseTerms = (input: string) =>
  input
    .split(/\n|,/)
    .map((term) => term.trim())
    .filter(Boolean);

export const PostImageBuilder = () => {
  const [input, setInput] = useState('Guten Tag!\nMoment mal\nWie heißt du?');
  const [rendering, setRendering] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [images, setImages] = useState<PostImageResult[]>([]);
  const [logs, setLogs] = useState<string[]>(['Ready. Enter German words or phrases, one per line.']);

  const terms = parseTerms(input);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const generate = async () => {
    if (terms.length === 0) {
      appendLogs(['Enter at least one German word or phrase.']);
      return;
    }

    setRendering(true);
    setImages([]);
    appendLogs([`Preparing ${terms.length} post image${terms.length === 1 ? '' : 's'}...`]);

    try {
      const response = await fetch('/api/render-post-images', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({terms}),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        images?: PostImageResult[];
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.images) {
        throw new Error(payload.message ?? 'Post image generation failed');
      }

      setImages(payload.images);
    } catch (error) {
      appendLogs([`Post image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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

        const blob = await response.blob();
        const file = await directory.getFileHandle(image.fileName, {create: true});
        const writable = await file.createWritable();
        await writable.write(blob);
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
    <main className="postPage">
      <section className="panel postComposer">
        <header className="header">
          <div>
            <p className="eyebrow">German vocabulary post images</p>
            <h1>Generate normal posts</h1>
          </div>
          <button className="button accent" disabled={rendering || terms.length === 0} type="button" onClick={generate}>
            {rendering ? 'Generating' : `Generate ${terms.length || ''}`}
          </button>
        </header>

        <div className="postForm">
          <textarea
            className="postTextarea"
            value={input}
            placeholder="Guten Tag!\nMoment mal\nWie heißt du?"
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="postHints">
            <span>{terms.length} items</span>
            <span>1080 x 1080 PNG</span>
            <span>Uses current background + watermark</span>
          </div>
        </div>
      </section>

      <section className="panel postResults">
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
                <img src={`${image.downloadUrl}?t=${Date.now()}`} alt={`${image.term} post`} />
                <div className="postCardBody">
                  <strong>{image.term}</strong>
                  <span>{image.ipa}</span>
                  <span>{image.translationVi}</span>
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
