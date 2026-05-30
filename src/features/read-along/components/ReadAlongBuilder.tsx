'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';
import type {ReadAlongVocabularyItem} from '../types';

type ReadAlongResult = {
  downloadUrl: string;
  fileName: string;
  durationSeconds: number;
  audioProvider: string;
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
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<ReadAlongResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Add a German reading text and vocabulary list.']);

  const vocabulary = parseVocabulary(vocabularyInput);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
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
        body: JSON.stringify({title, level, text, vocabulary, useEndCard}),
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
          <label className="checkboxLine">
            <input checked={useEndCard} type="checkbox" onChange={(event) => setUseEndCard(event.target.checked)} />
            <span>Show end card</span>
          </label>
          <div className="postHints">
            <span>{vocabulary.length} vocabulary items</span>
            <span>IPA + Vietnamese auto-generated</span>
            <span>1080 x 1920 MP4</span>
            <span>Text scrolls with audio duration</span>
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
