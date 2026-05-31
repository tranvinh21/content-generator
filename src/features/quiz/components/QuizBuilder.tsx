'use client';

import {useState} from 'react';
import {PanelHeader} from '../../../components/PanelHeader';
import {StatusPanel} from '../../../components/StatusPanel';
import type {QuizItem} from '../types';

type EditableQuizItem = Omit<QuizItem, 'audioFrames' | 'audioUrl'> & {
  id: string;
};

type QuizResult = {
  downloadUrl: string;
  fileName: string;
  durationSeconds: number;
  audioProvider: string;
};

const createItem = (index: number): EditableQuizItem => ({
  id: crypto.randomUUID(),
  questionDe: index === 0 ? 'Welche Antwort passt zu "Keine Sorge"?' : '',
  questionVi: index === 0 ? 'Câu nào hợp với "Keine Sorge"?' : '',
  options:
    index === 0
      ? [
          {de: 'Mach dir keine Sorgen.', vi: 'Đừng lo.'},
          {de: 'Ich habe großen Hunger.', vi: 'Tôi rất đói.'},
          {de: 'Bis später.', vi: 'Hẹn gặp lại.'},
        ]
      : [
          {de: '', vi: ''},
          {de: '', vi: ''},
          {de: '', vi: ''},
        ],
  correctIndex: 0,
});

const stripClientFields = (items: EditableQuizItem[]) =>
  items
    .map(({id: _id, ...item}) => ({
      ...item,
      questionDe: item.questionDe.trim(),
      questionVi: item.questionVi.trim(),
      illustrationUrl: item.illustrationUrl,
      options: item.options.map((option) => ({de: option.de.trim(), vi: option.vi.trim()})),
    }))
    .filter((item) => item.questionDe && item.options.every((option) => option.de));

export const QuizBuilder = () => {
  const [title, setTitle] = useState('Chọn đáp án đúng');
  const [items, setItems] = useState<EditableQuizItem[]>(() => [createItem(0)]);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [logs, setLogs] = useState<string[]>(['Ready. Add German quiz questions and three answers.']);

  const appendLogs = (lines: string[]) => {
    setLogs((current) => [...current, ...lines]);
  };

  const updateItem = (id: string, updater: (item: EditableQuizItem) => EditableQuizItem) => {
    setItems((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  };

  const updateOption = (itemId: string, optionIndex: number, field: 'de' | 'vi', value: string) => {
    updateItem(itemId, (item) => ({
      ...item,
      options: item.options.map((option, index) => (index === optionIndex ? {...option, [field]: value} : option)),
    }));
  };

  const updateIllustration = (itemId: string, file: File | null) => {
    if (!file) {
      updateItem(itemId, (item) => ({...item, illustrationUrl: undefined}));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      updateItem(itemId, (item) => ({...item, illustrationUrl: typeof reader.result === 'string' ? reader.result : undefined}));
    });
    reader.readAsDataURL(file);
  };

  const removeItem = (id: string) => {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const addItem = () => setItems((current) => [...current, createItem(current.length)]);

  const generate = async () => {
    const payloadItems = stripClientFields(items);
    if (payloadItems.length === 0) {
      appendLogs(['Add at least one complete question. Each question needs 3 German answers.']);
      return;
    }

    setRendering(true);
    setResult(null);
    appendLogs([`Preparing quiz video with ${payloadItems.length} questions...`]);

    try {
      const response = await fetch('/api/render-quiz', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({title, items: payloadItems}),
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
        throw new Error(payload.message ?? 'Quiz render failed');
      }

      setResult({
        downloadUrl: payload.downloadUrl,
        fileName: payload.fileName,
        durationSeconds: payload.durationSeconds ?? 0,
        audioProvider: payload.audioProvider ?? 'unknown',
      });
    } catch (error) {
      appendLogs([`Quiz render failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="quizPage">
      <section className="panel quizComposer">
        <PanelHeader
          actions={
            <button className="button accent" disabled={rendering || !title.trim()} type="button" onClick={generate}>
              {rendering ? 'Rendering' : 'Generate quiz'}
            </button>
          }
          eyebrow="Quiz Video"
          title="German answer reveal"
        />

        <div className="quizForm">
          <label>
            <span>Video title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <div className="quizBlocks">
            {items.map((item, itemIndex) => (
              <article className="quizBlock" key={item.id}>
                <div className="quizBlockHeader">
                  <strong>Question {itemIndex + 1}</strong>
                  <button className="button secondary" disabled={items.length === 1} type="button" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
                <label>
                  <span>Question German</span>
                  <textarea value={item.questionDe} onChange={(event) => updateItem(item.id, (current) => ({...current, questionDe: event.target.value}))} />
                </label>
                <label>
                  <span>Question Vietnamese</span>
                  <textarea value={item.questionVi} onChange={(event) => updateItem(item.id, (current) => ({...current, questionVi: event.target.value}))} />
                </label>
                <label>
                  <span>Illustration optional</span>
                  <input accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => updateIllustration(item.id, event.target.files?.[0] ?? null)} />
                </label>
                {item.illustrationUrl ? (
                  <div className="quizIllustrationPreview">
                    <img src={item.illustrationUrl} alt="" />
                    <button className="button secondary" type="button" onClick={() => updateIllustration(item.id, null)}>
                      Remove image
                    </button>
                  </div>
                ) : null}

                <div className="quizOptions">
                  {item.options.map((option, optionIndex) => (
                    <div className="quizOptionEdit" key={optionIndex}>
                      <label className="quizCorrect">
                        <input
                          checked={item.correctIndex === optionIndex}
                          name={`correct-${item.id}`}
                          type="radio"
                          onChange={() => updateItem(item.id, (current) => ({...current, correctIndex: optionIndex}))}
                        />
                        <span>Answer {optionIndex + 1}</span>
                      </label>
                      <input
                        placeholder="German answer"
                        value={option.de}
                        onChange={(event) => updateOption(item.id, optionIndex, 'de', event.target.value)}
                      />
                      <input
                        placeholder="Vietnamese translation"
                        value={option.vi}
                        onChange={(event) => updateOption(item.id, optionIndex, 'vi', event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <button className="button primary" type="button" onClick={addItem}>
            Add question
          </button>
          <div className="postHints">
            <span>{stripClientFields(items).length} ready questions</span>
            <span>Question voice: ElevenLabs or macOS fallback</span>
            <span>2.5s tick before reveal</span>
            <span>1080 x 1920 MP4</span>
          </div>
        </div>
      </section>

      <section className="panel quizPreview">
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
          <div className="empty postEmpty">Rendered quiz video will appear here.</div>
        )}
      </section>

      <StatusPanel logs={logs} />
    </main>
  );
};
