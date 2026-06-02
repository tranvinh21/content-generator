import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo} from 'remotion';

export type WordDescriptionImageProps = {
  german: string;
  vietnamese: string;
  example: string;
  exampleVi: string;
  illustrationUrl?: string;
  backgroundUrl?: string;
  watermarkUrl?: string;
};

const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp|svg)(\?|$)/i.test(src);

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), radial-gradient(circle at 50% 30%, #f6fbff, transparent 36%), linear-gradient(135deg, #eef4ff, #fffdf8 52%, #dce8ff)',
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

const Illustration = ({src}: {src?: string}) => {
  if (src) {
    return (
      <div
        style={{
          width: 370,
          height: 370,
          margin: '0 auto',
          overflow: 'hidden',
          border: '10px solid rgba(255,255,255,0.9)',
          borderRadius: 36,
          background: 'rgba(255,255,255,0.82)',
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
        width: 370,
        height: 370,
        margin: '0 auto',
        borderRadius: 36,
        background: 'rgba(255,255,255,0.82)',
        boxShadow: '0 24px 60px rgba(17, 24, 39, 0.14)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 78,
          width: 190,
          height: 190,
          borderRadius: '50%',
          background: '#4f7cff',
          boxShadow: 'inset 0 -20px 0 rgba(17,24,39,0.1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 128,
          top: 138,
          width: 28,
          height: 12,
          borderRadius: 999,
          background: '#101820',
          boxShadow: '84px 0 0 #101820',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 143,
          top: 210,
          width: 84,
          height: 12,
          borderRadius: 999,
          background: '#101820',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 70,
          bottom: 62,
          right: 70,
          height: 18,
          borderRadius: 999,
          background: '#d7e2ff',
        }}
      />
    </div>
  );
};

export const WordDescriptionImage: React.FC<WordDescriptionImageProps> = ({
  german,
  vietnamese,
  example,
  exampleVi,
  illustrationUrl,
  backgroundUrl,
  watermarkUrl,
}) => (
  <AbsoluteFill
    style={{
      padding: '64px 78px 64px',
      color: '#101820',
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
          width: 230,
          transform: 'translateX(-50%)',
        }}
      />
    ) : null}
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        gap: 34,
        alignContent: 'center',
        height: '100%',
        paddingTop: 54,
      }}
    >
      <Illustration src={illustrationUrl} />
      <div style={{display: 'grid', gap: 10}}>
        <div
          style={{
            color: '#4f7cff',
            fontSize: german.length > 22 ? 62 : 76,
            fontWeight: 900,
            lineHeight: 1.02,
            textShadow: '0 4px 0 rgba(255,255,255,0.76)',
          }}
        >
          {german}
        </div>
        <div
          style={{
            color: '#101820',
            fontSize: vietnamese.length > 28 ? 38 : 46,
            fontWeight: 850,
            lineHeight: 1.12,
          }}
        >
          {vietnamese}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 12,
          margin: '2px auto 0',
          maxWidth: 850,
          paddingTop: 26,
          borderTop: '4px solid rgba(79,124,255,0.24)',
        }}
      >
        <div
          style={{
            color: '#4f7cff',
            fontSize: example.length > 96 ? 29 : 35,
            fontWeight: 850,
            lineHeight: 1.2,
          }}
        >
          “{example}”
        </div>
        <div
          style={{
            color: '#2f3a45',
            fontSize: exampleVi.length > 95 ? 27 : 32,
            fontWeight: 760,
            lineHeight: 1.22,
          }}
        >
          {exampleVi}
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
