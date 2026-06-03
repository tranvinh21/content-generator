'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';

type CoverResult = {
  downloadUrl: string;
  fileName: string;
};

type CoverLine = {
  text: string;
  color: string;
};

export const CoverBuilder = () => {
  const [title, setTitle] = useState('SỬA NGAY NẾU BẠN ĐANG GIAO TIẾP NHƯ THẾ NÀY 🇩🇪');
  const [coverTemplate, setCoverTemplate] = useState<'photo' | 'myth'>('photo');
  const [subtitle, setSubtitle] = useState('(Phần 2)');
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
  const [coverImageName, setCoverImageName] = useState<string | undefined>();
  const [coverMascotUrl, setCoverMascotUrl] = useState<string | undefined>();
  const [coverMascotName, setCoverMascotName] = useState<string | undefined>();
  const [coverLayout, setCoverLayout] = useState<'balanced' | 'stacked'>('balanced');
  const [coverLines, setCoverLines] = useState<CoverLine[]>([
    {text: 'NGƯỜI ĐỨC', color: '#fffdf8'},
    {text: 'ĐẶT HỌ CHO TÊN GỌI', color: '#4f7cff'},
    {text: 'NHƯ THẾ NÀO?', color: '#fffdf8'},
  ]);
  const [coverTextColor, setCoverTextColor] = useState('#4f7cff');
  const [coverOverlayColor, setCoverOverlayColor] = useState('#080c12');
  const [coverOverlayOpacity, setCoverOverlayOpacity] = useState(0.48);
  const [coverMythMain, setCoverMythMain] = useState('FISCH');
  const [coverMythMeaning, setCoverMythMeaning] = useState('LÀ CÁ');
  const [coverMythTwist, setCoverMythTwist] = useState('NHƯNG CŨNG CÒN CÓ THỂ LÀ...');
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<CoverResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Generate a reusable TikTok cover image.']);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const updateCoverImage = (file: File | null) => {
    if (!file) {
      setCoverImageUrl(undefined);
      setCoverImageName(undefined);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCoverImageUrl(typeof reader.result === 'string' ? reader.result : undefined);
      setCoverImageName(file.name);
    });
    reader.readAsDataURL(file);
  };

  const updateCoverMascot = (file: File | null) => {
    if (!file) {
      setCoverMascotUrl(undefined);
      setCoverMascotName(undefined);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCoverMascotUrl(typeof reader.result === 'string' ? reader.result : undefined);
      setCoverMascotName(file.name);
    });
    reader.readAsDataURL(file);
  };

  const updateTemplate = (value: 'photo' | 'myth') => {
    setCoverTemplate(value);
    if (value === 'myth') {
      setCoverTextColor('#4f7cff');
      setCoverOverlayColor('#111111');
      setCoverOverlayOpacity(0.48);
    }
  };

  const generate = async () => {
    setRendering(true);
    setResult(null);
    appendLogs(['Preparing cover render...']);

    try {
      const response = await fetch('/api/render-cover', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          title: title.trim() || 'SỬA NGAY NẾU BẠN ĐANG GIAO TIẾP NHƯ THẾ NÀY 🇩🇪',
          coverTemplate,
          coverImageUrl,
          coverMascotUrl,
          coverLayout,
          coverLines: coverLayout === 'stacked' ? coverLines.filter((line) => line.text.trim()) : undefined,
          coverTextColor,
          coverOverlayColor,
          coverOverlayOpacity,
          coverSubtitle: subtitle.trim(),
          coverMythMain,
          coverMythMeaning,
          coverMythTwist,
        }),
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
            <span>Template</span>
            <select value={coverTemplate} onChange={(event) => updateTemplate(event.target.value as 'photo' | 'myth')}>
              <option value="photo">Photo cover</option>
              <option value="myth">Myth busting graphic</option>
            </select>
          </label>
          <label>
            <span>Cover title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Subtitle optional</span>
            <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          </label>
          {coverTemplate === 'photo' ? (
            <>
              <label>
                <span>Text layout</span>
                <select value={coverLayout} onChange={(event) => setCoverLayout(event.target.value as 'balanced' | 'stacked')}>
                  <option value="balanced">Balanced 2 lines</option>
                  <option value="stacked">Stacked 3 lines</option>
                </select>
              </label>
              {coverLayout === 'stacked' ? (
                <div className="coverLineEditor">
                  {coverLines.map((line, index) => (
                    <label key={index}>
                      <span>Line {index + 1}</span>
                      <input
                        value={line.text}
                        onChange={(event) =>
                          setCoverLines((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? {...item, text: event.target.value} : item)),
                          )
                        }
                      />
                      <input
                        value={line.color}
                        type="color"
                        onChange={(event) =>
                          setCoverLines((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? {...item, color: event.target.value} : item)),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <label>
                <span>Background image optional</span>
                <input accept="image/png,image/jpeg,image/webp,image/avif" type="file" onChange={(event) => updateCoverImage(event.target.files?.[0] ?? null)} />
              </label>
              {coverImageUrl ? (
                <div className="coverImagePreview">
                  <img src={coverImageUrl} alt={coverImageName ?? 'Cover background preview'} />
                  <div>
                    <strong>{coverImageName}</strong>
                    <button className="button secondary" type="button" onClick={() => updateCoverImage(null)}>
                      Clear image
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="coverMythEditor">
              <label>
                <span>Main word</span>
                <input value={coverMythMain} onChange={(event) => setCoverMythMain(event.target.value)} />
              </label>
              <label>
                <span>Meaning block</span>
                <input value={coverMythMeaning} onChange={(event) => setCoverMythMeaning(event.target.value)} />
              </label>
              <label>
                <span>Twist line</span>
                <input value={coverMythTwist} onChange={(event) => setCoverMythTwist(event.target.value)} />
              </label>
              <label>
                <span>Bottom image optional</span>
                <input accept="image/png,image/jpeg,image/webp,image/avif" type="file" onChange={(event) => updateCoverMascot(event.target.files?.[0] ?? null)} />
              </label>
              {coverMascotUrl ? (
                <div className="coverImagePreview">
                  <img src={coverMascotUrl} alt={coverMascotName ?? 'Cover bottom image preview'} />
                  <div>
                    <strong>{coverMascotName}</strong>
                    <button className="button secondary" type="button" onClick={() => updateCoverMascot(null)}>
                      Clear image
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div className="coverStyleGrid">
            <label>
              <span>Highlight color</span>
              <input value={coverTextColor} type="color" onChange={(event) => setCoverTextColor(event.target.value)} />
            </label>
            <label>
              <span>Mask color</span>
              <input value={coverOverlayColor} type="color" onChange={(event) => setCoverOverlayColor(event.target.value)} />
            </label>
            <label>
              <span>Mask opacity</span>
              <input
                max="0.78"
                min="0"
                step="0.02"
                type="range"
                value={coverOverlayOpacity}
                onChange={(event) => setCoverOverlayOpacity(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="postHints">
            <span>1080 x 1920 PNG</span>
            <span>{coverTemplate === 'myth' ? 'Graphic template' : coverImageUrl ? 'Uses uploaded image' : 'Uses current background'}</span>
            <span>Uses current watermark</span>
            <span>
              {coverTemplate === 'myth'
                ? 'Outline word, slanted meaning, black twist bar'
                : coverLayout === 'stacked'
                  ? 'Stacked title, middle line highlighted'
                  : 'Auto balances title into 2 lines'}
            </span>
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
