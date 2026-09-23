import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { analyticsSummary, latencyGroups, localDayKey, practiceStreak, speedAccuracyBySession, timeByLocalDay } from '../analytics/metrics';
import { PuzzleVisual } from '../components/PuzzleVisual';
import { buildSessionItems, eligibleFamilies, familyDispositions } from '../content/catalog';
import { buildCheckItems } from '../content/checkForms';
import { domains, domainIds } from '../data/domains';
import { createSessionState, type AttemptRecord, type DifficultyTier, type Pace, type SessionState } from '../session/sessionMachine';
import { foregroundSessionClock } from '../session/clock';
import { contentVersionKey, type AppStore, type Preferences, type StoreState } from '../store/appStore';
import { registerPuzzleServiceWorker } from '../pwa/register';

type Page = 'home' | 'setup' | 'session' | 'progress' | 'settings';

function useBoundStore<T>(store: AppStore, selector: (state: StoreState) => T) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()), () => selector(store.getSnapshot()));
}

const now = () => foregroundSessionClock.now();
const formatClock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const displayedResponse = (attempt: AttemptRecord) => {
  if (!attempt.responseId) return attempt.outcome;
  if (attempt.responseId.includes('|')) {
    return attempt.responseId
      .split('|')
      .map((id) => attempt.displayedChoices.find((choice) => choice.id === id)?.label ?? id)
      .join('-');
  }
  return attempt.displayedChoices.find((choice) => choice.id === attempt.responseId)?.label ?? attempt.responseId;
};

function Button({ label, onPress, kind = 'primary', disabled = false, testID }: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={[styles.button, kind === 'secondary' && styles.buttonSecondary, kind === 'danger' && styles.buttonDanger, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, kind !== 'primary' && styles.buttonTextDark]}>{label}</Text>
    </Pressable>
  );
}

function Header({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {onClose ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Close session" onPress={onClose} style={styles.iconButton}>
          <Feather name="x" size={22} color="#172033" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Home({ state, onPractice, onCheck, onResume }: {
  state: StoreState;
  onPractice: () => void;
  onCheck: () => void;
  onResume: () => void;
}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const today = localDayKey(Date.now(), timezone);
  const todayAttempts = state.attempts.filter((attempt) => localDayKey(attempt.committedAtMs, timezone) === today);
  const summary = analyticsSummary(todayAttempts);
  const todayTime = timeByLocalDay(state.sessionHistory, timezone).find((entry) => entry.day === today);
  const activeMinutes = Math.round((todayTime?.practiceActiveMs ?? 0) / 60000);
  const streak = practiceStreak(state.sessionHistory, timezone, Date.now());
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>PuzzleScroll</Text>
      <Text style={styles.heroTitle}>Train clearly. Know what improved.</Text>
      {state.activeSession ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroCardTitle}>Session in progress</Text>
          <Text style={styles.heroCardText}>
            {state.activeSession.pace === 'fast' ? 'Fast' : 'Slow'} · {state.activeSession.tier} · {state.activeSession.attempts.length} answered
          </Text>
          <Button label="Resume session" onPress={onResume} />
        </View>
      ) : (
        <View style={styles.heroCard}>
          <Text style={styles.heroCardTitle}>Ready for a focused session?</Text>
          <Text style={styles.heroCardText}>
            {state.preferences.pace === 'fast' ? 'Fast' : 'Slow'} · {state.preferences.tier} · {state.preferences.categories.length} categories
          </Text>
          <Button label="Start practice" onPress={onPractice} />
        </View>
      )}
      <View style={styles.metrics}>
        <Metric value={String(activeMinutes)} label="active min" />
        <Metric value={String(summary.correct)} label="correct" />
        <Metric value={String(streak)} label="day streak" />
      </View>
      <Pressable accessibilityRole="button" onPress={onCheck} style={styles.listCard}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Check progress</Text>
          <Text style={styles.muted}>A focused five-minute check across 2–3 available categories.</Text>
        </View>
        <Feather name="chevron-right" size={22} color="#3759C7" />
      </Pressable>
      <Text style={styles.sectionTitle}>Continue with purpose</Text>
      <Text style={styles.body}>Practice results describe performance in these tasks. They are not medical, IQ, or clinical measurements.</Text>
      {state.legacy ? <Text style={styles.notice}>Older activity is preserved as a legacy estimate and is not mixed with measured active time.</Text> : null}
    </ScrollView>
  );
}

function Segmented<T extends string>({ label, values, selected, onChange }: {
  label: string;
  values: readonly { id: T; label: string }[];
  selected: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.segmented}>
        {values.map((value) => {
          const active = value.id === selected;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              aria-checked={active}
              key={value.id}
              onPress={() => onChange(value.id)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{value.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggle}>
      <Text style={styles.body}>{label}</Text>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}><View style={[styles.switchThumb, value && styles.switchThumbOn]} /></View>
    </Pressable>
  );
}

function Setup({ store, state, kind, onStarted, onBack }: {
  store: AppStore;
  state: StoreState;
  kind: 'practice' | 'check';
  onStarted: () => void;
  onBack: () => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(state.preferences.custom);
  const [checkCategories, setCheckCategories] = useState(state.preferences.categories.slice(0, 3));
  const [error, setError] = useState<string>();
  const preferences = state.preferences;
  const excludedContentVersions = state.contentReports.map((report) => contentVersionKey(report.contentId, report.contentVersion));
  const update = (change: Partial<Preferences>) => store.updatePreferences(change);
  const toggleCategory = (domain: (typeof domainIds)[number]) => {
    const activeCategories = kind === 'check' ? checkCategories : preferences.categories;
    const selected = activeCategories.includes(domain);
    if (selected && activeCategories.length === (kind === 'check' ? 2 : 1)) return;
    if (kind === 'check') {
      if (!selected && activeCategories.length >= 3) {
        setError('Quick checks cover two or three categories at a time. Deselect one before adding another.');
        return;
      }
      setError(undefined);
      setCheckCategories(selected ? activeCategories.filter((item) => item !== domain) : [...activeCategories, domain]);
      return;
    }
    update({
      categories: selected ? preferences.categories.filter((item) => item !== domain) : [...preferences.categories, domain],
      allCategories: false
    });
  };
  const start = () => {
    const sessionCategories = kind === 'check' ? checkCategories : preferences.categories;
    if (kind === 'check' && sessionCategories.length < 2) {
      setError('Choose two or three categories for a useful quick check.');
      return;
    }
    const selection = {
      pace: preferences.pace,
      tier: preferences.tier,
      categories: sessionCategories,
      familyIds: preferences.custom.active ? preferences.custom.familyIds : undefined,
      excludedContentVersions
    };
    const durationMs = preferences.custom.active && preferences.custom.durationMs
      ? preferences.custom.durationMs
      : preferences.pace === 'fast'
        ? 5 * 60_000
        : 15 * 60_000;
    const count = preferences.pace === 'fast' ? 60 : 4;
    const seed = now();
    const items = kind === 'check'
      ? buildCheckItems(sessionCategories, Math.floor(seed)).filter(
        (candidate) => !excludedContentVersions.includes(contentVersionKey(candidate.contentId, candidate.contentVersion))
      )
      : buildSessionItems(selection, count, Math.floor(seed));
    if (!items.length) {
      setError('No approved questions match this combination yet. Choose another pace, difficulty, category, or Custom filter.');
      return;
    }
    const session = createSessionState({
      sessionId: `session-${seed}`,
      kind,
      items,
      pace: kind === 'check' ? 'fast' : preferences.pace,
      tier: kind === 'check' ? 'medium' : preferences.tier,
      categories: sessionCategories,
      startedAtMs: seed,
      budgetMs: kind === 'check' ? 5 * 60_000 : preferences.pace === 'fast' && !preferences.custom.untimed ? durationMs : undefined,
      softTargetMs: kind === 'practice' && preferences.pace === 'slow' && !preferences.custom.untimed ? durationMs : undefined,
      threeMisses: kind === 'practice' && preferences.custom.active && preferences.custom.threeMisses
    });
    if (store.startSession(session)) onStarted();
  };
  const available = eligibleFamilies({
    pace: preferences.pace,
    tier: preferences.tier,
    categories: preferences.categories,
    familyIds: preferences.custom.active ? preferences.custom.familyIds : undefined,
    excludedContentVersions
  });
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Header title={kind === 'check' ? 'Check progress' : 'Practice'} subtitle={kind === 'check' ? 'Focused and transparent' : 'Choose two things, then begin'} onClose={onBack} />
      {kind === 'practice' ? <Segmented<Pace>
        label="Pace"
        values={[{ id: 'fast', label: 'Fast' }, { id: 'slow', label: 'Slow' }]}
        selected={preferences.pace}
        onChange={(pace) => update({ pace })}
      /> : <Text style={styles.notice}>Quick check protocol: Fast · Medium · 5 active minutes · two trials per selected category.</Text>}
      {kind === 'practice' ? <Segmented<DifficultyTier>
        label="Difficulty"
        values={[{ id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' }]}
        selected={preferences.tier}
        onChange={(tier) => update({ tier })}
      /> : null}
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Categories</Text>
        <View style={styles.chips}>
          {kind === 'practice' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: preferences.allCategories }}
              onPress={() => update({ categories: [...domainIds], allCategories: true })}
              style={[styles.chip, preferences.allCategories && styles.chipActive]}
            >
              <Text style={[styles.chipText, preferences.allCategories && styles.chipTextActive]}>All</Text>
            </Pressable>
          ) : null}
          {domains.map((domain) => {
            const selected = (kind === 'check' ? checkCategories : preferences.categories).includes(domain.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={domain.id}
                onPress={() => toggleCategory(domain.id)}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{domain.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.sessionNote}>
        {kind === 'check'
          ? `This check covers ${checkCategories.length} categories and reports only those categories.`
          : preferences.pace === 'fast'
          ? 'Five active-task minutes. Examples and feedback do not use the countdown.'
          : 'About fifteen active minutes. Finish the current problem when the soft target is reached.'}
      </Text>
      <Text style={styles.muted}>{kind === 'check' ? `${checkCategories.length * 2} independent check trials prepared.` : `${available.length} approved families available for this selection.`}</Text>
      {kind === 'practice' && preferences.custom.active ? <Text style={styles.notice}>Custom filters active</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <View style={styles.flex}><Button label="Start" onPress={start} /></View>
        {kind === 'practice' ? <View style={styles.flex}><Button label="Custom" kind="secondary" onPress={() => { setCustomDraft(preferences.custom); setCustomOpen(true); }} /></View> : null}
      </View>
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Custom session</Text>
            <Text style={styles.muted}>Fine controls apply only after you press Apply.</Text>
            <Segmented
              label="Duration"
              values={[
                { id: '300000', label: '5 min' },
                { id: '900000', label: '15 min' },
                { id: '1200000', label: '20 min' }
              ]}
              selected={String(customDraft.durationMs ?? (preferences.pace === 'fast' ? 300000 : 900000))}
              onChange={(value) => setCustomDraft({ ...customDraft, durationMs: Number(value), untimed: false })}
            />
            <Toggle label="Untimed" value={customDraft.untimed} onChange={(untimed) => setCustomDraft({ ...customDraft, untimed })} />
            <Toggle label="End after three misses" value={customDraft.threeMisses} onChange={(threeMisses) => setCustomDraft({ ...customDraft, threeMisses })} />
            <Toggle label="Allow hints" value={customDraft.hints} onChange={(hints) => setCustomDraft({ ...customDraft, hints })} />
            <Text style={styles.groupLabel}>Specific puzzle families</Text>
            <Text style={styles.muted}>Leave all selected to include current and future approved families. An explicit selection stays explicit.</Text>
            <View style={styles.chips}>
              {familyDispositions.filter((family) => family.approved && preferences.categories.includes(family.domain)).map((family) => {
                const explicit = customDraft.familyIds;
                const selected = explicit ? explicit.includes(family.typeId) : true;
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={family.typeId}
                    onPress={() => {
                      const current = explicit ?? familyDispositions.filter((candidate) => candidate.approved).map((candidate) => candidate.typeId);
                      const familyIds = selected ? current.filter((id) => id !== family.typeId) : [...current, family.typeId];
                      setCustomDraft({ ...customDraft, familyIds });
                    }}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{family.typeId}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Use all approved families" kind="secondary" onPress={() => setCustomDraft({ ...customDraft, familyIds: undefined })} />
            <View style={styles.row}>
              <View style={styles.flex}><Button label="Cancel" kind="secondary" onPress={() => setCustomOpen(false)} /></View>
              <View style={styles.flex}><Button label="Apply" onPress={() => { store.applyCustom(customDraft); setCustomOpen(false); }} /></View>
            </View>
            <Button label="Reset custom filters" kind="secondary" onPress={() => {
              store.updatePreferences({ custom: { active: false, untimed: false, threeMisses: false, hints: true } });
              setCustomOpen(false);
            }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SessionView({ store, session, onHome }: { store: AppStore; session: SessionState; onHome: () => void }) {
  const [selected, setSelected] = useState<string>();
  const [closeOpen, setCloseOpen] = useState(false);
  const item = session.items[session.currentIndex]!;
  const attempt = session.attempts.find((candidate) => candidate.instanceId === item.instanceId);
  const reportProblem = (contentId: string, contentVersion: number, instanceId: string) => {
    store.reportContentProblem({ contentId, contentVersion, instanceId, reportedAtMs: Date.now() });
  };
  function requestClose() {
    if (session.status === 'instructions') {
      store.discardSession();
      onHome();
    } else if (session.status === 'summary') {
      store.finishSession();
      onHome();
    } else if (session.status === 'review') {
      store.dispatchSession({ type: 'BACK_TO_SUMMARY', atMs: now() });
    } else {
      setCloseOpen(true);
      store.dispatchSession({ type: 'PAUSE', atMs: now() });
    }
  }
  useEffect(() => setSelected(session.drafts[item.instanceId]?.responseText), [item.instanceId, session.drafts]);
  useEffect(() => {
    if (session.status !== 'active') return undefined;
    const timer = setInterval(() => store.dispatchSession({ type: 'TICK', atMs: now(), itemInstanceId: item.instanceId }), 250);
    return () => clearInterval(timer);
  }, [session.status, session.currentIndex, store]);
  useEffect(() => {
    if (session.status !== 'active') return undefined;
    if (session.phase === 'study') {
      const timer = setTimeout(
        () => store.dispatchSession({
          type: 'SET_PHASE',
          atMs: now(),
          phase: item.round?.interferencePrompt || item.round?.interferenceVisual ? 'interference' : 'responding',
          itemInstanceId: item.instanceId
        }),
        item.round?.studyDurationMs ?? 1800
      );
      return () => clearTimeout(timer);
    }
    if (session.phase === 'interference') {
      const timer = setTimeout(
        () => store.dispatchSession({ type: 'SET_PHASE', atMs: now(), phase: 'responding', itemInstanceId: item.instanceId }),
        item.round?.interferenceDurationMs ?? 1800
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [session.status, session.phase, item.instanceId, item.round, store]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [session.status, store, onHome]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' || (session.status !== 'active' && session.status !== 'feedback')) return;
      if (session.kind === 'check' && session.status === 'active') {
        store.dispatchSession({ type: 'INTERRUPT', atMs: now(), itemInstanceId: item.instanceId });
      } else {
        store.dispatchSession({ type: 'PAUSE', atMs: now() });
      }
    });
    return () => subscription.remove();
  }, [session.kind, session.status, item.instanceId, store]);

  if (session.status === 'instructions') {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title={session.kind === 'check' ? 'Before your check' : 'Before you begin'} onClose={requestClose} />
        <Text style={styles.heroTitle}>{session.pace === 'fast' ? 'Short, focused practice' : 'Take time to reason'}</Text>
        <Text style={styles.body}>
          {session.pace === 'fast'
            ? 'The timer counts only active question work. Reading feedback and pausing do not use your budget.'
            : 'The timer is a soft target. When it is reached, finish the current problem and review the solution.'}
        </Text>
        <Text style={styles.notice}>{session.items.length} prepared items · {session.tier} · {session.categories.length} categories</Text>
        <Button label="Start" onPress={() => store.dispatchSession({ type: 'START', atMs: now() })} />
      </ScrollView>
    );
  }

  if (session.status === 'summary') {
    const summary = analyticsSummary(session.attempts);
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="Session complete" onClose={requestClose} />
        <View style={styles.metrics}>
          <Metric value={String(summary.correct)} label="correct" />
          <Metric value={String(summary.incorrect)} label="incorrect" />
          <Metric value={formatClock(session.timing.activeTaskMs)} label="active time" />
        </View>
        <Text style={styles.body}>
          {summary.submittedAccuracy === undefined ? 'No submitted answers.' : `${Math.round(summary.submittedAccuracy * 100)}% submitted-answer accuracy.`}
          {summary.timedOut ? ` ${summary.timedOut} timed out.` : ''}
          {summary.skipped ? ` ${summary.skipped} skipped.` : ''}
        </Text>
        {session.kind === 'check' ? (
          <Text style={styles.notice}>
            Covered: {session.categories.map((domain) => domains.find((candidate) => candidate.id === domain)?.label ?? domain).join(', ')}. Other categories were not assessed.
          </Text>
        ) : null}
        <Button label="Review answers" kind="secondary" onPress={() => store.dispatchSession({ type: 'SHOW_REVIEW', atMs: now() })} />
        <Button label="Done" onPress={() => { store.finishSession(); onHome(); }} />
      </ScrollView>
    );
  }

  if (session.status === 'review') {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Header title="Review answers" onClose={requestClose} />
        {session.attempts.map((record, index) => {
          const response = displayedResponse(record);
          const correct = record.correctResponseLabel ?? record.displayedChoices.find((choice) => record.correctChoiceIds.includes(choice.id))?.label;
          const reported = store.isContentVersionExcluded(record.contentId, record.contentVersion);
          const challengeSaved = store.isChallengeSaved(record.instanceId);
          return (
            <View key={record.instanceId} style={styles.reviewCard}>
              <Text style={styles.eyebrow}>Question {index + 1} · {record.outcome}</Text>
              <Text style={styles.cardTitle}>{record.prompt}</Text>
              <Text style={styles.body}>Your answer: {response}</Text>
              <Text style={styles.body}>Correct answer: {correct ?? 'See rubric'}</Text>
              <Text style={styles.muted}>{record.explanation}</Text>
              {record.notes ? <Text style={styles.notice}>Your notes: {record.notes}</Text> : null}
              {reported ? <Text style={styles.notice}>Reported locally. This exact question version will be excluded from future sessions.</Text> : null}
              <Button
                label={reported ? 'Problem reported' : 'Report a problem'}
                kind="secondary"
                disabled={reported}
                onPress={() => reportProblem(record.contentId, record.contentVersion, record.instanceId)}
              />
              {record.pace === 'slow' && record.displayedChoices.length ? (
                <Button
                  label={challengeSaved ? 'Challenge saved' : 'Save challenge'}
                  kind="secondary"
                  disabled={challengeSaved}
                  onPress={() => store.saveChallenge(record)}
                />
              ) : null}
              {challengeSaved ? <Text style={styles.notice}>Saved for later practice on this device.</Text> : null}
              <Button
                label={`Retry question ${index + 1}`}
                kind="secondary"
                disabled={reported}
                onPress={() => store.dispatchSession({ type: 'RETRY_ITEM', atMs: now(), instanceId: record.instanceId })}
              />
            </View>
          );
        })}
        {session.abandonedInstanceIds.map((instanceId) => {
          const abandoned = session.items.find((candidate) => candidate.instanceId === instanceId);
          return (
            <View key={instanceId} style={styles.reviewCard}>
              <Text style={styles.eyebrow}>Unanswered (not scored)</Text>
              <Text style={styles.cardTitle}>{abandoned?.prompt}</Text>
            </View>
          );
        })}
        <Button label="Back to summary" onPress={() => store.dispatchSession({ type: 'BACK_TO_SUMMARY', atMs: now() })} />
      </ScrollView>
    );
  }

  const remaining = session.budgetMs === undefined ? undefined : Math.max(0, session.budgetMs - session.timing.activeTaskMs);
  const orderedResponseIds = item.responseSchema?.kind === 'ordered' && selected ? selected.split('|').filter(Boolean) : [];
  const responseComplete = item.responseSchema?.kind === 'ordered'
    ? orderedResponseIds.length === item.choices.length
    : Boolean(selected);
  const round = item.round;
  const shownPrompt =
    session.phase === 'study'
      ? round?.studyPrompt ?? item.prompt
      : session.phase === 'interference'
        ? round?.interferencePrompt ?? 'Hold the earlier item in mind.'
        : item.prompt;
  const shownVisual =
    session.phase === 'study'
      ? round?.studyVisual ?? round?.visual
      : session.phase === 'interference'
        ? round?.interferenceVisual
        : round?.visual;
  return (
    <View style={styles.sessionPage}>
      <View style={styles.sessionHeader}>
        <Header
          title={session.kind === 'check' ? 'Progress check' : `${session.pace === 'fast' ? 'Fast' : 'Slow'} · ${session.tier}`}
          subtitle={remaining === undefined ? `${formatClock(session.timing.activeTaskMs)} elapsed · ${session.attempts.length} answered` : `${formatClock(remaining)} remaining · ${session.attempts.length} answered`}
          onClose={requestClose}
        />
      </View>
      <ScrollView contentContainerStyle={styles.task}>
        {session.status === 'paused' ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroCardTitle}>Paused</Text>
            <Text style={styles.heroCardText}>Active time is not increasing.</Text>
            {!closeOpen ? (
              <>
                <Button label="Resume" onPress={() => store.dispatchSession({ type: 'RESUME', atMs: now() })} />
                <Button label="End session" kind="danger" onPress={() => store.dispatchSession({ type: 'END_SESSION', atMs: now() })} />
              </>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={styles.taskPrompt}>{shownPrompt}</Text>
            {session.pace === 'slow' && item.effortRangeMinutes ? (
              <Text style={styles.notice}>Expected effort: {item.effortRangeMinutes[0]}–{item.effortRangeMinutes[1]} minutes.</Text>
            ) : null}
            <PuzzleVisual visual={shownVisual} />
            {session.pace === 'slow' && session.status === 'active' ? (
              <TextInput
                accessibilityLabel="Scratchpad notes"
                multiline
                placeholder="Scratchpad notes (saved on this device)"
                value={session.drafts[item.instanceId]?.notes ?? ''}
                onChangeText={(notes) => store.dispatchSession({ type: 'SET_NOTES', atMs: now(), notes, itemInstanceId: item.instanceId })}
                style={styles.textInput}
              />
            ) : null}
            {session.phase === 'ready' ? (
              <Button label="I'm ready" onPress={() => store.dispatchSession({ type: 'SET_PHASE', atMs: now(), phase: round?.studyPrompt || round?.studyVisual ? 'study' : 'responding', itemInstanceId: item.instanceId })} />
            ) : null}
            {session.phase === 'responding' && session.status === 'active' ? (
              <>
                {item.responseSchema?.kind === 'ordered' ? (
                  <View style={styles.choiceList}>
                    <Text style={styles.notice}>Tap every tile in the order the path should follow.</Text>
                    <Text style={styles.body}>
                      Your order: {orderedResponseIds.length
                        ? orderedResponseIds.map((id) => item.choices.find((choice) => choice.id === id)?.label ?? id).join('-')
                        : 'No tiles selected'}
                    </Text>
                    {item.choices.map((choice) => {
                      const used = orderedResponseIds.includes(choice.id);
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${choice.label} to order`}
                          accessibilityState={{ disabled: used }}
                          disabled={used}
                          key={choice.id}
                          onPress={() => store.dispatchSession({
                            type: 'SET_DRAFT_RESPONSE',
                            atMs: now(),
                            responseText: [...orderedResponseIds, choice.id].join('|'),
                            itemInstanceId: item.instanceId
                          })}
                          style={[styles.choice, used && styles.disabled]}
                        >
                          <Text style={styles.choiceText}>{choice.label}</Text>
                        </Pressable>
                      );
                    })}
                    <Button
                      label="Undo last step"
                      kind="secondary"
                      disabled={!orderedResponseIds.length}
                      onPress={() => store.dispatchSession({
                        type: 'SET_DRAFT_RESPONSE',
                        atMs: now(),
                        responseText: orderedResponseIds.slice(0, -1).join('|'),
                        itemInstanceId: item.instanceId
                      })}
                    />
                  </View>
                ) : item.responseSchema?.kind === 'numeric' ? (
                  <TextInput
                    accessibilityLabel={item.responseSchema.inputLabel}
                    keyboardType="decimal-pad"
                    placeholder={item.responseSchema.inputLabel}
                    value={selected ?? ''}
                    onChangeText={(responseText) => store.dispatchSession({ type: 'SET_DRAFT_RESPONSE', atMs: now(), responseText, itemInstanceId: item.instanceId })}
                    style={styles.textInput}
                  />
                ) : <View style={styles.choiceList}>
                  {item.choices.map((choice) => {
                    const active = selected === choice.id;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        aria-checked={active}
                        key={choice.id}
                        onPress={() => store.dispatchSession({ type: 'SET_DRAFT_RESPONSE', atMs: now(), responseText: choice.id, itemInstanceId: item.instanceId })}
                        style={[styles.choice, active && styles.choiceSelected]}
                      >
                        <Text style={[styles.choiceText, active && styles.choiceTextSelected]}>{choice.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>}
                <Button label="Submit" disabled={!responseComplete} onPress={() => responseComplete && selected && store.dispatchSession({ type: 'SUBMIT', atMs: now(), responseId: selected, itemInstanceId: item.instanceId })} />
                <Button label="Skip" kind="secondary" onPress={() => store.dispatchSession({ type: 'SKIP', atMs: now(), itemInstanceId: item.instanceId })} />
              </>
            ) : null}
            {session.status === 'feedback' && attempt ? (
              <View style={styles.feedback}>
                <Text accessibilityRole="header" style={[styles.cardTitle, attempt.outcome === 'correct' ? styles.success : styles.failure]}>
                  {attempt.outcome === 'correct' ? 'Correct' : attempt.outcome === 'timedOut' ? 'Timed out' : attempt.outcome === 'skipped' ? 'Skipped' : attempt.outcome === 'interrupted' ? 'Interrupted' : 'Incorrect'}
                </Text>
                <Text style={styles.body}>Your answer: {displayedResponse(attempt)}</Text>
                <Text style={styles.body}>Correct answer: {attempt.correctResponseLabel ?? item.choices.find((choice) => item.correctChoiceIds.includes(choice.id))?.label}</Text>
                <Text style={styles.muted}>{attempt.explanation}</Text>
                {store.isContentVersionExcluded(item.contentId, item.contentVersion) ? (
                  <>
                    <Text style={styles.notice}>Reported locally. This exact question version will be excluded from future sessions.</Text>
                    <Button label="Problem reported" kind="secondary" disabled onPress={() => undefined} />
                  </>
                ) : (
                  <Button
                    label="Report a problem"
                    kind="secondary"
                    onPress={() => reportProblem(item.contentId, item.contentVersion, item.instanceId)}
                  />
                )}
                {attempt.pace === 'slow' && attempt.displayedChoices.length ? (
                  <>
                    <Button
                      label={store.isChallengeSaved(attempt.instanceId) ? 'Challenge saved' : 'Save challenge'}
                      kind="secondary"
                      disabled={store.isChallengeSaved(attempt.instanceId)}
                      onPress={() => store.saveChallenge(attempt)}
                    />
                    {store.isChallengeSaved(attempt.instanceId) ? <Text style={styles.notice}>Saved for later practice on this device.</Text> : null}
                  </>
                ) : null}
                <Button label={session.canContinue ? 'Next question' : 'View results'} onPress={() => store.dispatchSession({ type: 'NEXT', atMs: now() })} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <Modal visible={closeOpen} transparent animationType="fade" onRequestClose={() => { store.dispatchSession({ type: 'RESUME', atMs: now() }); setCloseOpen(false); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Session paused</Text>
            <Text style={styles.muted}>Resume where you stopped or end and keep completed answers.</Text>
            <Button label="Resume" onPress={() => { store.dispatchSession({ type: 'RESUME', atMs: now() }); setCloseOpen(false); }} />
            <Button label="End session" kind="danger" onPress={() => { store.dispatchSession({ type: 'END_SESSION', atMs: now() }); setCloseOpen(false); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Progress({ state, onPracticeMistakes, onPracticeSaved }: { state: StoreState; onPracticeMistakes: () => void; onPracticeSaved: () => void }) {
  const summary = analyticsSummary(state.attempts);
  const groups = latencyGroups(state.attempts).sort((left, right) => right.eligibleCount - left.eligibleCount);
  const latency = groups[0] ?? { eligibleCount: 0, medianMs: undefined, trendEligible: false, key: undefined };
  const speedAccuracy = latency.key ? speedAccuracyBySession(state.attempts, latency.key) : [];
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const daily = timeByLocalDay(state.sessionHistory, timezone).slice(-7).reverse();
  const mistakes = state.attempts.filter((attempt) => attempt.outcome === 'incorrect').length;
  const savedAvailable = state.savedChallenges.filter(
    (attempt) => !state.contentReports.some(
      (report) => contentVersionKey(report.contentId, report.contentVersion) === contentVersionKey(attempt.contentId, attempt.contentVersion)
    )
  ).length;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>Progress</Text>
      <Text style={styles.heroTitle}>Measured practice, with context</Text>
      <View style={styles.metrics}>
        <Metric value={String(state.sessionHistory.length)} label="sessions" />
        <Metric value={summary.submittedAccuracy === undefined ? '—' : `${Math.round(summary.submittedAccuracy * 100)}%`} label="accuracy" />
        <Metric value={formatClock(summary.activeTaskMs)} label="active time" />
      </View>
      <View style={styles.listCard}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Correct-answer response time</Text>
          <Text style={styles.body}>{latency.medianMs === undefined ? 'Not enough comparable data yet.' : `Median ${(latency.medianMs / 1000).toFixed(1)}s`}</Text>
          <Text style={styles.muted}>{latency.eligibleCount} eligible correct, unassisted answers. Trend requires 20.</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Outcome detail</Text>
      <Text style={styles.body}>{summary.correct} correct · {summary.incorrect} incorrect · {summary.skipped} skipped · {summary.timedOut} timed out · {summary.interrupted} interrupted</Text>
      <Button label={`Practice mistakes (${mistakes})`} kind="secondary" disabled={!mistakes || Boolean(state.activeSession)} onPress={onPracticeMistakes} />
      <Button label={`Practice saved challenges (${savedAvailable})`} kind="secondary" disabled={!savedAvailable || Boolean(state.activeSession)} onPress={onPracticeSaved} />
      <Text style={styles.sectionTitle}>Quick-check coverage</Text>
      {state.assessmentResults.length ? state.assessmentResults.slice(0, 8).map((result) => (
        <View key={result.resultId} style={styles.listCard}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{domains.find((domain) => domain.id === result.domain)?.label ?? result.domain}</Text>
            <Text style={styles.body}>
              {result.accuracy === undefined ? 'No submitted score' : `${Math.round(result.accuracy * 100)}% accuracy`} · n={result.eligibleTrialCount}
            </Text>
            <Text style={styles.muted}>
              {result.interrupted || !result.complete ? 'Incomplete; not eligible as a timed baseline.' : result.isBaseline ? 'Compatible baseline established.' : result.baselineResultId ? 'Compared with its compatible baseline.' : 'Complete result; baseline link unavailable.'}
            </Text>
          </View>
        </View>
      )) : <Text style={styles.muted}>No completed quick-check categories yet. Unassessed categories have no inferred score.</Text>}
      <Text style={styles.sectionTitle}>Speed vs accuracy</Text>
      {speedAccuracy.length ? speedAccuracy.slice(-5).map((point) => (
        <View key={point.sessionId} style={styles.listCard}>
          <Text style={styles.body}>
            {point.accuracy === undefined ? 'No submitted answers' : `${Math.round(point.accuracy * 100)}% accuracy`} · {point.medianCorrectResponseMs === undefined ? 'no correct-time sample' : `${(point.medianCorrectResponseMs / 1000).toFixed(1)}s median`} · n={point.eligibleCount}
          </Text>
        </View>
      )) : <Text style={styles.muted}>Complete comparable sessions in the same family, pace, difficulty, and protocol to see this tradeoff.</Text>}
      <Text style={styles.sectionTitle}>Measured time</Text>
      {daily.length ? daily.map((day) => (
        <View key={day.day} style={styles.listCard}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{day.day}</Text>
            <Text style={styles.muted}>Practice {formatClock(day.practiceActiveMs)} · checks {formatClock(day.checkActiveMs)} · review {formatClock(day.feedbackMs)}</Text>
          </View>
        </View>
      )) : <Text style={styles.muted}>Complete a session to see measured time by day.</Text>}
      <Text style={styles.sectionTitle}>Session history</Text>
      {state.sessionHistory.slice(0, 5).map((session) => (
        <View key={session.sessionId} style={styles.listCard}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{session.kind === 'check' ? 'Progress check' : `${session.pace} ${session.tier}`}</Text>
            <Text style={styles.muted}>{new Date(session.endedAtMs).toLocaleString()} · {session.attemptInstanceIds.length} attempts · {formatClock(session.timing.activeTaskMs)}</Text>
          </View>
        </View>
      ))}
      {state.legacy ? <Text style={styles.notice}>Legacy estimate: {state.legacy.estimatedTrainingMinutes.toFixed(1)} minutes. Exact active time and original responses were not retained.</Text> : null}
    </ScrollView>
  );
}

function Settings({ store, state }: { store: AppStore; state: StoreState }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>Settings</Text>
      <Text style={styles.heroTitle}>Keep the defaults simple</Text>
      <Text style={styles.body}>Pace, difficulty, and categories are selected from Practice. Detailed session controls live under Custom.</Text>
      <View style={styles.listCard}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Current setup</Text>
          <Text style={styles.muted}>{state.preferences.pace} · {state.preferences.tier} · {state.preferences.categories.length} categories</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>About results</Text>
      <Text style={styles.body}>Scores describe your in-app task performance. The app does not claim to diagnose a condition, measure IQ, or prevent cognitive decline.</Text>
      {state.storageError ? <Text accessibilityRole="alert" style={styles.error}>Storage error: {state.storageError}</Text> : null}
      <Button label="Reset local data" kind="danger" onPress={() => setConfirmReset(true)} />
      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Reset PuzzleScroll data?</Text>
            <Text style={styles.muted}>This removes local PuzzleScroll sessions, attempts, preferences, and legacy estimates. It does not touch unrelated browser or app data.</Text>
            <Button label="Cancel" kind="secondary" onPress={() => setConfirmReset(false)} />
            <Button label="Confirm reset" kind="danger" onPress={async () => { await store.resetLocalData(); setConfirmReset(false); }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TabBar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const tabs: { id: Page; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'setup', label: 'Practice', icon: 'play-circle' },
    { id: 'progress', label: 'Progress', icon: 'bar-chart-2' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const active = page === tab.id;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={tab.id} onPress={() => setPage(tab.id)} style={styles.tab}>
            <Feather name={tab.icon} size={20} color={active ? '#294FBF' : '#68738A'} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type LocalE2EScenario = 'final-item' | 'three-misses' | 'long-case';

function requestedLocalE2EScenario(): LocalE2EScenario | undefined {
  if (typeof window === 'undefined' || !window.location) return undefined;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return undefined;
  const candidate = new URLSearchParams(window.location.search).get('__e2e');
  return candidate === 'final-item' || candidate === 'three-misses' || candidate === 'long-case'
    ? candidate
    : undefined;
}

function localE2ESession(scenario: LocalE2EScenario, startedAtMs: number) {
  const fixtureItem = (instanceId: string, prompt = 'Choose the independently verified answer.') => ({
    instanceId,
    contentId: `local-e2e-${scenario}`,
    contentVersion: 1,
    prompt,
    choices: [
      { id: 'correct', label: 'Verified answer' },
      { id: 'wrong', label: 'Wrong option' }
    ],
    correctChoiceIds: ['correct'],
    explanation: 'The fixture answer is independently fixed as Verified answer.',
    domain: 'reasoning' as const,
    pace: scenario === 'long-case' ? 'slow' as const : 'fast' as const,
    tier: scenario === 'long-case' ? 'hard' as const : 'medium' as const,
    responsePolicy: 'ordinary' as const,
    protocolId: 'local-e2e-v1',
    formFamily: 'local-e2e'
  });
  const items = scenario === 'three-misses'
    ? [fixtureItem('miss-1'), fixtureItem('miss-2'), fixtureItem('miss-3'), fixtureItem('must-not-open')]
    : scenario === 'long-case'
      ? [fixtureItem(
        'long-1',
        'Long case. Constraints: every analyst has one day and one lab; each day and lab is used exactly once. Determine the only assignment supported by all rules.'
      )]
      : [fixtureItem('final-1')];
  return createSessionState({
    sessionId: `local-e2e-${scenario}-${Math.floor(startedAtMs)}`,
    kind: 'practice',
    items,
    pace: scenario === 'long-case' ? 'slow' : 'fast',
    tier: scenario === 'long-case' ? 'hard' : 'medium',
    categories: ['reasoning'],
    startedAtMs,
    budgetMs: scenario === 'long-case' ? undefined : 300_000,
    softTargetMs: scenario === 'long-case' ? 900_000 : undefined,
    threeMisses: scenario === 'three-misses'
  });
}

export function PuzzleApp({ store }: { store: AppStore }) {
  const state = useBoundStore(store, (snapshot) => snapshot);
  const [page, setPage] = useState<Page>('home');
  const [setupKind, setSetupKind] = useState<'practice' | 'check'>('practice');
  const e2eInitialized = useRef(false);
  useEffect(() => { void store.hydrate(); }, [store]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return undefined;
    const flush = () => store.flushWritesSync();
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [store]);
  useEffect(() => {
    void registerPuzzleServiceWorker(!state.activeSession).catch(() => undefined);
  }, [state.activeSession]);
  useEffect(() => {
    if (!state.activeSession && page === 'session') setPage('home');
  }, [state.activeSession, page]);
  useEffect(() => {
    if (state.hydration !== 'ready' || e2eInitialized.current) return;
    const scenario = requestedLocalE2EScenario();
    if (!scenario) return;
    e2eInitialized.current = true;
    if (state.activeSession) {
      setPage('session');
      return;
    }
    const marker = `puzzle-scroll-e2e-started:${scenario}`;
    try {
      if (window.sessionStorage.getItem(marker)) return;
    } catch {
      return;
    }
    const session = localE2ESession(scenario, now());
    if (store.startSession(session)) {
      window.sessionStorage.setItem(marker, 'true');
      setPage('session');
    }
  }, [state.hydration, state.activeSession, store]);
  const startAttemptRecords = (records: AttemptRecord[], prefix: 'mistakes' | 'saved') => {
    if (state.activeSession) return;
    if (!records.length) return;
    const seed = now();
    const items = records.map((attempt, index) => ({
      instanceId: `${attempt.instanceId}-${prefix}-${Math.floor(seed)}-${index}`,
      contentId: attempt.contentId,
      contentVersion: attempt.contentVersion,
      prompt: attempt.prompt,
      choices: attempt.displayedChoices.map((choice) => ({ ...choice })),
      correctChoiceIds: [...attempt.correctChoiceIds],
      explanation: attempt.explanation,
      domain: attempt.domain,
      pace: attempt.pace,
      tier: attempt.tier,
      responsePolicy: 'ordinary' as const,
      protocolId: attempt.protocolId,
      formFamily: attempt.formFamily,
      sourceId: attempt.sourceId
    }));
    const first = items[0]!;
    const session = createSessionState({
      sessionId: `${prefix}-${Math.floor(seed)}`,
      kind: 'practice',
      items,
      pace: first.pace,
      tier: first.tier,
      categories: [...new Set(items.map((item) => item.domain))],
      startedAtMs: seed
    });
    if (store.startSession(session)) setPage('session');
  };
  const startMistakes = () => {
    if (state.activeSession) return;
    const seen = new Set<string>();
    const records = state.attempts.filter((attempt) => {
      if (attempt.outcome !== 'incorrect' || !attempt.displayedChoices.length) return false;
      const key = `${attempt.contentId}:v${attempt.contentVersion}`;
      if (state.contentReports.some((report) => contentVersionKey(report.contentId, report.contentVersion) === key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-10);
    startAttemptRecords(records, 'mistakes');
  };
  const startSaved = () => {
    const record = [...state.savedChallenges].reverse().find(
      (attempt) => !state.contentReports.some(
        (report) => contentVersionKey(report.contentId, report.contentVersion) === contentVersionKey(attempt.contentId, attempt.contentVersion)
      )
    );
    if (record) startAttemptRecords([record], 'saved');
  };
  if (state.hydration === 'loading') {
    return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Loading your local progress…</Text></View>;
  }
  if (state.hydration === 'error') {
    return <View style={styles.page}><Text style={styles.heroTitle}>Progress could not be loaded</Text><Text accessibilityRole="alert" style={styles.error}>{state.storageError}</Text></View>;
  }
  if (page === 'session' && state.activeSession) {
    return <SessionView store={store} session={state.activeSession} onHome={() => setPage('home')} />;
  }
  let content;
  if (page === 'home') {
    content = <Home state={state} onPractice={() => { setSetupKind('practice'); setPage('setup'); }} onCheck={() => { setSetupKind('check'); setPage('setup'); }} onResume={() => setPage('session')} />;
  } else if (page === 'setup') {
    content = <Setup store={store} state={state} kind={setupKind} onStarted={() => setPage('session')} onBack={() => setPage('home')} />;
  } else if (page === 'progress') {
    content = <Progress state={state} onPracticeMistakes={startMistakes} onPracticeSaved={startSaved} />;
  } else {
    content = <Settings store={store} state={state} />;
  }
  return (
    <View style={styles.app}>
      <View style={styles.content}>{content}</View>
      <TabBar page={page} setPage={(next) => { if (next === 'setup') setSetupKind('practice'); setPage(next); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#F4F7FC' },
  content: { flex: 1 },
  page: { padding: 20, paddingBottom: 104, gap: 16 },
  sessionPage: { flex: 1, backgroundColor: '#F4F7FC' },
  sessionHeader: { paddingHorizontal: 20, paddingTop: 8 },
  task: { padding: 20, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  headerCopy: { flex: 1 },
  title: { color: '#172033', fontSize: 23, lineHeight: 29, fontWeight: '700' },
  heroTitle: { color: '#172033', fontSize: 31, lineHeight: 38, fontWeight: '700' },
  eyebrow: { color: '#4564BF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionTitle: { color: '#172033', fontSize: 19, lineHeight: 25, fontWeight: '700', marginTop: 8 },
  cardTitle: { color: '#172033', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { color: '#354158', fontSize: 15, lineHeight: 22 },
  muted: { color: '#68738A', fontSize: 14, lineHeight: 20 },
  heroCard: { backgroundColor: '#18243A', borderRadius: 18, padding: 20, gap: 10 },
  heroCardTitle: { color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  heroCardText: { color: '#DCE5F7', fontSize: 15, lineHeight: 21 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF', borderRadius: 14, padding: 14 },
  metricValue: { color: '#172033', fontSize: 21, fontWeight: '700' },
  metricLabel: { color: '#68738A', fontSize: 12, marginTop: 3 },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF', borderRadius: 14, padding: 16 },
  flex: { flex: 1 },
  button: { minHeight: 48, backgroundColor: '#315BD4', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFCBE0' },
  buttonDanger: { backgroundColor: '#FFF5F2', borderWidth: 1, borderColor: '#C8533B' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonTextDark: { color: '#25324A' },
  disabled: { opacity: 0.45 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF', alignItems: 'center', justifyContent: 'center' },
  group: { gap: 9 },
  groupLabel: { color: '#28354C', fontSize: 14, fontWeight: '700' },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: '#C7D2E5', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentActive: { backgroundColor: '#315BD4', borderColor: '#315BD4' },
  segmentText: { color: '#28354C', fontWeight: '600' },
  segmentTextActive: { color: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#C7D2E5', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 12 },
  chipActive: { borderColor: '#315BD4', backgroundColor: '#EAF0FF' },
  chipText: { color: '#536079', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#294FBF' },
  sessionNote: { color: '#354158', backgroundColor: '#EDF2FA', borderRadius: 12, padding: 14, lineHeight: 21 },
  notice: { color: '#365286', backgroundColor: '#ECF2FF', borderRadius: 10, padding: 12, lineHeight: 19 },
  error: { color: '#A53C2A', backgroundColor: '#FFF1ED', borderRadius: 10, padding: 12, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,40,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, gap: 12 },
  toggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#C9D1DF', padding: 3 },
  switchTrackOn: { backgroundColor: '#315BD4' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  taskPrompt: { color: '#172033', fontSize: 22, lineHeight: 30, fontWeight: '700', marginBottom: 12 },
  textInput: { minHeight: 52, marginTop: 14, borderWidth: 1, borderColor: '#BFCBE0', borderRadius: 12, backgroundColor: '#FFFFFF', color: '#172033', fontSize: 16, lineHeight: 22, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: 'top' },
  choiceList: { gap: 10, marginTop: 18 },
  choice: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: '#C7D2E5', backgroundColor: '#FFFFFF', padding: 14, justifyContent: 'center' },
  choiceSelected: { borderColor: '#315BD4', backgroundColor: '#EAF0FF' },
  choiceText: { color: '#28354C', fontSize: 15, lineHeight: 21 },
  choiceTextSelected: { color: '#2449B4', fontWeight: '700' },
  feedback: { marginTop: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF', borderRadius: 14, padding: 16, gap: 8 },
  success: { color: '#14734F' },
  failure: { color: '#B24732' },
  reviewCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF', borderRadius: 14, padding: 16, gap: 7 },
  tabs: { minHeight: 70, flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DCE3EF', paddingBottom: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabText: { color: '#68738A', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#294FBF' }
});
