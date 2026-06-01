'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';

type EngagementCardResult = {
  downloadUrl: string;
  fileName: string;
};

const defaultCopy = {
  title: 'Lưu lại để học dần nhé',
  subtitle: 'Follow BlauBerry để mỗi ngày gặp thêm một sắc thái tiếng Đức dễ nhớ.',
  primaryCta: 'Like',
  secondaryCta: 'Follow',
  handle: '@BlauBerry',
};

export const EngagementCardBuilder = () => {
  const [copy, setCopy] = useState(defaultCopy);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [image, setImage] = useState<EngagementCardResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Create a final image for likes and follows.']);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const updateCopy = (field: keyof typeof copy, value: string) => {
    setCopy((current) => ({...current, [field]: value}));
  };

  const generate = async () => {
    setRendering(true);
    setImage(null);
    appendLogs(['Preparing engagement card...']);

    try {
      const response = await fetch('/api/render-engagement-card', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({...copy, includeWatermark}),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        image?: EngagementCardResult;
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.image) {
        throw new Error(payload.message ?? 'Engagement card generation failed');
      }

      setImage(payload.image);
    } catch (error) {
      appendLogs([`Engagement card generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="postPage engagementPage">
      <section className="panel postComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={rendering} type="button" onClick={generate}>
              {rendering ? 'Generating' : 'Generate'}
            </button>
          }
          eyebrow="End card"
          title="Like & follow image"
        />

        <div className="engagementForm">
          <label>
            <span>Title</span>
            <input value={copy.title} onChange={(event) => updateCopy('title', event.target.value)} />
          </label>
          <label>
            <span>Subtitle</span>
            <textarea value={copy.subtitle} onChange={(event) => updateCopy('subtitle', event.target.value)} />
          </label>
          <div className="engagementSplit">
            <label>
              <span>Primary CTA optional</span>
              <input value={copy.primaryCta} onChange={(event) => updateCopy('primaryCta', event.target.value)} />
            </label>
            <label>
              <span>Secondary CTA optional</span>
              <input value={copy.secondaryCta} onChange={(event) => updateCopy('secondaryCta', event.target.value)} />
            </label>
          </div>
          <label>
            <span>Handle</span>
            <input value={copy.handle} onChange={(event) => updateCopy('handle', event.target.value)} />
          </label>
          <div className="postHints">
            <span>1080 x 1080 PNG</span>
            <span>{includeWatermark ? 'Uses current watermark' : 'No watermark'}</span>
            <span>Good as final carousel slide</span>
          </div>
          <label className="checkboxLine">
            <input checked={includeWatermark} type="checkbox" onChange={(event) => setIncludeWatermark(event.target.checked)} />
            <span>Include watermark</span>
          </label>
        </div>
      </section>

      <section className="panel postResults">
        <PanelHeader compact eyebrow="Output" title={image ? 'Ready' : 'Preview'} />

        {image ? (
          <div className="postGrid singleImageGrid">
            <article className="postCard">
              <img src={`${image.downloadUrl}?t=${Date.now()}`} alt="Engagement end card" />
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
          <div className="empty postEmpty">Generated end card will appear here.</div>
        )}
      </section>

      <StatusPanel logs={logs} />
    </main>
  );
};
