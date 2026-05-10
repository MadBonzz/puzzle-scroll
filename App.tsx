import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { domains, domainIds } from './src/data/domains';
import { publicDomainSources } from './src/data/sourcePuzzles';
import { generateAssessmentBattery, generateDailySession, trainingGeneratorEntries } from './src/logic/puzzleGenerators';
import { scoreAssessment } from './src/logic/scoring';
import { useAppStore } from './src/store/useAppStore';
import type { AssessmentScore, CognitiveDomain, PuzzleAttempt } from './src/types';
import { PuzzleCard } from './src/components/PuzzleCard';
import { RadarChart } from './src/components/RadarChart';

type Tab = 'feed' | 'profile' | 'assess' | 'settings';

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
    ensureMeta('theme-color', '#FFFDF8');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-title', 'PuzzleScroll');
    ensureMeta('mobile-web-app-capable', 'yes');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    }
  }, []);
}

function FeedScreen() {
  const { height } = useWindowDimensions();
  const domainsState = useAppStore((state) => state.domains);
  const feedSettings = useAppStore((state) => state.feedSettings);
  const recordAttempt = useAppStore((state) => state.recordAttempt);
  const streakDays = useAppStore((state) => state.streakDays);
  const buildSession = () =>
    generateDailySession(
      Object.fromEntries(domainIds.map((domain) => [domain, domainsState[domain].currentLevel])) as Record<CognitiveDomain, number>,
      18,
      feedSettings
    );
  const [session, setSession] = useState(buildSession);
  const cardHeight = Math.max(430, height - 148);
  const [index, setIndex] = useState(0);
  const current = session[index] ?? session[0];
  const goNext = () => setIndex((value) => Math.min(value + 1, session.length - 1));
  const goPrevious = () => setIndex((value) => Math.max(value - 1, 0));
  useEffect(() => {
    setSession(buildSession());
    setIndex(0);
  }, [feedSettings]);

  return (
    <View style={styles.screen}>
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
      <View style={styles.cardStage}>
        {current ? <PuzzleCard key={current.id} puzzle={current} height={cardHeight} onAnswered={recordAttempt} /> : null}
      </View>
      <PagerControls index={index} total={session.length} onPrevious={goPrevious} onNext={goNext} />
    </View>
  );
}

function ProfileScreen() {
  const domainScores = useAppStore((state) => state.domains);
  const attempts = useAppStore((state) => state.attempts);
  const totalTrainingMinutes = useAppStore((state) => state.totalTrainingMinutes);
  const assessments = useAppStore((state) => state.assessments);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.kicker}>Brain Profile</Text>
      <Text style={styles.screenTitle}>{domains.length}-domain progress</Text>
      <View style={styles.chartPanel}>
        <RadarChart scores={domainScores} />
      </View>

      <View style={styles.statsRow}>
        <Metric label="Puzzles" value={String(attempts.filter((attempt) => !attempt.isAssessment).length)} />
        <Metric label="Minutes" value={String(Math.round(totalTrainingMinutes))} />
        <Metric label="Checks" value={String(assessments.length)} />
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

function AssessScreen() {
  const domainScores = useAppStore((state) => state.domains);
  const recordAttempt = useAppStore((state) => state.recordAttempt);
  const recordAssessment = useAppStore((state) => state.recordAssessment);
  const [batteryId, setBatteryId] = useState(0);
  const [scores, setScores] = useState<Partial<Record<CognitiveDomain, AssessmentScore>>>({});
  const [complete, setComplete] = useState(false);
  const { height } = useWindowDimensions();
  const buildBattery = () => generateAssessmentBattery(Object.fromEntries(domainIds.map((domain) => [domain, domainScores[domain].currentLevel])) as Record<CognitiveDomain, number>);
  const [battery, setBattery] = useState(buildBattery);
  const cardHeight = Math.max(430, height - 148);
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
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.kicker}>Brain Check</Text>
          <Text style={styles.appTitle}>Assessment</Text>
        </View>
        <Text style={styles.headerNote}>1 per domain</Text>
      </View>
      <View style={styles.cardStage}>
        {current ? <PuzzleCard key={current.id} puzzle={current} height={cardHeight} onAnswered={onAnswered} /> : null}
      </View>
      <PagerControls index={index} total={battery.length} onPrevious={goPrevious} onNext={goNext} />
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
    { id: 'feed', label: 'Feed', icon: 'home' },
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
  const [active, setActive] = useState<Tab>('feed');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appBody}>
        {active === 'feed' ? <FeedScreen /> : null}
        {active === 'profile' ? <ProfileScreen /> : null}
        {active === 'assess' ? <AssessScreen /> : null}
        {active === 'settings' ? <SettingsScreen /> : null}
      </View>
      <TabBar active={active} setActive={setActive} />
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
    backgroundColor: '#F7F4EA'
  },
  appBody: {
    flex: 1
  },
  screen: {
    flex: 1
  },
  cardStage: {
    flex: 1
  },
  pager: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF8',
    borderTopWidth: 1,
    borderTopColor: '#E4E0D5'
  },
  pagerButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6DADF',
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
    color: '#20242A',
    fontWeight: '900'
  },
  pagerButtonTextDisabled: {
    color: '#A9B0B8'
  },
  pagerCount: {
    color: '#5D6670',
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
    borderBottomColor: '#E4E0D5',
    backgroundColor: '#FFFDF8'
  },
  appTitle: {
    color: '#20242A',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900'
  },
  headerStat: {
    minWidth: 72,
    borderRadius: 8,
    backgroundColor: '#20242A',
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
    color: '#5D6670',
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
    color: '#68717C',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase'
  },
  screenTitle: {
    color: '#20242A',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 5
  },
  summaryText: {
    color: '#5D6670',
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
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1DDD1',
    padding: 14
  },
  metricValue: {
    color: '#20242A',
    fontSize: 22,
    fontWeight: '900'
  },
  metricLabel: {
    color: '#68717C',
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
    borderColor: '#E1DDD1',
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
    color: '#20242A',
    fontWeight: '900',
    fontSize: 15
  },
  domainDescription: {
    color: '#68717C',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2
  },
  scorePill: {
    minWidth: 68,
    alignItems: 'center',
    backgroundColor: '#F3F5F4',
    borderRadius: 8,
    paddingVertical: 7
  },
  scoreText: {
    color: '#20242A',
    fontWeight: '900',
    fontSize: 18
  },
  scoreTrend: {
    color: '#68717C',
    fontSize: 10,
    fontWeight: '800'
  },
  resultRow: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1DDD1',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  resultScore: {
    color: '#20242A',
    fontWeight: '900',
    fontSize: 18
  },
  primaryButton: {
    backgroundColor: '#20242A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: '#20242A',
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  secondaryButtonSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DADF',
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
    color: '#20242A',
    fontWeight: '900'
  },
  sectionTitle: {
    color: '#20242A',
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
    borderColor: '#E1DDD1',
    marginBottom: 10
  },
  selectorRowActive: {
    borderColor: '#20242A'
  },
  typeGroup: {
    borderTopWidth: 1,
    borderTopColor: '#E1DDD1',
    paddingTop: 12,
    marginTop: 8
  },
  typeGroupTitle: {
    color: '#20242A',
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
    color: '#20242A',
    fontWeight: '800'
  },
  typeMeta: {
    color: '#68717C',
    fontWeight: '900',
    fontSize: 12
  },
  infoBlock: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1DDD1',
    padding: 16
  },
  infoTitle: {
    color: '#20242A',
    fontWeight: '900',
    fontSize: 16
  },
  infoBody: {
    color: '#5D6670',
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
    borderTopColor: '#E1DDD1',
    backgroundColor: '#FFFDF8'
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
    color: '#20242A'
  }
});
