import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PartyReactionEvent } from '@/types/party';

type Floating = PartyReactionEvent & { key: string };

export function PartyReactionsOverlay({ reactions }: { reactions: PartyReactionEvent[] }) {
  const [visible, setVisible] = useState<Floating[]>([]);
  const seenRef = useState(() => new Set<string>())[0];

  useEffect(() => {
    const incoming: Floating[] = [];
    for (const reaction of reactions) {
      const id = reaction.id ?? `${reaction.userId}-${reaction.emoji}-${reaction.createdAt ?? ''}`;
      if (seenRef.has(id)) continue;
      seenRef.add(id);
      incoming.push({ ...reaction, key: id });
    }
    if (!incoming.length) return;
    setVisible((prev) => [...prev, ...incoming].slice(-8));
    const t = setTimeout(() => {
      setVisible((prev) => prev.filter((item) => !incoming.some((i) => i.key === item.key)));
    }, 2200);
    return () => clearTimeout(t);
  }, [reactions, seenRef]);

  if (!visible.length) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {visible.map((item, index) => (
        <Text key={item.key} style={[styles.emoji, { right: 12 + (index % 3) * 18 }]}>
          {item.emoji}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 45,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 140,
  },
  emoji: {
    position: 'absolute',
    bottom: 0,
    fontSize: 28,
  },
});
