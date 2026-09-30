/**
 * Opt-in development utility. MainMenu only loads this module behind the
 * capture gate; this component checks the same gate again for direct mounts.
 */
import React, { useMemo, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import GameScreen from '../scenes/GameScreen';
import ShowMeDemo from '../scenes/ShowMeDemo';
import AchievementsScreen from '../scenes/AchievementsScreen';
import SettingsScreen from '../scenes/SettingsScreen';
import StatsScreen from '../scenes/StatsScreen';
import { isCaptureStudioEnabled } from './captureGate';
import {
  CAPTURE_SCENARIOS, createCaptureInitialState, createCaptureRng,
} from './captureScenarios';
import {
  CAPTURE_ACHIEVEMENTS_FIXTURE, CAPTURE_STATS_FIXTURE,
} from './captureFixtures';

const GROUPS = ['GAMEPLAY', 'POWERUPS', 'BOSSES', 'PRESENTATION', 'SCREENS'];
const SCREEN_SHORTCUTS = [
  { id: 'main_menu', group: 'SCREENS', label: 'MAIN MENU', description: 'Return to the real main menu.' },
  { id: 'show_me', group: 'SCREENS', label: 'SHOW ME', description: 'Open the real practice replay.' },
  { id: 'achievements', group: 'SCREENS', label: 'ACHIEVEMENTS', description: 'Display saved local progress.' },
  { id: 'achievements_fixture', group: 'SCREENS', label: 'ACHIEVEMENTS — REPRESENTATIVE PROGRESS', description: 'In-memory capture fixture; saved progress is unchanged.' },
  { id: 'settings', group: 'SCREENS', label: 'SETTINGS', description: 'Open the real settings screen.' },
  { id: 'stats', group: 'SCREENS', label: 'STATS', description: 'Display saved local history.' },
  { id: 'stats_fixture', group: 'SCREENS', label: 'STATS — REPRESENTATIVE HISTORY', description: 'In-memory capture fixture; saved history is unchanged.' },
];

function StudioButton({ label, onPress, testID, secondary = false }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, secondary && styles.secondaryButton]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CaptureGameplay({ scenarioId, attempt, timeScale, chromeVisible, onReset, onReturn, onChromeVisible, onTimeScale }) {
  const { width, height } = useWindowDimensions();
  // A remount after Reset creates a fresh snapshot and two independent seeded
  // streams. Stars must never consume the simulation's random sequence.
  const capture = useMemo(() => {
    // Keep even entity/event IDs identical across resets. The keyed remount
    // discards the previous session before creating the next one.
    const { state, seed } = createCaptureInitialState(scenarioId, width, height, 1000);
    return {
      initialState: state,
      random: createCaptureRng(seed),
      starRandom: createCaptureRng(seed ^ 0x9e3779b9),
    };
  }, [scenarioId, attempt, width, height]);

  return (
    <View style={styles.gameHost}>
      <GameScreen
        key={`${scenarioId}:${attempt}:${width}:${height}`}
        onExit={onReturn}
        showFirstPlayCue={false}
        captureSession={{ ...capture, timeScale, onReset }}
      />
      {chromeVisible ? (
        <View style={styles.capturePanel} testID="capture-controls">
          <Text style={styles.panelTitle}>DEV · CAPTURE</Text>
          <Text style={styles.panelSubtitle}>{scenarioId.replace(/_/g, ' ').toUpperCase()}</Text>
          <StudioButton testID="capture-freeze" label={timeScale === 0 ? 'RESUME CAPTURE' : 'PAUSE CAPTURE'} onPress={() => onTimeScale(timeScale === 0 ? 1 : 0)} secondary />
          <View style={styles.speedRow}>
            <StudioButton testID="capture-half-speed" label="0.5x" onPress={() => onTimeScale(0.5)} secondary />
            <StudioButton testID="capture-normal-speed" label="1.0x" onPress={() => onTimeScale(1)} secondary />
          </View>
          <StudioButton testID="capture-reset" label="RESET SCENARIO" onPress={onReset} secondary />
          <StudioButton testID="capture-return" label="RETURN TO CAPTURE STUDIO" onPress={onReturn} secondary />
          <StudioButton testID="capture-hide" label="CAPTURE HUD: OFF" onPress={() => onChromeVisible(false)} secondary />
          <Text style={styles.panelHint}>Tap the upper-left corner to restore controls.</Text>
        </View>
      ) : (
        // Deliberately transparent: clean captures show only production gameplay.
        <TouchableOpacity
          testID="capture-reveal-hotspot"
          style={styles.revealHotspot}
          onPress={() => onChromeVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Capture HUD: ON"
        />
      )}
    </View>
  );
}

function CaptureStudioEnabled({ onBack }) {
  const [route, setRoute] = useState(null);
  const [timeScale, setTimeScale] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);

  const returnToCatalog = () => {
    setRoute(null);
    setTimeScale(1);
    setChromeVisible(true);
  };
  const resetScenario = () => {
    setRoute(current => current?.kind === 'game' ? { ...current, attempt: current.attempt + 1 } : current);
    setTimeScale(1);
    setChromeVisible(true);
  };
  const launchScenario = id => {
    setTimeScale(1);
    setChromeVisible(true);
    setRoute({ kind: 'game', id, attempt: 0 });
  };
  const launchScreen = id => {
    if (id === 'main_menu') { onBack(); return; }
    setRoute({ kind: 'screen', id });
  };

  if (route?.kind === 'game') {
    return <CaptureGameplay
      key={`${route.id}:${route.attempt}`}
      scenarioId={route.id}
      attempt={route.attempt}
      timeScale={timeScale}
      chromeVisible={chromeVisible}
      onReset={resetScenario}
      onReturn={returnToCatalog}
      onChromeVisible={setChromeVisible}
      onTimeScale={setTimeScale}
    />;
  }
  if (route?.kind === 'screen') {
    switch (route.id) {
      case 'show_me':
        return <ShowMeDemo onBack={returnToCatalog} onPlay={() => launchScenario('stage1_early')} />;
      case 'achievements':
        return <AchievementsScreen onBack={returnToCatalog} />;
      case 'achievements_fixture':
        return <AchievementsScreen onBack={returnToCatalog} captureFixture={CAPTURE_ACHIEVEMENTS_FIXTURE} />;
      case 'settings':
        return <SettingsScreen onBack={returnToCatalog} />;
      case 'stats':
        return <StatsScreen onBack={returnToCatalog} />;
      case 'stats_fixture':
        return <StatsScreen onBack={returnToCatalog} captureFixture={CAPTURE_STATS_FIXTURE} />;
      default:
        return null;
    }
  }
  return (
    <View style={styles.catalog} testID="capture-catalog">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DEVELOPMENT TOOL · LOCAL ONLY</Text>
        <Text style={styles.title}>CAPTURE STUDIO</Text>
        <Text style={styles.intro}>Launch real game scenes from repeatable starting states. No screenshots are taken automatically.</Text>
        <StudioButton testID="capture-back-menu" label="BACK TO MENU" onPress={onBack} secondary />
      </View>
      <ScrollView style={styles.catalogScroll} contentContainerStyle={styles.catalogContent}>
        {GROUPS.map(group => {
          const entries = group === 'SCREENS'
            ? SCREEN_SHORTCUTS
            : CAPTURE_SCENARIOS.filter(scenario => scenario.group === group);
          return <View key={group} style={styles.group}>
            <Text style={styles.groupTitle}>{group}</Text>
            {entries.map(entry => <View key={entry.id} style={styles.entry}>
              <Text style={styles.entryDescription}>{entry.description}</Text>
              <StudioButton
                testID={`capture-launch-${entry.id}`}
                label={entry.label}
                onPress={() => group === 'SCREENS' ? launchScreen(entry.id) : launchScenario(entry.id)}
              />
            </View>)}
          </View>;
        })}
        <Text style={styles.footer}>Capture fixtures stay in memory. Saved local progress is not replaced.</Text>
      </ScrollView>
    </View>
  );
}

export default function CaptureStudio(props) {
  if (!isCaptureStudioEnabled()) return null;
  return <CaptureStudioEnabled {...props} />;
}

const styles = StyleSheet.create({
  catalog: { flex: 1, backgroundColor: '#08111f' },
  header: { paddingTop: 54, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  eyebrow: { color: '#f97316', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#f8fafc', fontSize: 27, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  intro: { color: '#94a3b8', fontSize: 13, lineHeight: 19, marginVertical: 12 },
  catalogScroll: { flex: 1 },
  catalogContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 48 },
  group: { marginTop: 18 },
  groupTitle: { color: '#38bdf8', fontSize: 17, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  entry: { backgroundColor: '#111e30', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#26384f' },
  entryDescription: { color: '#aebfd3', fontSize: 12, marginBottom: 8 },
  button: { backgroundColor: '#f97316', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: '#183047', borderWidth: 1, borderColor: '#4c708f' },
  buttonText: { color: '#091320', fontSize: 12, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center' },
  secondaryButtonText: { color: '#e0f2fe' },
  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 14 },
  gameHost: { flex: 1, backgroundColor: '#020617' },
  capturePanel: { position: 'absolute', top: 96, right: 8, width: 176, backgroundColor: 'rgba(4,14,28,0.92)', borderColor: '#fb923c', borderWidth: 1, borderRadius: 9, padding: 8, gap: 5 },
  panelTitle: { color: '#fb923c', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  panelSubtitle: { color: '#cbd5e1', fontSize: 10, marginBottom: 4 },
  panelHint: { color: '#8ca3bc', fontSize: 9, marginTop: 2 },
  speedRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  revealHotspot: { position: 'absolute', top: 48, left: 0, width: 44, height: 44, backgroundColor: 'transparent' },
});
