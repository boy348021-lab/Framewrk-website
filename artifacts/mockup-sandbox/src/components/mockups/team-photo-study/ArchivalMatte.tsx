import { useState } from 'react';
import './archival-matte.css';

const people = [
  { name: 'Richi', role: 'Director and COO', side: 'left' },
  { name: 'Vihan Saraswat', role: 'Director and CEO', side: 'right' },
] as const;

export function ArchivalMatte() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark'
  ));

  return (
    <main className="archival-matte" data-theme={theme}>
      <section className="archive-sheet" aria-labelledby="archive-title">
        <header className="archive-header">
          <div className="archive-imprint">
            <span>FrameWrk Media</span>
          </div>
          <div className="theme-switch" role="group" aria-label="Preview the light or dark colour palette">
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              LIGHT
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              DARK
            </button>
          </div>
          <p className="archive-edition">People / 01<br />Team portrait</p>
        </header>

        <div className="archive-title-row">
          <p className="archive-kicker">A note on the people behind the picture</p>
          <h1 id="archive-title">The people<br /><em>behind the frame</em></h1>
        </div>

        <figure className="print-object">
          <div className="print-topline">
            <span>Creative leadership</span>
            <span>FWM / PLATE 01</span>
          </div>
          <div className="print-mat">
            <span className="registration registration--tl" aria-hidden="true" />
            <span className="registration registration--tr" aria-hidden="true" />
            <span className="registration registration--bl" aria-hidden="true" />
            <span className="registration registration--br" aria-hidden="true" />
            <img
              className="team-print"
              src="/__mockup/images/team-photo.png"
              alt="Richi seated on the left and Vihan Saraswat seated on the right in a creative studio."
            />
          </div>
          <figcaption className="print-caption">
            <div className="caption-person caption-person--left">
              <span className="caption-index">01 / LEFT</span>
              <h2>{people[0].name}</h2>
              <p>{people[0].role}</p>
            </div>
            <div className="caption-colophon">
              <span className="colophon-rule" aria-hidden="true" />
              <span>Made together<br />in the studio</span>
            </div>
            <div className="caption-person caption-person--right">
              <span className="caption-index">02 / RIGHT</span>
              <h2>{people[1].name}</h2>
              <p>{people[1].role}</p>
            </div>
          </figcaption>
          <span className="print-edge-note" aria-hidden="true">ARCHIVAL MATTE · 01</span>
        </figure>

        <footer className="archive-footer">
          <span>FrameWrk Media / People study</span>
          <span className="footer-note">Creative direction&nbsp; / &nbsp;Production</span>
        </footer>
      </section>
    </main>
  );
}