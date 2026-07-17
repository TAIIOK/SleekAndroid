import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

// Deep import avoids canvas/document from qrcode's browser entry (breaks on RN/TV).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { create: createQr } = require('qrcode/lib/core/qrcode') as {
  create: (
    text: string,
    opts?: { errorCorrectionLevel?: string },
  ) => { modules: { size: number; get: (x: number, y: number) => number } };
};

interface QrCodeMatrixProps {
  value: string;
  size?: number;
}

type Segment = { dark: boolean; len: number };

/** Local QR — no remote image host required (TV emulators often block those). */
export function QrCodeMatrix({ value, size = 180 }: QrCodeMatrixProps) {
  const rows = useMemo(() => {
    if (!value) return null;
    try {
      const qr = createQr(value, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const result: Segment[][] = [];
      for (let y = 0; y < count; y += 1) {
        const segments: Segment[] = [];
        let x = 0;
        while (x < count) {
          const dark = Boolean(qr.modules.get(x, y));
          let len = 1;
          while (x + len < count && Boolean(qr.modules.get(x + len, y)) === dark) {
            len += 1;
          }
          segments.push({ dark, len });
          x += len;
        }
        result.push(segments);
      }
      return result;
    } catch {
      return null;
    }
  }, [value]);

  if (!rows) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }

  const moduleCount = rows.reduce((max, row) => {
    const width = row.reduce((sum, seg) => sum + seg.len, 0);
    return Math.max(max, width);
  }, 0);
  const cellSize = size / moduleCount;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {rows.map((row, y) => (
        <View key={y} style={[styles.row, { height: cellSize }]}>
          {row.map((seg, idx) => (
            <View
              key={idx}
              style={{
                width: cellSize * seg.len,
                height: cellSize,
                backgroundColor: seg.dark ? '#111' : '#fff',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  placeholder: {
    backgroundColor: '#e5e5e5',
    borderRadius: 8,
  },
});
