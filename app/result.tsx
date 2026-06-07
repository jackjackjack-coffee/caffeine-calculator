import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/app-context';
import { colors, radius, spacing } from '../lib/theme';
import { addIntake } from '../lib/store';
import { methodLabel } from '../lib/i18n';
import type { AnalysisResult } from '../lib/types';

export default function ResultScreen() {
  const { t, locale } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ data?: string }>();

  const parsed = useMemo<AnalysisResult | null>(() => {
    if (!params.data) return null;
    try {
      return JSON.parse(params.data) as AnalysisResult;
    } catch {
      return null;
    }
  }, [params.data]);

  const [mg, setMg] = useState(parsed ? String(Math.round(parsed.caffeine_mg)) : '0');
  const [name, setName] = useState(parsed?.product_name ?? '');
  const [saving, setSaving] = useState(false);

  if (!parsed) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textDim} />
        <Text style={styles.dim}>{t('result.error')}</Text>
        <Pressable style={styles.secondary} onPress={() => router.replace('/camera')}>
          <Text style={styles.secondaryText}>{t('result.retake')}</Text>
        </Pressable>
      </View>
    );
  }

  const drink = parsed; // non-null past the guard above
  const confidencePct = Math.round((drink.confidence ?? 0) * 100);

  async function onAdd() {
    setSaving(true);
    await addIntake({
      caffeine_mg: Number(mg) || 0,
      product_name: name.trim() || t('result.product'),
      method: drink.method,
    });
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Caffeine hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('result.caffeine')}</Text>
          <Text style={styles.heroValue}>
            {Math.round(Number(mg) || 0)}
            <Text style={styles.heroUnit}> {t('common.mg')}</Text>
          </Text>
          <View style={styles.badge}>
            <Ionicons name="sparkles-outline" size={13} color={colors.accent} />
            <Text style={styles.badgeText}>{methodLabel(locale, parsed.method)}</Text>
          </View>
          {parsed.confidence != null && (
            <Text style={styles.confidence}>{t('result.confidence', { pct: confidencePct })}</Text>
          )}
        </View>

        {/* How we got this */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('result.how')}</Text>
          {parsed.source ? (
            <Text style={styles.cardText}>{t('result.source', { source: parsed.source })}</Text>
          ) : null}
          {parsed.serving_ml ? (
            <Text style={styles.cardText}>{parsed.serving_ml} mL</Text>
          ) : null}
          {parsed.source_text ? (
            <Text style={styles.sourceText}>“{parsed.source_text}”</Text>
          ) : null}
        </View>

        {/* Editable fields */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('result.product')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textDim}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('result.edit')}</Text>
          <TextInput
            style={styles.input}
            value={mg}
            onChangeText={setMg}
            keyboardType="numeric"
            placeholderTextColor={colors.textDim}
          />
        </View>

        <Pressable style={styles.primary} onPress={onAdd} disabled={saving}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accentText} />
          <Text style={styles.primaryText}>{t('result.add')}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>{t('result.retake')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, textAlign: 'center' },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  heroLabel: { color: colors.textDim, fontSize: 14 },
  heroValue: { color: colors.accent, fontSize: 60, fontWeight: '800', lineHeight: 66 },
  heroUnit: { fontSize: 22, color: colors.textDim, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  confidence: { color: colors.textDim, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTitle: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  cardText: { color: colors.text, fontSize: 14 },
  sourceText: { color: colors.textDim, fontSize: 13, fontStyle: 'italic' },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  secondary: { padding: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.textDim, fontSize: 15 },
});
