import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame} from 'remotion';
import type {QuizItem, QuizVideoProps} from './features/quiz/types';

const FPS = 30;
const THINK_FRAMES = 90;
const REVEAL_FRAMES = 36;
const DEFAULT_OUTRO_FRAMES = 90;
const MIN_QUESTION_AUDIO_FRAMES = 42;
const SCENE_TRANSITION_FRAMES = 12;
const QUESTION_GAP_FRAMES = 18;
const CORRECT_VOICE_DELAY_FRAMES = 20;
const fontFamily = '"Manrope", ui-sans-serif, system-ui, sans-serif';
const optionLabels = ['A', 'B', 'C'];
const isImageSource = (src: string) => /\.(avif|jpe?g|png|webp)(\?|$)/i.test(src);

export const getQuizItemDuration = (item: QuizItem) =>
  Math.max(MIN_QUESTION_AUDIO_FRAMES, item.audioFrames || 0) +
  THINK_FRAMES +
  Math.max(REVEAL_FRAMES, (item.correctAudioFrames ?? 0) + CORRECT_VOICE_DELAY_FRAMES + 18) +
  QUESTION_GAP_FRAMES;

export const getQuizVideoDuration = (props: QuizVideoProps) =>
  Math.max(150, props.items.reduce((total, item) => total + getQuizItemDuration(item), 0) + (props.outroUrl ? props.outroFrames ?? DEFAULT_OUTRO_FRAMES : 0));

const Background: React.FC<{src?: string}> = ({src}) => {
  if (!src) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2)), radial-gradient(circle at 50% 22%, #fff7d2, transparent 35%), linear-gradient(135deg, #ede7dc, #fbf7ef 52%, #dce4e8)',
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
      <AbsoluteFill style={{background: 'rgba(255,255,255,0.2)'}} />
    </AbsoluteFill>
  );
};

const TickDots: React.FC<{progress: number}> = ({progress}) => (
  <div style={{display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center'}}>
    {[0, 1, 2, 3, 4].map((index) => {
      const active = progress >= index / 5;

      return (
        <div
          key={index}
          style={{
            width: active ? 24 : 16,
            height: active ? 24 : 16,
            borderRadius: 999,
            background: active ? '#df2f2f' : 'rgba(16, 24, 32, 0.18)',
            boxShadow: active ? '0 9px 20px rgba(223,47,47,0.26)' : 'none',
          }}
        />
      );
    })}
  </div>
);

const QuizScene: React.FC<{
  item: QuizItem;
  index: number;
  count: number;
  title: string;
  durationInFrames: number;
  tickAudioUrl?: string;
  successAudioUrl?: string;
  watermarkUrl?: string;
}> = ({item, index, count, title, durationInFrames, tickAudioUrl, successAudioUrl, watermarkUrl}) => {
  const frame = useCurrentFrame();
  const audioFrames = Math.max(MIN_QUESTION_AUDIO_FRAMES, item.audioFrames || 0);
  const revealStart = audioFrames + THINK_FRAMES;
  const revealed = frame >= revealStart;
  const exitEnd = Math.max(0, durationInFrames - QUESTION_GAP_FRAMES);
  const exitStart = Math.max(0, exitEnd - SCENE_TRANSITION_FRAMES);
  const sceneOpacity = interpolate(frame, [exitStart, exitEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sceneTranslateX = interpolate(
    frame,
    [exitStart, exitEnd],
    [0, -92],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const thinkProgress = interpolate(frame, [audioFrames, revealStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const revealScale = interpolate(frame, [revealStart, revealStart + 10], [0.96, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hasImage = Boolean(item.illustrationUrl);
  const contentTop = hasImage ? 286 : 430;
  const contentGap = hasImage ? 30 : 54;
  const questionMinHeight = hasImage ? 176 : 230;
  const optionMinHeight = hasImage ? 130 : 158;
  const optionGap = hasImage ? 22 : 34;

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        color: '#101820',
        opacity: sceneOpacity,
        transform: `translateX(${sceneTranslateX}px)`,
        transformOrigin: '50% 48%',
      }}
    >
      {item.audioUrl ? <Audio src={item.audioUrl} endAt={audioFrames} /> : null}
      {tickAudioUrl ? (
        <Sequence from={audioFrames} durationInFrames={THINK_FRAMES}>
          <Audio src={tickAudioUrl} endAt={THINK_FRAMES} />
        </Sequence>
      ) : null}
      {successAudioUrl ? (
        <Sequence from={revealStart} durationInFrames={Math.max(1, REVEAL_FRAMES)}>
          <Audio src={successAudioUrl} endAt={REVEAL_FRAMES} />
        </Sequence>
      ) : null}
      {item.correctAudioUrl ? (
        <Sequence
          from={revealStart + CORRECT_VOICE_DELAY_FRAMES}
          durationInFrames={Math.max(1, item.correctAudioFrames ?? REVEAL_FRAMES)}
        >
          <Audio src={item.correctAudioUrl} endAt={Math.max(1, item.correctAudioFrames ?? REVEAL_FRAMES)} />
        </Sequence>
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: 118,
          left: 72,
          right: 72,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          color: '#101820',
          textShadow: '0 3px 0 rgba(255,255,255,0.82)',
        }}
      >
        <div>
          <div style={{color: '#df2f2f', fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase'}}>
            Deutsch Quiz
          </div>
          <div style={{marginTop: 8, maxWidth: 680, fontSize: title.length > 34 ? 38 : 46, fontWeight: 850, lineHeight: 1.05}}>
            {title}
          </div>
        </div>
        <div style={{fontSize: 30, fontWeight: 900}}>
          {index + 1}/{count}
        </div>
      </div>

      {watermarkUrl ? (
        <Img
          src={watermarkUrl}
          style={{position: 'absolute', left: '50%', bottom: 210, width: 360, transform: 'translateX(-50%)'}}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: contentTop,
          left: 78,
          right: 78,
          display: 'grid',
          gap: contentGap,
        }}
      >
        <div
          style={{
            minHeight: questionMinHeight,
            display: 'grid',
            alignContent: 'center',
            gap: 18,
            padding: 0,
            textAlign: 'center',
          }}
        >
          <div style={{fontSize: item.questionDe.length > 70 ? 45 : 56, fontWeight: 850, lineHeight: 1.12}}>
            {item.questionDe}
          </div>
          {item.questionVi ? (
            <div style={{fontSize: 32, fontWeight: 750, lineHeight: 1.25, color: '#39434d'}}>{item.questionVi}</div>
          ) : null}
        </div>

        {item.illustrationUrl ? (
          <Img
            src={item.illustrationUrl}
            style={{
              justifySelf: 'center',
              width: 360,
              height: 360,
              borderRadius: 22,
              objectFit: 'cover',
              boxShadow: '0 18px 34px rgba(55,48,39,0.18)',
            }}
          />
        ) : null}

        <div style={{display: 'grid', gap: optionGap}}>
          {item.options.slice(0, 3).map((option, optionIndex) => {
            const correct = optionIndex === item.correctIndex;

            return (
              <div
                key={`${option.de}-${optionIndex}`}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '74px minmax(0, 1fr)',
                  gap: 20,
                  alignItems: 'center',
                  minHeight: optionMinHeight,
                  padding: hasImage ? '16px 20px' : '24px 28px',
                  borderRadius: 20,
                  border: revealed && correct ? '7px solid #df2f2f' : '2px solid rgba(16, 24, 32, 0.18)',
                  background: revealed && correct ? 'rgba(255, 247, 210, 0.38)' : 'transparent',
                  boxShadow: revealed && correct ? '0 18px 42px rgba(223,47,47,0.18)' : 'none',
                  transform: revealed && correct ? `scale(${revealScale})` : 'scale(1)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 66,
                    height: 66,
                    borderRadius: 999,
                    background: revealed && correct ? '#df2f2f' : '#101820',
                    color: 'white',
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  {optionLabels[optionIndex]}
                </div>
                <div style={{display: 'grid', gap: 7}}>
                  <div style={{fontSize: option.de.length > 46 ? 34 : 42, fontWeight: 800, lineHeight: 1.12}}>{option.de}</div>
                  <div style={{fontSize: 27, fontWeight: 700, color: '#39434d', lineHeight: 1.18}}>{option.vi}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{height: 76}}>
          {!revealed ? (
            <TickDots progress={thinkProgress} />
          ) : (
            <div style={{display: 'grid', justifyItems: 'center', gap: 4, color: '#df2f2f', textAlign: 'center'}}>
              <div style={{fontSize: 30, fontWeight: 900}}>Đáp án đúng</div>
              <div style={{fontSize: 24, fontWeight: 850, color: '#101820'}}>{item.options[item.correctIndex]?.de}</div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const QuizVideo: React.FC<QuizVideoProps> = (props) => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#f5f5f1'}}>
      <Background src={props.backgroundUrl} />
      {props.items.map((item, index) => {
        const duration = getQuizItemDuration(item);
        const from = cursor;
        cursor += duration;

        return (
          <Sequence from={from} durationInFrames={duration} key={`${item.questionDe}-${index}`}>
            <QuizScene
              count={props.items.length}
              durationInFrames={duration}
              index={index}
              item={item}
              successAudioUrl={props.successAudioUrl}
              tickAudioUrl={props.tickAudioUrl}
              title={props.title}
              watermarkUrl={props.watermarkUrl}
            />
          </Sequence>
        );
      })}
      {props.outroUrl ? (
        <Sequence from={cursor} durationInFrames={props.outroFrames ?? DEFAULT_OUTRO_FRAMES}>
          <OffthreadVideo src={props.outroUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const QUIZ_FPS = FPS;
