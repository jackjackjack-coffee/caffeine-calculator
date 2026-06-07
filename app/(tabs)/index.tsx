import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/app-context';
import { colors, radius, spacing } from '../../lib/theme';
import { getIntakeSince } from '../../lib/store';
import { caffeineInSystem, dailyLimit, hoursUntilBelow, totalBetween } from '../../lib/halflife';
import { methodLabel } from '../../lib/i18n';
import type { IntakeEntry } from '../../lib/types';

const HOUR_MS = 3_600_000;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function HomeScreen() {
  const { t, profile, locale } = useApp();
  const router = useRouter();
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await getIntakeSince(Date.now() - 48 * HOUR_MS);
        if (active) {
          setEntries(rows);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const now = Date.now();
  const todayTotal = Math.round(totalBetween(entries, startOfToday(), now + 1));
  const inSystem = Math.round(caffeineInSystem(entries, now, profile.half_life_hours));
  const limit = dailyLimit(profile).dailyLimitMg;
  const remaining = Math.max(0, limit - todayTotal);
  const pct = Math.min(1, limit > 0 ? todayTotal / limit : 0);
  const over = todayTotal > limit;
  const hoursToSleep = hoursUntilBelow(entries, now, 50, profile.half_life_hours);
  const todayEntries = entries.filter((e) => e.consumed_at >= startOfToday());

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* In-system hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{t('home.inSystem')}</Text>
        <Text style={styles.heroValue}>
          {inSystem}
          <Text style={styles.heroUnit}> {t('common.mg')}</Text>
        </Text>
        <Text style={styles.heroSub}>
          {inSystem > 50 ? t('home.sleepSafe', { hours: hoursToSleep }) : t('home.sleepNow')}
        </Text>
      </View>

      {/* Today vs limit */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('home.today')}</Text>
        <Text style={[styles.bigNumber, over && { color: colors.danger }]}>
          {t('home.ofLimit', { current: todayTotal, limit })}
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct * 100}%`, backgroundColor: over ? colors.danger : colors.accent },
            ]}
          />
        </View>
        <Text style={[styles.cardSub, over && { color: colors.danger }]}>
          {over ? t('home.overLimit') : t('home.remaining', { mg: remaining })}
        </Text>
      </View>

      {/* Scan CTA */}
      <Pressable style={styles.scanButton} onPress={() => router.push('/camera')}>
        <Ionicons name="camera" size={22} color={colors.accentText} />
        <Text style={styles.scanText}>{t('home.scan')}</Text>
      </Pressable>

      {/* Today's entries */}
      {todayEntries.length === 0 ? (
        <Text style={styles.empty}>{t('home.empty')}</Text>
      ) : (
        <View style={styles.card}>
          {todayEntries.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName} numberOfLines={1}>
                  {e.product_name}
                </Text>
                <Text style={styles.entryMeta}>
                  {methodLabel(locale, e.method)} ·{' '}
                  {new Date(e.consumed_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.entryMg}>
                {Math.round(e.caffeine_mg)} {t('common.mg')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>{t('home.disclaimerShort')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLabel: { color: colors.textDim, fontSize: 14 },
  heroValue: { color: colors.accent, fontSize: 64, fontWeight: '800', lineHeight: 70 },
  heroUnit: { fontSize: 24, color: colors.textDim, fontWeight: '600' },
  heroSub: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.textDim, fontSize: 14 },
  bigNumber: { color: colors.text, fontSize: 28, fontWeight: '700' },
  cardSub: { color: colors.textDim, fontSize: 13 },
  barTrack: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5 },
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scanText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  entryMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  entryMg: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', paddingVertical: spacing.lg },
  disclaimer: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.7,
  },
});
