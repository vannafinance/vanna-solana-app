import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/use-theme";
import type { ChartSource } from "@/types/perps";

import { CHART_USER_AGENT, DEXSCREENER_HOST_ORIGIN, dexScreenerHtml, isAllowedChartUrl, tradingViewHtml } from "./chart-embed";

type EmbeddedChartProps = {
  source: ChartSource;
  height?: number;
  accessibilityLabel: string;
};

// The chart provider draws the whole chart, including its own range and indicator controls. A load failure shows a
// retry instead of a blank box, and the chart can only navigate to its own provider.
export function EmbeddedChart({ source, height = 360, accessibilityLabel }: EmbeddedChartProps) {
  const { scheme, colors, radius } = useTheme();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dark = scheme === "dark";

  const frame = { height, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.background } as const;

  if (failed) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={{ ...frame, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AppText variant="body" color="textMuted">
          Chart unavailable
        </AppText>
        <Button
          label="Try again"
          variant="tonal"
          size="sm"
          onPress={() => {
            setFailed(false);
            setAttempt((count) => count + 1);
          }}
        />
      </View>
    );
  }

  const webSource =
    source.kind === "tradingview"
      ? { html: tradingViewHtml(source.symbol, dark, colors.background), baseUrl: "https://www.tradingview.com" }
      : { html: dexScreenerHtml(source.pairAddress, dark, colors.background), baseUrl: DEXSCREENER_HOST_ORIGIN };

  return (
    <View accessibilityLabel={accessibilityLabel} style={frame}>
      <WebView
        key={`${attempt}-${scheme}`}
        source={webSource}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(request) => isAllowedChartUrl(request.url)}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        userAgent={CHART_USER_AGENT}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        nestedScrollEnabled
        overScrollMode="never"
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        )}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </View>
  );
}
