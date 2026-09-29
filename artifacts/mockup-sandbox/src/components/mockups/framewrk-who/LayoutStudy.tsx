import { Asterisk, ArrowDownRight } from 'lucide-react';
import './layoutstudy.css';

export function LayoutStudy() {
  return (
    <main className="fwl-study">
      <section className="fwl-canvas" aria-labelledby="fwl-title">
        <div className="fwl-grain" aria-hidden="true" />
        <header className="fwl-topline">
          <span className="fwl-wordmark">FRAMEWRK <i>/</i> MEDIA</span>
          <span className="fwl-edition">STUDIO NOTES <b>04 — 04</b></span>
        </header>

        <div className="fwl-title-row">
          <p className="fwl-kicker"><span /> WHO WE ARE</p>
          <h1 id="fwl-title">WHO <em>WE ARE</em></h1>
          <ArrowDownRight className="fwl-title-arrow" size={30} strokeWidth={1.4} aria-hidden="true" />
        </div>

        <div className="fwl-main-grid">
          <aside className="fwl-identity" aria-label="FrameWrk Media identity">
            <div className="fwl-logo-panel">
              <span className="fwl-panel-index">01 / THE STUDIO</span>
              <div className="fwl-logo-window">
                <img src="/__mockup/images/fwm-about-white.png" alt="FrameWrk Media" />
              </div>
              <div className="fwl-identity-rule" />
              <p>CREATIVE PRODUCTION<br />MEDIA STUDIO</p>
              <span className="fwl-panel-stamp">INDEPENDENT<br />BY DESIGN</span>
            </div>
            <p className="fwl-side-note">A clear idea.<br /><strong>A frame to bring it to life.</strong></p>
          </aside>

          <div className="fwl-story">
            <p className="fwl-lead">
              FrameWrk Media is a creative production and media studio building brands through
              <span> strategy, storytelling, design and visual content.</span>
            </p>
            <div className="fwl-detail-grid">
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
            <div className="fwl-story-meta">
              <span>FRAMEWRK MEDIA</span>
              <span>STRATEGY <i>×</i> PRODUCTION</span>
            </div>
          </div>
        </div>

        <div className="fwl-framework">
          <div className="fwl-framework-label">
            <Asterisk size={19} strokeWidth={1.5} aria-hidden="true" />
            <span>THE<br />FRAMEWORK</span>
          </div>
          <div className="fwl-framework-copy">
            <h2>STRATEGY TO SCREEN.<br /><em>IDEA TO EXECUTION.</em></h2>
            <p>We build creative systems that help brands communicate consistently, creatively and with purpose.</p>
          </div>
          <span className="fwl-framework-mark" aria-hidden="true">F.</span>
        </div>

        <footer className="fwl-footer">
          <span>ONE FRAME, MANY WAYS TO TELL IT.</span>
          <span>FRAMEWRK MEDIA <i>·</i> CREATIVE PRODUCTION</span>
        </footer>
      </section>
    </main>
  );
}