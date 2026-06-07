// App-wide context: loads the user profile from SQLite and exposes the active
// locale + a bound translate function `t`.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import type { Locale, UserProfile } from './types';
import { DEFAULT_PROFILE, getProfile, saveProfile as persistProfile } from './store';
import { translate } from './i18n';

interface AppContextValue {
  profile: UserProfile;
  loading: boolean;
  /** true once the user has saved a profile at least once. */
  hasProfile: boolean;
  setProfile: (p: UserProfile) => Promise<void>;
  reload: () => Promise<void>;
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function deviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en';
  } catch {
    return 'en';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>({
    ...DEFAULT_PROFILE,
    locale: deviceLocale(),
  });
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const stored = await getProfile();
      if (stored) {
        setProfileState(stored);
        setHasProfile(true);
      } else {
        setProfileState({ ...DEFAULT_PROFILE, locale: deviceLocale() });
        setHasProfile(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setProfile = useCallback(async (p: UserProfile) => {
    await persistProfile(p);
    setProfileState(p);
    setHasProfile(true);
  }, []);

  const locale = profile.locale;
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<AppContextValue>(
    () => ({ profile, loading, hasProfile, setProfile, reload, locale, t }),
    [profile, loading, hasProfile, setProfile, reload, locale, t]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
