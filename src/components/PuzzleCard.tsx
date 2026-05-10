import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { domainById } from '../data/domains';
import type { PuzzleAttempt, PuzzleRound } from '../types';
import { PuzzleVisual } from './PuzzleVisual';

interface Props {
  puzzle: PuzzleRound;
  height?: number;
  onAnswered: (attempt: PuzzleAttempt) => void;
}

export function PuzzleCard({ puzzle, height, onAnswered }: Props) {
  const domain = domainById[puzzle.domain];
  const [phase, setPhase] = useState<'ready' | 'study' | 'interference' | 'answer'>(puzzle.requiresReady ? 'ready' : 'answer');
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startedAt = useRef(Date.now());
  const isCorrect = selected === puzzle.correctIndex;

  useEffect(() => {
    setPhase(puzzle.requiresReady ? 'ready' : 'answer');
    setSelected(null);
    setSubmitted(false);
    startedAt.current = Date.now();
  }, [puzzle.id, puzzle.requiresReady]);

  useEffect(() => {
    if (phase !== 'study') return undefined;
    const timer = setTimeout(() => {
      if (puzzle.interferencePrompt || puzzle.interferenceVisual) {
        setPhase('interference');
      } else {
        startedAt.current = Date.now();
        setPhase('answer');
      }
    }, puzzle.studyDurationMs ?? 1800);
    return () => clearTimeout(timer);
  }, [phase, puzzle.interferencePrompt, puzzle.interferenceVisual, puzzle.studyDurationMs]);

  useEffect(() => {
    if (phase !== 'interference') return undefined;
    const timer = setTimeout(() => {
      startedAt.current = Date.now();
      setPhase('answer');
    }, puzzle.interferenceDurationMs ?? 1800);
    return () => clearTimeout(timer);
  }, [phase, puzzle.interferenceDurationMs]);

  const beginStudy = () => {
    startedAt.current = Date.now();
    setPhase(puzzle.requiresReady ? 'study' : 'answer');
  };

  const submit = (index: number) => {
    if (submitted || phase !== 'answer') return;
    setSelected(index);
    setSubmitted(true);
    const correct = index === puzzle.correctIndex;
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    onAnswered({
      puzzleId: puzzle.id,
      puzzleType: puzzle.typeId,
      domain: puzzle.domain,
      difficulty: puzzle.difficulty,
      accuracy: correct ? 1 : 0,
      reactionTimeMs: Date.now() - startedAt.current,
      completedAt: Date.now(),
      isAssessment: puzzle.isAssessment
    });
  };

  return (
    <View style={[styles.outer, height ? { height } : undefined]}>
      <View style={[styles.card, { backgroundColor: domain.tint }]}>
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: domain.color }]}>
            <Feather name={domain.icon as never} size={16} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={[styles.domain, { color: domain.color }]}>{domain.label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
              {puzzle.typeName} - Lv {puzzle.difficulty}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>{puzzle.subtitle}</Text>
          {phase === 'ready' ? (
            <View style={styles.readyPanel}>
              <Text numberOfLines={5} adjustsFontSizeToFit style={styles.prompt}>{puzzle.studyPrompt ?? 'Get ready to study the pattern.'}</Text>
              <Text style={styles.readyText}>Start when you are ready. The study screen will disappear automatically.</Text>
              <Pressable style={[styles.primaryAction, { backgroundColor: domain.color }]} onPress={beginStudy}>
                <Text style={styles.primaryActionText}>I'm ready</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text numberOfLines={5} adjustsFontSizeToFit style={styles.prompt}>
                {phase === 'study' ? puzzle.studyPrompt ?? puzzle.prompt : phase === 'interference' ? puzzle.interferencePrompt ?? 'Hold the earlier item in mind.' : puzzle.prompt}
              </Text>
              <PuzzleVisual visual={phase === 'study' ? puzzle.studyVisual ?? puzzle.visual : phase === 'interference' ? puzzle.interferenceVisual : puzzle.visual} />
              {phase === 'study' ? <Text style={styles.studyHint}>Study now. The question appears next.</Text> : null}
              {phase === 'interference' ? <Text style={styles.studyHint}>Keep the original item in memory.</Text> : null}
              {submitted ? (
                <View style={[styles.feedbackPanel, { borderColor: isCorrect ? '#277A5B' : '#C84E2F' }]}>
                  <Text style={[styles.feedbackTitle, { color: isCorrect ? '#277A5B' : '#C84E2F' }]}>{isCorrect ? 'Correct' : 'Incorrect'}</Text>
                  <Text style={styles.feedbackText}>
                    Your answer: {selected === null ? 'none' : puzzle.choices[selected]} - Correct answer: {puzzle.choices[puzzle.correctIndex]}
                  </Text>
                  <Text style={styles.feedbackText}>{puzzle.explanation}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={[styles.choices, phase !== 'answer' && styles.choicesDisabled]}>
          {phase === 'answer' ? puzzle.choices.map((choice, index) => {
            const active = selected === index;
            const correctChoice = submitted && index === puzzle.correctIndex;
            const wrongChoice = submitted && active && !correctChoice;
            return (
              <Pressable
                key={`${choice}-${index}`}
                onPress={() => submit(index)}
                style={[
                  styles.choice,
                  active && styles.choiceActive,
                  correctChoice && styles.choiceCorrect,
                  wrongChoice && styles.choiceWrong
                ]}
              >
                <View style={styles.choiceContent}>
                  <Text numberOfLines={3} adjustsFontSizeToFit style={[styles.choiceText, (active || correctChoice) && styles.choiceTextActive]}>
                    {choice}
                  </Text>
                  {correctChoice ? <Feather name="check-circle" size={20} color="#FFFFFF" /> : null}
                  {wrongChoice ? <Feather name="x-circle" size={20} color="#FFFFFF" /> : null}
                </View>
              </Pressable>
            );
          }) : null}
        </View>

        {submitted ? (
          <View style={[styles.resultBar, { backgroundColor: isCorrect ? '#277A5B' : '#C84E2F' }]}>
            <Feather name={isCorrect ? 'check-circle' : 'x-circle'} size={18} color="#FFFFFF" />
            <Text style={styles.resultBarText}>
              {isCorrect ? 'Correct' : `Incorrect - correct answer: ${puzzle.choices[puzzle.correctIndex]}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            {submitted
              ? 'Result saved. Press Next when you are ready.'
              : phase === 'ready'
                ? 'Press ready before the timed display begins.'
                : phase === 'study'
                  ? 'Memorize what you see.'
                  : phase === 'interference'
                    ? 'Do the distraction while holding the earlier item.'
                  : 'Answer, then press Next for another puzzle.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  card: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0DED5',
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: {
    flex: 1
  },
  domain: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: '#20242A',
    fontSize: 16,
    fontWeight: '900'
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8
  },
  subtitle: {
    color: '#68717C',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 8
  },
  prompt: {
    color: '#20242A',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900'
  },
  choices: {
    gap: 8
  },
  choicesDisabled: {
    minHeight: 0
  },
  choice: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3D7DD',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  choiceActive: {
    borderColor: '#20242A',
    backgroundColor: '#20242A'
  },
  choiceCorrect: {
    borderColor: '#277A5B',
    backgroundColor: '#277A5B'
  },
  choiceWrong: {
    borderColor: '#C84E2F',
    backgroundColor: '#C84E2F'
  },
  choiceText: {
    color: '#20242A',
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
    flex: 1
  },
  choiceTextActive: {
    color: '#FFFFFF'
  },
  footer: {
    minHeight: 36,
    justifyContent: 'flex-end'
  },
  footerHint: {
    color: '#68717C',
    fontWeight: '700',
    fontSize: 12
  },
  readyPanel: {
    gap: 12,
    justifyContent: 'center'
  },
  readyText: {
    color: '#5D6670',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  primaryAction: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  },
  studyHint: {
    color: '#68717C',
    fontWeight: '800',
    textAlign: 'center'
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  resultBar: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  resultBarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    flex: 1
  },
  feedbackPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginTop: 10
  },
  feedback: {
    gap: 3
  },
  feedbackTitle: {
    fontWeight: '900',
    fontSize: 16
  },
  feedbackText: {
    color: '#39414A',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16
  }
});
