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

export type WorkFilm = {
  id: string;
  category: string;
  title: string;
  client: string;
  description: string;
  orientation: 'landscape' | 'portrait';
  video: string;
  poster: string;
};

function workFilmAsset(filename: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${basePath}work-films/${filename}`;
}

export const workFilms: WorkFilm[] = [
  {
    id: 'india-russia-forum',
    category: 'EVENT FILM',
    title: 'India–Russia Business Forum',
    client: 'Bharat Mandapam · FICCI',
    description: 'A global business forum, captured from the room to the conversations between sessions.',
    orientation: 'landscape',
    video: workFilmAsset('india-russia-forum.mp4'),
    poster: workFilmAsset('india-russia-forum.webp'),
  },
  {
    id: 'cafe-terrace',
    category: 'HOSPITALITY FILM',
    title: 'The Terrace',
    client: 'Cafe C · Zone Connect',
    description: 'Sunlit dining, colorful pours and the easy rhythm of an open-air table.',
    orientation: 'portrait',
    video: workFilmAsset('cafe-terrace.mp4'),
    poster: workFilmAsset('cafe-terrace.webp'),
  },
  {
    id: 'meeting-room',
    category: 'SPACE FILM',
    title: 'A Space That Elevates',
    client: 'Zone Connect',
    description: 'A quiet tour through the details that make a room ready for conversation.',
    orientation: 'portrait',
    video: workFilmAsset('meeting-room.mp4'),
    poster: workFilmAsset('meeting-room.webp'),
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