import { Pressable, type PressableProps } from "react-native";

export function AnimatedMotiPressable(props: PressableProps & Record<string, unknown>) {
  const { animate: _animate, transition: _transition, from: _from, exit: _exit, style, ...pressableProps } = props;
  return (
    <Pressable
      {...pressableProps}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        { transform: [{ scale: state.pressed ? 0.975 : 1 }] },
      ]}
    />
  );
}
