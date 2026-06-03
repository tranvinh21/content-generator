import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import type {ReadAlongVideoProps, ReadAlongVocabularyItem} from './features/read-along/types';

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);
const germanArticles = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']);
const VOCAB_REVIEW_HOLD_FRAMES = 90;
const END_CARD_FRAMES = 75;

export const getReadAlongDuration = (props: ReadAlongVideoProps) =>
  Math.max(240, props.durationFrames + VOCAB_REVIEW_HOLD_FRAMES + (props.useEndCard === false ? 0 : END_CARD_FRAMES));

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)), radial-gradient(circle at 50% 24%, #fff7d2, transparent 36%), linear-gradient(135deg, #ede7dc, #fbf7ef 52%, #dce4e8)',
        }}
      />
    );
  }

  return (
    <AbsoluteFill>
      {isImageSource(src) ? (
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <OffthreadVideo src={src} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      )}
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.18)'}} />
    </AbsoluteFill>
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getVocabularySearchTerms = (term: string) => {
  const trimmed = term.trim();
  const parts = trimmed.split(/\s+/);
  const withoutArticle = parts.length > 1 && germanArticles.has(parts[0].toLocaleLowerCase('de-DE')) ? parts.slice(1).join(' ') : '';

  return Array.from(new Set([trimmed, withoutArticle].filter(Boolean)));
};

const tokenizeWithVocabulary = (text: string, vocabulary: ReadAlongVocabularyItem[]) => {
  const terms = vocabulary
    .flatMap((item) => getVocabularySearchTerms(item.term))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) {
    return [{text, highlighted: false}];
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu');
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part) => ({
    text: part,
    highlighted: terms.some((term) => term.toLocaleLowerCase('de-DE') === part.toLocaleLowerCase('de-DE')),
  }));
};

const ReadingText: React.FC<{text: string; vocabulary: ReadAlongVocabularyItem[]; durationFrames: number}> = ({
  text,
  vocabulary,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const readAreaTop = 230;
  const readAreaHeight = 850;
  const fontSize = 38;
  const lineHeight = 1.6;
  const estimatedLines = Math.max(4, Math.ceil(text.length / 36));
  const estimatedContentHeight = estimatedLines * fontSize * lineHeight;
  const startY = Math.max(0, 1920 * 0.5 - readAreaTop);
  const endY = Math.min(startY, readAreaHeight * 0.86 - estimatedContentHeight);
  const translateY = interpolate(frame, [0, Math.max(1, durationFrames - 2)], [startY, endY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tokens = tokenizeWithVocabulary(text, vocabulary);

  return (
    <div
      style={{
        position: 'absolute',
        top: readAreaTop,
        left: 86,
        right: 86,
        height: readAreaHeight,
        overflow: 'hidden',
        color: '#101820',
        fontSize,
        fontWeight: 500,
        lineHeight,
        letterSpacing: 0.3,
        wordSpacing: 5,
        textAlign: 'left',
        textShadow: '0 3px 0 rgba(255,255,255,0.76)',
      }}
    >
      <div style={{transform: `translateY(${translateY}px)`}}>
        {tokens.map((token, index) => (
          <React.Fragment key={`${token.text}-${index}`}>
            {token.highlighted ? (
              <span
                style={{
                  display: 'inline',
                  borderRadius: 6,
                  background: 'linear-gradient(180deg, transparent 12%, rgba(244, 196, 48, 0.68) 12%, rgba(244, 196, 48, 0.68) 88%, transparent 88%)',
                  color: '#101820',
                  padding: '0 6px 3px',
                  borderBottom: '4px solid rgba(223, 47, 47, 0.72)',
                  boxShadow: '0 5px 0 rgba(244, 196, 48, 0.24)',
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone',
                }}
              >
                {token.text}
              </span>
            ) : (
              token.text
            )}
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(245,245,241,0.72) 0%, transparent 14%, transparent 82%, rgba(245,245,241,0.72) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

const getActiveVocabularyIndex = (text: string, items: ReadAlongVocabularyItem[], frame: number, durationFrames: number) => {
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, durationFrames)));
  const currentIndex = progress * text.length;
  const lookBehind = 180;
  const lookAhead = 360;

  for (const [index, item] of items.entries()) {
    const terms = getVocabularySearchTerms(item.term);
    if (terms.length === 0) {
      continue;
    }

    for (const term of terms) {
      const pattern = new RegExp(escapeRegExp(term), 'giu');
      const matches = Array.from(text.matchAll(pattern));
      if (
        matches.some((match) => {
          const start = match.index ?? 0;
          const end = start + term.length;

          return end >= currentIndex - lookBehind && start <= currentIndex + lookAhead;
        })
      ) {
        return index;
      }
    }
  }

  return -1;
};

const VocabularyDock: React.FC<{items: ReadAlongVocabularyItem[]; text: string; durationFrames: number}> = ({
  items,
  text,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const activeVocabularyIndex = getActiveVocabularyIndex(text, items, frame, durationFrames);
  const visibleItems = items;
  const compact = items.length > 6;

  return (
    <div
      style={{
        position: 'absolute',
        left: 54,
        right: 54,
        bottom: 270,
        display: 'grid',
        gap: 16,
        padding: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#df2f2f',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        <span>Wortschatz</span>
      </div>
      <div style={{display: 'grid', gap: compact ? 11 : 15}}>
        {visibleItems.map((item, visibleIndex) => {
          const active = visibleIndex === activeVocabularyIndex;
          const hasMeta = Boolean(item.ipa || item.translationVi);

          return (
          <div
            key={item.term}
            style={{
              display: 'grid',
              gridTemplateColumns: hasMeta
                ? 'minmax(180px, 0.66fr) minmax(190px, 0.78fr) minmax(0, 1.5fr)'
                : '1fr',
              gap: 12,
              alignItems: 'baseline',
              padding: active ? (compact ? '8px 10px 10px' : '10px 12px 12px') : compact ? '0 0 10px' : '0 0 13px',
              borderRadius: active ? 12 : 0,
              borderBottom: '2px solid rgba(16, 24, 32, 0.14)',
              background: active ? 'rgba(244, 196, 48, 0.18)' : 'transparent',
              color: '#101820',
            }}
          >
            <strong style={{fontSize: hasMeta ? (compact ? 28 : 32) : (compact ? 32 : 36), fontWeight: 750, lineHeight: 1.04, textShadow: '0 2px 0 rgba(255,255,255,0.7)'}}>{item.term}</strong>
            {item.ipa ? (
              <span style={{color: '#5275f6', fontSize: compact ? 22 : 25, fontWeight: 720, textShadow: '0 2px 0 rgba(255,255,255,0.62)'}}>{item.ipa}</span>
            ) : (
              hasMeta ? <span /> : null
            )}
            {item.translationVi ? (
              <span style={{color: '#26313d', fontSize: compact ? 23 : 26, fontWeight: 720, lineHeight: 1.14, textShadow: '0 2px 0 rgba(255,255,255,0.62)'}}>
                {item.translationVi}
              </span>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
};

const EndCard: React.FC<{watermarkUrl?: string}> = ({watermarkUrl}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 90}}>
    <div style={{display: 'grid', justifyItems: 'center', gap: 28, marginTop: -80}}>
      {watermarkUrl ? <Img src={watermarkUrl} style={{width: 280}} /> : null}
      <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.02, color: '#101820', textShadow: '0 4px 0 rgba(255,255,255,0.82)'}}>
        Lưu lại để đọc lại nhé
      </div>
      <div style={{fontSize: 46, fontWeight: 800, color: '#5275f6'}}>Follow BlauBerry.app</div>
    </div>
  </AbsoluteFill>
);

export const ReadAlongVideo: React.FC<ReadAlongVideoProps> = (props) => {
  const frame = useCurrentFrame();
  const endCardStart = props.durationFrames + VOCAB_REVIEW_HOLD_FRAMES;
  const showEndCard = props.useEndCard !== false && frame >= endCardStart;

  return (
    <AbsoluteFill style={{overflow: 'hidden', fontFamily, backgroundColor: '#f5f5f1'}}>
      <Background src={props.backgroundUrl} />
      {props.audioUrl ? <Audio src={props.audioUrl} endAt={props.durationFrames} /> : null}
      {!showEndCard ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 118,
              left: 76,
              width: 720,
              textAlign: 'left',
              color: '#101820',
              textShadow: '0 3px 0 rgba(255,255,255,0.78)',
            }}
          >
            <div style={{color: '#df2f2f', fontSize: 21, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase'}}>
              Leseübung {props.level}
            </div>
            <div style={{marginTop: 8, fontSize: props.title.length > 34 ? 42 : 52, fontWeight: 800, lineHeight: 1.04}}>
              {props.title}
            </div>
          </div>
          <ReadingText durationFrames={props.durationFrames} text={props.text} vocabulary={props.vocabulary} />
          <VocabularyDock durationFrames={props.durationFrames} items={props.vocabulary} text={props.text} />
          {props.watermarkUrl ? (
            <Img
              src={props.watermarkUrl}
              style={{position: 'absolute', left: '50%', bottom: 160, width: 310, transform: 'translateX(-50%)'}}
            />
          ) : null}
        </>
      ) : (
        <EndCard watermarkUrl={props.watermarkUrl} />
      )}
    </AbsoluteFill>
  );
};
