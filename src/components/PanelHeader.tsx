import type {ReactNode} from 'react';

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  compact?: boolean;
};

export const PanelHeader = ({eyebrow, title, actions, compact}: PanelHeaderProps) => (
  <header className={`header${compact ? ' compactHeader' : ''}`}>
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </div>
    {actions}
  </header>
);
