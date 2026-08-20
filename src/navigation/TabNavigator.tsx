import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { StackActions } from "@react-navigation/native";
import { useRef } from "react";
import { PanResponder, View } from "react-native";

import AccountStack from "./AccountStack";
import HomeScreen from "../screens/HomeScreen";
import { useSettings } from "../context/SettingsContext";
import { RootTabParamList } from "../types";
import { getTabIcon } from "../utils/icons";
import LibraryStack from "./LibraryStack";
import StatsScreen from "../screens/StatsScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  const { colors } = useSettings();
  const navigation = useNavigation();
  const routes: (keyof RootTabParamList)[] = ["Home", "Biblioteca", "Estatísticas", "Conta"];
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 40 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < 70 && Math.abs(gesture.vx) < 0.7) return;

        const rootState = navigation.getState();
        const mainRoute = rootState?.routes.find((route) => route.name === "Main") as
          | { state?: { index?: number; routes?: Array<{ name?: string; state?: { index?: number; routes?: Array<{ name?: string }> } }> } }
          | undefined;
        const activeTab = mainRoute?.state?.routes?.[mainRoute.state.index ?? 0];
        const nestedRoute = activeTab?.state?.routes?.[activeTab.state.index ?? 0]?.name;
        if (nestedRoute === "FlashcardStudy") return;
        const currentIndex = routes.indexOf(activeTab?.name as keyof RootTabParamList);
        const nextIndex = gesture.dx < 0 ? currentIndex + 1 : currentIndex - 1;
        const nextRoute = routes[nextIndex];
        if (nextRoute) {
          const destination = mainRoute?.state?.routes?.find((route) => route.name === nextRoute) as
            | { key?: string; state?: { key?: string } }
            | undefined;
          const destinationStackKey = destination?.state?.key;
          if (destinationStackKey) {
            navigation.dispatch({
              ...StackActions.popToTop(),
              target: destinationStackKey,
            });
          }
          (navigation as any).navigate("Main", { screen: nextRoute });
        }
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
    }),
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) =>
          getTabIcon(route.name, focused, color, size),
      })}
      >
        <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home" }}
        />
        <Tab.Screen
        name="Biblioteca"
        component={LibraryStack}
        options={{ tabBarLabel: "Biblioteca" }}
        />
        <Tab.Screen
        name="Estatísticas"
        component={StatsScreen}
        options={{ tabBarLabel: "Stats" }}
        />
        <Tab.Screen
        name="Conta"
        component={AccountStack}
        options={{ tabBarLabel: "Conta" }}
        />
      </Tab.Navigator>
    </View>
  );
}
