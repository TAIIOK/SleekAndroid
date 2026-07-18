import type { ReactNode } from 'react';
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

type FocusGuideComponent = (props: TvFocusGuideProps) => ReactNode;

/** `TVFocusGuideView` from react-native-tvos, with View fallback when unavailable. */
const NativeFocusGuide = (ReactNative as { TVFocusGuideView?: FocusGuideComponent })
  .TVFocusGuideView;

export function TvFocusGuide({ children, style, ...props }: TvFocusGuideProps) {
  if (NativeFocusGuide) {
    return (
      <NativeFocusGuide style={style} {...props}>
        {children}
      </NativeFocusGuide>
    );
  }

  return <View style={style}>{children}</View>;
}
