export const colors = {
  // Brand Primary & Accents
  espresso: '#2B1C16',
  espressoDark: '#1A100C',
  espressoLight: '#3D2A22',
  coffee: '#7A4D2E',
  coffeeLight: '#9C6944',
  caramel: '#C88A52',
  caramelLight: '#E8B684',
  caramelGold: '#D49B5B',
  
  // Surfaces & Backgrounds
  cream: '#F7F3EC',
  creamDark: '#EDE5D8',
  creamSoft: '#FAF7F2',
  paper: '#FFFFFF',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  
  // Text & Lines
  ink: '#1F1815',
  inkLight: '#423630',
  muted: '#736862',
  mutedLight: '#9E938D',
  line: '#E8DFD5',
  lineLight: '#F0E9E1',
  lineDark: '#D4C6B8',
  
  // Feedback & Status
  green: '#2E7D46',
  greenDark: '#1E5830',
  greenSoft: '#E8F5EB',
  amber: '#D97706',
  amberDark: '#B45309',
  amberSoft: '#FEF3C7',
  danger: '#C53030',
  dangerDark: '#9B2C2C',
  dangerSoft: '#FED7D7',
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
  '2xl': 28,
  full: 9999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '900' as const, lineHeight: 34, color: colors.espresso, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '900' as const, lineHeight: 30, color: colors.espresso, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800' as const, lineHeight: 26, color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '800' as const, lineHeight: 22, color: colors.ink },
  body: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, color: colors.ink },
  bodySm: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, color: colors.muted },
  caption: { fontSize: 11, fontWeight: '600' as const, lineHeight: 15, color: colors.muted },
  eyebrow: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: colors.caramel },
  badge: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
};

export const shadow = {
  shadowColor: '#2B1C16',
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
    shadowColor: '#2B1C16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#2B1C16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2B1C16',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  floating: {
    shadowColor: '#2B1C16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
};

