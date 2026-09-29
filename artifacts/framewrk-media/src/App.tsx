import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowRight, ArrowUp, ArrowUpRight, Menu, Pause, Play, X } from 'lucide-react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import whiteLogo from '@assets/FWM_WHITE_LOGO_1789527084870.png';
import teamPhoto from '@assets/Timeline_1_01_00_14_17_(1)_1790539728272.png';
import heroIconLogo from './assets/fwm-hero-icon.png';
import { creators } from './content/creators';
import { clientLogos, services, workFilms, type WorkFilm } from './content/site-content';
import { WhoWeAre } from '@/components/who-we-are';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const HERO_HLS_URL = import.meta.env.VITE_FRAMEWRK_HLS_URL as string | undefined;
const THEME_STORAGE_KEY = 'framewrk-theme';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

type OverlayOrigin = {
  x: number;
  y: number;
};

const collaborationTabs = ['BRANDS', 'CREATORS / ARTISTS'] as const;
type CollaborationTab = (typeof collaborationTabs)[number];
const clientLogoRows = Array.from({ length: 3 }, (_, rowIndex) => {
  const rowSize = Math.ceil(clientLogos.length / 3);
  return clientLogos.slice(rowIndex * rowSize, (rowIndex + 1) * rowSize);
});

type Person = {
  id: string;
  name: string;
  displayName: string;
  role: string;
  side: 'left' | 'right';
};

const people: Person[] = [
  {
    id: 'richi',
    name: 'Richi',
    displayName: 'Richi',
    role: 'Director & COO',
    side: 'left',
  },
  {
    id: 'vihan-saraswat',
    name: 'Vihan Saraswat',
    displayName: 'Vihan',
    role: 'Director & CEO',
    side: 'right',
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > 24);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  return (
    <button
      className={`fw-scroll-top ${isVisible ? 'is-visible' : ''}`}
      type="button"
      onClick={() => scrollToId('home')}
      aria-label="Scroll to top"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
    >
      <ArrowUp size={17} strokeWidth={2.2} />
    </button>
  );
}

function HangingThemeBulb({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [isSwinging, setIsSwinging] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wasAwayFromTopRef = useRef(false);
  const swingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 140) {
        wasAwayFromTopRef.current = true;
        return;
      }

      if (wasAwayFromTopRef.current && window.scrollY <= 24) {
        wasAwayFromTopRef.current = false;
        setIsSwinging(true);
        if (swingTimeoutRef.current !== null) {
          window.clearTimeout(swingTimeoutRef.current);
        }
        swingTimeoutRef.current = window.setTimeout(() => setIsSwinging(false), 1500);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (swingTimeoutRef.current !== null) {
        window.clearTimeout(swingTimeoutRef.current);
      }
    };
  }, []);

  function playSwitchClick() {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const start = context.currentTime;
    const click = context.createOscillator();
    const clickGain = context.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1500, start);
    click.frequency.exponentialRampToValueAtTime(480, start + 0.045);
    clickGain.gain.setValueAtTime(0.0001, start);
    clickGain.gain.exponentialRampToValueAtTime(0.13, start + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);
    click.connect(clickGain);
    clickGain.connect(context.destination);
    click.start(start);
    click.stop(start + 0.06);

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(220, start);
    thump.frequency.exponentialRampToValueAtTime(90, start + 0.065);
    thumpGain.gain.setValueAtTime(0.0001, start);
    thumpGain.gain.exponentialRampToValueAtTime(0.08, start + 0.003);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
    thump.connect(thumpGain);
    thumpGain.connect(context.destination);
    thump.start(start);
    thump.stop(start + 0.085);
  }

  function handleToggle() {
    playSwitchClick();
    onToggleTheme();
  }

  return (
    <button
      className={`fw-theme-toggle fw-hanging-bulb ${theme === 'light' ? 'is-lit' : ''} ${isSwinging ? 'is-swinging' : ''}`}
      type="button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Turn on the light theme' : 'Turn off the light theme'}
      aria-pressed={theme === 'light'}
      title={theme === 'dark' ? 'Turn on the light theme' : 'Turn off the light theme'}
    >
      <svg className="fw-bulb-svg" viewBox="0 0 140 360" aria-hidden="true">
        <defs>
          <radialGradient id="fw-bulb-glow" cx="42%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#fffde8" />
            <stop offset="48%" stopColor="#ffe58a" />
            <stop offset="100%" stopColor="#f0ad3f" />
          </radialGradient>
        </defs>
        <line className="fw-bulb-cord" x1="70" y1="0" x2="70" y2="225" />
        <g transform="translate(0 183) scale(1 .78)">
          <path className="fw-bulb-knot" d="M64 34h12" />
          <path className="fw-bulb-cap" d="M54 38h32M50 44h40M53 50h34" />
          <path
            className="fw-bulb-glass-shape"
            d="M53 53c0 20-7 32-17 45-11 14-12 35-3 50 9 16 23 25 37 26 14-1 28-10 37-26 9-15 8-36-3-50-10-13-17-25-17-45Z"
          />
          <path className="fw-bulb-filament" d="M49 111c-5 14-1 30 18 39" />
          <g className="fw-bulb-rays">
            <line x1="21" y1="102" x2="5" y2="94" />
            <line x1="18" y1="126" x2="0" y2="126" />
            <line x1="24" y1="150" x2="8" y2="161" />
            <line x1="42" y1="173" x2="34" y2="191" />
            <line x1="70" y1="181" x2="70" y2="201" />
            <line x1="98" y1="173" x2="106" y2="191" />
            <line x1="116" y1="150" x2="132" y2="161" />
            <line x1="122" y1="126" x2="140" y2="126" />
            <line x1="119" y1="102" x2="135" y2="94" />
          </g>
        </g>
      </svg>
      <span className="fw-bulb-halo" aria-hidden="true" />
    </button>
  );
}

function Header({
  menuOpen,
  setMenuOpen,
  theme,
  onToggleTheme,
}: {
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const links = [
    ['HOME', 'home'],
    ['SERVICES', 'services'],
    ['WORK', 'work'],
    ['ABOUT', 'about'],
    ['CONTACT', 'contact'],
  ];

  return (
    <header className="fw-container fw-nav">
      <button className="fw-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
        {menuOpen ? <X size={25} /> : <Menu size={25} />}
      </button>
      <a className="fw-logo-link" href="#home" aria-label="FrameWrk Media home" onClick={() => setMenuOpen(false)}>
        <img
          className={`fw-header-wordmark ${theme === 'light' ? 'is-light' : ''}`}
          src={whiteLogo}
          alt="FrameWrk Media"
        />
      </a>
      <nav className="fw-nav-links" aria-label="Main navigation">
        {links.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
      <div className="fw-nav-actions">
        <a className="fw-cta" href="#contact">START A PROJECT <ArrowUpRight size={14} /></a>
        <HangingThemeBulb theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      {menuOpen && (
        <nav className="fw-mobile-nav" aria-label="Mobile navigation">
          {links.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <a href="#contact" onClick={() => setMenuOpen(false)}>START A PROJECT <ArrowUpRight size={14} /></a>
        </nav>
      )}
    </header>
  );
}

function HeroVideo() {
  const forceFallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('hero-fallback');
  const [videoFailed, setVideoFailed] = useState(!HERO_HLS_URL || forceFallback);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return (
    <div className={`fw-hero-media ${videoFailed || reducedMotion ? 'is-fallback' : ''}`} aria-hidden="true">
      {HERO_HLS_URL && !reducedMotion && !forceFallback && (
        <video
          className="fw-hero-video"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
        >
          <source src={HERO_HLS_URL} type="application/vnd.apple.mpegurl" />
        </video>
      )}
      <div className="fw-hero-fallback">
        <i />
      </div>
    </div>
  );
}

function WorkFilmCard({
  film,
  index,
  isActive,
  onOpen,
}: {
  film: WorkFilm;
  index: number;
  isActive: boolean;
  onOpen: (film: WorkFilm, trigger: HTMLButtonElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('IntersectionObserver' in window)) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isVisible = false;
    const syncPlayback = () => {
      if (!isVisible || motionPreference.matches || isActive) {
        video.pause();
        return;
      }

      void video.play().catch(() => {
        // Keep the poster visible when autoplay is blocked by the browser.
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting);
      syncPlayback();
    }, { threshold: 0.25 });

    observer.observe(video);
    motionPreference.addEventListener('change', syncPlayback);

    return () => {
      observer.disconnect();
      motionPreference.removeEventListener('change', syncPlayback);
      video.pause();
    };
  }, [film.video, isActive]);

  return (
    <button
      className={`fw-project-card fw-surface-card fw-work-film-card fw-work-film-card--${film.orientation} ${isActive ? 'is-active' : ''}`}
      type="button"
      onClick={(event) => {
        delete event.currentTarget.dataset.focusRestored;
        onOpen(film, event.currentTarget);
      }}
      onBlur={(event) => { delete event.currentTarget.dataset.focusRestored; }}
      aria-expanded={isActive}
      aria-controls="work-film-preview"
      aria-haspopup="dialog"
      aria-label={`Watch film: ${film.title}`}
    >
      <video
        ref={videoRef}
        src={film.video}
        poster={film.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <span className="fw-work-film-card__shade" aria-hidden="true" />
      <span className="fw-work-film-card__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <span className="fw-work-film-card__play" aria-hidden="true"><Play size={19} fill="currentColor" /></span>
      <span className="fw-work-film-card__copy">
        <span className="fw-work-film-card__category">{film.category}</span>
        <strong>{film.title}</strong>
        <span className="fw-work-film-card__client">{film.client}</span>
        <span className="fw-work-film-card__action">OPEN FILM <ArrowUpRight size={14} /></span>
      </span>
    </button>
  );
}

function CollaborationLogoMarquee({
  clients,
  rowIndex,
  direction,
  isPaused,
}: {
  clients: typeof clientLogos;
  rowIndex: number;
  direction: 'left' | 'right';
  isPaused: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSeconds, setDurationSeconds] = useState(60);

  useEffect(() => {
    const group = trackRef.current?.querySelector<HTMLElement>('.fw-collab-marquee__group');
    if (!group) return;

    const updateDuration = () => {
      const width = group.getBoundingClientRect().width;
      if (width <= 0) return;
      const nextDuration = width / 34;
      setDurationSeconds((current) => Math.abs(current - nextDuration) < 0.05 ? current : nextDuration);
    };

    updateDuration();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateDuration);
      return () => window.removeEventListener('resize', updateDuration);
    }

    const observer = new ResizeObserver(updateDuration);
    observer.observe(group);
    return () => observer.disconnect();
  }, [clients.length]);

  const trackStyle = {
    '--collab-marquee-duration': `${durationSeconds}s`,
    '--collab-marquee-delay': `${-(durationSeconds * rowIndex / 3)}s`,
  } as CSSProperties;

  return (
    <div
      className={`fw-collab-marquee fw-reveal fw-collab-marquee--${direction}`}
      data-reveal-delay={String(rowIndex)}
      data-testid={`region-brand-marquee-row-${rowIndex + 1}`}
      role="region"
      aria-label={`Brand logos, row ${rowIndex + 1} of 3`}
      tabIndex={0}
    >
      <div
        ref={trackRef}
        className={`fw-collab-marquee__track ${isPaused ? 'is-paused' : ''}`}
        style={trackStyle}
      >
        {[false, true].map((isDuplicate, copyIndex) => (
          <div
            className={`fw-collab-marquee__group ${isDuplicate ? 'fw-collab-marquee__group--duplicate' : ''}`}
            key={copyIndex}
            role={isDuplicate ? undefined : 'list'}
            aria-label={isDuplicate ? undefined : `Brand collaborators, row ${rowIndex + 1}`}
            aria-hidden={isDuplicate || undefined}
          >
            {clients.map((client) => (
              <figure
                className="fw-collab-item"
                key={client.id}
                role={isDuplicate ? undefined : 'listitem'}
              >
                <img src={client.logo} alt={client.name} loading="lazy" decoding="async" />
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkFilmPreview({
  film,
  onClose,
  containerRef,
  origin,
}: {
  film: WorkFilm;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  origin: OverlayOrigin;
}) {
  useLayoutEffect(() => {
    const panel = containerRef.current;
    if (!panel) return;

    const previousTransform = panel.style.getPropertyValue('transform');
    panel.style.setProperty('transform', 'none');
    const panelRect = panel.getBoundingClientRect();
    if (previousTransform) {
      panel.style.setProperty('transform', previousTransform);
    } else {
      panel.style.removeProperty('transform');
    }
    panel.style.setProperty('--case-start-x', `${origin.x - (panelRect.left + panelRect.width / 2)}px`);
    panel.style.setProperty('--case-start-y', `${origin.y - (panelRect.top + panelRect.height / 2)}px`);
    panel.dataset.originReady = 'true';

    return () => {
      delete panel.dataset.originReady;
    };
  }, [containerRef, origin.x, origin.y]);

  return (
    <article
      ref={containerRef}
      className={`fw-case-study fw-work-film-preview fw-work-film-preview--${film.orientation}`}
      id="work-film-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-film-preview-title"
      tabIndex={-1}
    >
      <button className="fw-case-close fw-work-film-preview__close" onClick={onClose} aria-label="Close video preview">
        <X size={18} />
      </button>
      <div className="fw-case-media fw-work-film-preview__media">
        <video
          className="fw-work-film-preview__video"
          src={film.video}
          poster={film.poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          aria-label={`${film.title} video`}
        />
      </div>
      <div className="fw-case-copy">
        <p className="fw-case-topline"><span>{film.category}</span><span>FRAMEWRK MEDIA / SELECTED WORK</span></p>
        <p className="fw-case-category">{film.client}</p>
        <h3 id="work-film-preview-title">{film.title}</h3>
        <p className="fw-work-film-preview__description">{film.description}</p>
      </div>
    </article>
  );
}

function Home() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilm, setActiveFilm] = useState<WorkFilm | null>(null);
  const [caseStudyOrigin, setCaseStudyOrigin] = useState<OverlayOrigin>({ x: 0, y: 0 });
  const [collabTab, setCollabTab] = useState<CollaborationTab>('BRANDS');
  const [isCollabMotionPaused, setIsCollabMotionPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const caseStudyRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still works for this visit when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('.fw-reveal'));

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [collabTab]);

  useEffect(() => {
    if (!activeFilm) return;

    const FOCUSABLE = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'video[controls]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreview();
        return;
      }

      if (event.key === 'Tab' && caseStudyRef.current) {
        const focusable = Array.from(
          caseStudyRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => !el.closest('[inert]'));

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const insidePreview = caseStudyRef.current.contains(document.activeElement);

        if (!insidePreview) {
          // Focus is outside the preview — redirect into it.
          event.preventDefault();
          if (event.shiftKey) {
            last.focus();
          } else {
            first.focus();
          }
          return;
        }

        if (event.shiftKey) {
          if (document.activeElement === first || document.activeElement === caseStudyRef.current) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFilm]);

  useEffect(() => {
    if (!activeFilm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeFilm]);

  useEffect(() => {
    if (activeFilm && caseStudyRef.current) {
      caseStudyRef.current.focus({ preventScroll: true });
    }
  }, [activeFilm]);

  function openPreview(film: WorkFilm, trigger: HTMLButtonElement) {
    const triggerRect = trigger.getBoundingClientRect();
    triggerRef.current = trigger;
    setCaseStudyOrigin({
      x: triggerRect.left + triggerRect.width / 2,
      y: triggerRect.top + triggerRect.height / 2,
    });
    setActiveFilm(film);
  }

  function closePreview() {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    setActiveFilm(null);
    if (trigger?.isConnected) {
      trigger.dataset.focusRestored = 'true';
      trigger.focus({ preventScroll: true });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    const enquiry = {
      name: String(formData.get('name') ?? ''),
      company: String(formData.get('company') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      message: String(formData.get('message') ?? ''),
      faxNumber: String(formData.get('faxNumber') ?? ''),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquiry),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;

      if (response.status === 503 && result?.error === 'Email delivery is not configured yet.') {
        setSubmitError('Online enquiries aren’t set up yet. Your details are still here.');
        return;
      }

      if (!response.ok || result?.ok !== true) {
        throw new Error('Contact form submission failed');
      }

      setSubmitted(true);
    } catch {
      setSubmitError('We couldn’t send your note just now. Your details are still here—please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fw-shell">
      <section id="home" className="fw-hero">
        <HeroVideo />
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        />
          <div className="fw-container fw-hero-main">
          <div className="fw-hero-copy">
             <p className="fw-eyebrow">FRAMEWRK MEDIA</p>
             <h1>WE MAKE<br /><em>BRANDS MOVE.</em></h1>
             <p className="fw-hero-sub">FrameWrk Media is a creative production &amp; media studio crafting films, campaigns, social content and visual experiences for brands, businesses and ideas.</p>
             <a className="fw-solid-cta" href="#work">EXPLORE OUR WORK <ArrowRight size={15} /></a>
          </div>
           <div className="fw-hero-mark font-light" aria-hidden="true">
             <span
               className="fw-hero-logo"
               style={{ '--hero-logo-mask': `url(${heroIconLogo})` } as CSSProperties}
               aria-hidden="true"
             />
             <span className="fw-hero-orbit"><i /></span>
           </div>
        </div>
      </section>
      <section id="services" className="fw-light-section">
        <div className="fw-container">
           <div className="fw-section-head fw-reveal">
             <div><p className="fw-eyebrow">SERVICES</p><h2>WHAT<br /><em>WE DO</em></h2></div>
            <p>Strategy. Creativity. Production. Execution.<br />From the first idea to the final frame, we bring strategy, storytelling and production together to create work that moves brands forward.</p>
          </div>
          <div className="fw-services">
            {services.map((service, index) => (
               <article className="fw-service fw-reveal fw-reveal-pop" key={service.title} data-reveal-delay={String(index % 4)}>
                <span className="fw-service-num">{service.number}</span>
                <h3>{service.title}</h3>
                <p className="fw-service-disciplines">{service.disciplines}</p>
                <p className="fw-service-description">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="work" className="fw-dark-section fw-surface-section">
        <div className="fw-container">
           <div className="fw-section-head fw-reveal">
             <div><p className="fw-eyebrow">WORK</p><h2>SELECTED<br /><em>WORK</em></h2></div>
            <p>A selection of films, campaigns, brand identities, social content and creative projects we&apos;ve built for brands, businesses and organisations.</p>
          </div>
           <div className="fw-work-intro fw-reveal" data-reveal-delay="1">
             <span className="fw-work-count">{String(workFilms.length).padStart(2, '0')} FILMS</span>
            <a className="fw-work-contact-cta" href="#contact">HAVE A PROJECT IN MIND? <span>→ LET&apos;S TALK</span></a>
          </div>
           <div className="fw-work-stage" onClick={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
            <div className="fw-projects">
               {workFilms.map((film, index) => (
                 <WorkFilmCard
                   key={film.id}
                   film={film}
                   index={index}
                   isActive={activeFilm?.id === film.id}
                   onOpen={openPreview}
                 />
               ))}
            </div>
          </div>
             {activeFilm && (
              <div
                className="fw-case-overlay"
                role="presentation"
                onPointerDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}
              >
                 <WorkFilmPreview film={activeFilm} onClose={closePreview} containerRef={caseStudyRef} origin={caseStudyOrigin} />
              </div>
            )}
        </div>
      </section>
      <WhoWeAre theme={theme} />
      <section id="team" className="fw-people-feature" aria-labelledby="fw-people-feature-title">
        <figure className="fw-people-feature__figure">
          <img
            className="fw-people-feature__photo"
            src={teamPhoto}
            alt="Richi seated on the left and Vihan Saraswat seated on the right in a creative studio."
            loading="lazy"
            decoding="async"
          />
          <figcaption className="fw-people-feature__caption">
            <div className="fw-people-feature__intro">
              <h2 id="fw-people-feature-title">Meet the team</h2>
              <p>Two perspectives. One frame.</p>
            </div>
            <div className="fw-people-feature__profiles">
              {people.map((person) => (
                <article
                  className={`fw-people-feature__person fw-people-feature__person--${person.side}`}
                  key={person.id}
                  aria-label={`${person.name}, ${person.role}`}
                >
                  <div className="fw-people-feature__identity">
                    <h3>{person.displayName}</h3>
                    <p>{person.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </figcaption>
        </figure>
      </section>
      <section id="collaborations" className="fw-collab">
        <div className="fw-container">
           <p className="fw-eyebrow fw-reveal">CLIENTS / COLLABORATIONS</p>
           <div className="fw-collab-head fw-reveal" data-reveal-delay="1"><h2>PEOPLE WE&apos;VE<br /><em>CREATED WITH</em></h2><p>From established brands to creators and artists, we collaborate with people bringing ambitious ideas to life.</p></div>
            <div className="fw-collab-controls fw-reveal" data-reveal-delay="2">
              <div className="fw-collab-tabs" role="tablist" aria-label="Collaboration type">
                {collaborationTabs.map((tab) => {
                  const tabId = `collab-tab-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  return (
                    <button
                      key={tab}
                      id={tabId}
                      className={`fw-collab-tab ${collabTab === tab ? 'active' : ''}`}
                      onClick={() => setCollabTab(tab)}
                      role="tab"
                      aria-controls="collab-panel"
                      aria-selected={collabTab === tab}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
              {collabTab === 'BRANDS' && (
                <button
                  className="fw-collab-motion-toggle"
                  type="button"
                  onClick={() => setIsCollabMotionPaused((paused) => !paused)}
                  aria-label={isCollabMotionPaused ? 'Resume logo motion' : 'Pause logo motion'}
                  aria-pressed={isCollabMotionPaused}
                  aria-controls="fw-brand-logo-marquee"
                  data-testid="button-collab-motion-toggle"
                >
                  {isCollabMotionPaused ? <Play size={12} fill="currentColor" aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                  <span>{isCollabMotionPaused ? 'RESUME MOTION' : 'PAUSE MOTION'}</span>
                </button>
              )}
          </div>
          <div
            className="fw-collab-panel"
            id="collab-panel"
            role="tabpanel"
            aria-labelledby={`collab-tab-${collabTab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          >
            {collabTab === 'BRANDS' ? (
              <div className="fw-collab-marquee-list" id="fw-brand-logo-marquee">
                {clientLogoRows.map((clients, rowIndex) => (
                  <CollaborationLogoMarquee
                    key={rowIndex}
                    clients={clients}
                    rowIndex={rowIndex}
                    direction={rowIndex === 1 ? 'left' : 'right'}
                    isPaused={isCollabMotionPaused}
                  />
                ))}
              </div>
            ) : (
              <div className="fw-creator-grid">
                {creators.map((creator, index) => (
                  <figure className="fw-creator-card fw-reveal fw-reveal-pop" key={creator.name} data-reveal-delay={String(index % 4)}>
                    <img src={creator.image} alt={`Portrait of ${creator.name}`} loading="lazy" decoding="async" />
                    <figcaption>{creator.name}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
          <div className="fw-collab-foot fw-reveal" data-reveal-delay="3">
            <a href="#work">EXPLORE SELECTED WORK <ArrowUpRight size={14} /></a>
          </div>
        </div>
      </section>
      <section id="contact" className="fw-contact">
        <div className="fw-container fw-contact-grid">
           <div className="fw-reveal">
             <p className="fw-eyebrow">CONTACT</p>
            <h2>HAVE AN<br /><em>IDEA?</em></h2>
            <div className="fw-contact-details">
              <a href="mailto:contact@theframewrkmedia.com">contact@theframewrkmedia.com</a>
              <a href="tel:+91959904951">+91 9599041951</a>
              <a href="tel:+917999229700">+91 7999229700</a>
            </div>
          </div>
           <form className="fw-form fw-reveal" data-reveal-delay="1" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            {submitted ? (
              <div className="fw-form-success" role="status" aria-live="polite">
                <strong>Thanks for reaching out.</strong><br />
                Your note has been sent to FrameWrk Media. We&apos;ll be in touch soon.
              </div>
            ) : <>
              <div className="fw-field"><label htmlFor="name">YOUR NAME</label><input id="name" name="name" autoComplete="name" maxLength={120} placeholder="Your full name" required /></div>
              <div className="fw-field"><label htmlFor="company">COMPANY / BRAND (OPTIONAL)</label><input id="company" name="company" autoComplete="organization" maxLength={160} placeholder="Company or brand name" /></div>
              <div className="fw-form-row">
                <div className="fw-field"><label htmlFor="email">EMAIL</label><input id="email" name="email" type="email" autoComplete="email" maxLength={320} placeholder="you@example.com" required /></div>
                <div className="fw-field"><label htmlFor="phone">PHONE (OPTIONAL)</label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={80} placeholder="Phone number" /></div>
              </div>
              <div className="fw-field"><label htmlFor="message">WHAT CAN WE HELP WITH?</label><textarea id="message" name="message" maxLength={5000} placeholder="Tell us about your project" required /></div>
              <div className="fw-honeypot" aria-hidden="true">
                <label htmlFor="faxNumber">Fax number</label>
                <input id="faxNumber" name="faxNumber" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              {submitError && (
                <div className="fw-form-error" role="alert">
                  {submitError} <a href="mailto:contact@theframewrkmedia.com">Email us directly</a>.
                </div>
              )}
              <button className="fw-form-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'SENDING…' : 'START THE CONVERSATION'}
                {!isSubmitting && <ArrowUpRight size={15} />}
              </button>
            </>}
          </form>
        </div>
      </section>
      <footer className="fw-footer">
        <div className="fw-container">
          <div className="fw-footer-top">
            <div className="fw-footer-brand"><div className="fw-footer-logo-frame"><img className={`fw-logo ${theme === 'light' ? 'is-light' : ''}`} src={whiteLogo} alt="FrameWrk Media" /></div><p>FRAMEWRK MEDIA PVT. LTD.</p><p className="fw-footer-statement">STRATEGY TO SCREEN. IDEA TO EXECUTION.</p><p className="fw-footer-support">We build creative systems that help brands communicate consistently, creatively and with purpose.</p><a className="fw-company-url" href="https://theframewrkmedia.com" target="_blank" rel="noreferrer">theframewrkmedia.com</a></div>
            <div className="fw-footer-links">
              <div className="fw-footer-col"><h4>QUICK LINKS</h4><a href="#home">Home</a><a href="#services">Services</a><a href="#work">Work</a><a href="#about">About</a><a href="#team">Team</a><a href="#collaborations">Clients</a><a href="#contact">Contact</a></div>
              <div className="fw-footer-col"><h4>CONTACT</h4><a href="mailto:contact@theframewrkmedia.com">contact@theframewrkmedia.com</a><a href="tel:+91959904951">+91 9599041951</a><a href="tel:+917999229700">+91 7999229700</a></div>
              <div className="fw-footer-col"><h4>LEGAL</h4><span>Privacy Policy</span><span>Terms &amp; Conditions</span></div>
            </div>
          </div>
          <div className="fw-footer-bottom"><span>© 2026 FrameWrk Media Pvt. Ltd. All Rights Reserved.</span></div>
        </div>
      </footer>
      <ScrollToTopButton />
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
