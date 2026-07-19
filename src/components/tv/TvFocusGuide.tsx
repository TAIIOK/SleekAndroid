import { forwardRef, type ReactNode } from 'react';
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import * as ReactNative from 'react-native';

type TvFocusGuideProps = ViewProps & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
  destinations?: unknown[];
};

type FocusGuideComponent = React.ComponentType<TvFocusGuideProps>;

/** `TVFocusGuideView` from react-native-tvos, with View fallback when unavailable. */
const NativeFocusGuide = (ReactNative as { TVFocusGuideView?: FocusGuideComponent })
  .TVFocusGuideView;

/** TV focus region; forwards ref so callers can `requestTVFocus()` after navigation. */
export const TvFocusGuide = forwardRef<View, TvFocusGuideProps>(function TvFocusGuide(
  { children, style, ...props },
  ref,
) {
  if (NativeFocusGuide) {
    return (
      <NativeFocusGuide ref={ref} style={style} {...props}>
        {children}
      </NativeFocusGuide>
    );
  }

  return (
    <View ref={ref} style={style} {...props}>
      {children}
    </View>
  );
});
