import React from 'react';
import {Composition} from 'remotion';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import {sampleClips} from './data/sample-clips';
import {EngagementCardImage} from './engagement-card-image';
import {FormalContrastImage} from './formal-contrast-image';
import {OpenGraphBlogImage} from './opengraph-blog-image';
import {PhraseVideo} from './phrase-video';
import {ReadAlongVideo, getReadAlongDuration} from './read-along-video';
import {VocabularyPostImage} from './post-image';
import {getVocabularyTikTokDuration, VocabularyCover, VocabularyTikTok} from './vocabulary-tiktok';
import {DEFAULT_FPS, DEFAULT_GAP_MS, getVideoDurationInFrames} from './timing';
import type {PhraseVideoProps} from './types';
import type {VocabularyTikTokProps} from './features/vocabulary/types';
import type {ReadAlongVideoProps} from './features/read-along/types';

const defaultProps: PhraseVideoProps = {
  clips: sampleClips,
  layout: 'landscape',
  gapMs: DEFAULT_GAP_MS,
  showMovieInfo: true,
};

const vocabularyDefaultProps: VocabularyTikTokProps = {
  title: '100 câu tiếng Đức cơ bản 🇩🇪',
  blocks: [],
};

const readAlongDefaultProps: ReadAlongVideoProps = {
  title: 'Leseübung: Zeit im Alltag',
  level: 'B1',
  text: 'Viele Menschen haben das Gefühl, dass ihnen die Zeit ständig davonläuft. Am Morgen beginnt der Tag oft hektisch.',
  vocabulary: [
    {term: 'ständig', ipa: '/ˈʃtɛndɪç/', translationVi: 'liên tục, thường xuyên'},
    {term: 'hektisch', ipa: '/ˈhɛktɪʃ/', translationVi: 'hối hả, tất bật'},
  ],
  durationFrames: 360,
  useEndCard: true,
};

export const Root: React.FC = () => {
  const durationInFrames = getVideoDurationInFrames(
    defaultProps.clips,
    DEFAULT_FPS,
    defaultProps.gapMs,
  );

  return (
    <>
      <Composition
        id="PhraseVideo"
        component={PhraseVideo}
        durationInFrames={durationInFrames}
        fps={DEFAULT_FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
        calculateMetadata={({props}) => {
          const layout = props.layout ?? 'landscape';
          const width = layout === 'vertical' ? 1080 : 1920;
          const height = layout === 'vertical' ? 1920 : 1080;

          return {
            durationInFrames: getVideoDurationInFrames(
              props.clips,
              DEFAULT_FPS,
              props.gapMs ?? DEFAULT_GAP_MS,
            ),
            width,
            height,
          };
        }}
      />
      <Composition
        id="VocabularyTikTok"
        component={VocabularyTikTok}
        durationInFrames={90}
        fps={DEFAULT_FPS}
        width={1080}
        height={1920}
        defaultProps={vocabularyDefaultProps}
        calculateMetadata={({props}) => ({
          durationInFrames: Math.max(90, getVocabularyTikTokDuration(props)),
          width: 1080,
          height: 1920,
        })}
      />
      <Composition
        id="VocabularyCover"
        component={VocabularyCover}
        durationInFrames={60}
        fps={DEFAULT_FPS}
        width={1080}
        height={1920}
        defaultProps={vocabularyDefaultProps}
      />
      <Composition
        id="ReadAlongVideo"
        component={ReadAlongVideo}
        durationInFrames={435}
        fps={DEFAULT_FPS}
        width={1080}
        height={1920}
        defaultProps={readAlongDefaultProps}
        calculateMetadata={({props}) => ({
          durationInFrames: getReadAlongDuration(props),
          width: 1080,
          height: 1920,
        })}
      />
      <Composition
        id="VocabularyPostImage"
        component={VocabularyPostImage}
        durationInFrames={1}
        fps={DEFAULT_FPS}
        width={1080}
        height={1080}
        defaultProps={{
          term: 'Guten Tag!',
          ipa: '/ˌɡuːtn̩ ˈtaːk/',
          translationVi: 'Xin chào / Chào buổi chiều',
        }}
      />
      <Composition
        id="FormalContrastImage"
        component={FormalContrastImage}
        durationInFrames={1}
        fps={DEFAULT_FPS}
        width={1080}
        height={1080}
        defaultProps={{
          informalGerman: 'Kannst du mir helfen?',
          informalVi: 'Bạn giúp tôi được không?',
          formalGerman: 'Könnten Sie mir bitte helfen?',
          formalVi: 'Bạn có thể vui lòng giúp tôi không?',
        }}
      />
      <Composition
        id="OpenGraphBlogImage"
        component={OpenGraphBlogImage}
        durationInFrames={1}
        fps={DEFAULT_FPS}
        width={1200}
        height={630}
        defaultProps={{
          title: '“ständig” và “beständig” khác nhau thế nào?',
          subtitle: 'Một sắc thái C1 nhỏ: xảy ra hoài hay trôi đi bền bỉ, không ngắt?',
          leftTerm: 'ständig',
          rightTerm: 'beständig',
        }}
      />
      <Composition
        id="EngagementCardImage"
        component={EngagementCardImage}
        durationInFrames={1}
        fps={DEFAULT_FPS}
        width={1080}
        height={1080}
        defaultProps={{
          title: 'Lưu lại để học dần nhé',
          subtitle: 'Follow BlauBerry để mỗi ngày gặp thêm một sắc thái tiếng Đức dễ nhớ.',
          primaryCta: 'Like',
          secondaryCta: 'Follow',
          handle: '@BlauBerry',
        }}
      />
    </>
  );
};
