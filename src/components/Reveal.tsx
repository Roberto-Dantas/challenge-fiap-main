import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { AnimatedMotiView } from "./AnimatedMotiView";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Reveal({ children, delay = 0, style }: RevealProps) {
  return (
    <AnimatedMotiView
      from={{ opacity: 0, translateY: 26, scale: 0.96 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 14, stiffness: 115, delay }}
      style={style}
    >{children}</AnimatedMotiView>
  );
}
