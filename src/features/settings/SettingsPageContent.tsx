'use client';

import {useEffect, useState} from 'react';

type SettingsStatus = {
  openai: boolean;
  elevenLabs: boolean;
  did: boolean;
  playphrase: boolean;
  filmot: boolean;
  macOsVoiceFallback: boolean;
};

type DidPresenter = {
  id: string;
  name: string;
  gender?: string;
  imageUrl?: string;
};

type OpenAiSettings = {
  hasApiKey: boolean;
  model: string;
  url: string;
};

type ElevenLabsSettings = {
  hasApiKey: boolean;
  voiceId: string;
  modelId: string;
};

type DidSettings = {
  hasApiKey: boolean;
  sourceUrl: string;
  voiceId: string;
  presenterId: string;
};

const appendLog = (setLogs: (updater: (logs: string[]) => string[]) => void, lines: string | string[]) => {
  const nextLines = Array.isArray(lines) ? lines : [lines];
  setLogs((logs) => [...logs, ...nextLines]);
};

export const SettingsPageContent = () => {
  const [logs, setLogs] = useState<string[]>(['Ready. Manage provider sessions and avatar services here.']);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus | null>(null);
  const [openAiSaving, setOpenAiSaving] = useState(false);
  const [elevenLabsSaving, setElevenLabsSaving] = useState(false);
  const [openAiForm, setOpenAiForm] = useState({apiKey: '', model: 'gpt-4.1-mini', url: 'https://api.openai.com/v1'});
  const [elevenLabsForm, setElevenLabsForm] = useState({apiKey: '', voiceId: '', modelId: 'eleven_multilingual_v2'});
  const [playphraseCurl, setPlayphraseCurl] = useState('');
  const [filmotCurl, setFilmotCurl] = useState('');
  const [filmotChecking, setFilmotChecking] = useState(false);
  const [filmotCurlChecking, setFilmotCurlChecking] = useState(false);
  const [filmotBrowserBusy, setFilmotBrowserBusy] = useState(false);
  const [filmotCheckResult, setFilmotCheckResult] = useState('');
  const [didSaving, setDidSaving] = useState(false);
  const [didCreditsLoading, setDidCreditsLoading] = useState(false);
  const [didCredits, setDidCredits] = useState<string>('');
  const [didPresenters, setDidPresenters] = useState<DidPresenter[]>([]);
  const [didPresentersLoading, setDidPresentersLoading] = useState(false);
  const [didForm, setDidForm] = useState({
    apiKey: '',
    sourceUrl: '',
    voiceId: 'de-DE-KatjaNeural',
    didPresenterId: '',
  });

  useEffect(() => {
    void refreshSettings();
  }, []);

  const refreshSettings = async () => {
    const response = await fetch('/api/settings');
    const payload = (await response.json()) as {ok: boolean; status?: SettingsStatus; openaiSettings?: OpenAiSettings; elevenLabsSettings?: ElevenLabsSettings; didSettings?: DidSettings};

    if (payload.status) {
      setSettingsStatus(payload.status);
    }
    if (payload.openaiSettings) {
      setOpenAiForm((current) => ({
        ...current,
        model: payload.openaiSettings?.model || 'gpt-4.1-mini',
        url: payload.openaiSettings?.url || 'https://api.openai.com/v1',
      }));
    }
    if (payload.elevenLabsSettings) {
      setElevenLabsForm((current) => ({
        ...current,
        voiceId: payload.elevenLabsSettings?.voiceId ?? '',
        modelId: payload.elevenLabsSettings?.modelId || 'eleven_multilingual_v2',
      }));
    }
    if (payload.didSettings) {
      setDidForm((current) => ({
        ...current,
        sourceUrl: payload.didSettings?.sourceUrl ?? '',
        voiceId: payload.didSettings?.voiceId || 'de-DE-KatjaNeural',
        didPresenterId: payload.didSettings?.presenterId ?? '',
      }));
    }
  };

  const saveOpenAiSettings = async () => {
    setOpenAiSaving(true);
    appendLog(setLogs, '[OpenAI] Saving settings...');

    try {
      const body: Record<string, string> = {
        openaiModel: openAiForm.model || 'gpt-4.1-mini',
        openaiUrl: openAiForm.url || 'https://api.openai.com/v1',
      };
      if (openAiForm.apiKey.trim()) {
        body.openaiApiKey = openAiForm.apiKey.trim();
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {ok: boolean; savedKeys?: string[]; status?: SettingsStatus; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to save OpenAI settings');
      }

      setOpenAiForm((current) => ({...current, apiKey: ''}));
      if (payload.status) {
        setSettingsStatus(payload.status);
      }
      appendLog(setLogs, '[OpenAI] Saved.');
    } catch (error) {
      appendLog(setLogs, `[OpenAI] Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOpenAiSaving(false);
    }
  };

  const saveElevenLabsSettings = async () => {
    setElevenLabsSaving(true);
    appendLog(setLogs, '[ElevenLabs] Saving settings...');

    try {
      const body: Record<string, string> = {
        elevenLabsVoiceId: elevenLabsForm.voiceId,
        elevenLabsModelId: elevenLabsForm.modelId || 'eleven_multilingual_v2',
      };
      if (elevenLabsForm.apiKey.trim()) {
        body.elevenLabsApiKey = elevenLabsForm.apiKey.trim();
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {ok: boolean; savedKeys?: string[]; status?: SettingsStatus; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to save ElevenLabs settings');
      }

      setElevenLabsForm((current) => ({...current, apiKey: ''}));
      if (payload.status) {
        setSettingsStatus(payload.status);
      }
      appendLog(setLogs, '[ElevenLabs] Saved.');
    } catch (error) {
      appendLog(setLogs, `[ElevenLabs] Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setElevenLabsSaving(false);
    }
  };

  const savePlayphraseSettings = async () => {
    setSettingsSaving(true);
    appendLog(setLogs, '[PlayPhrase] Saving curl...');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({playphraseCurl}),
      });
      const payload = (await response.json()) as {ok: boolean; savedKeys?: string[]; status?: SettingsStatus; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to save PlayPhrase curl');
      }

      setPlayphraseCurl('');
      if (payload.status) {
        setSettingsStatus(payload.status);
      }
      appendLog(setLogs, '[PlayPhrase] Saved.');
    } catch (error) {
      appendLog(setLogs, `[PlayPhrase] Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveFilmotSettings = async () => {
    setSettingsSaving(true);
    appendLog(setLogs, '[Filmot] Saving curl...');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({filmotCurl}),
      });
      const payload = (await response.json()) as {ok: boolean; savedKeys?: string[]; status?: SettingsStatus; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to save Filmot curl');
      }

      setFilmotCurl('');
      if (payload.status) {
        setSettingsStatus(payload.status);
      }
      appendLog(setLogs, '[Filmot] Saved.');
    } catch (error) {
      appendLog(setLogs, `[Filmot] Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  const checkFilmot = async () => {
    setFilmotChecking(true);
    appendLog(setLogs, '[Filmot] Checking saved session...');

    try {
      const response = await fetch('/api/filmot-check');
      const payload = (await response.json()) as {ok: boolean; count?: number; log?: string; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Filmot check failed');
      }

      const status = payload.log ?? `[Filmot] Found ${payload.count ?? 0} clips`;
      setFilmotCheckResult(status);
      appendLog(setLogs, status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFilmotCheckResult(message);
      appendLog(setLogs, `[Filmot] Check failed: ${message}`);
    } finally {
      setFilmotChecking(false);
    }
  };

  const checkFilmotCurl = async () => {
    if (!filmotCurl.trim()) {
      setFilmotCheckResult('Paste a Filmot curl first.');
      return;
    }

    setFilmotCurlChecking(true);
    appendLog(setLogs, '[Filmot] Checking pasted curl...');

    try {
      const response = await fetch('/api/filmot-check', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({curl: filmotCurl}),
      });
      const payload = (await response.json()) as {ok: boolean; count?: number; log?: string; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Filmot curl check failed');
      }

      const status = payload.log ?? `[Filmot] Found ${payload.count ?? 0} clips from pasted curl`;
      setFilmotCheckResult(status);
      appendLog(setLogs, status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFilmotCheckResult(message);
      appendLog(setLogs, `[Filmot] Curl check failed: ${message}`);
    } finally {
      setFilmotCurlChecking(false);
    }
  };

  const runFilmotBrowserAction = async (action: 'start' | 'capture') => {
    setFilmotBrowserBusy(true);
    appendLog(setLogs, action === 'start' ? '[Filmot] Opening browser session...' : '[Filmot] Capturing browser cookies...');

    try {
      const response = await fetch('/api/filmot-browser', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({action}),
      });
      const payload = (await response.json()) as {ok: boolean; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Filmot browser action failed');
      }

      const message = payload.message ?? 'Filmot browser action complete.';
      setFilmotCheckResult(message);
      appendLog(setLogs, `[Filmot] ${message}`);
      if (action === 'capture') {
        await refreshSettings();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFilmotCheckResult(message);
      appendLog(setLogs, `[Filmot] Browser action failed: ${message}`);
    } finally {
      setFilmotBrowserBusy(false);
    }
  };

  const saveDidSettings = async () => {
    setDidSaving(true);
    appendLog(setLogs, '[D-ID] Saving local D-ID settings...');

    try {
      const body: Record<string, string> = {
        didSourceUrl: didForm.sourceUrl,
        didVoiceId: didForm.voiceId || 'de-DE-KatjaNeural',
        didPresenterId: didForm.didPresenterId,
      };
      if (didForm.apiKey.trim()) {
        body.didApiKey = didForm.apiKey.trim();
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {ok: boolean; savedKeys?: string[]; status?: SettingsStatus; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to save D-ID settings');
      }

      setDidForm((current) => ({...current, apiKey: ''}));
      if (payload.status) {
        setSettingsStatus(payload.status);
      }
      appendLog(setLogs, `[D-ID] Saved: ${payload.savedKeys?.join(', ') || 'nothing new'}`);
    } catch (error) {
      appendLog(setLogs, `[D-ID] Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDidSaving(false);
    }
  };

  const checkDidCredits = async () => {
    setDidCreditsLoading(true);
    appendLog(setLogs, '[D-ID] Checking credits...');

    try {
      const response = await fetch('/api/did-credits');
      const payload = (await response.json()) as {ok: boolean; credits?: unknown; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to check D-ID credits');
      }

      const formatted = JSON.stringify(payload.credits, null, 2);
      setDidCredits(formatted);
      appendLog(setLogs, '[D-ID] Credits loaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setDidCredits(message);
      appendLog(setLogs, `[D-ID] Credit check failed: ${message}`);
    } finally {
      setDidCreditsLoading(false);
    }
  };

  const loadDidPresenters = async () => {
    setDidPresentersLoading(true);
    appendLog(setLogs, '[D-ID] Loading presenters...');

    try {
      const response = await fetch('/api/did-presenters');
      const payload = (await response.json()) as {ok: boolean; presenters?: DidPresenter[]; message?: string};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Failed to load D-ID presenters');
      }

      setDidPresenters(payload.presenters ?? []);
      appendLog(setLogs, `[D-ID] Loaded ${payload.presenters?.length ?? 0} presenters.`);
    } catch (error) {
      appendLog(setLogs, `[D-ID] Load presenters failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDidPresentersLoading(false);
    }
  };

  return (
    <main className="settingsPage">
      <section className="panel settingsPanel">
        <header className="header">
          <div>
            <p className="eyebrow">System</p>
            <h1>Settings</h1>
          </div>
          <div className="settingsStatus">
            <span className={settingsStatus?.openai ? 'ok' : 'warn'}>OpenAI {settingsStatus?.openai ? 'ready' : 'missing'}</span>
            <span className={settingsStatus?.elevenLabs ? 'ok' : 'warn'}>
              ElevenLabs {settingsStatus?.elevenLabs ? 'ready' : 'fallback'}
            </span>
            <span className={settingsStatus?.did ? 'ok' : 'warn'}>D-ID {settingsStatus?.did ? 'ready' : 'fallback'}</span>
            <span className={settingsStatus?.playphrase ? 'ok' : 'warn'}>
              PlayPhrase {settingsStatus?.playphrase ? 'ready' : 'needs curl'}
            </span>
            <span className={settingsStatus?.filmot ? 'ok' : 'warn'}>Filmot {settingsStatus?.filmot ? 'ready' : 'needs curl'}</span>
          </div>
        </header>

        <div className="settingsSections">
          <section className="settingsSection">
            <div className="settingsSectionHeader">
              <div>
                <p className="eyebrow">OpenAI</p>
                <h2>Translation and IPA</h2>
              </div>
              <button className="button primary" type="button" disabled={openAiSaving} onClick={saveOpenAiSettings}>
                {openAiSaving ? 'Saving' : 'Save OpenAI'}
              </button>
            </div>

            <div className="providerFieldGrid">
              <label>
                <span>API key</span>
                <input
                  type="password"
                  value={openAiForm.apiKey}
                  placeholder={settingsStatus?.openai ? 'Key is saved. Paste a new key to replace it.' : 'Paste OpenAI API key'}
                  onChange={(event) => setOpenAiForm((current) => ({...current, apiKey: event.target.value}))}
                />
              </label>
              <label>
                <span>Model</span>
                <input value={openAiForm.model} onChange={(event) => setOpenAiForm((current) => ({...current, model: event.target.value}))} />
              </label>
              <label>
                <span>Base URL</span>
                <input value={openAiForm.url} onChange={(event) => setOpenAiForm((current) => ({...current, url: event.target.value}))} />
              </label>
            </div>
          </section>

          <section className="settingsSection">
            <div className="settingsSectionHeader">
              <div>
                <p className="eyebrow">ElevenLabs</p>
                <h2>Intro voice</h2>
              </div>
              <button className="button primary" type="button" disabled={elevenLabsSaving} onClick={saveElevenLabsSettings}>
                {elevenLabsSaving ? 'Saving' : 'Save ElevenLabs'}
              </button>
            </div>

            <div className="providerFieldGrid">
              <label>
                <span>API key</span>
                <input
                  type="password"
                  value={elevenLabsForm.apiKey}
                  placeholder={settingsStatus?.elevenLabs ? 'Key is saved. Paste a new key to replace it.' : 'Paste ElevenLabs API key'}
                  onChange={(event) => setElevenLabsForm((current) => ({...current, apiKey: event.target.value}))}
                />
              </label>
              <label>
                <span>Voice ID</span>
                <input
                  value={elevenLabsForm.voiceId}
                  onChange={(event) => setElevenLabsForm((current) => ({...current, voiceId: event.target.value}))}
                />
              </label>
              <label>
                <span>Model ID</span>
                <input
                  value={elevenLabsForm.modelId}
                  onChange={(event) => setElevenLabsForm((current) => ({...current, modelId: event.target.value}))}
                />
              </label>
            </div>
          </section>

          <section className="settingsSection">
            <div className="settingsSectionHeader">
              <div>
                <p className="eyebrow">PlayPhrase</p>
                <h2>Search session</h2>
              </div>
              <button className="button primary" type="button" disabled={settingsSaving} onClick={savePlayphraseSettings}>
                {settingsSaving ? 'Saving' : 'Save PlayPhrase'}
              </button>
            </div>

            <textarea
              className="settingsTextarea compact"
              value={playphraseCurl}
              placeholder="Paste PlayPhrase curl here."
              onChange={(event) => setPlayphraseCurl(event.target.value)}
            />
          </section>

          <section className="settingsSection">
            <div className="settingsSectionHeader">
              <div>
                <p className="eyebrow">Filmot</p>
                <h2>Search session</h2>
                <strong>{filmotCheckResult || 'Open Filmot, pass captcha, paste Filmot curl, then check before saving.'}</strong>
              </div>
              <div className="providerReconnectActions">
                <button className="button primary" type="button" disabled={filmotBrowserBusy} onClick={() => runFilmotBrowserAction('start')}>
                  Open local browser
                </button>
                <button className="button secondary" type="button" disabled={filmotBrowserBusy} onClick={() => runFilmotBrowserAction('capture')}>
                  Capture cookies
                </button>
                <a
                  className="button secondary"
                  href="https://filmot.com/search/%22Moment+mal%22/1?lang=de&hideDeleted=1&gridView=1&category=18"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Filmot
                </a>
                <button className="button secondary" type="button" disabled={filmotCurlChecking} onClick={checkFilmotCurl}>
                  {filmotCurlChecking ? 'Checking curl' : 'Check pasted curl'}
                </button>
                <button className="button secondary" type="button" disabled={filmotChecking} onClick={checkFilmot}>
                  {filmotChecking ? 'Checking saved' : 'Check saved'}
                </button>
                <button className="button primary" type="button" disabled={settingsSaving} onClick={saveFilmotSettings}>
                  {settingsSaving ? 'Saving' : 'Save Filmot'}
                </button>
              </div>
            </div>

            <textarea
              className="settingsTextarea compact"
              value={filmotCurl}
              placeholder="Paste Filmot curl here. Use the same browser profile that passed captcha."
              onChange={(event) => setFilmotCurl(event.target.value)}
            />
          </section>

          <section className="settingsSection">
            <div className="settingsSectionHeader">
              <div>
                <p className="eyebrow">D-ID avatar</p>
                <h2>Talking intro</h2>
              </div>
              <div className="providerReconnectActions">
                <button className="button primary" type="button" disabled={didSaving} onClick={saveDidSettings}>
                  {didSaving ? 'Saving' : 'Save D-ID'}
                </button>
                <button className="button secondary" type="button" disabled={didCreditsLoading} onClick={checkDidCredits}>
                  {didCreditsLoading ? 'Checking' : 'Check credits'}
                </button>
              </div>
            </div>

            <div className="didConfigGrid">
              <label>
                <span>D-ID API key</span>
                <input
                  type="password"
                  value={didForm.apiKey}
                  placeholder={settingsStatus?.did ? 'Key is saved. Paste a new key to replace it.' : 'Paste D-ID API key'}
                  onChange={(event) => setDidForm((current) => ({...current, apiKey: event.target.value}))}
                />
              </label>
              <label>
                <span>Source image URL</span>
                <input
                  value={didForm.sourceUrl}
                  placeholder="https://..."
                  onChange={(event) => setDidForm((current) => ({...current, sourceUrl: event.target.value}))}
                />
              </label>
              <label>
                <span>Voice ID</span>
                <input
                  value={didForm.voiceId}
                  placeholder="de-DE-KatjaNeural"
                  onChange={(event) => setDidForm((current) => ({...current, voiceId: event.target.value}))}
                />
              </label>
            </div>

            <div className="didPicker">
              <div className="didPickerTop">
                <div>
                  <p className="eyebrow">Presenter</p>
                  <strong>{didForm.didPresenterId || 'Using DID_SOURCE_URL or Remotion fallback'}</strong>
                </div>
                <button className="button secondary" type="button" disabled={didPresentersLoading} onClick={loadDidPresenters}>
                  {didPresentersLoading ? 'Loading' : 'Load avatars'}
                </button>
              </div>

              {didPresenters.length > 0 ? (
                <div className="didPresenterGrid">
                  {didPresenters.map((presenter) => {
                    const selected = didForm.didPresenterId === presenter.id;

                    return (
                      <button
                        className={`didPresenter ${selected ? 'selected' : ''}`}
                        type="button"
                        key={presenter.id}
                        onClick={() => setDidForm((current) => ({...current, didPresenterId: selected ? '' : presenter.id}))}
                      >
                        {presenter.imageUrl ? <img src={presenter.imageUrl} alt="" /> : <span className="didAvatarFallback">{presenter.name.slice(0, 1)}</span>}
                        <span>{presenter.name}</span>
                        <small>{presenter.gender || presenter.id}</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {didCredits ? <pre className="didCredits">{didCredits}</pre> : null}
          </section>
        </div>
      </section>

      <aside className="panel side settingsLog">
        <header className="header">
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
