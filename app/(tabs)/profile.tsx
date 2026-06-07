import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../../lib/app-context';
import { colors, radius, spacing } from '../../lib/theme';
import { dailyLimit } from '../../lib/halflife';
import type { Locale } from '../../lib/types';

export default function ProfileScreen() {
  const { t, profile, setProfile } = useApp();

  const [weight, setWeight] = useState(String(profile.weight_kg));
  const [age, setAge] = useState(String(profile.age));
  const [pregnant, setPregnant] = useState(profile.is_pregnant);
  const [halfLife, setHalfLife] = useState(String(profile.half_life_hours));
  const [locale, setLocale] = useState<Locale>(profile.locale);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setWeight(String(profile.weight_kg));
    setAge(String(profile.age));
    setPregnant(profile.is_pregnant);
    setHalfLife(String(profile.half_life_hours));
    setLocale(profile.locale);
  }, [profile]);

  const draft = {
    weight_kg: Number(weight) || 0,
    age: Number(age) || 0,
    is_pregnant: pregnant,
  };
  const limit = dailyLimit(draft);

  async function onSave() {
    await setProfile({
      weight_kg: Number(weight) || 65,
      age: Number(age) || 30,
      is_pregnant: pregnant,
      half_life_hours: Number(halfLife) || 5,
      locale,
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Computed limit */}
        <View style={styles.limitCard}>
          <Text style={styles.limitLabel}>{t('profile.yourLimit')}</Text>
          <Text style={styles.limitValue}>
            {limit.dailyLimitMg} {t('common.mg')}
          </Text>
          <Text style={styles.limitBasis}>{t(`profile.basis.${limit.basis}`)}</Text>
        </View>

        <Field label={t('profile.weight')}>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholderTextColor={colors.textDim}
          />
        </Field>

        <Field label={t('profile.age')}>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholderTextColor={colors.textDim}
          />
        </Field>

        <View style={styles.rowField}>
          <Text style={styles.label}>{t('profile.pregnant')}</Text>
          <Switch
            value={pregnant}
            onValueChange={setPregnant}
            trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
            thumbColor={colors.text}
          />
        </View>

        <Field label={t('profile.halfLife')} hint={t('profile.halfLifeHint')}>
          <TextInput
            style={styles.input}
            value={halfLife}
            onChangeText={setHalfLife}
            keyboardType="numeric"
            placeholderTextColor={colors.textDim}
          />
        </Field>

        <Field label={t('profile.locale')}>
          <View style={styles.segment}>
            {(['en', 'ko'] as Locale[]).map((loc) => (
              <Pressable
                key={loc}
                style={[styles.segmentItem, locale === loc && styles.segmentItemActive]}
                onPress={() => setLocale(loc)}
              >
                <Text style={[styles.segmentText, locale === loc && styles.segmentTextActive]}>
                  {loc === 'en' ? 'English' : '한국어'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Pressable style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveText}>{justSaved ? t('profile.saved') : t('profile.save')}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>{t('profile.disclaimer')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md },
  limitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitLabel: { color: colors.textDim, fontSize: 14 },
  limitValue: { color: colors.accent, fontSize: 40, fontWeight: '800' },
  limitBasis: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
  field: { gap: spacing.xs },
  rowField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentItem: { flex: 1, padding: spacing.md, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textDim, fontWeight: '600' },
  segmentTextActive: { color: colors.accentText },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  disclaimer: { color: colors.textDim, fontSize: 11, textAlign: 'center', opacity: 0.7 },
});
