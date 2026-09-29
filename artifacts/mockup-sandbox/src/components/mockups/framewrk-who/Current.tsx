import './_group.css';

export function Current() {
  return (
    <main className="fw-about-preview" data-theme="dark">
      <section className="fw-light-section">
        <div className="fw-container fw-about">
          <div>
            <p className="fw-eyebrow">04 : WHO WE ARE</p>
            <h2>WHO<br /><em>WE ARE</em></h2>
          </div>
          <div>
            <div className="fw-light-branding" aria-label="FrameWrk Media">
              <div className="fw-light-logo-frame">
                <img
                  className="fw-light-logo fw-light-logo--white"
                  src="/__mockup/images/fwm-about-white.png"
                  alt="FrameWrk Media"
                />
                <img
                  className="fw-light-logo fw-light-logo--black"
                  src="/__mockup/images/fwm-about-black.png"
                  alt=""
                />
              </div>
            </div>
            <p className="fw-about-copy">
              FrameWrk Media is a creative production and media studio building brands through strategy,
              storytelling, design and visual content.
            </p>
            <p className="fw-about-body">
              We work across branding, video production, content, social media and creative direction to
              turn ideas into work that connects with people and gives brands a consistent system to grow.
            </p>
            <p className="fw-about-body">
              From a single campaign to an ongoing creative partnership, we bring strategy and execution
              together under one frame.
            </p>
            <div className="fw-about-statement">
              <h3>STRATEGY TO SCREEN. IDEA TO EXECUTION.</h3>
              <p>We build creative systems that help brands communicate consistently, creatively and with purpose.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}