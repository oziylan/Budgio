/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#333333',
    textSecondary: '#666666',
    background: '#f5f5f5',
    card: '#FFFFFF',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // Couleurs fonctionnelles
    positive: '#4CAF50',
    negative: '#F44336',
    primary: '#2196F3',
    
    // États spéciaux
    border: '#E0E0E0',
    placeholder: '#999999',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#CCCCCC', 
    background: '#121212',
    card: '#1E1E1E',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Couleurs fonctionnelles
    positive: '#1B3B1B',  // Vert foncé pour le mode nuit
    negative: '#3B1B1B',  // Rouge foncé pour le mode nuit
    primary: '#2196F3',
    
    // États spéciaux
    border: '#333333',
    placeholder: '#888888',
  },
};

// Couleurs fixes (ne changent pas selon le mode)
export const FixedColors = {
  positive: '#4CAF50',      // Vert pour les revenus
  negative: '#F44336',      // Rouge pour les dépenses
  primary: '#2196F3',       // Bleu pour les actions
  brandBlue: '#0a7ea4',     // Ton bleu marque
  white: '#FFFFFF',
  black: '#000000',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});