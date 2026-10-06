import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// The brand gradient, lifted in brightness so the mark stays readable on the purple, teal and pink space headers as well as on
// light surfaces. Same two hues and the same shape, with no background behind it.
const MARK_START = "#FF7679";
const MARK_END = "#A88BFF";

// The logo's own gradient, sampled from the brand favicon, at full strength. Used where the mark sits on a dark backing.
const LOGO_START = "#F6535D";
const LOGO_END = "#7038E6";

const SHAPE =
  "M133.2 18.6 L130.2 18.7 L126.1 19.2 L121.2 21.2 L118.2 23.1 L14.9 102.0 L14.6 102.5 L15.1 103.2 L38.4 116.8 L39.2 117.2 L39.9 117.1 L122.6 54.1 L123.9 53.4 L124.5 53.5 L110.8 152.2 L109.7 158.0 L109.3 158.1 L108.2 157.2 L87.0 144.9 L86.1 144.8 L85.0 145.3 L59.9 164.5 L59.1 164.6 L58.8 164.1 L62.7 136.1 L63.1 131.5 L62.0 130.5 L40.1 118.1 L39.6 118.6 L32.2 171.5 L31.9 175.2 L32.1 179.9 L33.2 183.9 L35.2 187.6 L38.5 191.3 L41.5 193.6 L46.0 195.7 L50.5 196.6 L54.0 196.6 L58.8 195.6 L61.0 194.7 L64.5 192.7 L109.0 158.8 L109.6 158.8 L109.8 159.8 L102.2 213.5 L102.0 216.2 L102.3 219.2 L103.2 222.9 L104.3 225.6 L106.3 228.9 L109.4 232.2 L112.5 234.6 L116.4 236.5 L122.4 237.9 L127.2 237.7 L131.2 236.8 L134.0 235.6 L137.5 233.5 L240.8 154.5 L241.2 153.8 L240.7 153.1 L219.2 140.7 L216.0 138.5 L216.6 136.2 L223.7 85.1 L224.0 79.0 L223.7 76.0 L222.8 73.0 L220.7 68.9 L217.6 65.3 L213.6 62.4 L211.1 61.2 L208.2 60.3 L204.6 59.9 L199.2 60.2 L196.1 61.2 L193.8 62.3 L185.4 68.3 L146.8 97.9 L146.2 97.8 L146.0 96.9 L153.7 43.1 L153.9 40.2 L153.6 37.1 L152.8 33.8 L151.6 30.9 L149.5 27.4 L146.5 24.2 L144.0 22.2 L140.1 20.2 L136.9 19.1Z M196.7 91.9 L197.1 92.6 L193.2 120.4 L192.9 125.0 L193.5 125.7 L215.0 138.2 L215.7 138.8 L215.6 139.5 L132.6 202.9 L131.7 203.0 L131.4 202.2 L145.1 104.2 L146.0 99.0 L146.4 98.7 L147.0 98.8 L169.0 111.6 L169.8 111.8 L195.9 92.1Z";

type VannaMarkProps = {
  size?: number;
  tone?: "lifted" | "logo";
};

export function VannaMark({ size = 32, tone = "lifted" }: VannaMarkProps) {
  const id = `vannaMark-${tone}`;
  const logo = tone === "logo";
  return (
    <Svg accessibilityLabel="Vanna" width={size} height={size} viewBox="11 12 232 232">
      <Defs>
        <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">
          <Stop offset="0" stopColor={logo ? LOGO_START : MARK_START} />
          <Stop offset="1" stopColor={logo ? LOGO_END : MARK_END} />
        </LinearGradient>
      </Defs>
      <Path fill={`url(#${id})`} fillRule="evenodd" d={SHAPE} />
    </Svg>
  );
}
