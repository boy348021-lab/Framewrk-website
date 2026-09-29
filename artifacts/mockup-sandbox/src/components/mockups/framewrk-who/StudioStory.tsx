import { useState } from 'react';
import './_group.css';
import './StudioStory.css';

type Theme = 'dark' | 'light';

export function StudioStory() {
  const [theme, setTheme] = useState<Theme>('dark');

  return (
    <main className="fw-story" data-theme={theme}>
      <section className="fw-story__section" aria-labelledby="fw-story-title">
        <div className="fw-story__texture" aria-hidden="true" />
        <div className="fw-story__topline">
          <span className="fw-story__wordmark">FWM</span>
          <button
            className="fw-story__theme"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span className="fw-story__theme-dot" aria-hidden="true" />
            {theme === 'dark' ? 'LIGHT / DARK' : 'DARK / LIGHT'}
          </button>
        </div>

        <div className="fw-story__layout">
          <header className="fw-story__intro">
            <p className="fw-story__eyebrow"><span>04</span> — WHO WE ARE</p>
            <h2 id="fw-story-title">WHO<br /><em>WE ARE</em></h2>
            <div className="fw-story__index" aria-hidden="true">
              <span>CREATIVE PRODUCTION</span>
              <span>MEDIA STUDIO</span>
            </div>
            <div className="fw-story__rule" />
            <p className="fw-story__side-note">A clear idea.<br />A frame to bring it to life.</p>
          </header>

          <div className="fw-story__body">
            <div className="fw-story__brand-row">
              <div className="fw-story__logo-frame" aria-label="FrameWrk Media">
                <img
                  className="fw-story__logo fw-story__logo--white"
                  src="/__mockup/images/fwm-about-white.png"
                  alt="FrameWrk Media"
                />
                <img
                  className="fw-story__logo fw-story__logo--black"
                  src="/__mockup/images/fwm-about-black.png"
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <span className="fw-story__brand-caption">FRAMEWRK MEDIA<br />STRATEGY × PRODUCTION</span>
            </div>

            <div className="fw-story__copy">
              <p className="fw-story__lead">
                FrameWrk Media is a creative production and media studio building brands through
                <span> strategy, storytelling, design and visual content.</span>
              </p>
              <div className="fw-story__details">
                <p>
                  We work across branding, video production, content, social media and creative
                  direction to turn ideas into work that connects with people and gives brands a
                  consistent system to grow.
                </p>
                <p>
                  From a single campaign to an ongoing creative partnership, we bring strategy and
                  execution together under one frame.
                </p>
              </div>
            </div>

            <div className="fw-story__statement">
              <div className="fw-story__statement-label">
                <span className="fw-story__asterisk" aria-hidden="true">✳</span>
                <span>THE FRAMEWORK</span>
              </div>
              <div className="fw-story__statement-copy">
                <h2>STRATEGY TO SCREEN.<br /><em>IDEA TO EXECUTION.</em></h2>
                <p>We build creative systems that help brands communicate consistently, creatively and with purpose.</p>
              </div>
            </div>
            <div className="fw-story__footer">
              <span>ONE FRAME, MANY WAYS TO TELL IT.</span>
              <span>04 <i>—</i> 04</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}