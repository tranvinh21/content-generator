import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';
import type {QuizOption} from './features/quiz/types';

export type QuizChoiceImageProps = {
  title: string;
  questionDe: string;
  questionVi?: string;
  illustrationUrl?: string;
  options: QuizOption[];
  backgroundUrl?: string;
  watermarkUrl?: string;
};

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const labels = ['A', 'B', 'C'];
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.16)), radial-gradient(circle at 50% 28%, #fff9df, transparent 38%), linear-gradient(135deg, #efe9dd, #faf6ee 48%, #dfe5e8)',
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
      <AbsoluteFill style={{background: 'rgba(255,255,255,0.14)'}} />
    </AbsoluteFill>
  );
};

export const QuizChoiceImage: React.FC<QuizChoiceImageProps> = ({
  title,
  questionDe,
  questionVi,
  illustrationUrl,
  options,
  backgroundUrl,
  watermarkUrl,
}) => {
  const hasImage = Boolean(illustrationUrl);

  return (
    <AbsoluteFill
      style={{
        padding: '70px 72px 64px',
        color: '#101820',
        fontFamily,
        textAlign: 'center',
      }}
    >
      <Background src={backgroundUrl} />
      {watermarkUrl ? <Img src={watermarkUrl} style={{position: 'absolute', left: '50%', top: 54, width: 230, transform: 'translateX(-50%)'}} /> : null}

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'grid',
          gridTemplateRows: hasImage ? 'auto auto auto 1fr' : 'auto auto 1fr',
          alignContent: 'center',
          gap: hasImage ? 26 : 38,
          paddingTop: watermarkUrl ? 86 : 18,
        }}
      >
        <div style={{display: 'grid', gap: 8}}>
          <div style={{color: '#df2f2f', fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase'}}>
            Deutsch Quiz
          </div>
          <div style={{fontSize: title.length > 32 ? 44 : 54, fontWeight: 900, lineHeight: 1.02, textShadow: '0 3px 0 rgba(255,255,255,0.78)'}}>
            {title}
          </div>
        </div>

        <div style={{display: 'grid', gap: 14}}>
          <div style={{fontSize: questionDe.length > 72 ? 44 : 56, fontWeight: 850, lineHeight: 1.12, textWrap: 'balance'}}>
            {questionDe}
          </div>
          {questionVi ? (
            <div style={{fontSize: 30, fontWeight: 750, color: '#39434d', lineHeight: 1.22, textWrap: 'balance'}}>{questionVi}</div>
          ) : null}
        </div>

        {illustrationUrl ? (
          <Img
            src={illustrationUrl}
            style={{
              justifySelf: 'center',
              width: 330,
              height: 330,
              borderRadius: 24,
              objectFit: 'cover',
              boxShadow: '0 18px 38px rgba(55,48,39,0.18)',
            }}
          />
        ) : null}

        <div style={{display: 'grid', gap: 24, alignContent: 'center'}}>
          {options.slice(0, 3).map((option, index) => (
            <div
              key={`${option.de}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '76px minmax(0, 1fr)',
                gap: 22,
                alignItems: 'center',
                minHeight: hasImage ? 130 : 154,
                padding: hasImage ? '18px 20px' : '24px 28px',
                borderRadius: 22,
                border: '3px solid rgba(16,24,32,0.16)',
                background: 'rgba(255,253,248,0.2)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  background: '#101820',
                  color: 'white',
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {labels[index]}
              </div>
              <div style={{display: 'grid', gap: 8, textAlign: 'left'}}>
                <div style={{fontSize: option.de.length > 46 ? 34 : 42, fontWeight: 850, lineHeight: 1.12}}>{option.de}</div>
                {option.vi ? <div style={{fontSize: 27, fontWeight: 700, color: '#39434d', lineHeight: 1.18}}>{option.vi}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

