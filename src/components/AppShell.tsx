'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {featureNavItems} from '../app/feature-registry';

const isActivePath = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AppShell = ({children}: {children: ReactNode}) => {
  const pathname = usePathname();

  return (
    <div className="appShell">
      <aside className="appSidebar">
        <Link className="brandMark" href="/">
          <span className="brandKicker">BlauBerry</span>
          <strong>Content Studio</strong>
        </Link>
        <nav className="featureNav" aria-label="Content tools">
          {featureNavItems.map((item) => (
            <Link className={isActivePath(pathname, item.href) ? 'active' : undefined} href={item.href} key={item.href}>
              <span>{item.group}</span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="appMain">
        <header className="mobileTopbar">
          <Link className="mobileBrand" href="/">
            BlauBerry Studio
          </Link>
          <nav className="mobileNav" aria-label="Content tools">
            {featureNavItems.map((item) => (
              <Link className={isActivePath(pathname, item.href) ? 'active' : undefined} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
};
