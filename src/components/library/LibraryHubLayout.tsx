import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/aniverse';

/** Pass-through for `/library/*`. Hub chrome is rendered inside each screen. */
export function LibraryHubLayout({ children }: { children: React.ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.bg,
  },
});
