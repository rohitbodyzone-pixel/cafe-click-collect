export const colors = {
  // Brand Primary & Accents
  espresso: '#34251F',
  espressoDark: '#211713',
  coffee: '#8B5E3C',
  coffeeLight: '#A6734D',
  caramel: '#C88A52',
  caramelLight: '#DDB389',
  
  // Surfaces & Backgrounds
  cream: '#F8F3EC',
  creamDark: '#EDE3D6',
  paper: '#FFFDF9',
  white: '#FFFFFF',
  
  // Text & Lines
  ink: '#28221F',
  inkLight: '#463C37',
  muted: '#786E68',
  mutedLight: '#A29892',
  line: '#E8DED3',
  lineDark: '#D4C6B8',
  
  // Feedback & Status
  green: '#426B4D',
  greenDark: '#2D7D46',
  greenSoft: '#E5EFE7',
  amber: '#D97706',
  amberSoft: '#FFF0D9',
  danger: '#A7473E',
  dangerDark: '#87342C',
  dangerSoft: '#FBE8E5',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '900' as const, lineHeight: 34, color: colors.espresso },
  h1: { fontSize: 24, fontWeight: '900' as const, lineHeight: 30, color: colors.espresso },
  h2: { fontSize: 20, fontWeight: '800' as const, lineHeight: 26, color: colors.ink },
  h3: { fontSize: 17, fontWeight: '800' as const, lineHeight: 22, color: colors.ink },
  body: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, color: colors.ink },
  bodySm: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, color: colors.muted },
  caption: { fontSize: 11, fontWeight: '600' as const, lineHeight: 15, color: colors.muted },
  eyebrow: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1, textTransform: 'uppercase' as const, color: colors.caramel },
  badge: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
};

export const shadow = {
  shadowColor: '#34251F',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#34251F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#34251F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#34251F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};
