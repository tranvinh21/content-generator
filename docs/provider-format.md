# Provider Clip Format

The app should normalize every search provider into `NormalizedClip` before rendering.

PlayPhrase and Filmot are different:

- PlayPhrase returns direct MP4 clips plus word timings.
- Filmot searches YouTube captions. It returns YouTube video matches and timestamps, so it needs a materialization step before Remotion can render it.

## NormalizedClip

```ts
type NormalizedClip = {
  id: string;
  provider: "playphrase" | "filmot";
  language: string;
  query: string;
  text: string;
  matchedText: string;
  startMs: number;
  endMs: number;
  media: {
    kind: "direct-mp4" | "youtube-segment";
    sourceUrl: string;
    renderUrl?: string;
    youtubeVideoId?: string;
    youtubeWatchUrl?: string;
    thumbnailUrl?: string;
    requiresMaterialization: boolean;
  };
  words: Array<{
    text: string;
    startMs: number;
    endMs: number;
    index: number;
    isMatch: boolean;
    confidence?: number;
  }>;
  transcriptSegments: Array<{
    text: string;
    startMs: number;
    endMs?: number;
    isMatch?: boolean;
  }>;
  attribution: {
    title?: string;
    channelName?: string;
    channelUrl?: string;
    sourcePageUrl?: string;
    sourceInfo?: string;
  };
  raw: unknown;
};
```

## PlayPhrase Mapping

PlayPhrase has enough data to render immediately:

- `video-url` -> `media.renderUrl`
- `words[].start/end` -> `words[].startMs/endMs`
- `words[].searched?` -> `words[].isMatch`
- `video-info.info` -> `attribution.title`
- `video-info.source-url` -> `attribution.sourcePageUrl`

Its normalized media looks like:

```json
{
  "kind": "direct-mp4",
  "sourceUrl": "https://...mp4",
  "renderUrl": "https://...mp4",
  "requiresMaterialization": false
}
```

## Filmot Mapping

Anonymous direct requests to the provided Filmot search URL returned hCaptcha, so production use will need either:

- a logged-in/patron cookie after user verification, or
- a manual browser-auth flow that stores a Filmot session cookie.

Filmot search results should be treated as YouTube transcript matches:

- YouTube video id -> `media.youtubeVideoId`
- result timestamp -> `startMs`
- subtitle snippet -> `text` and `transcriptSegments`
- title/channel -> `attribution`
- result URL -> `media.sourceUrl`

Its normalized media starts as:

```json
{
  "kind": "youtube-segment",
  "sourceUrl": "https://filmot.com/...",
  "youtubeVideoId": "VIDEO_ID",
  "youtubeWatchUrl": "https://www.youtube.com/watch?v=VIDEO_ID&t=123s",
  "requiresMaterialization": true
}
```

Before Remotion render, a Filmot clip must be materialized:

```txt
yt-dlp YouTube URL -> ffmpeg cut startMs/endMs -> local mp4 -> media.renderUrl
```

After that:

```json
{
  "kind": "youtube-segment",
  "renderUrl": "/out/materialized/filmot-VIDEO_ID-123000.mp4",
  "requiresMaterialization": false
}
```

## Render Rule

Remotion may render only clips where `media.renderUrl` is present.

For subtitles:

- Prefer `words` when available.
- Fall back to `transcriptSegments` when word-level timing is unavailable.
- Highlight `words[].isMatch` or `transcriptSegments[].isMatch`.
