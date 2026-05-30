# German Vocabulary TikTok Builder

Local Next.js + Remotion app for searching German phrase clips, selecting examples, and rendering a vertical TikTok-style vocabulary video.

## Run

```bash
npm install
npm run app
```

Open http://127.0.0.1:43123.

## Workflow

1. Add one German word or phrase per block.
2. Click `Search` to fetch clips from PlayPhrase and Filmot.
3. Select 1-3 clips per block.
4. Click `Render TikTok`.
5. Download the final MP4 from the UI.

## Assets

Put local visual assets in `src/asset/` or `assets/`.

Supported names:

- `watermark.png`, `watermark.webp`, `watermark.jpg`, `watermark.jpeg`
- `outro.mp4`, `outtro.mp4`, `outro-background.mp4`, `outtro-background.mp4`
- `background.mp4`, `background.mov`

If no background video exists, the render uses the built-in paper-like background.

## Environment

Copy `.env.example` to `.env.local` and fill keys as needed. See `ENV.md`.

OpenAI and ElevenLabs stay in `.env.local`. PlayPhrase and Filmot session cookies can be pasted from browser curl in the app `Settings` panel.

OpenAI is required for Vietnamese translations and IPA fallback. Set `OPENAI_URL` when using an OpenAI-compatible proxy or gateway; it defaults to `https://api.openai.com/v1`. ElevenLabs is optional for intro voice; if it is missing or fails, the renderer falls back to the local macOS German voice.
# content-generator
