import { StyleSheet, Text, View } from 'react-native';
import type { PuzzleVisual as PuzzleVisualType, VisualToken } from '../types';

interface Props {
  visual?: PuzzleVisualType;
}

function TokenView({ token }: { token: VisualToken }) {
  const backgroundColor = token.tone === 'outline' ? '#FFFFFF' : token.color ?? '#EBEEF2';
  const borderColor = token.color ?? '#CCD3DA';
  const color = token.tone === 'outline' ? '#29313A' : '#FFFFFF';

  return (
    <View style={[styles.token, { backgroundColor, borderColor }]}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tokenText, { color }]}>
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
        {visual.tokens?.map((item, index) => <TokenView token={item} key={index} />)}
        {visual.note ? <Text style={styles.statementText}>{visual.note}</Text> : null}
      </View>
    );
  }

  const columns = visual.columns ?? 3;
  return (
    <View style={styles.visualWrap}>
      {visual.note ? <Text style={styles.note}>{visual.note}</Text> : null}
      <View style={[styles.grid, { maxWidth: columns * 76 }]}>
        {visual.tokens?.map((item, index) => (
          <View style={{ width: `${100 / columns}%` }} key={`${item.label}-${index}`}>
            <TokenView token={item} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  visualWrap: {
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
    minHeight: 120,
    justifyContent: 'center'
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  token: {
    minHeight: 54,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tokenText: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  comparison: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 18
  },
  compareSide: {
    width: 118,
    minHeight: 120,
    justifyContent: 'center'
  },
  vs: {
    color: '#68717C',
    fontWeight: '800'
  },
  statement: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 18
  },
  statementText: {
    color: '#20242A',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center'
  },
  note: {
    color: '#68717C',
    fontWeight: '700'
  }
});
