import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { colors } from '@/constants/aniverse';
import { formatPlaybackTime } from '@/lib/formatPlaybackTime';
import { isOpeningLikeSkip, type PlayerSkipSegment } from '@/lib/playerSkip';

function pct(value: number): DimensionValue {
  return `${Math.min(100, Math.max(0, value))}%`;
}

export function PhoneScrubBar({
  progress,
  currentTime,
  duration,
  skipSegments = [],
  onSeekRatio,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  skipSegments?: PlayerSkipSegment[];
  onSeekRatio: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View>
      <Pressable
        style={styles.hit}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width || 1)}
        onPress={(e) => onSeekRatio(Math.min(1, Math.max(0, e.nativeEvent.locationX / width)))}
      >
        <View style={styles.track}>
          {duration > 0
            ? skipSegments.map((segment) => {
                const left = (segment.start / duration) * 100;
                const segWidth = ((segment.end - segment.start) / duration) * 100;
                return (
                  <View
                    key={segment.id}
                    style={[
                      styles.skipMark,
                      isOpeningLikeSkip(segment.type) ? styles.skipOpen : styles.skipEnd,
                      { left: pct(left), width: pct(Math.max(segWidth, 0.5)) },
                    ]}
                  />
                );
              })
            : null}
          <View style={[styles.progress, { width: pct(clamped) }]} />
        </View>
        <View style={[styles.thumb, { left: pct(clamped) }]} />
      </Pressable>
      <Text style={styles.times}>
        {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 24,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.brand,
  },
  skipMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  skipOpen: { backgroundColor: 'rgba(251,146,60,0.45)' },
  skipEnd: { backgroundColor: 'rgba(195,192,255,0.45)' },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.brandTint,
  },
  times: {
    marginTop: 4,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
