import { useState } from 'react';
import './hero-refined.css';

const clients = [
  'BRICS INDIA 2026',
  'HARLEY-DAVIDSON',
  'paytm',
  'HYROX',
  'WARNER BROS. DISCOVERY',
  'FICCI FLO',
];

function FrameMark() {
  return (
    <svg viewBox="0 0 80 72" role="img" aria-label="FrameWrk mark">
      <path d="M7 53 17 18l17-8-9 35-18 8Z" />
      <path d="m32 42 9-32 17-8-9 32-17 8Z" />
      <path d="m52 32 8-28 15-4-8 27-15 5Z" />
    </svg>
  );
}

export function HeroRefined() {
  const [theme, setTheme] = useState<'night' | 'day'>('night');

  return (
    <main className="fhr" data-theme={theme}>
      <section className="fhr-hero" aria-labelledby="fhr-title">
        <div className="fhr-grain" aria-hidden="true" />
        <div className="fhr-vignette" aria-hidden="true" />
        <header className="fhr-header">
          <a className="fhr-brand" href="#home" aria-label="FrameWrk Media home">
            <span className="fhr-brand-mark"><FrameMark /></span>
            <span className="fhr-brand-name">FrameWrk<small>Media</small></span>
          </a>
          <nav className="fhr-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <a href="#work">Work</a>
            <a href="#about">About</a>
          </nav>
          <div className="fhr-header-actions">
            <a className="fhr-contact" href="#contact">Start a project <span aria-hidden="true">↗</span></a>
            <button
              className={`fhr-theme ${theme === 'day' ? 'is-day' : ''}`}
              type="button"
              aria-label={`Switch to ${theme === 'night' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'day'}
              onClick={() => setTheme(theme === 'night' ? 'day' : 'night')}
            >
              <span />
            </button>
          </div>
        </header>

        <div className="fhr-content" id="home">
          <div className="fhr-copy">
            <p className="fhr-kicker"><i /> Independent creative production studio</p>
            <h1 id="fhr-title">WE MAKE<br /><em>BRANDS MOVE.</em></h1>
            <p className="fhr-description">
              FrameWrk Media brings strategy, storytelling and production together
              to make work that moves people — and brands forward.
            </p>
            <div className="fhr-actions">
              <a className="fhr-primary" href="#work">Explore our work <span aria-hidden="true">→</span></a>
              <span className="fhr-location"><span className="fhr-location-dot" /> India · working everywhere</span>
            </div>
          </div>

          <div className="fhr-art" aria-label="FrameWrk Media visual mark">
            <div className="fhr-art-label fhr-art-label--top">IDEA / FRAME / IMPACT</div>
            <div className="fhr-orbit fhr-orbit--outer" />
            <div className="fhr-orbit fhr-orbit--middle" />
            <div className="fhr-orbit fhr-orbit--inner" />
            <div className="fhr-orbit-line" />
            <span className="fhr-orbit-point" />
            <div className="fhr-symbol"><FrameMark /></div>
            <div className="fhr-art-label fhr-art-label--bottom">STRATEGY × STORY × SCREEN</div>
          </div>
        </div>

        <div className="fhr-client-bar" aria-label={`Brands we've worked with: ${clients.join(', ')}`}>
          <div className="fhr-client-heading">
            <span>Selected collaborators</span>
            <b>01 — 06</b>
          </div>
          <div className="fhr-client-track">
            {clients.map((client, index) => (
              <div className={`fhr-client fhr-client--${index}`} key={client}>
                <span className="fhr-client-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{client}</span>
              </div>
            ))}
          </div>
          <span className="fhr-scroll-cue"><i /> Scroll to explore</span>
        </div>
      </section>
    </main>
  );
}