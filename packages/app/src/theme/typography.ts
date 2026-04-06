import { TextStyle } from 'react-native';
import { colors } from './colors';

const base = {
  color: colors.textPrimary,
  fontWeight: '400' as TextStyle['fontWeight'],
};

export const typography = {
  headingXL: {
    ...base,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  headingLG: {
    ...base,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.15,
  },
  headingMD: {
    ...base,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  bodyLG: {
    ...base,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  bodyMD: {
    ...base,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySM: {
    ...base,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  caption: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  buttonText: {
    ...base,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
  },
} as const;
