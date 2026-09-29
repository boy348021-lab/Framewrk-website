import './lightcaptionband.css';

const profiles = [
  { name: 'Richi', role: 'Director and COO', side: 'left', index: '01' },
  { name: 'Vihan Saraswat', role: 'Director and CEO', side: 'right', index: '02' },
] as const;

export function LightCaptionBand() {
  return (
    <main className="light-caption">
      <header className="light-caption__masthead" aria-label="FrameWrk team">
        <span className="light-caption__mark" aria-hidden="true" />
        <span className="light-caption__eyebrow">The people behind the frame</span>
        <span className="light-caption__edition">A studio portrait&nbsp; / &nbsp;01</span>
      </header>

      <figure className="light-caption__figure">
        <img
          className="light-caption__photo"
          src="/__mockup/images/team-photo.png"
          alt="Richi seated on the left and Vihan Saraswat seated on the right in a creative studio."
        />
        <figcaption className="light-caption__band">
          <div className="light-caption__intro">
            <span className="light-caption__label">Meet the team</span>
            <span className="light-caption__note">Two perspectives. One frame.</span>
          </div>
          <div className="light-caption__profiles">
            {profiles.map((person) => (
              <article className={`light-caption__person light-caption__person--${person.side}`} key={person.index}>
                <span className="light-caption__index">{person.index}</span>
                <div className="light-caption__identity">
                  <h2>{person.name}</h2>
                  <p>{person.role}</p>
                </div>
                <span className="light-caption__arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </figcaption>
      </figure>

      <footer className="light-caption__tail" aria-label="Studio details">
        <span>FrameWrk Studio</span>
        <span>Directors &amp; co-founders</span>
      </footer>
    </main>
  );
}