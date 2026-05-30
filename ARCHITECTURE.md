# Architecture

This is a local-only Next.js + Remotion app for generating German vocabulary TikTok videos.

## Workflow

1. User creates word/phrase blocks.
2. Each block searches PlayPhrase and Filmot.
3. User previews and selects 1-3 clips per block.
4. Final render enriches selected blocks:
   - German IPA via `espeak-ng`
   - Vietnamese translations via OpenAI
   - German intro voice via ElevenLabs
   - Filmot selected clips materialized from YouTube via `yt-dlp` + `ffmpeg`
5. Remotion renders one vertical MP4.

## Local assets

The render step looks for assets in `assets/` first, then `src/asset/`.

- Watermark: `watermark.png`, `watermark.webp`, `watermark.jpg`, `watermark.jpeg`
- Outro: `outro.mp4`, `outtro.mp4`, `outro-background.mp4`, `outtro-background.mp4`
- Background: `background.mp4`, `background.mov`

Assets are served through the internal `/local-assets/...` route during Remotion rendering so Chromium can load them without `file://` restrictions.

## Providers

- PlayPhrase returns direct MP4 clips and word timings.
- Filmot returns YouTube transcript matches, so selected clips must be downloaded/cut before rendering.

All providers normalize into `NormalizedClip`.
