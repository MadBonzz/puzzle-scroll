import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [phase, setPhase] = useState<'ready' | 'study' | 'answer'>(puzzle.requiresReady ? 'ready' : 'answer');
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
      startedAt.current = Date.now();
      setPhase('answer');
    }, puzzle.studyDurationMs ?? 1800);
    return () => clearTimeout(timer);
  }, [phase, puzzle.studyDurationMs]);

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
            <Feather name={domain.icon as never} size={18} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.domain, { color: domain.color }]}>{domain.label}</Text>
            <Text style={styles.title}>
              {puzzle.typeName} - Lv {puzzle.difficulty}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>{puzzle.subtitle}</Text>
          {phase === 'ready' ? (
            <View style={styles.readyPanel}>
              <Text style={styles.prompt}>{puzzle.studyPrompt ?? 'Get ready to study the pattern.'}</Text>
              <Text style={styles.readyText}>Start when you are ready. The study screen will disappear automatically.</Text>
              <Pressable style={[styles.primaryAction, { backgroundColor: domain.color }]} onPress={beginStudy}>
                <Text style={styles.primaryActionText}>I'm ready</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.prompt}>{phase === 'study' ? puzzle.studyPrompt ?? puzzle.prompt : puzzle.prompt}</Text>
              <PuzzleVisual visual={phase === 'study' ? puzzle.studyVisual ?? puzzle.visual : puzzle.visual} />
              {phase === 'study' ? <Text style={styles.studyHint}>Study now. The question appears next.</Text> : null}
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
        </View>

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
                <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.choiceText, (active || correctChoice) && styles.choiceTextActive]}>
                  {choice}
                </Text>
              </Pressable>
            );
          }) : null}
        </View>

        <View style={styles.footer}>
          {submitted ? (
            <View style={styles.feedback}>
              <Text style={[styles.feedbackTitle, { color: isCorrect ? '#277A5B' : '#C84E2F' }]}>{isCorrect ? 'Correct' : 'Missed'}</Text>
              <Text style={styles.feedbackText}>{puzzle.explanation}</Text>
            </View>
          ) : (
            <Text style={styles.footerHint}>
              {phase === 'ready' ? 'Press ready before the timed display begins.' : phase === 'study' ? 'Memorize what you see.' : 'Answer, then swipe up for another puzzle.'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  card: {
    flex: 1,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0DED5',
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: {
    flex: 1
  },
  domain: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: '#20242A',
    fontSize: 18,
    fontWeight: '900'
  },
  body: {
    flex: 1,
    justifyContent: 'center'
  },
  subtitle: {
    color: '#68717C',
    fontWeight: '800',
    marginBottom: 12
  },
  prompt: {
    color: '#20242A',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900'
  },
  choices: {
    gap: 10
  },
  choicesDisabled: {
    minHeight: 0
  },
  choice: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3D7DD',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 14
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
    fontSize: 16,
    textAlign: 'center'
  },
  choiceTextActive: {
    color: '#FFFFFF'
  },
  footer: {
    minHeight: 58,
    justifyContent: 'flex-end'
  },
  footerHint: {
    color: '#68717C',
    fontWeight: '700'
  },
  readyPanel: {
    gap: 16,
    justifyContent: 'center'
  },
  readyText: {
    color: '#5D6670',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700'
  },
  primaryAction: {
    minHeight: 52,
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
  feedbackPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
    fontWeight: '700'
  }
});
