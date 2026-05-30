# Environment

Create `.env.local` for local secrets.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_URL=https://api.openai.com/v1

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

PLAYPHRASE_AUTHORIZATION=Token
PLAYPHRASE_COOKIE=ring-session=
PLAYPHRASE_CSRF_TOKEN=

FILMOT_COOKIE=
FILMOT_USER_AGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
```

OpenAI and ElevenLabs should stay in `.env.local`.

PlayPhrase and Filmot can also be saved from the web UI by pasting a browser curl into `Settings`. Those provider session values are stored locally in `tmp/local-settings.json` and are read without restarting the app.

Filmot may require a manually verified browser session. Paste the resulting cookie or a Filmot curl into `Settings`.
