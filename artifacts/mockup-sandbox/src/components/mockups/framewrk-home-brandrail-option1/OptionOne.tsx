import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import './OptionOne.css';

const selectedClients = [
  { name: 'BRICS India 2026', image: 'hero-client-02.png' },
  { name: 'Harley-Davidson', image: 'hero-client-27.png' },
  { name: 'Paytm', image: 'hero-client-04.png' },
  { name: 'HYROX', image: 'hero-client-30.png' },
  { name: 'Warner Bros. Discovery', image: 'hero-client-03.png' },
  { name: 'FICCI FLO', image: 'hero-client-05.png' },
];

const navigation = [
  ['HOME', 'home'],
  ['SERVICES', 'services'],
  ['WORK', 'work'],
  ['ABOUT', 'about'],
  ['CONTACT', 'contact'],
];

const services = [
  { number: '01', name: 'BRANDING', detail: 'Strategy · Visual identity · Art direction' },
  { number: '02', name: 'VIDEO & CONTENT PRODUCTION', detail: 'Photography · Films · Campaigns' },
  { number: '03', name: 'SOCIAL MEDIA', detail: 'Content strategy · Social campaigns' },
  { number: '04', name: 'CREATIVE & DESIGN', detail: 'Creative direction · Digital design' },
];

export function OptionOne() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="fwm-option" id="home">
      <section className="fwm-hero" aria-labelledby="fwm-heading">
        <header className="fwm-header">
          <button
            className="fwm-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <a className="fwm-wordmark" href="#home" aria-label="FrameWrk Media home">
            <img src="/__mockup/images/framewrk-home-brandrail-option1/wordmark.png" alt="FrameWrk Media" />
          </a>
          <nav className={`fwm-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            {navigation.map(([label, target]) => (
              <a key={target} href={`#${target}`} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <a className="fwm-header-cta" href="#contact">
            <span>START A PROJECT</span><ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </header>

        <div className="fwm-hero-body">
          <div className="fwm-copy">
            <p className="fwm-eyebrow fwm-hero-eyebrow">FRAMEWRK MEDIA</p>
            <h1 id="fwm-heading">WE MAKE<br /><em>BRANDS MOVE.</em></h1>
            <p className="fwm-hero-description">
              FrameWrk Media is a creative production &amp; media studio crafting films, campaigns, social content and visual experiences for brands, businesses and ideas.
            </p>
            <a className="fwm-primary-cta" href="#work">EXPLORE OUR WORK <ArrowRight size={15} aria-hidden="true" /></a>
          </div>

          <div className="fwm-orbit" aria-hidden="true">
            <span className="fwm-orbit-ring fwm-orbit-ring-one" />
            <span className="fwm-orbit-ring fwm-orbit-ring-two" />
            <span className="fwm-orbit-ring fwm-orbit-ring-three" />
            <span className="fwm-orbit-mark" />
            <span className="fwm-orbit-path"><i /></span>
            <span className="fwm-orbit-flare" />
          </div>
          <div className="fwm-hero-index" aria-hidden="true"><span>01</span><i /> CREATIVE STUDIO · INDIA</div>
        </div>
      </section>

      <section className="fwm-services" id="services" aria-labelledby="fwm-services-heading">
        <div className="fwm-transition-glow" aria-hidden="true" />
        <div className="fwm-client-block">
          <p className="fwm-client-label">SELECTED CLIENTS</p>
          <ul className="fwm-client-row" aria-label="Selected clients">
            {selectedClients.map((client) => (
              <li className="fwm-client-logo" key={client.name}>
                <img
                  src={`/__mockup/images/framewrk-home-brandrail-option1/${client.image}`}
                  alt={client.name}
                  loading="eager"
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="fwm-services-content">
          <div className="fwm-section-intro">
            <div>
              <p className="fwm-eyebrow">SERVICES</p>
              <h2 id="fwm-services-heading">WHAT<br /><em>WE DO</em></h2>
            </div>
            <p className="fwm-services-summary">
              Strategy. Creativity. Production. Execution.<br />
              From the first idea to the final frame, we bring strategy, storytelling and production together to create work that moves brands forward.
            </p>
          </div>
          <div className="fwm-service-list">
            {services.map((service) => (
              <article className="fwm-service" key={service.number}>
                <span className="fwm-service-number">{service.number}</span>
                <h3>{service.name}</h3>
                <p>{service.detail}</p>
                <ArrowUpRight size={16} aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}