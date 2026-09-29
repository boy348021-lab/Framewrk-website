import { Asterisk } from 'lucide-react';
import aboutBlackLogo from '@assets/FWM_Black_LOGO_H_1790008840051.png';
import aboutWhiteLogo from '@assets/FWM_WHITE_LOGO_1790008840051.png';
import './who-we-are.css';

type Theme = 'dark' | 'light';

export function WhoWeAre({ theme }: { theme: Theme }) {
  return (
    <section
      id="about"
      className="fw-story"
      data-theme={theme}
      aria-labelledby="fw-story-title"
      data-testid="section-about"
    >
      <div className="fw-story__section">
        <div className="fw-story__texture" aria-hidden="true" />
        <div className="fw-story__topline">
          <span className="fw-story__wordmark">FRAMEWRK / MEDIA</span>
        </div>

        <div className="fw-story__layout">
          <header className="fw-story__intro fw-reveal">
            <p className="fw-story__eyebrow">WHO WE ARE</p>
            <h2 id="fw-story-title" data-testid="text-about-title">WHO<br /><em>WE ARE</em></h2>
            <div className="fw-story__index" aria-hidden="true">
              <span>CREATIVE PRODUCTION</span>
              <span>MEDIA STUDIO</span>
            </div>
            <div className="fw-story__rule" />
            <p className="fw-story__side-note">A clear idea.<br />A frame to bring it to life.</p>
          </header>

          <div className="fw-story__body fw-reveal" data-reveal-delay="1">
            <div className="fw-story__brand-row">
              <div className="fw-story__logo-frame" role="img" aria-label="FrameWrk Media">
                <img className="fw-story__logo fw-story__logo--white" src={aboutWhiteLogo} alt="" aria-hidden="true" />
                <img className="fw-story__logo fw-story__logo--black" src={aboutBlackLogo} alt="" aria-hidden="true" />
              </div>
              <span className="fw-story__brand-caption">FRAMEWRK MEDIA<br />STRATEGY × PRODUCTION</span>
            </div>

            <div className="fw-story__copy">
              <p className="fw-story__lead" data-testid="text-about-lead">
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
                <Asterisk className="fw-story__asterisk" size={16} aria-hidden="true" />
                <span>THE FRAMEWORK</span>
              </div>
              <div className="fw-story__statement-copy">
                <h3>STRATEGY TO SCREEN.<br /><em>IDEA TO EXECUTION.</em></h3>
                <p>We build creative systems that help brands communicate consistently, creatively and with purpose.</p>
              </div>
            </div>
            <div className="fw-story__footer">
              <span>ONE FRAME, MANY WAYS TO TELL IT.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}