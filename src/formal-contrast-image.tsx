import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';

export type FormalContrastImageProps = {
  informalGerman: string;
  informalVi: string;
  formalGerman: string;
  formalVi: string;
  illustrationUrl?: string;
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
            'linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)), radial-gradient(circle at 50% 30%, #fff9df, transparent 36%), linear-gradient(135deg, #efe9dd, #faf6ee 48%, #dfe5e8)',
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
      <AbsoluteFill style={{background: 'rgba(255, 255, 255, 0.12)'}} />
    </AbsoluteFill>
  );
};

const Illustration: React.FC<{src?: string}> = ({src}) => {
  if (src) {
    return (
      <div
        style={{
          width: 340,
          height: 340,
          margin: '0 auto',
          overflow: 'hidden',
          border: '10px solid rgba(255,255,255,0.86)',
          borderRadius: 42,
          background: 'rgba(255,255,255,0.78)',
          boxShadow: '0 24px 60px rgba(17, 24, 39, 0.14)',
        }}
      >
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
    );
  }

  return (
  <div
    style={{
      position: 'relative',
      width: 340,
      height: 340,
      margin: '0 auto',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 42,
        background: 'rgba(255,255,255,0.78)',
        boxShadow: '0 24px 60px rgba(17, 24, 39, 0.14)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 48,
        top: 118,
        width: 110,
        height: 110,
        borderRadius: '50%',
        background: '#5275f6',
        boxShadow: 'inset 0 -16px 0 rgba(17,24,39,0.08)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 48,
        top: 118,
        width: 110,
        height: 110,
        borderRadius: '50%',
        background: '#f3c244',
        boxShadow: 'inset 0 -16px 0 rgba(17,24,39,0.08)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 88,
        top: 150,
        width: 28,
        height: 10,
        borderRadius: 999,
        background: '#111827',
        boxShadow: '44px 0 0 #111827',
      }}
    />
    <div
      style={{
        position: 'absolute',
        right: 88,
        top: 150,
        width: 28,
        height: 10,
        borderRadius: 999,
        background: '#111827',
        boxShadow: '44px 0 0 #111827',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 119,
        top: 48,
        width: 102,
        height: 74,
        borderRadius: '34px 34px 34px 12px',
        background: '#ffffff',
        border: '5px solid rgba(17,24,39,0.1)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 147,
        top: 78,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#df2f2f',
        boxShadow: '28px 0 0 #0db8d2',
      }}
    />
  </div>
  );
};

const PhraseBlock: React.FC<{
  german: string;
  vi: string;
  kind: 'informal' | 'formal';
}> = ({german, vi, kind}) => {
  const isFormal = kind === 'formal';

  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        justifyItems: 'center',
        color: isFormal ? '#5275f6' : '#111827',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontSize: german.length > 32 ? 52 : 68,
          fontWeight: 800,
          lineHeight: 1.06,
          textDecoration: isFormal ? 'none' : 'line-through',
          textDecorationColor: '#df2f2f',
          textDecorationThickness: 3,
          textShadow: '0 4px 0 rgba(255,255,255,0.76)',
        }}
      >
        {german}
      </div>
      <div
        style={{
          color: '#111111',
          fontSize: vi.length > 36 ? 34 : 42,
          fontWeight: 800,
          lineHeight: 1.12,
          textDecoration: isFormal ? 'none' : 'line-through',
          textDecorationColor: '#df2f2f',
          textDecorationThickness: 2,
          textShadow: '0 3px 0 rgba(255,255,255,0.72)',
        }}
      >
        {vi}
      </div>
    </div>
  );
};

export const FormalContrastImage: React.FC<FormalContrastImageProps> = ({
  informalGerman,
  informalVi,
  formalGerman,
  formalVi,
  illustrationUrl,
  backgroundUrl,
  watermarkUrl,
}) => (
  <AbsoluteFill
    style={{
      padding: '64px 78px 64px',
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
          top: 52,
          left: '50%',
          width: 220,
          transform: 'translateX(-50%)',
        }}
      />
    ) : null}
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gap: 38,
        alignContent: 'center',
        height: '100%',
        paddingTop: 54,
      }}
    >
      <Illustration src={illustrationUrl} />
      <PhraseBlock german={informalGerman} vi={informalVi} kind="informal" />
      <PhraseBlock german={formalGerman} vi={formalVi} kind="formal" />
    </div>
  </AbsoluteFill>
);
