import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { type HostInstance, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { TokenLogo, VannaMark, Wordmark } from "@/components/brand";
import { shareCaptured } from "@/screens/share/share-image";
import { cleanAmt, Seg2, TokenPill } from "@/components/form";
import { Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconAction, shareIcon } from "@/components/ui/kit";
import { nf, tokFmt, usd } from "@/format";
import { LOGO_PNG } from "@/generated/logos";
import { ACCOUNT, ACTIVITY, DATA, PX, TOK } from "@/sample/data";
import { nowT, randTx } from "@/screens/earn/model";
import { MarginTransfer } from "@/screens/margin/margin";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { mutate, useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { BRAND_GRADIENT, families, font } from "@/theme/tokens";
import { openSheet, toast , closeSheet } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import { personalReady } from "@/state/personal";
import { inUseWallet, walletState } from "@/state/wallets";
import { refreshAccount, refreshAccountSoon } from "@/chain/account-live";
import { stellarFaucet, stellarTransfer } from "@/chain/stellar/actions";
import { solanaFundFaucet, solanaWalletTransfer } from "@/chain/solana/actions";
import { fundCash } from "@/chain/solana/predict";
import * as dynamic from "@/chain/dynamic";
import { openAddWallet } from "@/screens/wallets/wallets";

/* Move (design screens/move.js): Deposit (Test funds, Receive), Withdraw (send to an address) and Transfer (wallet ↔ margin account),
   each a sheet over the screen it came from, sized to its content. Testnet: Buy, Bridge and From an exchange are mainnet tabs. */
const fam = families.portfolio;
const FAUCET: Record<Chain, [string, number][]> = {
  solana: [
    // Same tokens, order and amounts as the website's faucet (lib/solana/tokens.ts faucetAmount, plus CASH for Predict).
    ["SOL", 1000],
    ["USDC", 1000],
    ["USDT", 1000],
    ["JitoSOL", 1000],
    ["JupSOL", 1000],
    ["JupUSD", 1000],
    ["NVDAx", 10],
    ["GOOGLx", 10],
    ["AAPLx", 10],
    ["TSLAx", 10],
    ["CASH", 1000],
  ],
  stellar: [
    ["XLM", 10000],
    ["AqUSDC", 1000],
    ["BLUSDC", 1000],
    ["SoUSDC", 25000], // what Soroswap's faucet actually sends
  ],
};
const RESERVE: Record<Chain, Record<string, number>> = {
  solana: { SOL: 0.05 },
  stellar: { XLM: 2 },
};
const FULL: Record<Chain, string> = {
  solana: "7xKXitdq4bBLzfS4PyNucdyedmr93H4UTKGBW8qS9fQ2",
  stellar: "GD3KQ7MZWBOV5YPRB3CTBU4NCXH6S7RL2VOE2FJMYX2DQHCVQ7MZ",
};
const short = (a: string) => (a.length > 12 ? a.slice(0, 4) + "…" + a.slice(-4) : a);
const px = (s: string) => PX[s] ?? 1;
const stable = (s: string) => !!TOK[s]?.stable;

export const openDeposit = (chain: Chain, tab: "faucet" | "receive" = "faucet") =>
  openSheet({
    title: "Deposit",
    content: () => <Deposit chain={chain} initial={tab} />,
  });
export const openWithdraw = (chain: Chain) => openSheet({ title: "Withdraw", content: () => <Withdraw chain={chain} /> });
export const openTransfer = () =>
  openSheet({
    title: "Transfer",
    content: () => (
      <View style={{ gap: 12, paddingBottom: 8 }}>
        <MarginTransfer sheet />
      </View>
    ),
  });

// Source pill (design .mv-top): purple tint, the wallet address in a dark chip.
function SrcPill({ text, chain }: { text: string; chain: Chain }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.src, { backgroundColor: colors.purpleTint }]}>
      <Icon name="account_balance_wallet" size={16} color={colors.onPurpleTint} />
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 13,
          color: colors.onPurpleTint,
        }}
      >
        {text}
      </Text>
      <View style={[styles.srcAddr, { backgroundColor: colors.bg }]}>
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 12,
            color: colors.text,
          }}
        >
          {ACCOUNT.wallets[chain].addr}
        </Text>
      </View>
    </View>
  );
}

function Deposit({ chain, initial }: { chain: Chain; initial: "faucet" | "receive" }) {
  useDataVersion();
  const [tab, setTab] = useState(initial);
  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <SrcPill text="To your wallet" chain={chain} />
      <Seg2
        items={[
          ["faucet", "Test funds"],
          ["receive", "Receive"],
        ]}
        value={tab}
        onChange={setTab}
        label="Deposit"
        full
        accent="#703AE6"
      />
      <Swap k={tab}>{tab === "faucet" ? <Faucet chain={chain} /> : <Receive chain={chain} />}</Swap>
    </View>
  );
}

// Test faucet (design faucetCard): rows of four equal tiles that always fill the card (Stellar one row, Solana two), each with the
// amount it sends; tap one, or Get all; a ✓ on what was sent.
const kShort = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v));
// Loading state of a faucet tile: a brand-gradient arc that spins around the token logo while the claim is in flight.
function SendRing() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [r]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[styles.ring, spin]} pointerEvents="none">
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Defs>
          <SvgGradient id="fr" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FC5457" />
            <Stop offset="1" stopColor="#703AE6" />
          </SvgGradient>
        </Defs>
        <Circle cx={22} cy={22} r={20} stroke="url(#fr)" strokeWidth={3} strokeLinecap="round" fill="none" strokeDasharray="70 126" />
      </Svg>
    </Animated.View>
  );
}

// A faucet step that never answers (a signing prompt that doesn't return, a slow server) must end as "Failed", not spin forever.
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(msg)), ms);
    p.then(
      (v) => (clearTimeout(t), res(v)),
      (e) => (clearTimeout(t), rej(e)),
    );
  });
}

// What this wallet has already claimed on Stellar (its faucets give once), kept while the app is open.
const CLAIMED: Record<string, Record<string, true>> = {};

function Faucet({ chain }: { chain: Chain }) {
  const { colors } = useTheme();
  const key = `${chain}:${inUseWallet(chain)?.full ?? ""}`;
  const [st, setSt] = useState<Record<string, "pending" | "done" | "failed">>(() => (chain === "stellar" ? Object.fromEntries(Object.keys(CLAIMED[key] ?? {}).map((s) => [s, "done" as const])) : {}));
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const list = FAUCET[chain];
  const claim = async (items: [string, number][]) => {
    if (!items.length) return;
    if (dynamic.available && !personalReady(chain)) {
      toast(`Add a ${CHAIN_LABEL[chain]} wallet first`, "err");
      closeSheet();
      openAddWallet(chain);
      return;
    }
    setMsg(null);
    setSt((p) => ({
      ...p,
      ...Object.fromEntries(items.map(([s]) => [s, "pending" as const])),
    }));
    const failed: string[] = [];
    let firstWhy = "";
    let sent = 0;
    const one = async ([sym, amount]: [string, number]) => {
      try {
        if (personalReady(chain)) {
          if (chain === "stellar") await withTimeout(stellarFaucet(sym), 180_000, `${sym} timed out`);
          else {
            const addr = inUseWallet("solana")?.full ?? inUseWallet("solana")?.addr;
            if (addr) {
              if (sym === "CASH") await fundCash(addr, amount);
              else await solanaFundFaucet(addr, sym);
            }
          }
          void refreshAccount(chain); // show each token as soon as it lands
        }
        sent++;
        if (chain === "stellar" && sym === "XLM") (CLAIMED[key] ??= {})[sym] = true; // Friendbot gives once; the USDC faucets any time
        setSt((p) => ({ ...p, [sym]: "done" }));
      } catch (e: any) {
        failed.push(sym);
        firstWhy ||= String(e?.message ?? "Faucet failed").split("\n")[0].slice(0, 120);
        setSt((p) => ({ ...p, [sym]: "failed" }));
      }
    };
    if (chain === "stellar") {
      // XLM first (a brand-new account has to exist). Then the tokens that need your signature go one after another
      // (they share the account's sequence number); the rest, like SoUSDC, run alongside them.
      const needsSign = (s: string) => s === "AqUSDC" || s === "BLUSDC";
      const xlm = items.filter(([s]) => s === "XLM");
      for (const it of xlm) await one(it);
      const signed = items.filter(([s]) => needsSign(s));
      const rest = items.filter(([s]) => s !== "XLM" && !needsSign(s));
      await Promise.all([(async () => { for (const it of signed) await one(it); })(), ...rest.map(one)]);
    } else {
      // Solana: a few at a time, SOL first so the account can pay fees.
      const sol = items.filter(([s]) => s === "SOL");
      for (const it of sol) await one(it);
      const queue = items.filter(([s]) => s !== "SOL");
      await Promise.all(Array.from({ length: 4 }, async () => { for (let it = queue.shift(); it; it = queue.shift()) await one(it); }));
    }
    if (sent) {
      refreshAccountSoon(chain);
      mutate(() => {
        // A real wallet's balance already came back from the chain above.
        const ok = items.filter(([s]) => !failed.includes(s));
        if (!personalReady(chain)) ok.forEach(([s, v]) => (DATA[chain].wallet[s] = (DATA[chain].wallet[s] ?? 0) + v));
        ACTIVITY[chain].unshift({
          t: nowT(),
          area: "Wallet",
          action: "Test funds",
          detail: ok.map(([s]) => s).join(", "),
          amt: ok.map(([s, v]) => `${nf(v)} ${s}`).join(", "),
          usd: ok.reduce((t, [s, v]) => t + v * px(s), 0),
          tx: randTx(),
          sym: ok[0][0],
        });
      });
    }
    if (!failed.length) {
      setMsg({ text: items.length > 1 ? (chain === "solana" ? "Sent to your wallet. Unlimited on the fork." : "Sent to your wallet. XLM comes once per wallet; the USDC faucets any time.") : `Sent ${nf(items[0][1])} ${items[0][0]} to your wallet.` });
    } else {
      setMsg({ text: `${failed.join(", ")} didn't go through. Tap ${failed.length > 1 ? "one" : "it"} to try again. ${firstWhy}`, bad: true });
      toast(`${failed.join(", ")} failed`, "err");
    }
  };
  const available = (s: string) => (chain === "stellar" && s === "XLM" ? st[s] !== "done" && st[s] !== "pending" : st[s] !== "pending"); // only Friendbot (XLM) is once per wallet
  const open = list.filter(([s]) => available(s));
  const allDone = chain === "stellar" && !open.length;
  return (
    <View style={[styles.card, { backgroundColor: colors.bg }]}>
      <View style={styles.fh}>
        <Text
          style={{
            flex: 1,
            fontFamily: font.semibold,
            fontSize: 18,
            color: colors.text,
          }}
        >
          Test faucet
        </Text>
        <View style={[styles.tag, { backgroundColor: colors.pinkTint }]}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 11,
              color: colors.onPinkTint,
            }}
          >
            {chain === "solana" ? "Fork only" : "Testnet"}
          </Text>
        </View>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(list.length / 4) }, (_, r) => list.slice(r * 4, r * 4 + 4)).map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map(([s, v]) => (
              <Pressable
                key={s}
                onPress={() => available(s) && claim([[s, v]])}
                style={[styles.tile, { backgroundColor: colors.surface }]}
                accessibilityRole="button"
                accessibilityLabel={st[s] === "done" ? `${s} sent` : st[s] === "failed" ? `${s} failed, tap to retry` : `Get ${nf(v)} test ${s}`}
              >
                <View style={styles.logoBox}>
                  {st[s] === "pending" && <SendRing />}
                  <View style={st[s] === "pending" && { opacity: 0.55 }}>
                    <TokenLogo sym={s} size={32} />
                  </View>
                  {st[s] === "done" && (
                    <View style={[styles.ok, { borderColor: colors.surface }]}>
                      <Icon name="check" size={10} color="#FFFFFF" />
                    </View>
                  )}
                  {st[s] === "failed" && (
                    <View style={[styles.ok, { borderColor: colors.surface, backgroundColor: colors.negative }]}>
                      <Icon name="close" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: font.semibold,
                      fontSize: 12,
                      color: colors.text,
                    }}
                  >
                    {s}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: font.regular,
                      fontSize: 11,
                      color: st[s] === "done" ? colors.positive : st[s] === "failed" ? colors.negative : colors.muted,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {st[s] === "done" ? "Sent" : st[s] === "pending" ? "Sending" : st[s] === "failed" ? "Failed" : `+${nf(v)}`}
                  </Text>
                </View>
              </Pressable>
            ))}
            {Array.from({ length: 4 - row.length }, (_, i) => (
              <View key={`f${i}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
      <Pressable onPress={() => claim(open)} disabled={!open.length} style={[styles.getAll, !open.length && { opacity: 0.5 }]} accessibilityRole="button">
        <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: "#FFFFFF" }}>{allDone ? "All claimed" : Object.values(st).includes("failed") ? "Get the rest" : "Get all"}</Text>
      </Pressable>
      {msg && (
        <View style={styles.msg}>
          <Icon name="info" size={16} color={msg.bad ? colors.negative : colors.positive} />
          <Text
            style={{
              flex: 1,
              fontFamily: font.regular,
              fontSize: 12,
              color: msg.bad ? colors.negative : colors.positive,
            }}
          >
            {msg.text}
          </Text>
        </View>
      )}
    </View>
  );
}

// Receive (design receiveCard): QR with the chain mark, the address in groups of four (ends bold), copy and share, network and tokens.
function Receive({ chain }: { chain: Chain }) {
  const { colors } = useTheme();
  // Never show a sample address here: someone could send real funds to it.
  const addr = inUseWallet(chain)?.full ?? (dynamic.available ? "" : FULL[chain]);
  const [copied, setCopied] = useState(false);
  const shot = useRef<HostInstance>(null);
  if (!addr) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bg, alignItems: "center", gap: 14 }]}>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: "center" }}>Add a {CHAIN_LABEL[chain]} wallet to see your address.</Text>
        <Button label={`Add a ${CHAIN_LABEL[chain]} wallet`} fam={fam} onPress={() => (closeSheet(), openAddWallet(chain))} style={{ alignSelf: "stretch" }} />
      </View>
    );
  }
  const groups = addr.match(/.{1,4}/g) ?? [addr];
  // This white card is also the picture that gets shared: the code and the address together, readable on any background.
  return (
    <View style={[styles.card, { backgroundColor: colors.bg, alignItems: "center", gap: 14 }]}>
      <View ref={shot} collapsable={false} style={styles.shot}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
          <VannaMark size={18} />
          <Wordmark height={13} color="#1F1F1F" />
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#595959", alignSelf: "flex-start" }}>My {CHAIN_LABEL[chain]} testnet address</Text>
        <View style={styles.qr}>
          <QRCode
            value={addr}
            size={168}
            backgroundColor="#FFFFFF"
            color="#111111"
            logo={(LOGO_PNG as Record<string, number>)[chain === "solana" ? "SOLANA_CHAIN" : "STELLAR_CHAIN"]}
            logoSize={36}
            logoBackgroundColor="#FFFFFF"
            logoBorderRadius={18}
            logoMargin={3}
          />
        </View>
        <Text style={[styles.addr, { color: "#1F1F1F" }]} selectable>
          {groups.map((g, i) => (
            <Text
              key={i}
              style={{
                color: i === 0 || i === groups.length - 1 ? "#1F1F1F" : "#595959",
                fontWeight: i === 0 || i === groups.length - 1 ? "700" : "400",
              }}
            >
              {g}
              {i < groups.length - 1 ? "  " : ""}
            </Text>
          ))}
        </Text>
      </View>
      <View style={{ alignSelf: "stretch", gap: 8 }}>
        <Button
          label="Share address"
          icon={shareIcon}
          fam={fam}
          onPress={() => void shareCaptured(shot, `My ${CHAIN_LABEL[chain]} testnet address on Vanna:\n${addr}`, `vanna-${chain}-address.png`).catch(() => toast("Couldn't open the share menu", "err"))}
        />
        <Button
          label={copied ? "Copied" : "Copy address"}
          icon={copied ? "check" : "content_copy"}
          v="outline"
          size="md"
          onPress={() => {
            Clipboard.setStringAsync(addr).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        />
      </View>
      <View style={[styles.rows, { backgroundColor: colors.surface, alignSelf: "stretch" }]}>
        {(
          [
            ["Network", `${CHAIN_LABEL[chain]} testnet`],
            ["Tokens", chain === "solana" ? "SOL, USDC, stocks" : "XLM, AqUSDC, BLUSDC, SoUSDC"],
          ] as [string, string][]
        ).map(([l, v], i) => (
          <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text
              style={{
                flex: 1,
                fontFamily: font.regular,
                fontSize: 14,
                color: colors.muted,
              }}
            >
              {l}
            </Text>
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 14,
                color: colors.text,
              }}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.warn, { alignSelf: "stretch" }]}>
        <Icon name="warning" size={16} color={colors.warning} />
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 12,
            color: colors.warning,
          }}
        >
          Vanna testnet tokens only
        </Text>
      </View>
    </View>
  );
}

// Withdraw (design SCREENS.withdraw): You send card, the address field with Paste and your own wallet, then fee and before → after.
function Withdraw({ chain }: { chain: Chain }) {
  useDataVersion();
  const { colors } = useTheme();
  const d = DATA[chain];
  const list = [
    ...new Set(
      Object.keys(d.wallet)
        .filter((k) => (d.wallet[k] ?? 0) > 0)
        .concat(chain === "solana" ? ["USDC"] : ["SoUSDC"]),
    ),
  ];
  const [sym, setSym] = useState(list.includes(chain === "solana" ? "USDC" : "SoUSDC") ? (chain === "solana" ? "USDC" : "SoUSDC") : list[0]);
  const [amt, setAmt] = useState("");
  const [to, setTo] = useState("");
  const [memo, setMemo] = useState("");
  const [focus, setFocus] = useState(false);
  const [pasteMsg, setPasteMsg] = useState("");
  const bal = d.wallet[sym] ?? 0;
  const max = Math.max(0, bal - (RESERVE[chain][sym] ?? 0));
  const x = parseFloat(amt) || 0;
  const re = chain === "solana" ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/ : /^(G[A-Z2-7]{55}|M[A-Z2-7]{68})$/;
  const t = to.trim();
  const addrErr =
    t && !re.test(t)
      ? chain === "stellar"
        ? "Enter a Stellar address that starts with G"
        : "Enter a valid Solana address"
      : t === (inUseWallet(chain)?.full ?? FULL[chain])
        ? "That is this wallet"
        : "";
  const issue = !x ? "Enter an amount" : x > max ? `Not enough ${sym}` : !t ? "Enter an address" : addrErr ? "Check the address" : null;
  const cur = inUseWallet(chain);
  const otherWallets = walletState().wallets[chain].filter((w) => !w.sample && w.id !== cur?.id);
  const dp = stable(sym) ? 2 : 4;
  const go = () =>
    runTx({
      chain,
      fam,
      title: "Review withdrawal",
      cta: "Confirm and send",
      legs: [
        { l: "You send", v: tokFmt(x, sym), s: "From your wallet" },
        {
          l: `To ${CHAIN_LABEL[chain]}`,
          v: short(t),
          s: otherWallets.some((w) => w.full === t) ? `Your ${otherWallets.find((w) => w.full === t)!.app}` : memo ? "Memo " + memo : "Address",
        },
      ],
      rows: [
        ["They receive", tokFmt(x, sym)],
        ["Wallet", `${tokFmt(bal, sym)} → ${tokFmt(Math.max(0, bal - x), sym)}`],
      ],
      done: {
        title: `Sent ${tokFmt(x, sym)}`,
        line: `To ${short(t)} on ${CHAIN_LABEL[chain]}`,
      },
      send: async () =>
        chain === "stellar"
          ? await stellarTransfer({ sym, amount: x, from: cur?.full ?? "", to: t, memo: memo.trim() || undefined })
          : await solanaWalletTransfer(t, sym, x),
      apply: () => {
        d.wallet[sym] = Math.max(0, bal - x);
        ACTIVITY[chain].unshift({
          t: nowT(),
          area: "Wallet",
          action: "Withdraw",
          detail: `${sym} to ${short(t)}`,
          amt: tokFmt(x, sym),
          usd: x * px(sym),
          tx: randTx(),
          sym,
        });
        setAmt("");
        setTo("");
      },
    });
  return (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <SrcPill text="From your wallet" chain={chain} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bg,
            borderColor: x > max ? colors.negative : "transparent",
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.fh}>
          <Text
            style={{
              flex: 1,
              fontFamily: font.regular,
              fontSize: 13,
              color: colors.text,
            }}
          >
            You send
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: colors.muted,
            }}
          >
            Wallet {nf(bal, dp)} {sym}
          </Text>
        </View>
        <View style={styles.fh}>
          <TextInput
            value={amt}
            onChangeText={(v) => setAmt(cleanAmt(v, dp))}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            accessibilityLabel="You send"
            style={[styles.big, { color: x > max ? colors.negative : colors.text }]}
          />
          <TokenPill sym={sym} syms={list} onSym={(s) => (setSym(s), setAmt(""))} meta={(s) => nf(d.wallet[s] ?? 0, stable(s) ? 2 : 4)} />
        </View>
        {x > 0 && !stable(sym) && (
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: colors.muted,
            }}
          >
            ~{usd(x * px(sym))}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[25, 50, 75, 100].map((q) => (
            <Pressable
              key={q}
              onPress={() => setAmt(String(Math.floor(((max * q) / 100) * 10 ** dp) / 10 ** dp))}
              style={[styles.pc, { borderColor: colors.borderControl }]}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontFamily: font.semibold,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                {q === 100 ? "Max" : `${q}%`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.bg, gap: 12 }]}>
        <View
          style={[
            styles.field,
            {
              borderColor: addrErr ? colors.negative : focus ? colors.link : colors.borderControl,
            },
          ]}
        >
          <Text
            style={[
              styles.flabel,
              {
                color: addrErr ? colors.negative : focus ? colors.link : colors.muted,
                backgroundColor: colors.bg,
              },
            ]}
          >
            {chain === "solana" ? "Solana address" : "Stellar address"}
          </Text>
          <TextInput
            value={to}
            onChangeText={(v) => (setTo(v), setPasteMsg(""))}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Paste or type"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Destination address"
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: font.regular,
              fontSize: 15,
              color: colors.text,
              paddingVertical: 14,
            }}
          />
          <Pressable
            onPress={async () => {
              const v = (await Clipboard.getStringAsync().catch(() => "")).trim();
              if (re.test(v)) {
                setTo(v);
                setPasteMsg("");
              }
              else setPasteMsg(chain === "stellar" ? "Nothing to paste. Copy an address that starts with G." : "Nothing to paste. Copy a Solana address first.");
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Paste address"
          >
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 14,
                color: colors.link,
              }}
            >
              Paste
            </Text>
          </Pressable>
        </View>
        {pasteMsg && !addrErr ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: -6 }}>{pasteMsg}</Text> : null}
        {addrErr ? (
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 12,
              color: colors.negative,
              marginTop: -6,
            }}
          >
            {addrErr}
          </Text>
        ) : null}
        {/* The person's own other wallets on this chain, one tap each. With only one wallet connected there is nothing to offer
            (the old chip showed a made-up example address that could never validate). */}
        {otherWallets.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => (setTo(w.full), setPasteMsg(""))}
            style={[styles.mine, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Send to your ${w.app} wallet`}
          >
            <TokenLogo sym={w.logo} size={20} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{w.app}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>{short(w.full)}</Text>
          </Pressable>
        ))}
        {chain === "stellar" && (
          <View style={[styles.field, { borderColor: colors.borderControl }]}>
            <Text style={[styles.flabel, { color: colors.muted, backgroundColor: colors.bg }]}>Memo (only for exchanges)</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Memo"
              style={{
                flex: 1,
                fontFamily: font.regular,
                fontSize: 15,
                color: colors.text,
                paddingVertical: 14,
              }}
            />
          </View>
        )}
      </View>
      <View style={[styles.card, { backgroundColor: colors.bg, paddingVertical: 4, gap: 0 }]}>
        {(
          [
            ["Network fee", chain === "solana" ? "~0.000005 SOL" : "~0.00001 XLM"],
            ["They receive", `${nf(x, dp)} ${sym}`],
            ["Wallet", x > 0 ? `${nf(bal, dp)} → ${nf(Math.max(0, bal - x), dp)} ${sym}` : `${nf(bal, dp)} ${sym}`],
          ] as [string, string][]
        ).map(([l, v], i) => (
          <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text
              style={{
                flex: 1,
                fontFamily: font.regular,
                fontSize: 14,
                color: colors.muted,
              }}
            >
              {l}
            </Text>
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 14,
                color: colors.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>
      {issue !== "Enter an amount" && <Button label={issue ?? `Send ${tokFmt(x, sym)}`} fam={fam} disabled={!!issue} onPress={go} />}
    </View>
  );
}

const styles = StyleSheet.create({
  shot: { alignSelf: "stretch", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF" },
  src: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingLeft: 10,
    paddingRight: 4,
    borderRadius: 17,
  },
  srcAddr: {
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    justifyContent: "center",
  },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  fh: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: {
    paddingHorizontal: 8,
    minHeight: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  grid: { gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  ok: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#1C7C83",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", left: 0, top: 0 },
  okP: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  getAll: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    marginTop: 4,
  },
  msg: { flexDirection: "row", alignItems: "center", gap: 6 },
  qr: { padding: 12, borderRadius: 16, backgroundColor: "#FFFFFF" },
  addr: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  rows: { borderRadius: 12, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 10 },
  warn: { flexDirection: "row", alignItems: "center", gap: 6 },
  big: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semibold,
    fontSize: 34,
    paddingVertical: 2,
    fontVariant: ["tabular-nums"],
  },
  pc: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  flabel: {
    position: "absolute",
    left: 10,
    top: -9,
    paddingHorizontal: 4,
    fontFamily: font.regular,
    fontSize: 12,
  },
  mine: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
});
