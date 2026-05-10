import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { domains, domainIds } from './src/data/domains';
import { publicDomainSources } from './src/data/sourcePuzzles';
import { generateAssessmentBattery, generateDailySession, trainingGeneratorEntries } from './src/logic/puzzleGenerators';
import { scoreAssessment } from './src/logic/scoring';
import { useAppStore } from './src/store/useAppStore';
import type { AssessmentScore, CognitiveDomain, FeedMode, PuzzleAttempt, SessionGoal } from './src/types';
import { PuzzleCard } from './src/components/PuzzleCard';
import { RadarChart } from './src/components/RadarChart';

type Tab = 'dashboard' | 'feed' | 'profile' | 'assess' | 'settings';

const feedModes: { id: FeedMode; label: string; note: string }[] = [
  { id: 'mixed', label: 'Mixed Daily', note: 'Balanced with weak-area bias' },
  { id: 'fastReflex', label: 'Fast Reflex', note: 'Speed, inhibition, switching' },
  { id: 'deepReasoning', label: 'Deep Reasoning', note: 'Logic, planning, quant' },
  { id: 'mathSprint', label: 'Math Sprint', note: 'Quant and quick arithmetic' },
  { id: 'memory', label: 'Memory', note: 'Span, delayed recall, updating' },
  { id: 'calmFocus', label: 'Calm Focus', note: 'Attention without feed noise' },
  { id: 'hardLogic', label: 'Hard Logic', note: 'Hard types only' }
];

const sessionGoals: { id: SessionGoal; label: string; count: number }[] = [
  { id: 'short', label: '5 min', count: 8 },
  { id: 'standard', label: '10 min', count: 18 },
  { id: 'long', label: '20 min', count: 32 },
  { id: 'threeMisses', label: '3 misses', count: 60 }
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const sessionCount = (goal: SessionGoal) => sessionGoals.find((item) => item.id === goal)?.count ?? 18;
const hardTypeIds = new Set(domainIds.flatMap((domain) => trainingGeneratorEntries[domain].filter((entry) => entry.complexity === 'Hard').map((entry) => entry.typeId)));

function usePwaInstallSupport() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = 'PuzzleScroll';

    const ensureLink = (rel: string, href: string, extra?: Record<string, string>) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (extra) Object.entries(extra).forEach(([key, value]) => link?.setAttribute(key, value));
    };

    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    ensureLink('manifest', '/manifest.json');
    ensureLink('icon', '/icon.svg', { type: 'image/svg+xml' });
    ensureLink('apple-touch-icon', '/maskable-icon.svg');
    ensureMeta('theme-color', '#EEF4FF');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-title', 'PuzzleScroll');
    ensureMeta('mobile-web-app-capable', 'yes');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    }
  }, []);
}

function FeedScreen({ immersive, onToggleImmersive }: { immersive: boolean; onToggleImmersive: () => void }) {
  const { height } = useWindowDimensions();
  const domainsState = useAppStore((state) => state.domains);
  const feedSettings = useAppStore((state) => state.feedSettings);
  const recordAttempt = useAppStore((state) => state.recordAttempt);
  const streakDays = useAppStore((state) => state.streakDays);
  const buildSession = () => {
    const enabledDomains = feedSettings.enabledDomains.length ? feedSettings.enabledDomains : domainIds;
    const weakestDomains = [...enabledDomains].sort((a, b) => domainsState[a].latestScore - domainsState[b].latestScore).slice(0, 2);
    const domainSequence = feedSettings.mode === 'mixed' ? [...enabledDomains, ...weakestDomains, ...weakestDomains] : enabledDomains;
    return (
    generateDailySession(
      Object.fromEntries(domainIds.map((domain) => [domain, domainsState[domain].currentLevel])) as Record<CognitiveDomain, number>,
      sessionCount(feedSettings.sessionGoal),
      { ...feedSettings, domainSequence }
    )
    );
  };
  const [session, setSession] = useState(buildSession);
  const cardHeight = Math.max(430, height - (immersive ? 18 : 148));
  const [index, setIndex] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const current = session[index] ?? session[0];
  const goNext = () => {
    if (feedSettings.sessionGoal === 'threeMisses' && missCount >= 3) {
      setSessionEnded(true);
      return;
    }
    setIndex((value) => Math.min(value + 1, session.length - 1));
  };
  const goPrevious = () => setIndex((value) => Math.max(value - 1, 0));
  const restartSession = () => {
    setSession(buildSession());
    setIndex(0);
    setMissCount(0);
    setSessionEnded(false);
  };
  const onAnswered = (attempt: PuzzleAttempt) => {
    recordAttempt(attempt);
    if (feedSettings.sessionGoal === 'threeMisses' && attempt.accuracy < 1) {
      setMissCount((value) => value + 1);
    }
  };
  useEffect(() => {
    restartSession();
  }, [feedSettings]);

  if (sessionEnded) {
    return (
      <View style={styles.screen}>
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.kicker}>Session Complete</Text>
            <Text style={styles.appTitle}>3 misses reached</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{index + 1}</Text>
            <Text style={styles.headerStatLabel}>seen</Text>
          </View>
        </View>
        <View style={styles.completionPanel}>
          <Text style={styles.screenTitle}>Stop while it still counts</Text>
          <Text style={styles.summaryText}>This mode ends when you miss three puzzles, so the session stays focused instead of becoming an endless scroll.</Text>
          <Pressable style={styles.primaryButton} onPress={restartSession}>
            <Text style={styles.primaryButtonText}>Start another session</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {!immersive ? (
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.kicker}>Daily Mix</Text>
            <Text style={styles.appTitle}>PuzzleScroll</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{streakDays}</Text>
            <Text style={styles.headerStatLabel}>day streak</Text>
          </View>
        </View>
      ) : null}
      <Pressable style={styles.lockButton} onPress={onToggleImmersive}>
        <Feather name={immersive ? 'lock' : 'unlock'} size={18} color="#20242A" />
      </Pressable>
      <SwipePager index={index} total={session.length} onPrevious={goPrevious} onNext={goNext}>
        {current ? <PuzzleCard key={current.id} puzzle={current} height={cardHeight} onAnswered={onAnswered} /> : null}
      </SwipePager>
      {!immersive ? <PagerControls index={index} total={session.length} onPrevious={goPrevious} onNext={goNext} /> : null}
    </View>
  );
}

function DashboardScreen({ onStartFeed, onStartCheck }: { onStartFeed: () => void; onStartCheck: () => void }) {
  const attempts = useAppStore((state) => state.attempts);
  const streakDays = useAppStore((state) => state.streakDays);
  const feedSettings = useAppStore((state) => state.feedSettings);
  const assessments = useAppStore((state) => state.assessments);
  const practiceAttempts = attempts.filter((attempt) => !attempt.isAssessment);
  const recent = practiceAttempts.slice(0, 20);
  const accuracy = recent.length ? Math.round((recent.reduce((sum, attempt) => sum + attempt.accuracy, 0) / recent.length) * 100) : 0;
  const hardSolved = practiceAttempts.filter((attempt) => hardTypeIds.has(attempt.puzzleType)).length;
  const activeMode = feedModes.find((mode) => mode.id === feedSettings.mode)?.label ?? 'Mixed Daily';
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inRange = (from: Date) => practiceAttempts.filter((attempt) => attempt.completedAt >= from.getTime());
  const todayAttempts = inRange(todayStart);
  const weekAttempts = inRange(weekStart);
  const monthAttempts = inRange(monthStart);
  const minutesFor = (items: PuzzleAttempt[]) => Math.round(items.reduce((sum, attempt) => sum + Math.max(0.25, attempt.reactionTimeMs / 60000), 0));
  const weekAccuracy = weekAttempts.length ? Math.round((weekAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / weekAttempts.length) * 100) : 0;
  const lastCheck = assessments[0]?.date ? new Date(assessments[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not yet';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenTitle}>PuzzleScroll</Text>
      <View style={styles.dashboardHero}>
        <View>
          <Text style={styles.heroMode}>{activeMode}</Text>
          <Text style={styles.heroSub}>{sessionGoals.find((goal) => goal.id === feedSettings.sessionGoal)?.label ?? '10 min'} session</Text>
        </View>
        <Pressable style={styles.heroButton} onPress={onStartFeed}>
          <Feather name="play" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start</Text>
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <Metric label="Today" value={`${minutesFor(todayAttempts)}m`} />
        <Metric label="Puzzles" value={String(todayAttempts.length)} />
        <Metric label="Streak" value={String(streakDays)} />
      </View>
      <View style={styles.statsRow}>
        <Metric label="7 days" value={`${minutesFor(weekAttempts)}m`} />
        <Metric label="Month" value={`${minutesFor(monthAttempts)}m`} />
        <Metric label="Week acc" value={`${weekAccuracy}%`} />
      </View>
      <View style={styles.statsRow}>
        <Metric label="Recent acc" value={`${accuracy}%`} />
        <Metric label="Hard solved" value={String(hardSolved)} />
        <Metric label="Last check" value={lastCheck} />
      </View>
      <Pressable style={styles.dashboardAction} onPress={onStartCheck}>
        <View>
          <Text style={styles.domainName}>Brain Check</Text>
          <Text style={styles.domainDescription}>Short baseline for today.</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#20242A" />
      </Pressable>
      <Pressable style={styles.dashboardAction} onPress={onStartFeed}>
        <View>
          <Text style={styles.domainName}>Start Training</Text>
          <Text style={styles.domainDescription}>{activeMode} · {sessionGoals.find((goal) => goal.id === feedSettings.sessionGoal)?.label ?? '10 min'}</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#20242A" />
      </Pressable>
    </ScrollView>
  );
}

function ProfileScreen() {
  const domainScores = useAppStore((state) => state.domains);
  const attempts = useAppStore((state) => state.attempts);
  const totalTrainingMinutes = useAppStore((state) => state.totalTrainingMinutes);
  const assessments = useAppStore((state) => state.assessments);
  const practiceAttempts = attempts.filter((attempt) => !attempt.isAssessment);
  const recent = practiceAttempts.slice(0, 30);
  const recentAccuracy = recent.length ? Math.round((recent.reduce((sum, attempt) => sum + attempt.accuracy, 0) / recent.length) * 100) : 0;
  const avgReaction = recent.length ? Math.round(recent.reduce((sum, attempt) => sum + attempt.reactionTimeMs, 0) / recent.length / 100) / 10 : 0;
  const hardAttempts = practiceAttempts.filter((attempt) => hardTypeIds.has(attempt.puzzleType)).length;
  const correctStreak = practiceAttempts.findIndex((attempt) => attempt.accuracy < 1);
  const qualityStreak = correctStreak === -1 ? practiceAttempts.length : correctStreak;
  const cognitiveFitness = recent.length ? Math.round(recentAccuracy * 0.7 + Math.min(30, hardAttempts) * 0.5 + Math.min(20, qualityStreak) * 0.75) : 50;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.kicker}>Brain Profile</Text>
      <Text style={styles.screenTitle}>{domains.length}-domain progress</Text>
      <View style={styles.chartPanel}>
        <RadarChart scores={domainScores} />
      </View>

      <View style={styles.statsRow}>
        <Metric label="Puzzles" value={String(practiceAttempts.length)} />
        <Metric label="Minutes" value={String(Math.round(totalTrainingMinutes))} />
        <Metric label="Checks" value={String(assessments.length)} />
      </View>
      <View style={styles.statsRow}>
        <Metric label="Fitness" value={String(Math.min(100, cognitiveFitness))} />
        <Metric label="Accuracy" value={`${recentAccuracy}%`} />
        <Metric label="Avg sec" value={String(avgReaction)} />
      </View>
      <View style={styles.statsRow}>
        <Metric label="Quality streak" value={String(qualityStreak)} />
        <Metric label="Hard solved" value={String(hardAttempts)} />
        <Metric label="Deep min" value={String(Math.round(practiceAttempts.filter((attempt) => hardTypeIds.has(attempt.puzzleType)).reduce((sum, attempt) => sum + attempt.reactionTimeMs, 0) / 60000))} />
      </View>

      {domains.map((domain) => {
        const score = domainScores[domain.id];
        return (
          <View style={styles.domainRow} key={domain.id}>
            <View style={[styles.domainIcon, { backgroundColor: domain.color }]}>
              <Feather name={domain.icon as never} color="#FFFFFF" size={18} />
            </View>
            <View style={styles.domainText}>
              <Text style={styles.domainName}>{domain.label}</Text>
              <Text style={styles.domainDescription}>{domain.description}</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{score.latestScore}</Text>
              <Text style={styles.scoreTrend}>{score.trend}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AssessScreen({ immersive, onToggleImmersive }: { immersive: boolean; onToggleImmersive: () => void }) {
  const domainScores = useAppStore((state) => state.domains);
  const recordAttempt = useAppStore((state) => state.recordAttempt);
  const recordAssessment = useAppStore((state) => state.recordAssessment);
  const [batteryId, setBatteryId] = useState(0);
  const [scores, setScores] = useState<Partial<Record<CognitiveDomain, AssessmentScore>>>({});
  const [complete, setComplete] = useState(false);
  const { height } = useWindowDimensions();
  const buildBattery = () => generateAssessmentBattery(Object.fromEntries(domainIds.map((domain) => [domain, domainScores[domain].currentLevel])) as Record<CognitiveDomain, number>);
  const [battery, setBattery] = useState(buildBattery);
  const cardHeight = Math.max(430, height - (immersive ? 18 : 148));
  const [index, setIndex] = useState(0);
  const current = battery[index] ?? battery[0];
  const goNext = () => setIndex((value) => Math.min(value + 1, battery.length - 1));
  const goPrevious = () => setIndex((value) => Math.max(value - 1, 0));

  useEffect(() => {
    setBattery(buildBattery());
    setIndex(0);
  }, [batteryId]);

  const onAnswered = (attempt: PuzzleAttempt) => {
    recordAttempt(attempt);
    const assessmentScore = scoreAssessment(attempt.domain, attempt.accuracy, attempt.reactionTimeMs);
    const nextScores = { ...scores, [attempt.domain]: assessmentScore };
    setScores(nextScores);

    if (Object.keys(nextScores).length === domainIds.length) {
      recordAssessment({
        id: `assessment-${Date.now()}`,
        date: Date.now(),
        type: 'monthly',
        scores: nextScores
      });
      setComplete(true);
    }
  };

  if (complete) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.kicker}>Brain Check</Text>
        <Text style={styles.screenTitle}>Assessment saved</Text>
        <Text style={styles.summaryText}>These scores use different tasks from the training feed to reduce practice-test bias.</Text>
        {domainIds.map((domainId) => {
          const meta = domains.find((domain) => domain.id === domainId)!;
          const score = scores[domainId];
          return (
            <View style={styles.resultRow} key={domainId}>
              <Text style={styles.domainName}>{meta.label}</Text>
              <Text style={styles.resultScore}>{score?.compositeScore ?? '--'}</Text>
            </View>
          );
        })}
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setScores({});
            setComplete(false);
            setBatteryId((value) => value + 1);
          }}
        >
          <Text style={styles.primaryButtonText}>Start another check</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      {!immersive ? (
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.kicker}>Brain Check</Text>
            <Text style={styles.appTitle}>Assessment</Text>
          </View>
          <Text style={styles.headerNote}>1 per domain</Text>
        </View>
      ) : null}
      <Pressable style={styles.lockButton} onPress={onToggleImmersive}>
        <Feather name={immersive ? 'lock' : 'unlock'} size={18} color="#20242A" />
      </Pressable>
      <SwipePager index={index} total={battery.length} onPrevious={goPrevious} onNext={goNext}>
        {current ? <PuzzleCard key={current.id} puzzle={current} height={cardHeight} onAnswered={onAnswered} /> : null}
      </SwipePager>
      {!immersive ? <PagerControls index={index} total={battery.length} onPrevious={goPrevious} onNext={goNext} /> : null}
    </View>
  );
}

function SwipePager({
  index,
  total,
  onPrevious,
  onNext,
  children
}: {
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  const lastStepAt = useRef(0);
  const wheelDelta = useRef(0);

  const step = (direction: 'previous' | 'next') => {
    if (direction === 'previous' && index <= 0) return;
    if (direction === 'next' && index >= total - 1) return;

    const now = Date.now();
    if (now - lastStepAt.current < 620) return;
    lastStepAt.current = now;
    wheelDelta.current = 0;

    if (direction === 'previous') onPrevious();
    else onNext();
  };

  const shouldHandleVerticalPage = (_: unknown, gesture: { dx: number; dy: number }) => {
      const vertical = Math.abs(gesture.dy);
      return vertical > 42 && vertical > Math.abs(gesture.dx) * 1.2;
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: shouldHandleVerticalPage,
    onMoveShouldSetPanResponderCapture: shouldHandleVerticalPage,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -58) step('next');
      if (gesture.dy > 58) step('previous');
    }
  });

  const wheelProps = {
    onWheel: (event: { nativeEvent?: { deltaY?: number; preventDefault?: () => void }; deltaY?: number; preventDefault?: () => void }) => {
      const deltaY = event.nativeEvent?.deltaY ?? event.deltaY ?? 0;
      if (Math.abs(deltaY) < 4) return;

      event.preventDefault?.();
      event.nativeEvent?.preventDefault?.();
      wheelDelta.current += deltaY;

      if (Math.abs(wheelDelta.current) < 80) return;
      step(wheelDelta.current > 0 ? 'next' : 'previous');
    }
  };

  return (
    <View style={styles.cardStage} {...panResponder.panHandlers} {...(wheelProps as object)}>
      <View style={styles.swipeSurface}>{children}</View>
      <View pointerEvents="none" style={styles.swipeHint}>
        <Feather name="chevrons-up" size={14} color="#7B848E" />
        <Text style={styles.swipeHintText}>Swipe or scroll for next</Text>
      </View>
    </View>
  );
}

function PagerControls({ index, total, onPrevious, onNext }: { index: number; total: number; onPrevious: () => void; onNext: () => void }) {
  return (
    <View style={styles.pager}>
      <Pressable style={[styles.pagerButton, index === 0 && styles.pagerButtonDisabled]} onPress={onPrevious} disabled={index === 0}>
        <Feather name="chevron-up" size={18} color={index === 0 ? '#A9B0B8' : '#20242A'} />
        <Text style={[styles.pagerButtonText, index === 0 && styles.pagerButtonTextDisabled]}>Prev</Text>
      </Pressable>
      <Text style={styles.pagerCount}>{index + 1} / {total}</Text>
      <Pressable style={[styles.pagerButton, index >= total - 1 && styles.pagerButtonDisabled]} onPress={onNext} disabled={index >= total - 1}>
        <Text style={[styles.pagerButtonText, index >= total - 1 && styles.pagerButtonTextDisabled]}>Next</Text>
        <Feather name="chevron-down" size={18} color={index >= total - 1 ? '#A9B0B8' : '#20242A'} />
      </Pressable>
    </View>
  );
}

function SettingsScreen() {
  const resetProgress = useAppStore((state) => state.resetProgress);
  const feedSettings = useAppStore((state) => state.feedSettings);
  const setFeedMode = useAppStore((state) => state.setFeedMode);
  const setSessionGoal = useAppStore((state) => state.setSessionGoal);
  const toggleFeedDomain = useAppStore((state) => state.toggleFeedDomain);
  const toggleFeedPuzzleType = useAppStore((state) => state.toggleFeedPuzzleType);
  const enableAllFeedPuzzles = useAppStore((state) => state.enableAllFeedPuzzles);
  const enableHardFeedPuzzles = useAppStore((state) => state.enableHardFeedPuzzles);
  const enabledDomainSet = new Set(feedSettings.enabledDomains);
  const enabledTypeSet = new Set(feedSettings.enabledPuzzleTypes);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.kicker}>Settings</Text>
      <Text style={styles.screenTitle}>Customize training</Text>
      <Text style={styles.sectionTitle}>Feed mode</Text>
      <View style={styles.modeGrid}>
        {feedModes.map((mode) => {
          const active = feedSettings.mode === mode.id;
          return (
            <Pressable key={mode.id} style={[styles.modeTile, active && styles.modeTileActive]} onPress={() => setFeedMode(mode.id)}>
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode.label}</Text>
              <Text style={styles.modeNote}>{mode.note}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Session length</Text>
      <View style={styles.segmentRow}>
        {sessionGoals.map((goal) => {
          const active = feedSettings.sessionGoal === goal.id;
          return (
            <Pressable key={goal.id} style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={() => setSessionGoal(goal.id)}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{goal.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.quickActions}>
        <Pressable style={styles.primaryButtonSmall} onPress={enableHardFeedPuzzles}>
          <Text style={styles.primaryButtonText}>Hard logic mix</Text>
        </Pressable>
        <Pressable style={styles.secondaryButtonSmall} onPress={enableAllFeedPuzzles}>
          <Text style={styles.secondaryButtonText}>Enable all</Text>
        </Pressable>
      </View>

      <InfoBlock
        title="Complex puzzle placement"
        body="The harder CAT/GMAT-style tasks live mainly in Reasoning & Logic, Planning & Strategy, Quantitative Reasoning, and Language & Verbal. Use the Hard logic mix preset or choose individual types below."
      />

      <Text style={styles.sectionTitle}>Feed categories</Text>
      {domains.map((domain) => {
        const selected = enabledDomainSet.has(domain.id);
        const enabledCount = trainingGeneratorEntries[domain.id].filter((entry) => enabledTypeSet.has(entry.typeId)).length;
        return (
          <Pressable key={domain.id} style={[styles.selectorRow, selected && styles.selectorRowActive]} onPress={() => toggleFeedDomain(domain.id)}>
            <View style={[styles.domainIcon, { backgroundColor: selected ? domain.color : '#A9B0B8' }]}>
              <Feather name={selected ? 'check' : (domain.icon as never)} color="#FFFFFF" size={18} />
            </View>
            <View style={styles.domainText}>
              <Text style={styles.domainName}>{domain.label}</Text>
              <Text style={styles.domainDescription}>{enabledCount} selected puzzle types</Text>
            </View>
          </Pressable>
        );
      })}

      <Text style={styles.sectionTitle}>Puzzle types</Text>
      {domains.map((domain) => (
        <View key={domain.id} style={styles.typeGroup}>
          <Text style={styles.typeGroupTitle}>{domain.label}</Text>
          {trainingGeneratorEntries[domain.id].map((entry) => {
            const selected = enabledTypeSet.has(entry.typeId);
            return (
              <Pressable key={entry.typeId} style={styles.typeRow} onPress={() => toggleFeedPuzzleType(entry.typeId)}>
                <Feather name={selected ? 'check-square' : 'square'} size={19} color={selected ? domain.color : '#8D96A0'} />
                <View style={styles.typeText}>
                  <Text style={styles.typeName}>{entry.typeName}</Text>
                  <Text style={styles.typeMeta}>{entry.complexity}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Guardrails</Text>
      <InfoBlock
        title="What the app claims"
        body="Exercises are designed to challenge specific cognitive skills and track your in-app task performance over time."
      />
      <InfoBlock
        title="What the app does not claim"
        body="This is not a medical device, diagnostic test, dementia prevention product, or IQ-improvement tool."
      />
      <InfoBlock
        title="Puzzle generation"
        body="Each domain uses multiple task families with parameterized generators for sequences, visual features, categories, arithmetic switches, constraints, clues, and assessment variants."
      />
      <InfoBlock
        title="Hard puzzle sources"
        body={`Harder puzzle formats are adapted from public-domain recreational mathematics sources, especially ${publicDomainSources.dudeneyAmusements.title} and ${publicDomainSources.dudeneyCanterbury.title}.`}
      />
      <Pressable style={styles.dangerButton} onPress={resetProgress}>
        <Text style={styles.dangerButtonText}>Reset local progress</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

function TabBar({ active, setActive }: { active: Tab; setActive: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Home', icon: 'grid' },
    { id: 'feed', label: 'Feed', icon: 'play-circle' },
    { id: 'profile', label: 'Profile', icon: 'bar-chart-2' },
    { id: 'assess', label: 'Check', icon: 'check-circle' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable key={tab.id} style={styles.tabButton} onPress={() => setActive(tab.id)}>
            <Feather name={tab.icon as never} size={20} color={isActive ? '#20242A' : '#7B848E'} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppShell() {
  const [active, setActiveRaw] = useState<Tab>('dashboard');
  const [feedImmersive, setFeedImmersive] = useState(true);
  const [assessImmersive, setAssessImmersive] = useState(true);
  const lastBrainCheckPromptDate = useAppStore((state) => state.lastBrainCheckPromptDate);
  const assessments = useAppStore((state) => state.assessments);
  const markBrainCheckPromptSeen = useAppStore((state) => state.markBrainCheckPromptSeen);
  const [showBrainCheckPrompt, setShowBrainCheckPrompt] = useState(false);

  useEffect(() => {
    const today = todayKey();
    const checkedToday = assessments.some((assessment) => new Date(assessment.date).toISOString().slice(0, 10) === today);
    if (lastBrainCheckPromptDate !== today && !checkedToday) {
      const timer = setTimeout(() => setShowBrainCheckPrompt(true), 500);
      return () => clearTimeout(timer);
    }
    setShowBrainCheckPrompt(false);
    return undefined;
  }, [assessments, lastBrainCheckPromptDate]);

  const closeBrainCheckPrompt = () => {
    markBrainCheckPromptSeen();
    setShowBrainCheckPrompt(false);
  };
  const setActive = (tab: Tab) => {
    if (tab === 'feed') setFeedImmersive(true);
    if (tab === 'assess') setAssessImmersive(true);
    setActiveRaw(tab);
  };

  useEffect(() => {
    const isLocked = (active === 'feed' && feedImmersive) || (active === 'assess' && assessImmersive);
    if (!isLocked) return undefined;
    const unlock = () => {
      if (active === 'feed') setFeedImmersive(false);
      if (active === 'assess') setAssessImmersive(false);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', unlock);
    if (typeof window !== 'undefined') {
      window.history.pushState({ puzzleScrollFeed: true }, '');
      window.addEventListener('popstate', unlock);
      return () => {
        subscription.remove();
        window.removeEventListener('popstate', unlock);
      };
    }
    return () => subscription.remove();
  }, [active, feedImmersive, assessImmersive]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appBody}>
        {active === 'dashboard' ? <DashboardScreen onStartFeed={() => setActive('feed')} onStartCheck={() => setActive('assess')} /> : null}
        {active === 'feed' ? <FeedScreen immersive={feedImmersive} onToggleImmersive={() => setFeedImmersive((value) => !value)} /> : null}
        {active === 'profile' ? <ProfileScreen /> : null}
        {active === 'assess' ? <AssessScreen immersive={assessImmersive} onToggleImmersive={() => setAssessImmersive((value) => !value)} /> : null}
        {active === 'settings' ? <SettingsScreen /> : null}
      </View>
      {(active === 'feed' && feedImmersive) || (active === 'assess' && assessImmersive) ? null : <TabBar active={active} setActive={setActive} />}
      <Modal transparent visible={showBrainCheckPrompt} animationType="fade" onRequestClose={closeBrainCheckPrompt}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.kicker}>Daily Brain Check</Text>
            <Text style={styles.modalTitle}>Do a quick baseline?</Text>
            <Text style={styles.infoBody}>A short check gives cleaner trend data than regular practice. You can skip it and train normally.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButtonSmall} onPress={closeBrainCheckPrompt}>
                <Text style={styles.secondaryButtonText}>Later</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButtonSmall}
                onPress={() => {
                  closeBrainCheckPrompt();
                  setActive('assess');
                }}
              >
                <Text style={styles.primaryButtonText}>Start check</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  usePwaInstallSupport();

  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF4FF'
  },
  appBody: {
    flex: 1
  },
  screen: {
    flex: 1
  },
  cardStage: {
    flex: 1,
    overflow: 'hidden'
  },
  lockButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#C9D7EA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  swipeSurface: {
    flex: 1
  },
  swipeHint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#C9D7EA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  swipeHintText: {
    color: '#56647C',
    fontWeight: '900',
    fontSize: 11
  },
  pager: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#C9D7EA'
  },
  pagerButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  pagerButtonDisabled: {
    backgroundColor: '#F1F2F2'
  },
  pagerButtonText: {
    color: '#141B2D',
    fontWeight: '900'
  },
  pagerButtonTextDisabled: {
    color: '#A9B0B8'
  },
  pagerCount: {
    color: '#44516A',
    fontWeight: '900'
  },
  appHeader: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#C9D7EA',
    backgroundColor: '#FFFFFF'
  },
  appTitle: {
    color: '#141B2D',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900'
  },
  headerStat: {
    minWidth: 72,
    borderRadius: 8,
    backgroundColor: '#2457D6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  headerStatValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18
  },
  headerStatLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10
  },
  headerNote: {
    color: '#44516A',
    fontWeight: '900'
  },
  summary: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120
  },
  kicker: {
    color: '#56647C',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase'
  },
  screenTitle: {
    color: '#141B2D',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 5
  },
  summaryText: {
    color: '#44516A',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 8
  },
  chartPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  dashboardHero: {
    minHeight: 132,
    marginTop: 18,
    marginBottom: 14,
    borderRadius: 8,
    backgroundColor: '#162033',
    padding: 18,
    justifyContent: 'space-between'
  },
  heroMode: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900'
  },
  heroSub: {
    color: '#DDE4DF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    marginTop: 4
  },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#0A8F5A',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dashboardAction: {
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 14
  },
  metricValue: {
    color: '#141B2D',
    fontSize: 22,
    fontWeight: '900'
  },
  metricLabel: {
    color: '#56647C',
    fontWeight: '800'
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    marginBottom: 10
  },
  domainIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  domainText: {
    flex: 1
  },
  domainName: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 15
  },
  domainDescription: {
    color: '#56647C',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2
  },
  scorePill: {
    minWidth: 68,
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingVertical: 7
  },
  scoreText: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 18
  },
  scoreTrend: {
    color: '#56647C',
    fontSize: 10,
    fontWeight: '800'
  },
  resultRow: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  resultScore: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 18
  },
  primaryButton: {
    backgroundColor: '#2457D6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18
  },
  completionPanel: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  modeTile: {
    width: '48%',
    minHeight: 78,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 10,
    justifyContent: 'center'
  },
  modeTileActive: {
    borderColor: '#2457D6',
    backgroundColor: '#EAF2FF'
  },
  modeLabel: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 14
  },
  modeLabelActive: {
    color: '#141B2D'
  },
  modeNote: {
    color: '#56647C',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  segmentButtonActive: {
    backgroundColor: '#2457D6',
    borderColor: '#2457D6'
  },
  segmentText: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 12
  },
  segmentTextActive: {
    color: '#FFFFFF'
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: '#2457D6',
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  secondaryButtonSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D7EA',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  secondaryButtonText: {
    color: '#141B2D',
    fontWeight: '900'
  },
  sectionTitle: {
    color: '#141B2D',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 8
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    marginBottom: 10
  },
  selectorRowActive: {
    borderColor: '#2457D6'
  },
  typeGroup: {
    borderTopWidth: 1,
    borderTopColor: '#C9D7EA',
    paddingTop: 12,
    marginTop: 8
  },
  typeGroupTitle: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 4
  },
  typeRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  typeText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  typeName: {
    flex: 1,
    color: '#141B2D',
    fontWeight: '800'
  },
  typeMeta: {
    color: '#56647C',
    fontWeight: '900',
    fontSize: 12
  },
  infoBlock: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 16
  },
  infoTitle: {
    color: '#141B2D',
    fontWeight: '900',
    fontSize: 16
  },
  infoBody: {
    color: '#44516A',
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6
  },
  dangerButton: {
    borderColor: '#C84E2F',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18
  },
  dangerButtonText: {
    color: '#C84E2F',
    fontWeight: '900'
  },
  tabBar: {
    height: 68,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#C9D7EA',
    backgroundColor: '#FFFFFF'
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  tabText: {
    color: '#7B848E',
    fontSize: 11,
    fontWeight: '800'
  },
  tabTextActive: {
    color: '#141B2D'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32,36,42,0.45)',
    padding: 20,
    justifyContent: 'center'
  },
  modalPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7EA',
    padding: 18
  },
  modalTitle: {
    color: '#141B2D',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 4
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  }
});
