import Svg, { Path } from "react-native-svg";

const CENTER = 9;
const RADIUS = 7;
const DOMAIN = 1.5;

type HealthArcProps = {
  health: number;
  width: number;
  height: number;
  track: string;
  fill: string;
};

export function HealthArc({ health, width, height, track, fill }: HealthArcProps) {
  const fraction = Math.max(0.02, Math.min(1, (health - 1) / DOMAIN));
  const angle = Math.PI * (1 - fraction);
  const endX = CENTER + RADIUS * Math.cos(angle);
  const endY = CENTER - RADIUS * Math.sin(angle);

  return (
    <Svg width={width} height={height} viewBox="0 0 18 10">
      <Path d="M2 9 A7 7 0 0 1 16 9" stroke={track} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d={`M2 9 A7 7 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`} stroke={fill} strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
