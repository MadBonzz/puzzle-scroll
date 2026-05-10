import { StyleSheet, Text, View } from 'react-native';
import type { PuzzleVisual as PuzzleVisualType, VisualToken } from '../types';

interface Props {
  visual?: PuzzleVisualType;
}

function TokenView({ token, large = false }: { token: VisualToken; large?: boolean }) {
  const backgroundColor = token.tone === 'outline' ? '#FFFFFF' : token.color ?? '#EBEEF2';
  const borderColor = token.color ?? '#C7D6EA';
  const color = token.tone === 'outline' ? '#182235' : '#FFFFFF';
  const multiline = token.label.length > 5 || token.label.includes('\n') || token.label.includes(' ');

  return (
    <View style={[styles.token, large && styles.tokenLarge, multiline && styles.tokenMultiline, { backgroundColor, borderColor }]}>
      <Text adjustsFontSizeToFit={token.label.length <= 8} style={[styles.tokenText, multiline && styles.tokenTextMultiline, { color }]}>
        {token.label}
      </Text>
    </View>
  );
}

export function PuzzleVisual({ visual }: Props) {
  if (!visual) return null;

  if (visual.mode === 'comparison') {
    return (
      <View style={styles.comparison}>
        <View style={styles.compareSide}>{visual.left?.map((item, index) => <TokenView token={item} key={`l-${index}`} />)}</View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.compareSide}>{visual.right?.map((item, index) => <TokenView token={item} key={`r-${index}`} />)}</View>
      </View>
    );
  }

  if (visual.mode === 'statement') {
    return (
      <View style={styles.statement}>
        {visual.tokens?.map((item, index) => <TokenView token={item} large key={index} />)}
        {visual.note ? <Text style={styles.statementText}>{visual.note}</Text> : null}
      </View>
    );
  }

  if (visual.mode === 'rules') {
    return (
      <View style={styles.rules}>
        {visual.note ? <Text style={styles.rulesTitle}>{visual.note}</Text> : null}
        {visual.lines?.map((line, index) => (
          <Text key={`${line}-${index}`} style={styles.ruleLine}>
            {line}
          </Text>
        ))}
      </View>
    );
  }

  const requestedColumns = visual.columns ?? 3;
  const maxLabelLength = Math.max(0, ...(visual.tokens ?? []).map((item) => item.label.length));
  const columns = maxLabelLength > 12 ? 1 : maxLabelLength > 5 ? Math.min(2, requestedColumns) : requestedColumns;
  return (
    <View style={styles.visualWrap}>
      {visual.note ? <Text style={styles.note}>{visual.note}</Text> : null}
      <View style={[styles.grid, { maxWidth: Math.min(columns * (maxLabelLength > 5 ? 132 : 82), 340) }]}>
        {visual.tokens?.map((item, index) => (
          <View style={{ width: `${100 / columns}%` }} key={`${item.label}-${index}`}>
            <TokenView token={item} large={maxLabelLength > 5} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualWrap: {
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
    minHeight: 112,
    justifyContent: 'center'
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  token: {
    minHeight: 58,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tokenLarge: {
    minHeight: 70
  },
  tokenMultiline: {
    minHeight: 82
  },
  tokenText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center'
  },
  tokenTextMultiline: {
    fontSize: 16,
    lineHeight: 21
  },
  comparison: {
    minHeight: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10
  },
  compareSide: {
    width: 128,
    minHeight: 122,
    justifyContent: 'center'
  },
  vs: {
    color: '#56647C',
    fontWeight: '800'
  },
  statement: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10
  },
  statementText: {
    color: '#141B2D',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    textAlign: 'center'
  },
  note: {
    color: '#56647C',
    fontWeight: '700'
  },
  rules: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 14,
    gap: 8,
    marginVertical: 14,
    flexShrink: 1
  },
  rulesTitle: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 16
  },
  ruleLine: {
    color: '#273248',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22
  }
});
