import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';

export type VocabularyPostImageProps = {
  term: string;
  ipa: string;
  translationVi: string;
  backgroundUrl?: string;
  watermarkUrl?: string;
};

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
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
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.14)'}} />
    </AbsoluteFill>
  );
};

export const VocabularyPostImage: React.FC<VocabularyPostImageProps> = ({
  term,
  ipa,
  translationVi,
  backgroundUrl,
  watermarkUrl,
}) => {
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '92px 92px 76px',
        color: '#111827',
        fontFamily,
        textAlign: 'center',
      }}
    >
      <Background src={backgroundUrl} />
      {watermarkUrl ? (
        <Img
          src={watermarkUrl}
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            width: 250,
            transform: 'translateX(-50%)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gap: 30,
          width: '100%',
          marginTop: 88,
        }}
      >
        <div
          style={{
            color: '#5275f6',
            fontSize: term.length > 18 ? 82 : 104,
            fontWeight: 800,
            lineHeight: 1.02,
            textShadow: '0 4px 0 rgba(255,255,255,0.78)',
          }}
        >
          {term}
        </div>
        <div
          style={{
            color: '#0db8d2',
            fontSize: ipa.length > 28 ? 44 : 58,
            fontWeight: 800,
            lineHeight: 1.08,
            textShadow: '0 3px 0 rgba(255,255,255,0.72)',
          }}
        >
          {ipa}
        </div>
        <div
          style={{
            color: '#111111',
            fontSize: translationVi.length > 32 ? 50 : 66,
            fontWeight: 800,
            lineHeight: 1.12,
            textShadow: '0 3px 0 rgba(255,255,255,0.72)',
          }}
        >
          {translationVi}
        </div>
      </div>
    </AbsoluteFill>
  );
};
