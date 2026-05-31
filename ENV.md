# Environment

Create `.env.local` for local secrets.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_URL=https://api.openai.com/v1

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

DID_API_KEY=
DID_PRESENTER_ID=
DID_SOURCE_URL=
DID_VOICE_ID=de-DE-KatjaNeural

PLAYPHRASE_AUTHORIZATION=Token
PLAYPHRASE_COOKIE=ring-session=
PLAYPHRASE_CSRF_TOKEN=

FILMOT_COOKIE=
FILMOT_USER_AGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
```

OpenAI, ElevenLabs, and D-ID should stay in `.env.local`.

D-ID is optional. When `DID_API_KEY` and `DID_PRESENTER_ID` are configured, the vocabulary intro scene uses a D-ID presenter from the Clips API before the example clips. If there is no presenter id, the app uses `DID_SOURCE_URL` with the Talks API; `DID_SOURCE_URL` must be a public image URL that D-ID can fetch. If D-ID is missing or fails, the app falls back to the built-in Remotion avatar intro.

PlayPhrase and Filmot can also be saved from the web UI by pasting a browser curl into `Settings`. Those provider session values are stored locally in `tmp/local-settings.json` and are read without restarting the app.

Filmot may require a manually verified browser session. Paste the resulting cookie or a Filmot curl into `Settings`.
