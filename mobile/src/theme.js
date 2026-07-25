// Tokens tomados de stitch_file_based_design_generator/kuska_response/DESIGN.md

export const colors = {
  surface: '#fcf8f8',
  surfaceDim: '#ddd9d9',
  surfaceBright: '#fcf8f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f1eded',
  surfaceContainerHigh: '#ebe7e7',
  surfaceContainerHighest: '#e5e2e1',
  onSurface: '#1c1b1b',
  onSurfaceVariant: '#44474a',
  inverseSurface: '#313030',
  inverseOnSurface: '#f4f0ef',
  outline: '#75777a',
  outlineVariant: '#c5c6ca',
  primary: '#000101',
  onPrimary: '#ffffff',
  primaryContainer: '#1a1c1e',
  onPrimaryContainer: '#838486',
  secondary: '#5d5e62',
  onSecondary: '#ffffff',
  secondaryContainer: '#e2e2e6',
  onSecondaryContainer: '#636468',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#fcf8f8',
  onBackground: '#1c1b1b',
  surfaceVariant: '#e5e2e1',
  statusHighError: '#D32F2F',
  statusMediumSync: '#FF8F00',
  statusLowSynced: '#2E7D32',
  backgroundSurface: '#FFFFFF',
  inputActive: '#005FB8',
};

export const typography = {
  headlineLg: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 32, lineHeight: 40 },
  headlineMd: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 24, lineHeight: 32 },
  bodyLg: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, lineHeight: 24 },
  labelStatus: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, lineHeight: 16, letterSpacing: 0.7 },
  buttonText: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 18, lineHeight: 24 },
};

export const radius = {
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
};

export const spacing = {
  baseUnit: 8,
  marginMobile: 20,
  gutter: 16,
  touchTargetMin: 56,
};

export default { colors, typography, radius, spacing };
