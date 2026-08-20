import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { colors as lightColors } from "../theme/colors";
import { darkColors } from "../theme/darkColors";
import { ThemeMode } from "../types";

const STORAGE_KEY = "@notez/settings";

interface SettingsState {
  notificationsEnabled: boolean;
  theme: ThemeMode;
  goalPeriod: "daily" | "monthly";
  dailyGoal: number;
  monthlyGoal: number;
}

interface SettingsContextValue extends SettingsState {
  colors: typeof lightColors;
  setNotificationsEnabled: (value: boolean) => void;
  setTheme: (value: ThemeMode) => void;
  goalPeriod: "daily" | "monthly";
  dailyGoal: number;
  monthlyGoal: number;
  setGoalPeriod: (value: "daily" | "monthly") => void;
  setDailyGoal: (value: number) => void;
  setMonthlyGoal: (value: number) => void;
}

const DEFAULT_STATE: SettingsState = {
  notificationsEnabled: true,
  theme: "light",
  goalPeriod: "daily",
  dailyGoal: 20,
  monthlyGoal: 600,
};

const MAX_DAILY_GOAL = 1000;
const MAX_MONTHLY_GOAL = 100000;

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(DEFAULT_STATE);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setState({ ...DEFAULT_STATE, ...JSON.parse(stored) });
        }
      } catch (error) {
        console.warn("Falha ao carregar preferências", error);
      }
    })();
  }, []);

  const persist = useCallback((next: SettingsState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error) =>
      console.warn("Falha ao salvar preferências", error),
    );
  }, []);

  const setNotificationsEnabled = useCallback(
    (value: boolean) => persist({ ...state, notificationsEnabled: value }),
    [state, persist],
  );

  const setTheme = useCallback(
    (value: ThemeMode) => persist({ ...state, theme: value }),
    [state, persist],
  );

  const setGoalPeriod = useCallback(
    (value: "daily" | "monthly") => persist({ ...state, goalPeriod: value }),
    [state, persist],
  );

  const setDailyGoal = useCallback(
    (value: number) => persist({ ...state, dailyGoal: Math.min(MAX_DAILY_GOAL, Math.max(1, Math.round(value))) }),
    [state, persist],
  );

  const setMonthlyGoal = useCallback(
    (value: number) => persist({ ...state, monthlyGoal: Math.min(MAX_MONTHLY_GOAL, Math.max(1, Math.round(value))) }),
    [state, persist],
  );

  const value = useMemo(
    () => ({
      ...state,
      colors: state.theme === "dark" ? darkColors : lightColors,
      setNotificationsEnabled,
      setTheme,
      setGoalPeriod,
      setDailyGoal,
      setMonthlyGoal,
    }),
    [state, setNotificationsEnabled, setTheme, setGoalPeriod, setDailyGoal, setMonthlyGoal],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }

  return context;
}
