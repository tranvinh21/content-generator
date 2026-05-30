import type {ReactNode} from 'react';
import {PanelHeader} from './PanelHeader';

type StatusPanelProps = {
  logs: string[];
  eyebrow?: string;
  title?: string;
  children?: ReactNode;
};

export const StatusPanel = ({logs, eyebrow = 'Log', title = 'Status', children}: StatusPanelProps) => (
  <aside className="panel postLog">
    <PanelHeader compact eyebrow={eyebrow} title={title} />
    {children}
    <pre className="log">{logs.join('\n')}</pre>
  </aside>
);
