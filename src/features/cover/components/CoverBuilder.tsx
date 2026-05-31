'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';

type CoverResult = {
  downloadUrl: string;
  fileName: string;
};

export const CoverBuilder = () => {
  const [title, setTitle] = useState('100 câu tiếng Đức cơ bản 🇩🇪');
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<CoverResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Generate a reusable TikTok cover image.']);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const generate = async () => {
    setRendering(true);
    setResult(null);
    appendLogs(['Preparing cover render...']);

    try {
      const response = await fetch('/api/render-cover', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({title: title.trim() || '100 câu tiếng Đức cơ bản 🇩🇪'}),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        downloadUrl?: string;
        fileName?: string;
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.downloadUrl || !payload.fileName) {
        throw new Error(payload.message ?? 'Cover render failed');
      }

      setResult({downloadUrl: payload.downloadUrl, fileName: payload.fileName});
    } catch (error) {
      appendLogs([`Cover render failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="coverPage">
      <section className="panel coverComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={rendering || !title.trim()} type="button" onClick={generate}>
              {rendering ? 'Generating' : 'Generate cover'}
            </button>
          }
          eyebrow="Cover"
          title="TikTok cover image"
        />

        <div className="coverForm">
          <label>
            <span>Cover title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="postHints">
            <span>1080 x 1920 PNG</span>
            <span>Uses current background</span>
            <span>Uses current watermark</span>
          </div>
        </div>
      </section>

      <section className="panel coverPreview">
        <PanelHeader compact eyebrow="Output" title={result ? 'Ready' : 'Preview'} />
        {result ? (
          <div className="postGrid singleImageGrid">
            <article className="postCard">
              <img src={`${result.downloadUrl}?t=${Date.now()}`} alt="Generated cover" />
              <div className="postCardBody">
                <strong>{title}</strong>
                <a className="download" href={result.downloadUrl} download={result.fileName}>
                  Download PNG
                </a>
              </div>
            </article>
          </div>
        ) : (
          <div className="empty postEmpty">Generated cover image will appear here.</div>
        )}
      </section>

      <StatusPanel logs={logs} />
    </main>
  );
};

