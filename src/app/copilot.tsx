import { type Href, router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GateList, Pill } from "@/screens/rewards/parts";
import { CHAIN_LOGO, TokenLogo, VannaMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card } from "@/components/ui/kit";
import { hfFmt, levFmt } from "@/format";
import { MascotBody, MascotFace } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { DATA } from "@/sample/data";
import { acct } from "@/sample/model";
import { PERKS, UNLOCK, rewardsNow, setRewards, useRewards } from "@/sample/rewards";
import { type Answer, explainQ, FLOOR, INTENTS, type Plan, recheck, reply, VEN } from "@/screens/copilot/engine";
import { CHAIN_LABEL, useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openSheet } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import { haptic } from "@/ui/haptics";

/* Vanna Copilot (design screens/copilot.js, compact): testnet-gated. Locked = the unlock checklist, Rewards, "Preview unlocked", and the
   MCP card. Unlocked = context chips (health with the face, network, MCP), the intents, then a thread whose changes arrive as checked
   plans (steps with venues, health and leverage before → after, floor 1.15, valid 5 minutes, live re-check) approved through the one
   transaction sheet. */
type Turn = { who: "me"; text: string } | { who: "ai"; r: Answer };

export default function Copilot() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const r = useRewards();
  const [turns, setTurns] = useState<Turn[]>([]);
  const open = r.cpView === "unlocked";
  const chat = open && turns.length > 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ animation: "slide_from_bottom" }} />
      <StatusBar style="auto" />
      <View style={[styles.hd, { paddingTop: insets.top, height: 60 + insets.top }]}>
        <Text style={[styles.ttl, { color: colors.text }]} accessibilityRole="header">Vanna Copilot</Text>
        {chat && (
          <>
            <HBtn icon="history" label="Chats" onPress={() => setTurns([])} />
            <HBtn icon="edit_square" label="New chat" onPress={() => setTurns([])} />
          </>
        )}
        <HBtn icon="close" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace("/portfolio" as Href))} />
      </View>
      {open ? <ChatView turns={turns} setTurns={setTurns} /> : <Locked />}
    </View>
  );
}

function HBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.hb} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={24} />
    </Pressable>
  );
}

/* ---------- locked ---------- */
function Locked() {
  const { colors } = useTheme();
  const { chain } = useChain();
  const hf = acct(chain).hf;
  const preview = () => {
    setRewards({ cpView: "unlocked" });
    if (!rewardsNow().unlockSeen) setTimeout(openUnlocked, 350);
  };
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Card style={{ alignItems: "stretch", gap: 14, paddingTop: 24 }}>
        <View style={[styles.lockFace, { backgroundColor: colors.bg }]}>
          <MascotFace hf={hf} size={64} />
        </View>
        <Text style={[styles.h, { color: colors.text }]}>Unlock Copilot</Text>
        <GateList />
        <Button label="Rewards" v="outline" icon="stars" onPress={() => router.push("/rewards" as Href)} />
        <Pressable onPress={preview} style={styles.prevBtn} accessibilityRole="button">
          <Icon name="visibility" size={18} color="link" />
          <Text style={[styles.lbB, { color: colors.link }]}>Preview unlocked</Text>
        </Pressable>
      </Card>
      <McpCard />
    </ScrollView>
  );
}

function McpCard() {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.mcpI, { backgroundColor: colors.bg }]}>
          <Icon name="cable" size={22} />
        </View>
        <Text style={[styles.lbB, { color: colors.text, flex: 1, fontSize: 15 }]}>Agent (MCP)</Text>
        <Pill label="Locked" tone="grey" icon={<Icon name="lock" size={12} color="muted" />} />
      </View>
    </Card>
  );
}

// The unlock moment (design cp-unlock sheet), once per session.
function openUnlocked() {
  setRewards({ unlockSeen: true });
  openSheet({
    title: "",
    content: (close) => <UnlockSheet close={close} />,
  });
}
function UnlockSheet({ close }: { close: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 12, paddingBottom: 8 }}>
      <MascotBody width={120} />
      <Text style={[styles.h, { color: colors.text }]}>Vanna Copilot is open</Text>
      <Text style={[styles.bd, { color: colors.text, textAlign: "center" }]}>Preview of Copilot once your account unlocks it.</Text>
      <View style={[styles.perks, { backgroundColor: colors.bg }]}>
        {PERKS.map((p) => (
          <View key={p} style={styles.li}>
            <Icon name="check" size={18} color="positive" />
            <Text style={[styles.bd, { color: colors.text }]}>{p}</Text>
          </View>
        ))}
        <View style={styles.li}>
          <Icon name="lock" size={18} color="muted" />
          <Text style={[styles.bd, { color: colors.text }]}>MCP unlocks in {UNLOCK.mcpDelayDays} days</Text>
        </View>
      </View>
      <Button label="Start a chat" style={{ alignSelf: "stretch" }} fam={families.portfolio} onPress={close} />
      <Button label="See Rewards" v="outline" style={{ alignSelf: "stretch" }} onPress={() => (close(), setTimeout(() => router.push("/rewards" as Href), 250))} />
    </View>
  );
}

/* ---------- unlocked: chips, empty view, thread, composer ---------- */
function ChatView({ turns, setTurns }: { turns: Turn[]; setTurns: (f: (t: Turn[]) => Turn[]) => void }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const insets = useSafeAreaInsets();
  useDataVersion();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const send = (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setDraft("");
    setTurns((p) => [...p, { who: "me", text: t }]);
    setBusy(true);
    timer.current = setTimeout(() => {
      setTurns((p) => [...p, { who: "ai", r: reply(chain, t) }]);
      setBusy(false);
    }, 900);
  };
  const upd = (id: string, f: (p: Plan) => Plan | null, after?: Turn) =>
    setTurns((ts) => {
      const n = ts.map((t) => (t.who === "ai" && t.r.kind === "plan" && t.r.plan.id === id ? { ...t, r: { ...t.r, plan: f(t.r.plan) ?? t.r.plan } } : t));
      return after ? [...n, after] : n;
    });

  const approve = (p: Plan) => {
    if (Date.now() > p.exp) return upd(p.id, (x) => ({ ...x, state: "expired" }));
    const s1 = recheck(chain, p);
    if (!(s1.hf >= FLOOR)) return (haptic.error(), upd)(p.id, (x) => ({ ...x, state: "blocked", why: `Health factor would be ${hfFmt(s1.hf)}, below ${FLOOR.toFixed(2)}` }));
    const s0 = acct(chain);
    runTx({
      chain, fam: families.portfolio, title: p.tx.title, cta: p.tx.cta, legs: p.tx.legs,
      rows: [...p.tx.rows, ["Health factor", `${hfFmt(s0.hf)} → ${hfFmt(s1.hf)}`]],
      done: { title: "Done", line: p.result },
      send: p.send,
      apply: () => {
        p.mutate(DATA[chain]);
        setTimeout(() => {
          const a = acct(chain);
          upd(p.id, (x) => ({ ...x, state: "done" }), { who: "ai", r: { kind: "done", text: p.result, rows: [["Health factor", `${hfFmt(s0.hf)} → ${hfFmt(a.hf)}`], ["Leverage", `${levFmt(s0.lev)} → ${levFmt(a.lev)}`]] } });
        }, 0);
      },
    });
  };

  const asked = turns.filter((t) => t.who === "me").map((t) => (t as { text: string }).text);
  const last = turns[turns.length - 1];
  const sugg: string[] = (last?.who === "ai" && "chips" in last.r && last.r.chips) || [...INTENTS(chain).map((x) => x[1]), explainQ(chain)].filter((x) => !asked.includes(x));
  const h = acct(chain).hf, noDebt = !isFinite(h) || h >= 100;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.cbar}>
        <View style={[styles.cc, { borderColor: colors.border }]}>
          <MascotFace hf={h} size={24} />
          <Text style={[styles.cap, { color: colors.text }]}>Health</Text>
          <Text style={[styles.lbB, { color: noDebt || h >= 1.5 ? colors.positive : colors.warning }]}>{noDebt ? "No debt" : hfFmt(h)}</Text>
        </View>
        <View style={[styles.cc, { borderColor: colors.border }]}>
          <TokenLogo sym={CHAIN_LOGO[chain]} size={16} />
          <Text style={[styles.lbB, { color: colors.text }]}>{CHAIN_LABEL[chain]} testnet</Text>
        </View>
        <View style={[styles.cc, { borderColor: colors.border }]}>
          <Icon name="lock" size={14} />
          <Text style={[styles.lbB, { color: colors.text }]}>MCP</Text>
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={[styles.body, { paddingTop: 8 }]} keyboardShouldPersistTaps="handled" onContentSizeChange={() => turns.length && scroll.current?.scrollToEnd({ animated: true })}>
        {!turns.length ? (
          <View style={{ gap: 10 }}>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
              <MascotBody width={104} asleep />
              <Text style={[styles.h, { color: colors.text }]}>What&apos;s the next move?</Text>
            </View>
            {[...INTENTS(chain), ["help", explainQ(chain)] as [string, string]].map(([ic, l]) => (
              <Pressable key={l} onPress={() => send(l)} style={[styles.intent, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button">
                <Icon name={ic as IconName} size={20} color="link" />
                <Text style={[styles.lbB, { color: colors.text, flex: 1, fontSize: 15 }]}>{l}</Text>
                <Icon name="arrow_upward" size={20} />
              </Pressable>
            ))}
            <Guards />
          </View>
        ) : (
          turns.map((t, i) =>
            t.who === "me" ? (
              <View key={i} style={[styles.me, { backgroundColor: colors.purpleTint }]}>
                <Text style={[styles.bd, { color: colors.onPurpleTint }]}>{t.text}</Text>
              </View>
            ) : (
              <View key={i} style={styles.ai}>
                <View style={[styles.av, { backgroundColor: colors.purpleTint }]}>
                  <VannaMark size={16} tone="lift" />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <AnswerView r={t.r} onApprove={approve} onDismiss={(id) => upd(id, (x) => ({ ...x, state: "dismissed" }))} onEdit={(p) => setDraft(p.title)} />
                </View>
              </View>
            ),
          )
        )}
        {busy && (
          <View style={styles.ai}>
            <TailLoader size={32} />
          </View>
        )}
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {turns.length > 0 && !busy && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
            {sugg.map((s) => (
              <Pressable key={s} onPress={() => send(s)} style={[styles.chip, { borderColor: colors.border }]} accessibilityRole="button">
                <Text style={[styles.lbB, { color: colors.text }]}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={[styles.in, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => send(draft)} placeholder="Ask Copilot" placeholderTextColor={colors.muted} returnKeyType="send" style={[styles.inT, { color: colors.text }]} accessibilityLabel="Message Copilot" />
          <Pressable onPress={() => send(draft)} disabled={!draft.trim() || busy} style={[styles.send, { backgroundColor: draft.trim() ? "#703AE6" : colors.segment }]} accessibilityRole="button" accessibilityLabel="Send">
            <Icon name="arrow_upward" size={22} color={draft.trim() ? "#FFFFFF" : colors.muted} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Guards({ exp }: { exp?: number }) {
  const { colors } = useTheme();
  const [left, setLeft] = useState(300);
  useEffect(() => {
    if (!exp) return;
    const upd = () => setLeft(Math.max(0, Math.ceil((exp - Date.now()) / 1000)));
    const t = setInterval(upd, 1000);
    const first = setTimeout(upd, 0);
    return () => (clearInterval(t), clearTimeout(first));
  }, [exp]);
  const items: [IconName, string][] = [["shield", `Floor ${FLOOR.toFixed(2)}`], ["timer", exp ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Valid 5 min"], ["sync", "Live re-check"]];
  return (
    <View style={styles.guard} accessibilityRole="list" accessibilityLabel="Guardrails">
      {items.map(([ic, l]) => (
        <View key={ic} style={[styles.gc, { backgroundColor: colors.segment }]}>
          <Icon name={ic} size={16} />
          <Text style={[styles.cap, { color: colors.text, fontFamily: font.semibold }]}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

const PSTATE: Record<Plan["state"], [string, "teal" | "grey" | "pink" | "purple"]> = { ready: ["Ready", "teal"], done: ["Done", "teal"], dismissed: ["Dismissed", "grey"], expired: ["Expired", "grey"], blocked: ["Blocked", "pink"] };

function AnswerView({ r, onApprove, onDismiss, onEdit }: { r: Answer; onApprove: (p: Plan) => void; onDismiss: (id: string) => void; onEdit: (p: Plan) => void }) {
  const { colors } = useTheme();
  const tone = (t?: string) => (t === "pos" ? colors.positive : t === "neg" ? colors.negative : t === "warn" ? colors.warning : colors.text);
  if (r.kind === "text") return <Text style={[styles.bd, { color: colors.text }]}>{r.text}</Text>;
  if (r.kind === "facts")
    return (
      <>
        <Text style={[styles.bd, { color: colors.text }]}>{r.head}</Text>
        {r.rows.length > 0 && (
          <View style={[styles.facts, { backgroundColor: colors.surface }]}>
            {r.rows.map(([l, v, t], i) => (
              <View key={l + i} style={[styles.fr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>{l}</Text>
                <Text style={[styles.lbB, { color: tone(t), fontSize: 14 }]}>{v}</Text>
              </View>
            ))}
          </View>
        )}
        {r.note && <Text style={[styles.cap, { color: colors.muted }]}>{r.note}</Text>}
      </>
    );
  if (r.kind === "done")
    return (
      <View style={[styles.facts, { backgroundColor: colors.surface, paddingVertical: 12, gap: 8 }]}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Icon name="check_circle" size={20} color="positive" filled />
          <Text style={[styles.lbB, { color: colors.text, flex: 1, fontSize: 15 }]}>{r.text}</Text>
        </View>
        {r.rows.map(([l, v]) => (
          <View key={l} style={styles.fr}>
            <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>{l}</Text>
            <Text style={[styles.lbB, { color: colors.text, fontSize: 14 }]}>{v}</Text>
          </View>
        ))}
      </View>
    );
  const p = r.plan, live = p.state === "ready", st = PSTATE[p.state];
  const arrow = (a: string, b: string, worse: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={[styles.bd, { color: colors.text }]}>{a}</Text>
      <Icon name="arrow_forward" size={14} color="muted" />
      <Text style={[styles.lbB, { color: worse ? colors.warning : colors.positive, fontSize: 14 }]}>{b}</Text>
    </View>
  );
  return (
    <View style={[styles.plan, { backgroundColor: colors.surface, opacity: live || p.state === "done" ? 1 : 0.7 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[styles.pt, { color: colors.text }]}>{p.title}</Text>
        <Pill label={st[0]} tone={st[1]} />
      </View>
      {p.sub && <Text style={[styles.cap, { color: colors.muted }]}>{p.sub}</Text>}
      {p.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={[styles.sn, { backgroundColor: colors.purpleTint }]}>
            <Text style={{ color: colors.onPurpleTint, fontFamily: font.semibold, fontSize: 12 }}>{i + 1}</Text>
          </View>
          <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>{s.t}</Text>
          <View style={styles.ven}>
            {VEN[s.ven][1] ? <TokenLogo sym={VEN[s.ven][1]!} size={18} /> : s.ven === "vanna" ? <VannaMark size={16} tone="lift" /> : <Icon name={s.ven === "earn" ? "savings" : "account_balance_wallet"} size={16} color="muted" />}
            <Text style={[styles.cap, { color: colors.text }]}>{VEN[s.ven][0]}</Text>
          </View>
        </View>
      ))}
      <View style={[styles.imp, { backgroundColor: colors.bg }]}>
        <View style={styles.fr}>
          <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>Health factor</Text>
          {arrow(hfFmt(p.s0.hf), hfFmt(p.s1.hf), p.s1.hf < p.s0.hf)}
        </View>
        <View style={[styles.fr, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>Leverage</Text>
          {arrow(levFmt(p.s0.lev), levFmt(p.s1.lev), p.s1.lev > p.s0.lev)}
        </View>
        {p.extra && (
          <View style={[styles.fr, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={[styles.bd, { color: colors.text, flex: 1 }]}>{p.extra[0]}</Text>
            <Text style={[styles.lbB, { color: tone(p.extra[2]), fontSize: 14 }]}>{p.extra[1]}</Text>
          </View>
        )}
      </View>
      {p.why && <Text style={[styles.cap, { color: colors.negative }]}>{p.why}</Text>}
      <Guards exp={live ? p.exp : undefined} />
      {live && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Button label="Approve" icon="fingerprint" size="md" fam={families.portfolio} style={{ flex: 1 }} onPress={() => onApprove(p)} />
          <Pressable onPress={() => onEdit(p)} style={[styles.ia, { backgroundColor: colors.bg }]} accessibilityRole="button" accessibilityLabel="Edit">
            <Icon name="edit" size={20} />
          </Pressable>
          <Pressable onPress={() => onDismiss(p.id)} style={[styles.ia, { backgroundColor: colors.bg }]} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Icon name="close" size={20} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hd: { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8, gap: 2 },
  ttl: { flex: 1, fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  hb: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  h: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, textAlign: "center" },
  bd: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  lbB: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, fontVariant: ["tabular-nums"] },
  lockFace: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.12)" },
  prevBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40 },
  mcpI: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  perks: { alignSelf: "stretch", borderRadius: 12, padding: 12, gap: 8 },
  li: { flexDirection: "row", alignItems: "center", gap: 8 },
  cbar: { flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingBottom: 4, flexWrap: "wrap" },
  cc: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 10, borderRadius: 17, borderWidth: 1 },
  intent: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  guard: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gc: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 8, borderRadius: 14 },
  me: { alignSelf: "flex-end", maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 6 },
  ai: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  av: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  facts: { borderRadius: 12, paddingHorizontal: 12 },
  fr: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  plan: { borderRadius: 16, padding: 14, gap: 10 },
  pt: { flex: 1, fontFamily: font.semibold, fontSize: 17, lineHeight: 24 },
  step: { flexDirection: "row", alignItems: "center", gap: 8 },
  sn: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  ven: { flexDirection: "row", alignItems: "center", gap: 4 },
  imp: { borderRadius: 12, paddingHorizontal: 12 },
  ia: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  foot: { gap: 10, paddingTop: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  in: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, height: 52, borderRadius: 26, borderWidth: 1, paddingLeft: 18, paddingRight: 5 },
  inT: { flex: 1, fontFamily: font.regular, fontSize: 15, paddingVertical: 0 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
