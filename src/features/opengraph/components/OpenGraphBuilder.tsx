'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';

type OpenGraphResult = {
  downloadUrl: string;
  fileName: string;
};

const defaultCopy = {
  title: 'Tại Sao Là "in der Schule" Nhưng Lại Là "in die Schule"? Giải Thích Giới Từ Hai Chiều Trong Tiếng Đức',
  eyebrow: 'German grammar',
  subtitle: 'Một ghi chú ngắn để hiểu đúng sắc thái tiếng Đức.',
  footer: 'BlauBerry Deutsch',
};

export const OpenGraphBuilder = () => {
  const [copy, setCopy] = useState(defaultCopy);
  const [rendering, setRendering] = useState(false);
  const [image, setImage] = useState<OpenGraphResult | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'Ready. Enter a blog title. Terms inside quotes will be used as the comparison chips.',
  ]);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const updateCopy = (field: keyof typeof copy, value: string) => {
    setCopy((current) => ({...current, [field]: value}));
  };

  const generate = async () => {
    setRendering(true);
    setImage(null);
    appendLogs(['Preparing OpenGraph image...']);

    try {
      const response = await fetch('/api/render-opengraph', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(copy),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        image?: OpenGraphResult;
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.image) {
        throw new Error(payload.message ?? 'OpenGraph generation failed');
      }

      setImage(payload.image);
    } catch (error) {
      appendLogs([`OpenGraph generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="postPage opengraphPage">
      <section className="panel postComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={rendering || !copy.title.trim()} type="button" onClick={generate}>
              {rendering ? 'Generating' : 'Generate'}
            </button>
          }
          eyebrow="Blog OpenGraph"
          title="Generate OG image"
        />

        <div className="engagementForm">
          <label>
            <span>Blog title</span>
            <textarea value={copy.title} onChange={(event) => updateCopy('title', event.target.value)} />
          </label>
          <label>
            <span>Eyebrow</span>
            <input value={copy.eyebrow} onChange={(event) => updateCopy('eyebrow', event.target.value)} />
          </label>
          <label>
            <span>Subtitle</span>
            <textarea value={copy.subtitle} onChange={(event) => updateCopy('subtitle', event.target.value)} />
          </label>
          <label>
            <span>Footer</span>
            <input value={copy.footer} onChange={(event) => updateCopy('footer', event.target.value)} />
          </label>
          <div className="postHints">
            <span>1200 x 630 PNG</span>
            <span>Quotes become comparison chips</span>
            <span>Uses current background + new watermark</span>
          </div>
        </div>
      </section>

      <section className="panel postResults">
        <PanelHeader compact eyebrow="Output" title={image ? 'Ready' : 'Preview'} />

        {image ? (
          <div className="postGrid opengraphGrid">
            <article className="postCard">
              <img className="opengraphPreview" src={`${image.downloadUrl}?t=${Date.now()}`} alt="Blog OpenGraph" />
              <div className="postCardBody">
                <strong>{copy.title}</strong>
                <span>{copy.subtitle}</span>
                <a className="download" href={image.downloadUrl} download={image.fileName}>
                  Download PNG
                </a>
              </div>
            </article>
          </div>
        ) : (
          <div className="empty postEmpty">Generated OpenGraph image will appear here.</div>
        )}
      </section>

      <StatusPanel eyebrow="Format" logs={logs} title="Rules">
        <div className="ogRules">
          <strong>Common format</strong>
          <span>Eyebrow: content category, e.g. German grammar</span>
          <span>Title: full blog headline</span>
          <span>Chips: first two quoted terms, e.g. in der Schule / in die Schule</span>
          <span>Footer + watermark: stable BlauBerry branding</span>
        </div>
      </StatusPanel>
    </main>
  );
};
