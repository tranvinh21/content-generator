'use client';

import {useEffect, useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';
import type {ReadAlongVocabularyItem} from '../types';

type ReadAlongResult = {
  downloadUrl: string;
  fileName: string;
  durationSeconds: number;
  audioProvider: string;
};

type AudioMode = 'generate' | 'asset' | 'upload';

type AudioAsset = {
  id: string;
  label: string;
  url?: string;
};

const defaultText =
  'Viele Menschen haben das Gefühl, dass ihnen die Zeit ständig davonläuft. Am Morgen beginnt der Tag oft hektisch: Man trinkt schnell einen Kaffee, schaut kurz auf das Handy und eilt zur Arbeit oder zur Schule. Im Laufe des Tages gibt es viele Aufgaben, Termine und Nachrichten. Deshalb fällt es manchen Menschen schwer, ruhig zu bleiben und sich auf eine Sache zu konzentrieren. Wer jedoch bewusst kleine Pausen macht, kann den Tag besser strukturieren und fühlt sich am Abend weniger erschöpft.';

const defaultVocabulary = [
  'ständig',
  'davonläuft',
  'hektisch',
  'eilt',
  'Termine',
  'sich zu konzentrieren',
  'bewusst',
  'erschöpft',
].join('\n');

const parseVocabulary = (input: string): ReadAlongVocabularyItem[] =>
  input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [term = '', ipa = '', translationVi = ''] = line.split('|').map((part) => part.trim());

      return {term, ipa, translationVi};
    })
    .filter((item) => item.term);

export const ReadAlongBuilder = () => {
  const [title, setTitle] = useState('Leseübung: Zeit im Alltag');
  const [level, setLevel] = useState('B1');
  const [text, setText] = useState(defaultText);
  const [vocabularyInput, setVocabularyInput] = useState(defaultVocabulary);
  const [useEndCard, setUseEndCard] = useState(true);
  const [audioMode, setAudioMode] = useState<AudioMode>('generate');
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [audioAssetId, setAudioAssetId] = useState('');
  const [uploadedAudioDataUrl, setUploadedAudioDataUrl] = useState('');
  const [uploadedAudioName, setUploadedAudioName] = useState('');
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<ReadAlongResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Add a German reading text and vocabulary list.']);

  const vocabulary = parseVocabulary(vocabularyInput);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  useEffect(() => {
    let active = true;

    const loadAudioAssets = async () => {
      try {
        const response = await fetch('/api/render-read-along');
        const payload = (await response.json()) as {ok?: boolean; audioAssets?: AudioAsset[]};
        if (!active) {
          return;
        }

        const assets = payload.audioAssets ?? [];
        setAudioAssets(assets);
        setAudioAssetId((current) => current || assets[0]?.id || '');
      } catch {
        if (active) {
          appendLogs(['Could not load saved audio list. Upload audio or generate voice still works.']);
        }
      }
    };

    loadAudioAssets();

    return () => {
      active = false;
    };
  }, []);

  const setUploadedAudio = (file: File | null) => {
    if (!file) {
      setUploadedAudioDataUrl('');
      setUploadedAudioName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedAudioDataUrl(typeof reader.result === 'string' ? reader.result : '');
      setUploadedAudioName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (vocabulary.length === 0) {
      appendLogs(['Add at least one vocabulary item. One term per line is enough.']);
      return;
    }

    setRendering(true);
    setResult(null);
    appendLogs([`Preparing read along video with ${vocabulary.length} vocabulary items...`]);

    try {
      const response = await fetch('/api/render-read-along', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          title,
          level,
          text,
          vocabulary,
          useEndCard,
          audioMode,
          audioAssetId,
          uploadedAudioDataUrl,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        downloadUrl?: string;
        fileName?: string;
        durationSeconds?: number;
        audioProvider?: string;
        logs?: string[];
        message?: string;
      };

      appendLogs(payload.logs ?? []);

      if (!response.ok || !payload.ok || !payload.downloadUrl || !payload.fileName) {
        throw new Error(payload.message ?? 'Read along generation failed');
      }

      setResult({
        downloadUrl: payload.downloadUrl,
        fileName: payload.fileName,
        durationSeconds: payload.durationSeconds ?? 0,
        audioProvider: payload.audioProvider ?? 'unknown',
      });
    } catch (error) {
      appendLogs([`Read along generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="readAlongPage">
      <section className="panel readAlongComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={rendering || !title.trim() || !text.trim()} type="button" onClick={generate}>
              {rendering ? 'Rendering' : 'Generate video'}
            </button>
          }
          eyebrow="Read Along"
          title="Reading practice video"
        />

        <div className="readAlongForm">
          <div className="engagementSplit">
            <label>
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span>Level</span>
              <input value={level} onChange={(event) => setLevel(event.target.value)} />
            </label>
          </div>
          <label>
            <span>German paragraph</span>
            <textarea className="readingTextarea" value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <label>
            <span>Vocabulary, one per line</span>
            <textarea
              className="vocabularyTextarea"
              value={vocabularyInput}
              onChange={(event) => setVocabularyInput(event.target.value)}
            />
          </label>
          <div className="readAlongAudioPanel">
            <div className="engagementSplit">
              <label>
                <span>Audio source</span>
                <select value={audioMode} onChange={(event) => setAudioMode(event.target.value as AudioMode)}>
                  <option value="generate">Generate voice</option>
                  <option value="asset">Use saved MP3/WAV/AIFF</option>
                  <option value="upload">Upload new MP3/WAV/AIFF</option>
                </select>
              </label>
              {audioMode === 'asset' ? (
                <label>
                  <span>Saved audio</span>
                  <select value={audioAssetId} onChange={(event) => setAudioAssetId(event.target.value)}>
                    {audioAssets.length > 0 ? (
                      audioAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No saved audio found</option>
                    )}
                  </select>
                </label>
              ) : null}
              {audioMode === 'upload' ? (
                <label>
                  <span>Upload audio</span>
                  <input accept="audio/mpeg,audio/mp3,audio/wav,audio/aiff,.mp3,.wav,.aiff" type="file" onChange={(event) => setUploadedAudio(event.target.files?.[0] ?? null)} />
                </label>
              ) : null}
            </div>
            {audioMode === 'asset' && audioAssetId ? (
              <audio controls src={audioAssets.find((asset) => asset.id === audioAssetId)?.url} />
            ) : null}
            {audioMode === 'upload' && uploadedAudioDataUrl ? (
              <div className="readAlongUploadedAudio">
                <audio controls src={uploadedAudioDataUrl} />
                <button className="button secondary" type="button" onClick={() => setUploadedAudio(null)}>
                  Clear {uploadedAudioName || 'audio'}
                </button>
              </div>
            ) : null}
          </div>
          <label className="checkboxLine">
            <input checked={useEndCard} type="checkbox" onChange={(event) => setUseEndCard(event.target.checked)} />
            <span>Show end card</span>
          </label>
          <div className="postHints">
            <span>{vocabulary.length} vocabulary items</span>
            <span>IPA + Vietnamese auto-generated</span>
            <span>1080 x 1920 MP4</span>
            <span>{audioMode === 'generate' ? 'Voice generated automatically' : 'Text scrolls with selected audio'}</span>
          </div>
        </div>
      </section>

      <section className="panel readAlongPreview">
        <PanelHeader compact eyebrow="Output" title={result ? 'Ready' : 'Preview'} />
        {result ? (
          <div className="result">
            <video controls src={result.downloadUrl} />
            <div className="postHints">
              <span>{result.durationSeconds}s</span>
              <span>Audio: {result.audioProvider}</span>
            </div>
            <a className="download" href={result.downloadUrl} download={result.fileName}>
              Download MP4
            </a>
          </div>
        ) : (
          <div className="empty postEmpty">Rendered read along video will appear here.</div>
        )}
      </section>

      <StatusPanel logs={logs} />
    </main>
  );
};
