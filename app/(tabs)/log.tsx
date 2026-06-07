import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/app-context';
import { colors, radius, spacing } from '../../lib/theme';
import { deleteIntake, getIntakeSince } from '../../lib/store';
import { dailyLimit } from '../../lib/halflife';
import { methodLabel } from '../../lib/i18n';
import type { IntakeEntry } from '../../lib/types';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function LogScreen() {
  const { t, profile, locale } = useApp();
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await getIntakeSince(Date.now() - 8 * DAY_MS);
    setEntries(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const limit = dailyLimit(profile).dailyLimitMg;

  // Build last-7-days totals (oldest -> newest).
  const todayStart = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayStart = todayStart - (6 - i) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const total = entries
      .filter((e) => e.consumed_at >= dayStart && e.consumed_at < dayEnd)
      .reduce((s, e) => s + e.caffeine_mg, 0);
    return { dayStart, total: Math.round(total) };
  });
  const maxScale = Math.max(limit, ...days.map((d) => d.total), 1);

  function confirmDelete(entry: IntakeEntry) {
    Alert.alert(entry.product_name, `${Math.round(entry.caffeine_mg)} ${t('common.mg')}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('log.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteIntake(entry.id);
          load();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Weekly chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('log.weekly')}</Text>
        <Text style={styles.limitLine}>{t('log.limitLine', { limit })}</Text>
        <View style={styles.chart}>
          {days.map((d) => {
            const h = Math.max(2, (d.total / maxScale) * 100);
            const over = d.total > limit;
            const isToday = d.dayStart === todayStart;
            return (
              <View key={d.dayStart} style={styles.chartCol}>
                <Text style={styles.chartValue}>{d.total || ''}</Text>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${h}%`, backgroundColor: over ? colors.danger : colors.accent },
                    ]}
                  />
                </View>
                <Text style={[styles.chartDay, isToday && { color: colors.accent }]}>
                  {new Date(d.dayStart).toLocaleDateString(locale, { weekday: 'short' })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Entries */}
      <Text style={styles.sectionTitle}>{t('log.daily')}</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{t('log.empty')}</Text>
      ) : (
        <View style={styles.card}>
          {entries.map((e) => (
            <Pressable
              key={e.id}
              style={styles.entryRow}
              onLongPress={() => confirmDelete(e)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName} numberOfLines={1}>
                  {e.product_name}
                </Text>
                <Text style={styles.entryMeta}>
                  {methodLabel(locale, e.method)} ·{' '}
                  {new Date(e.consumed_at).toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.entryMg}>
                {Math.round(e.caffeine_mg)} {t('common.mg')}
              </Text>
              <Pressable hitSlop={10} onPress={() => confirmDelete(e)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.textDim} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  limitLine: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 160, marginTop: spacing.md },
  chartCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartValue: { color: colors.textDim, fontSize: 10, marginBottom: 2 },
  chartBarTrack: { width: 18, height: 110, justifyContent: 'flex-end' },
  chartBar: { width: 18, borderRadius: 4 },
  chartDay: { color: colors.textDim, fontSize: 11, marginTop: spacing.xs },
  sectionTitle: { color: colors.textDim, fontSize: 14, marginTop: spacing.xs },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  entryMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  entryMg: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  deleteBtn: { padding: spacing.xs },
  empty: { color: colors.textDim, textAlign: 'center', paddingVertical: spacing.lg },
});
