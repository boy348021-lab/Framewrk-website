const people = [
  { id: 'richi', name: 'Richi', role: 'Director and COO', side: 'left' },
  { id: 'vihan-saraswat', name: 'Vihan Saraswat', role: 'Director and CEO', side: 'right' },
] as const;

export function TeamPhotoSection({ editorial = false }: { editorial?: boolean }) {
  return (
    <main className="fw-people-preview" data-theme="dark">
      <section className="fw-dark-section fw-people">
        <div className="fw-container">
          <h2>
            THE PEOPLE<br />
            <em>BEHIND THE FRAME</em>
          </h2>
          <div className="fw-people-team">
            <div className={`fw-people-photo-wrap ${editorial ? 'fw-people-photo-wrap--editorial' : ''}`}>
              <figure className="fw-people-photo">
                <img
                  src="/__mockup/images/team-photo.png"
                  alt="Richi seated on the left and Vihan Saraswat seated on the right in a creative studio."
                />
              </figure>
            </div>
            <div className="fw-people-profiles">
              {people.map((person) => (
                <article className={`fw-person fw-person-${person.side}`} key={person.id}>
                  <h3>{person.name}</h3>
                  <p>{person.role}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}