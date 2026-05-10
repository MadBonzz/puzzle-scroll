import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PuzzleAttempt, PuzzleRound } from '../types';
import { PuzzleVisual } from './PuzzleVisual';

interface Props {
  puzzle: PuzzleRound;
  height?: number;
  onAnswered: (attempt: PuzzleAttempt) => void;
}

export function PuzzleCard({ puzzle, height, onAnswered }: Props) {
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
      <View style={styles.card}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {phase === 'ready' ? (
            <View style={styles.readyPanel}>
              <Text style={styles.prompt}>{puzzle.studyPrompt ?? 'Get ready to study the pattern.'}</Text>
              <Text style={styles.readyText}>Start when you are ready. The study screen will disappear automatically.</Text>
              <Pressable style={styles.primaryAction} onPress={beginStudy}>
                <Text style={styles.primaryActionText}>I'm ready</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.prompt}>
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
                        <Text style={[styles.choiceText, (active || correctChoice) && styles.choiceTextActive]}>
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
            </>
          )}
        </ScrollView>

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
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8E3F0',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#162033',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 18,
    paddingBottom: 16
  },
  prompt: {
    color: '#141B2D',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900'
  },
  choices: {
    gap: 10,
    marginTop: 18,
    paddingBottom: 8
  },
  choicesDisabled: {
    minHeight: 0
  },
  choice: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    backgroundColor: '#F8FBFF',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  choiceActive: {
    borderColor: '#2457D6',
    backgroundColor: '#2457D6'
  },
  choiceCorrect: {
    borderColor: '#0A8F5A',
    backgroundColor: '#0A8F5A'
  },
  choiceWrong: {
    borderColor: '#D9324A',
    backgroundColor: '#D9324A'
  },
  choiceText: {
    color: '#182235',
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
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
    color: '#6D7890',
    fontWeight: '700',
    fontSize: 12
  },
  readyPanel: {
    gap: 12,
    justifyContent: 'center'
  },
  readyText: {
    color: '#44516A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700'
  },
  primaryAction: {
    backgroundColor: '#2457D6',
    minHeight: 54,
    borderRadius: 12,
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
    color: '#56647C',
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
    minHeight: 44,
    borderRadius: 12,
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
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderRadius: 12,
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
    color: '#273248',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16
  }
});
