import './fullwidthfeature.css';

const team = [
  { name: 'Richi', role: 'Director and COO', side: 'left', index: '01' },
  { name: 'Vihan Saraswat', role: 'Director and CEO', side: 'right', index: '02' },
] as const;

export function FullWidthFeature() {
  return (
    <main className="fw-feature">
      <header className="fw-feature__masthead" aria-label="FrameWrk team">
        <span className="fw-feature__mark" aria-hidden="true" />
        <span className="fw-feature__eyebrow">THE PEOPLE BEHIND THE FRAME</span>
        <span className="fw-feature__edition">A STUDIO PORTRAIT&nbsp; / &nbsp;01</span>
      </header>

      <figure className="fw-feature__figure">
        <img
          className="fw-feature__photo"
          src="/__mockup/images/team-photo.png"
          alt="Richi seated on the left and Vihan Saraswat seated on the right in a creative studio."
        />
        <figcaption className="fw-feature__caption">
          <div className="fw-feature__caption-intro">
            <span className="fw-feature__caption-label">Meet the team</span>
            <span className="fw-feature__caption-note">Two perspectives. One frame.</span>
          </div>
          <div className="fw-feature__profiles">
            {team.map((person) => (
              <article className={`fw-feature__person fw-feature__person--${person.side}`} key={person.index}>
                <span className="fw-feature__index">{person.index}</span>
                <div className="fw-feature__identity">
                  <h2>{person.name}</h2>
                  <p>{person.role}</p>
                </div>
                <span className="fw-feature__arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </figcaption>
      </figure>
      <div className="fw-feature__tail" aria-hidden="true">
        <span>FRAMEWRK STUDIO</span>
        <span>DIRECTORS &amp; CO-FOUNDERS</span>
      </div>
    </main>
  );
}