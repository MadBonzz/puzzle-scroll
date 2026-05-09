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

  const columns = visual.columns ?? 3;
  return (
    <View style={styles.visualWrap}>
      {visual.note ? <Text style={styles.note}>{visual.note}</Text> : null}
      <View style={[styles.grid, { maxWidth: Math.min(columns * 64, 310) }]}>
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
    gap: 8,
    marginVertical: 10,
    minHeight: 78,
    justifyContent: 'center'
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  token: {
    minHeight: 42,
    margin: 3,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  comparison: {
    minHeight: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10
  },
  compareSide: {
    width: 104,
    minHeight: 96,
    justifyContent: 'center'
  },
  vs: {
    color: '#68717C',
    fontWeight: '800'
  },
  statement: {
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10
  },
  statementText: {
    color: '#20242A',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center'
  },
  note: {
    color: '#68717C',
    fontWeight: '700'
  },
  rules: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0DED5',
    padding: 10,
    gap: 6,
    marginVertical: 10
  },
  rulesTitle: {
    color: '#20242A',
    fontWeight: '900',
    fontSize: 14
  },
  ruleLine: {
    color: '#39414A',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18
  }
});
