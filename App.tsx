import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { domains, domainIds } from './src/data/domains';
import { generateAssessmentBattery, generateDailySession } from './src/logic/puzzleGenerators';
import { scoreAssessment } from './src/logic/scoring';
import { useAppStore } from './src/store/useAppStore';
import type { AssessmentScore, CognitiveDomain, PuzzleAttempt } from './src/types';
import { PuzzleCard } from './src/components/PuzzleCard';
import { RadarChart } from './src/components/RadarChart';

type Tab = 'feed' | 'profile' | 'assess' | 'settings';

function FeedScreen() {
  const { height } = useWindowDimensions();
  const domainsState = useAppStore((state) => state.domains);
  const recordAttempt = useAppStore((state) => state.recordAttempt);
  const streakDays = useAppStore((state) => state.streakDays);
  const session = useMemo(
    () => generateDailySession(Object.fromEntries(domainIds.map((domain) => [domain, domainsState[domain].currentLevel])) as Record<CognitiveDomain, number>, 18),
    [domainsState]
  );
  const cardHeight = Math.max(430, height - 148);

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
      <FlatList
        data={session}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={cardHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PuzzleCard puzzle={item} height={cardHeight} onAnswered={recordAttempt} />}
      />
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
  const battery = useMemo(
    () => generateAssessmentBattery(Object.fromEntries(domainIds.map((domain) => [domain, domainScores[domain].currentLevel])) as Record<CognitiveDomain, number>),
    [batteryId, domainScores]
  );
  const cardHeight = Math.max(430, height - 148);

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
      <FlatList
        data={battery}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={cardHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PuzzleCard puzzle={item} height={cardHeight} onAnswered={onAnswered} />}
      />
    </View>
  );
}

function SettingsScreen() {
  const resetProgress = useAppStore((state) => state.resetProgress);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.kicker}>Settings</Text>
      <Text style={styles.screenTitle}>Scientific guardrails</Text>
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
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
