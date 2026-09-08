'use client';

import { ParticleScene } from '@/components/particle-scene';

const links = [
  {
    title: 'Tra cứu dược phẩm',
    href: 'https://xxct.allofdtp.site',
    domain: 'xxct.allofdtp.site',
  },
  {
    title: 'Tiêu chuẩn nguyên liệu',
    href: 'https://tcnl.allofdtp.site',
    domain: 'tcnl.allofdtp.site',
  },
  {
    title: 'Nguồn cung chuẩn & QC',
    href: 'https://orderhc.allofdtp.site',
    domain: 'orderhc.allofdtp.site',
  },
];

export default function Home() {
  return (
    <main className="workspace">
      <header className="masthead">
        <h1>
          DTP <span>Workspace</span>
        </h1>
        <p>Cổng công cụ dược phẩm</p>
      </header>
      <section className="scene" aria-label="DTP — trường sao tương tác">
        <ParticleScene />
      </section>
      <nav className="destinations" aria-label="Công cụ DTP">
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="destination"
          >
            <span className="destination-index">0{index + 1}</span>
            <span className="destination-title">{link.title}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18 18 6M6 6h12v12" />
            </svg>
            <span className="destination-domain">{link.domain}</span>
            <span className="sr-only">Mở trong tab mới</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
