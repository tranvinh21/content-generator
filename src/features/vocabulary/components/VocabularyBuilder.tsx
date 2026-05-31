'use client';

import {useMemo, useRef, useState} from 'react';
import type {NormalizedClip} from '../../../providers/normalized-clip';

type WordBlock = {
  id: string;
  term: string;
  clips: NormalizedClip[];
  selected: string[];
  searching: boolean;
  resultsOpen: boolean;
};

const createBlock = (index: number): WordBlock => ({
  id: crypto.randomUUID(),
  term: index === 0 ? 'Moment mal' : '',
  clips: [],
  selected: [],
  searching: false,
  resultsOpen: false,
});

const appendLog = (setLogs: (updater: (logs: string[]) => string[]) => void, lines: string | string[]) => {
  const nextLines = Array.isArray(lines) ? lines : [lines];
  setLogs((logs) => [...logs, ...nextLines]);
};

const providerSections = [
  {provider: 'playphrase', label: 'PlayPhrase'},
  {provider: 'youglish', label: 'YouGlish'},
  {provider: 'filmot', label: 'Filmot'},
] as const;

const HighlightedText = ({text, query}: {text: string; query: string}) => {
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'i'));

  return (
    <>
      {parts.map((part, index) => (
        <span className={part.toLowerCase() === query.trim().toLowerCase() ? 'match' : undefined} key={`${part}-${index}`}>
          {part}
        </span>
      ))}
    </>
  );
};

const ClipPreview = ({clip}: {clip: NormalizedClip}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(clip.media.renderUrl ?? '');
  const [preparingPreview, setPreparingPreview] = useState(false);

  const preparePreview = async () => {
    if (previewUrl || !clip.media.youtubeVideoId) {
      return;
    }

    setPreparingPreview(true);
    try {
      const response = await fetch('/api/prepare-preview', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({clip}),
      });
      const payload = (await response.json()) as {ok: boolean; previewUrl?: string; message?: string};
      if (!response.ok || !payload.ok || !payload.previewUrl) {
        throw new Error(payload.message ?? 'Preview prepare failed');
      }
      setPreviewUrl(payload.previewUrl);
      requestAnimationFrame(() => {
        void videoRef.current?.play();
      });
    } finally {
      setPreparingPreview(false);
    }
  };

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      video.muted = false;
      video.volume = 1;
      await video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className="clipPreview">
      {previewUrl ? (
        <>
          <video
            ref={videoRef}
            src={previewUrl}
            playsInline
            preload="metadata"
            onClick={(event) => event.stopPropagation()}
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onTimeUpdate={(event) => setCurrentMs(event.currentTarget.currentTime * 1000)}
          />
          <button
            className="previewPlay"
            type="button"
            aria-label={playing ? 'Pause preview' : 'Play preview'}
            onClick={(event) => {
              event.stopPropagation();
              void togglePlayback();
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </>
      ) : clip.media.youtubeVideoId ? (
        <>
          <img src={clip.media.thumbnailUrl} alt="" />
          <button
            className="previewPlay"
            type="button"
            aria-label="Prepare preview"
            disabled={preparingPreview}
            onClick={(event) => {
              event.stopPropagation();
              void preparePreview();
            }}
          >
            {preparingPreview ? 'Preparing' : 'Play'}
          </button>
        </>
      ) : (
        <div className="thumb">{clip.media.thumbnailUrl ? 'YouTube clip' : 'Filmot result'}</div>
      )}
      <div className={`previewSubtitle ${clip.media.youtubeVideoId ? 'external' : ''}`} aria-hidden="true">
        {clip.words.length > 0 ? (
          clip.words.map((word) => {
            const active = currentMs >= word.startMs && currentMs <= word.endMs;
            const className = active ? 'active' : word.isMatch ? 'match' : undefined;

            return (
              <span className={className} key={`${word.index}-${word.text}`}>
                {word.text}
              </span>
            );
          })
        ) : (
          <HighlightedText text={clip.text} query={clip.query} />
        )}
      </div>
    </div>
  );
};

export const VocabularyBuilder = () => {
  const [blocks, setBlocks] = useState<WordBlock[]>(() => [createBlock(0)]);
  const [logs, setLogs] = useState<string[]>(['Ready. Add German words or phrases, search clips, then render.']);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<{downloadUrl: string; fileName: string} | null>(null);
  const selectedCount = useMemo(() => blocks.reduce((sum, block) => sum + block.selected.length, 0), [blocks]);


  const updateBlock = (id: string, updater: (block: WordBlock) => WordBlock) => {
    setBlocks((current) => current.map((block) => (block.id === id ? updater(block) : block)));
  };

  const addBlock = () => {
    const block = createBlock(blocks.length);
    setBlocks((current) => [...current, block]);
    requestAnimationFrame(() => {
      document.getElementById(`block-${block.id}`)?.scrollIntoView({behavior: 'smooth', block: 'center'});
      document.getElementById(`term-${block.id}`)?.focus();
    });
  };

  const searchBlock = async (block: WordBlock) => {
    if (!block.term.trim()) {
      appendLog(setLogs, '[Search] Enter a German word or phrase first.');
      return;
    }

    updateBlock(block.id, (current) => ({...current, searching: true, clips: [], selected: [], resultsOpen: false}));
    appendLog(setLogs, `[${block.term}] Searching PlayPhrase + YouGlish + Filmot...`);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({query: block.term.trim(), language: 'de', playphraseLimit: 10}),
      });
      const payload = (await response.json()) as {ok: boolean; clips?: NormalizedClip[]; logs?: string[]; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Search failed');
      }

      const clips = payload.clips ?? [];
      updateBlock(block.id, (current) => ({...current, clips, searching: false, resultsOpen: false}));
      appendLog(setLogs, [
        ...(payload.logs ?? [`[${block.term}] Found ${clips.length} clips`]),
        `[${block.term}] ${clips.length} previews ready. Open results to choose 1-3 clips.`,
      ]);
    } catch (error) {
      updateBlock(block.id, (current) => ({...current, searching: false}));
      appendLog(setLogs, `[${block.term}] Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleClip = (block: WordBlock, clip: NormalizedClip) => {
    updateBlock(block.id, (current) => {
      const selected = current.selected.includes(clip.id)
        ? current.selected.filter((id) => id !== clip.id)
        : current.selected.length >= 3
          ? current.selected
          : [...current.selected, clip.id];

      return {...current, selected};
    });
  };

  const getRenderBlocks = () =>
    blocks
      .map((block) => ({
        id: block.id,
        term: block.term.trim(),
        selectedClips: block.clips.filter((clip) => block.selected.includes(clip.id)),
      }))
      .filter((block) => block.term && block.selectedClips.length > 0);

  const renderFinal = async () => {
    setRendering(true);
    setResult(null);
    appendLog(setLogs, 'Preparing final render...');

    try {
      const response = await fetch('/api/render-final', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({blocks: getRenderBlocks()}),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        downloadUrl?: string;
        fileName?: string;
        logs?: string[];
        message?: string;
      };

      appendLog(setLogs, payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.downloadUrl || !payload.fileName) {
        throw new Error(payload.message ?? 'Render failed');
      }

      setResult({downloadUrl: payload.downloadUrl, fileName: payload.fileName});
    } catch (error) {
      appendLog(setLogs, `Final render failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <header className="header">
          <div>
            <p className="eyebrow">German vocabulary to TikTok</p>
            <h1>100 câu tiếng Đức cơ bản 🇩🇪</h1>
          </div>
          <div className="toolbar">
            <button className="button secondary" type="button" onClick={addBlock}>
              Add block
            </button>
            <button className="button accent" type="button" disabled={selectedCount === 0 || rendering} onClick={renderFinal}>
              Render TikTok
            </button>
          </div>
        </header>

        <div className="blocks">
          {blocks.map((block, index) => (
            <article className="block" id={`block-${block.id}`} key={block.id}>
              <div className="blockTop">
                <div className="index">{index + 1}</div>
                <input
                  className="termInput"
                  id={`term-${block.id}`}
                  value={block.term}
                  placeholder="German word or phrase"
                  onChange={(event) => updateBlock(block.id, (current) => ({...current, term: event.target.value}))}
                />
                <button className="button primary" type="button" disabled={block.searching} onClick={() => searchBlock(block)}>
                  {block.searching ? 'Searching' : 'Search'}
                </button>
              </div>

              {block.clips.length > 0 ? (
                <div className="resultToggle">
                  <div>
                    <strong>{block.clips.length} clips ready</strong>
                    <span>{block.selected.length}/3 selected</span>
                  </div>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => updateBlock(block.id, (current) => ({...current, resultsOpen: !current.resultsOpen}))}
                  >
                    {block.resultsOpen ? 'Hide clips' : 'Review clips'}
                  </button>
                </div>
              ) : null}

              {block.clips.length > 0 && block.resultsOpen ? (
                <div className="clipSections">
                  {providerSections.map((section) => {
                    const sectionClips = block.clips.filter((clip) => clip.provider === section.provider);
                    if (sectionClips.length === 0) {
                      return null;
                    }

                    return (
                      <section className="clipSection" key={section.provider}>
                        <div className="clipSectionHeader">
                          <h3>{section.label}</h3>
                          <span>{sectionClips.length} clips</span>
                        </div>
                        <div className="clips">
                          {sectionClips.map((clip) => {
                            const selected = block.selected.includes(clip.id);
                            const canSelect = selected || block.selected.length < 3;
                            const selectedOrder = selected ? block.selected.indexOf(clip.id) + 1 : undefined;
                            const hasPreview = Boolean(clip.media.renderUrl || clip.media.youtubeVideoId);

                            return (
                              <div
                                className={`clip ${selected ? 'selected' : ''} ${canSelect ? '' : 'disabled'}`}
                                key={clip.id}
                                role="button"
                                tabIndex={canSelect ? 0 : -1}
                                onClick={() => {
                                  if (canSelect) {
                                    toggleClip(block, clip);
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (canSelect && (event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    toggleClip(block, clip);
                                  }
                                }}
                              >
                                {selectedOrder ? <div className="selectionBadge">{selectedOrder}</div> : null}
                                <ClipPreview clip={clip} />
                                <div className="clipMeta">
                                  <span>{clip.provider}</span>
                                  <span>{selectedOrder ? `Selected #${selectedOrder}` : hasPreview ? 'Preview ready' : 'Needs prepare'}</span>
                                </div>
                                <div className="clipText">{clip.text}</div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <aside className="panel side">
        <header className="header">
          <div>
            <p className="eyebrow">Log</p>
            <h1>{selectedCount} selected</h1>
          </div>
        </header>
        <pre className="log">{logs.join('\n')}</pre>
        {result ? (
          <div className="result">
            <video src={`${result.downloadUrl}?t=${Date.now()}`} controls />
            <a className="download" href={result.downloadUrl} download={result.fileName}>
              Download final MP4
            </a>
          </div>
        ) : null}
      </aside>
    </main>
  );
};
