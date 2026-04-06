import { ViewStyle } from 'react-native';
import { shadows } from './shadows';

export const layout = {
  row: { flexDirection: 'row' } as ViewStyle,
  column: { flexDirection: 'column' } as ViewStyle,
  center: { justifyContent: 'center', alignItems: 'center' } as ViewStyle,
  between: { justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  flex1: { flex: 1 } as ViewStyle,
  absoluteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  } as ViewStyle,
  safeContainer: { flex: 1 } as ViewStyle,
  scrollContent: { flexGrow: 1 } as ViewStyle,
  shadowCard: shadows.card,
} as const;
