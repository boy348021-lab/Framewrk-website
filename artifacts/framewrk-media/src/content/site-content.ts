const logoAssets = import.meta.glob('../assets/client-logos/client-*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

function logoAsset(number: number): string {
  const filename = `client-${String(number).padStart(2, '0')}.png`;
  const path = `../assets/client-logos/${filename}`;
  const asset = logoAssets[path];

  if (!asset) {
    throw new Error(`Missing client logo asset: ${path}`);
  }

  return asset;
}

const clientNames = [
  'Woodfeather and Arborn',
  'BRICS India 2026',
  'Warner Bros. Discovery',
  'Paytm',
  'FICCI FLO',
  'Hilton',
  'Hyatt Place',
  'Glenfiddich',
  'European Union',
  'Government of India',
  'The Park Hotels',
  'The Times Group',
  'Kingfisher',
  'Three Sixty',
  'Red Bull',
  'Visa2Fly',
  'unJob',
  'Oriole Entertainment',
  'Yours Eventually',
  'Aspirant Learning',
  'Bennett University',
  'Mother Dairy',
  'Tribes Art Fest',
  'Tops',
  'Octaloop',
  'Nishat',
  'Harley-Davidson',
  'Train Rex',
  'SK-27 Gym',
  'HYROX',
  'BMW',
];

export type ClientLogo = {
  id: string;
  name: string;
  logo: string;
};

export const clientLogos: ClientLogo[] = clientNames.map((name, index) => ({
  id: String(index + 1).padStart(2, '0'),
  name,
  logo: logoAsset(index + 1),
}));

export const workCategories = ['Corporate', 'Hospitality', 'Personal brand', 'Artist'] as const;

export type WorkCategory = typeof workCategories[number];

export type WorkFilm = {
  id: string;
  category: WorkCategory;
  title: string;
  client: string;
  description: string;
  orientation: 'landscape' | 'portrait';
  video: string;
  poster: string;
};

export function workFilmAsset(filename: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${basePath}work-films/${filename}`;
}

export const workFilms: WorkFilm[] = [
  {
    id: 'mm-aftermovie',
    category: 'Corporate',
    title: 'MM Aftermovie',
    client: 'EthElite',
    description: "A recap of India's Web3 and AI gala.",
    orientation: 'landscape',
    video: workFilmAsset('mm-aftermovie-web.mp4'),
    poster: workFilmAsset('mm-aftermovie.jpg'),
  },
  {
    id: 'europe-day-2026',
    category: 'Corporate',
    title: 'Europe Day 2026',
    client: 'European Union',
    description: 'A portrait event film featuring the Europe Day 2026 program.',
    orientation: 'portrait',
    video: workFilmAsset('europe-day-2026-web.mp4'),
    poster: workFilmAsset('europe-day-2026.jpg'),
  },
  {
    id: 'mother-dairy-edit',
    category: 'Corporate',
    title: 'Mother Dairy Edit',
    client: 'Mother Dairy',
    description: 'A short brand film featuring Mother Dairy products.',
    orientation: 'portrait',
    video: workFilmAsset('mother-dairy-edit.mp4'),
    poster: workFilmAsset('mother-dairy-edit.jpg'),
  },
  {
    id: 'pmun-24-conference',
    category: 'Corporate',
    title: "PMUN '24 Conference",
    client: "PMUN '24",
    description: 'Conference highlights and committee sessions from 2024.',
    orientation: 'landscape',
    video: workFilmAsset('pmun-24-conference.mp4'),
    poster: workFilmAsset('pmun-24-conference.jpg'),
  },
  {
    id: 'hilton-garden-inn',
    category: 'Hospitality',
    title: 'Hilton Garden Inn',
    client: 'Hilton',
    description: 'A hospitality film featuring guest experiences and amenities.',
    orientation: 'landscape',
    video: workFilmAsset('hilton-garden-inn-web.mp4'),
    poster: workFilmAsset('hilton-garden-inn.jpg'),
  },
  {
    id: 'cafe-x-terrace',
    category: 'Hospitality',
    title: 'Café x Terrace',
    client: 'Zone Connect',
    description: 'A vertical venue film highlighting the café and terrace.',
    orientation: 'portrait',
    video: workFilmAsset('cafe-x-terrace.mp4'),
    poster: workFilmAsset('cafe-x-terrace.jpg'),
  },
  {
    id: 'zone-lohri',
    category: 'Hospitality',
    title: 'Zone Lohri',
    client: 'Zone Connect',
    description: 'A Lohri celebration captured at Zone Connect.',
    orientation: 'portrait',
    video: workFilmAsset('zone-lohri.mp4'),
    poster: workFilmAsset('zone-lohri.jpg'),
  },
  {
    id: 'friendship-day',
    category: 'Hospitality',
    title: 'Friendship Day',
    client: 'Three Sixty',
    description: 'A Friendship Day film for Three Sixty.',
    orientation: 'landscape',
    video: workFilmAsset('friendship-day.mp4'),
    poster: workFilmAsset('friendship-day.jpg'),
  },
  {
    id: 'emaar-personal-brand',
    category: 'Personal brand',
    title: 'EMAAR Brand Film',
    client: 'EMAAR',
    description: 'A portrait brand film featuring EMAAR spaces.',
    orientation: 'portrait',
    video: workFilmAsset('emaar-personal-brand.mp4'),
    poster: workFilmAsset('emaar-personal-brand.jpg'),
  },
  {
    id: 'founder-reel',
    category: 'Personal brand',
    title: 'Founder Reel',
    client: 'Founder',
    description: 'A portrait reel introducing a founder and their work.',
    orientation: 'portrait',
    video: workFilmAsset('founder-reel.mp4'),
    poster: workFilmAsset('founder-reel.jpg'),
  },
  {
    id: 'saurav-reel',
    category: 'Personal brand',
    title: 'Saurav Reel',
    client: 'Saurav',
    description: 'A portrait personal-brand reel featuring Saurav.',
    orientation: 'portrait',
    video: workFilmAsset('saurav-reel.mp4'),
    poster: workFilmAsset('saurav-reel.jpg'),
  },
  {
    id: 'saurav-bts',
    category: 'Personal brand',
    title: 'Saurav BTS',
    client: 'Saurav',
    description: 'Behind-the-scenes footage from a Saurav shoot.',
    orientation: 'landscape',
    video: workFilmAsset('saurav-bts.mp4'),
    poster: workFilmAsset('saurav-bts.jpg'),
  },
  {
    id: 'catharsis',
    category: 'Artist',
    title: 'Catharsis',
    client: 'Catharsis',
    description: 'A studio-driven music piece for Catharsis.',
    orientation: 'portrait',
    video: workFilmAsset('catharsis.mp4'),
    poster: workFilmAsset('catharsis.jpg'),
  },
  {
    id: 'kisi-ke-bagair',
    category: 'Artist',
    title: 'Kisi Ke Bagair',
    client: 'Music video',
    description: 'A performance film featuring the title “Kisi Ke Bagair.”',
    orientation: 'portrait',
    video: workFilmAsset('kisi-ke-bagair.mp4'),
    poster: workFilmAsset('kisi-ke-bagair.jpg'),
  },
  {
    id: 'honey-singh-millionaire',
    category: 'Artist',
    title: 'Millionaire',
    client: 'Yo Yo Honey Singh',
    description: 'A vertical artist film featuring “Millionaire.”',
    orientation: 'portrait',
    video: workFilmAsset('honey-singh-millionaire.mp4'),
    poster: workFilmAsset('honey-singh-millionaire.jpg'),
  },
  {
    id: 'pranjan-music-teaser',
    category: 'Artist',
    title: 'Pranjan Music Teaser',
    client: 'Pranjan',
    description: 'A teaser introducing Pranjan’s music.',
    orientation: 'landscape',
    video: workFilmAsset('pranjan-music-teaser.mp4'),
    poster: workFilmAsset('pranjan-music-teaser.jpg'),
  },
];

export const services = [
  {
    number: '01',
    title: 'BRANDING',
    disciplines: 'Brand Strategy · Visual Identity · Art Direction · Brand Systems',
    description: 'We build distinctive brand identities that give businesses a clear visual language and a consistent presence across every touchpoint.',
  },
  {
    number: '02',
    title: 'VIDEO & CONTENT PRODUCTION',
    disciplines: 'Photography · Videography · Reels · Brand Films · Commercial Production',
    description: 'We produce high-quality visual content for brands — from social-first reels and photography to brand films, campaigns and end-to-end video production.',
  },
  {
    number: '03',
    title: 'SOCIAL MEDIA',
    disciplines: 'Content Strategy · Social Campaigns · Social Design · Content Management',
    description: 'We create social media strategies and content systems that help brands stay relevant, consistent and visually distinctive.',
  },
  {
    number: '04',
    title: 'CREATIVE & DESIGN',
    disciplines: 'Campaigns · Graphic Design · Digital Design · Creative Direction',
    description: 'We turn ideas into visual campaigns through creative direction, graphic design and digital experiences built around the brand.',
  },
];