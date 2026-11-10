import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { type HostInstance, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AnonPic, MeAvatar, XGlyph, XPic } from "@/components/avatar";
import { CHAIN_LOGO, TokenLogo } from "@/components/brand";
import { PagePill, PillTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card, shareIcon } from "@/components/ui/kit";
import { nf } from "@/format";
import {
  COUNTS, FRIENDS, type Friend, LEADERBOARD, MY_RANK, NOTHING, OVERVIEW, PERKS, QUESTS, REFERRAL, SEASON, TIERS, TIPS, UNLOCK, USERS,
  useRewards, setRewards, ANON,
} from "@/sample/rewards";
import { openEditCode, openEditName } from "@/screens/rewards/edit";
import { GateList, Pill } from "@/screens/rewards/parts";
import { openShare } from "@/screens/share/share";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openTip, toast } from "@/ui/overlay";
import { AfterTransition } from "@/ui/ready";

/* Rewards (design screens/rewards.js, Season 0): Overview (points, by chain, quests, Copilot, how points work), Referrals (code and
   link, referred by, stats, invite codes, tier, friends, how it works), Leaderboard (your rank, search, 20 a page), Profile. */
type T = "overview" | "referrals" | "leaderboard" | "profile";
const TABS: [T, string][] = [["overview", "Overview"], ["referrals", "Referrals"], ["leaderboard", "Leaderboard"], ["profile", "Profile"]];
const TAB_ICONS: Record<T, IconName> = { overview: "dashboard", referrals: "person_add", leaderboard: "leaderboard", profile: "person" };

export default function Rewards() {
  const { colors } = useTheme();
  const [t, setT] = useState<T>("overview");
  const go = (k: T) => setT(k);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title="Rewards" />
      <AfterTransition>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.sea}>
            <Icon name="schedule" size={16} />
            <Text style={[styles.lb, { color: colors.text }]}>{SEASON.name}</Text>
            <Pill label={SEASON.tag} tone="purple" />
          </View>
          <View style={{ marginTop: 28, marginHorizontal: -16 }}>
            <PagePill items={TABS} icons={TAB_ICONS} value={t} onChange={go} fam={families.portfolio} />
          </View>
          <Swap k={t}>
            <View style={{ gap: 12 }}>
              {t === "overview" ? <Overview onRank={() => go("leaderboard")} /> : t === "referrals" ? <Referrals /> : t === "leaderboard" ? <Board onProfile={() => go("profile")} /> : <Profile />}
            </View>
          </Swap>
        </ScrollView>
      </AfterTransition>
    </View>
  );
}

/* ---------- parts ---------- */
function Info({ k }: { k: keyof typeof TIPS }) {
  const ref = useRef<HostInstance>(null);
  return (
    <Pressable ref={ref} onPress={() => openTip(ref, TIPS[k])} hitSlop={10} accessibilityRole="button" accessibilityLabel={`About ${k}`}>
      <Icon name="info" size={20} color="muted" />
    </Pressable>
  );
}

function Head({ title, sub, right, count }: { title: string; sub?: React.ReactNode; right?: React.ReactNode; count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.head}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
          {count != null && <Text style={{ color: colors.muted }}>{"  "}{count}</Text>}
        </Text>
        {sub != null && (typeof sub === "string" ? <Text style={[styles.cap, { color: colors.muted }]}>{sub}</Text> : sub)}
      </View>
      {right}
    </View>
  );
}

const copy = (text: string, what: string) => {
  Clipboard.setStringAsync(text).catch(() => {});
  toast(`${what} copied`);
};

/* Quests (style A): each quest in its module's icon and colour. Open ones first, with what to do and Start; done ones
   say when. A segmented bar shows progress; when all are done the list folds into one line with Show all. */
function Quests() {
  const { colors } = useTheme();
  const [all, setAll] = useState(false);
  const done = QUESTS.filter((q) => q.done).length;
  const finished = done === QUESTS.length;
  const rows = [...QUESTS.filter((q) => !q.done), ...QUESTS.filter((q) => q.done)];
  return (
    <Card style={{ gap: 0 }}>
      <Head title="Quests" sub={<Text style={[styles.cap, { color: colors.muted }]}><Text style={{ fontFamily: font.semibold, color: colors.text }}>{done}</Text> of {QUESTS.length}</Text>} />
      <View style={styles.qbar}>
        {QUESTS.map((q, i) => (
          <View key={q.t} style={[styles.qseg, { backgroundColor: i < done ? colors.positive : colors.divider }]} />
        ))}
      </View>
      {finished && !all ? (
        <>
          <View style={[styles.qdone, { backgroundColor: colors.tealTint }]}>
            <Icon name="check_circle" size={20} color={colors.onTealTint} filled />
            <Text style={[styles.body14, { color: colors.onTealTint, flex: 1 }]}>All {QUESTS.length} done. New quests start with the next season.</Text>
          </View>
          <Pressable onPress={() => setAll(true)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start", paddingTop: 12 }}>
            <Text style={[styles.body14, { color: colors.link, fontFamily: font.semibold }]}>Show all {QUESTS.length}</Text>
          </Pressable>
        </>
      ) : (
        rows.map((q, i) => (
          <View key={q.t} style={[styles.quest, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <View style={[styles.qi, { backgroundColor: q.color }]}>
              <Icon name={q.icon} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.body15, { color: q.done ? colors.muted : colors.text }]}>{q.t}</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>{q.done ? `Done ${q.day}` : q.todo}</Text>
            </View>
            {q.done ? (
              <Icon name="check_circle" size={22} color="positive" filled />
            ) : (
              <Pressable onPress={() => router.push(q.go as Href)} style={[styles.qstart, { borderColor: colors.borderControl }]} accessibilityRole="button" accessibilityLabel={`Start ${q.t}`}>
                <Text style={[styles.cap, { color: colors.text, fontFamily: font.semibold, fontSize: 13 }]}>Start</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </Card>
  );
}

/* ===================== OVERVIEW ===================== */
function Overview({ onRank }: { onRank: () => void }) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.hero}>
        <LinearGradient colors={["#B65BE0", "#7B3CEA", "#4B25A6"]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(252,84,87,0.45)", "rgba(252,84,87,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.hl}>Points</Text>
        <Text style={styles.big}>{nf(OVERVIEW.points)}</Text>
        <Pressable onPress={onRank} style={styles.rank} accessibilityRole="button" accessibilityLabel={`Rank ${MY_RANK} of ${USERS}, open the leaderboard`}>
          <Icon name="bar_chart" size={16} color="#FFFFFF" />
          <Text style={styles.rankT}>#{nf(MY_RANK)} of {nf(USERS)}</Text>
        </Pressable>
        <View style={styles.hstats}>
          {[["Last drop", `+${nf(OVERVIEW.lastDrop)}`], ["This week", `${OVERVIEW.week.mods} modules`], ["Active days", String(OVERVIEW.week.days)]].map(([l, v], i) => (
            <View key={l} style={[{ flex: 1, gap: 2 }, i > 0 && styles.hsep]}>
              <Text style={styles.hl}>{l}</Text>
              <Text style={styles.hv}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <Card>
        <Head title="By chain" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["solana", "stellar"] as const).map((c) => (
            <View key={c} style={[styles.chainT, { backgroundColor: colors.bg }]}>
              <TokenLogo sym={CHAIN_LOGO[c]} size={36} />
              <View>
                <Text style={[styles.cap, { color: colors.text }]}>{c === "solana" ? "Solana" : "Stellar"}</Text>
                <Text style={[styles.v20, { color: colors.text }]}>{nf(OVERVIEW.byChain[c])}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Quests />

      <CopilotCard />

      <Card>
        <Head title="How points work" right={<Info k="points" />} />
        <Text style={[styles.capB, { color: colors.text }]}>Counts</Text>
        {COUNTS.map((c) => (
          <View key={c} style={styles.li}>
            <Icon name="check_circle" size={18} color="positive" filled />
            <Text style={[styles.body14, { color: colors.text }]}>{c}</Text>
          </View>
        ))}
        <Text style={[styles.capB, { color: colors.text, marginTop: 6 }]}>Earns nothing</Text>
        {NOTHING.map((c) => (
          <View key={c} style={styles.li}>
            <Icon name="block" size={18} />
            <Text style={[styles.body14, { color: colors.text }]}>{c}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

// The Copilot unlock card (design GateAPI.rewardsCard): locked = the checklist; unlocked = the perks, MCP's countdown, two actions.
export function CopilotCard() {
  const { colors } = useTheme();
  const r = useRewards();
  const open = r.cpView === "unlocked";
  return (
    <Card>
      <Head title="Copilot" right={open ? <Pill label="Copilot tester" tone="purple" /> : <Pill label="Locked" tone="grey" icon={<Icon name="lock" size={12} color="muted" />} />} />
      {open ? (
        <>
          {PERKS.map((p) => (
            <View key={p} style={styles.li}>
              <Icon name="check" size={18} color="positive" />
              <Text style={[styles.body14, { color: colors.text }]}>{p}</Text>
            </View>
          ))}
          <View style={styles.li}>
            <Icon name="lock" size={18} color="positive" />
            <Text style={[styles.body14, { color: colors.text }]}>MCP unlocks in {UNLOCK.mcpDelayDays} days</Text>
          </View>
        </>
      ) : (
        <GateList compact />
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <Button label="Open Copilot" v="outline" size="md" style={{ flex: 1 }} onPress={() => router.push("/copilot" as Href)} />
        <Button label="MCP" v="outline" size="md" icon="cable" style={{ flex: 1 }} onPress={() => toast(open ? `MCP opens ${UNLOCK.mcpDelayDays} days after Copilot unlocked` : `MCP opens ${UNLOCK.mcpDelayDays} days after Copilot unlocks`)} />
      </View>
    </Card>
  );
}

/* ===================== REFERRALS ===================== */
const MEDAL: Record<string, { bg: string; fg: string }> = {
  Bronze: { bg: "#4A2E1A", fg: "#F0B98A" },
  Silver: { bg: "#353840", fg: "#E1E4EA" },
  Gold: { bg: "#4A3C10", fg: "#F2D36B" },
  Platinum: { bg: "#2F1B61", fg: "#E1D5FA" },
};
function TierBadge({ name }: { name: string }) {
  const m = MEDAL[name];
  return (
    <View style={[styles.tb, { backgroundColor: m.bg }]}>
      <Icon name="workspace_premium" size={16} color={m.fg} filled />
      <Text style={[styles.tbT, { color: m.fg }]}>{name}</Text>
    </View>
  );
}

const CODES = [{ code: "VN-7K2Q", by: "Leo", on: "Oct 2" }, { code: "VN-M4XP" }, { code: "VN-H9TD" }, { code: "VN-DC5Q" }, { code: "VN-4CQT" }];
type FF = "all" | Friend["st"];

function Referrals() {
  const { colors } = useTheme();
  const me = useRewards();
  const [ff, setFf] = useState<FF>("all");
  const S = REFERRAL.stats;
  const tierI = TIERS.findLastIndex((t) => S.active >= t.min), next = TIERS[tierI + 1];
  const unused = CODES.filter((c) => !c.by).length;
  const list = FRIENDS.filter((f) => ff === "all" || f.st === ff);
  const stTag = (s: Friend["st"]) => (s === "active" ? <Pill label="Active" tone="teal" /> : s === "verified" ? <Pill label="Verified" tone="purple" /> : <Pill label="Joined" tone="grey" />);
  return (
    <>
      {/* The invite ticket: the code is the one big thing; the link copies on tap; two labelled actions; who referred you as a footnote. */}
      <View style={[styles.tk, { backgroundColor: colors.surface }]}>
        <LinearGradient colors={["rgba(252,84,87,0.22)", "rgba(112,58,230,0.18)", "rgba(112,58,230,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.tkTop}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>Your invite code</Text>
            {me.codeEdited ? (
              <Pill label="Changed" tone="grey" />
            ) : (
              <Pressable onPress={openEditCode} hitSlop={10} style={styles.tkEdit} accessibilityRole="button" accessibilityLabel="Edit code">
                <Icon name="edit" size={16} color="muted" />
                <Text style={[styles.capB, { color: colors.muted }]}>Edit</Text>
              </Pressable>
            )}
          </View>
          <Text style={[styles.tkCode, { color: colors.text }]} selectable>{REFERRAL.code}</Text>
          <Pressable onPress={() => copy(`https://${REFERRAL.link}`, "Link")} style={styles.tkLink} accessibilityRole="button" accessibilityLabel="Copy invite link">
            <Text style={[styles.body14, { color: colors.muted }]} numberOfLines={1}>{REFERRAL.link}</Text>
            <Icon name="content_copy" size={16} color="muted" />
          </Pressable>
        </View>
        <View style={styles.perf}>
          <View style={[styles.notch, { backgroundColor: colors.bg, marginLeft: -10 }]} />
          <View style={[styles.dash, { borderColor: colors.borderControl }]} />
          <View style={[styles.notch, { backgroundColor: colors.bg, marginRight: -10 }]} />
        </View>
        <View style={styles.tkBot}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Copy code" v="outline" size="md" icon="content_copy" style={{ flex: 1 }} onPress={() => copy(REFERRAL.code, "Code")} />
            <Button label="Share invite" size="md" icon={shareIcon} fam={families.portfolio} style={{ flex: 1 }} onPress={() => openShare({ kind: "invite" })} />
          </View>
          <View style={styles.byRow}>
            <View style={[styles.byAvS, { backgroundColor: "#1C7C83" }]}>
              <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 11 }}>V</Text>
            </View>
            <Text style={[styles.cap, { color: colors.muted, flex: 1 }]} numberOfLines={1}>
              Referred by <Text style={{ fontFamily: font.semibold, color: colors.text }}>{REFERRAL.by.name}</Text> {REFERRAL.by.x}
            </Text>
            <Pill label="+5% points" tone="teal" />
          </View>
        </View>
      </View>

      <Card>
        <Head title="Your referrals" />
        <View style={[styles.stats, { backgroundColor: colors.bg }]}>
          {[["Joined", S.joined], ["Verified", S.verified], ["Active", S.active]].map(([l, v], i) => (
            <View key={l} style={[{ flex: 1, gap: 2 }, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.divider, paddingLeft: 12 }]}>
              <Text style={[styles.cap, { color: colors.text }]}>{l}</Text>
              <Text style={[styles.body15b, { color: colors.text }]}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={styles.rp}>
          <Text style={[styles.body15, { color: colors.text, flex: 1 }]}>Referral points</Text>
          <Text style={[styles.v20, { color: colors.text }]}>{nf(REFERRAL.points)}</Text>
        </View>
      </Card>

      <Card style={{ gap: 0 }}>
        <Head title="Invite codes" sub={`${unused} of ${CODES.length} unused`} right={<Info k="codes" />} />
        {CODES.map((c) => (
          <View key={c.code} style={[styles.ic, { borderTopColor: colors.divider }]}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.icT, { color: c.by ? colors.muted : colors.text, textDecorationLine: c.by ? "line-through" : "none" }]}>{c.code}</Text>
              {!c.by && <Pill label="Unused" tone="teal" />}
            </View>
            {c.by ? (
              <Text style={[styles.cap, { color: colors.text }]}>Used by {c.by}, {c.on}</Text>
            ) : (
              <Pressable onPress={() => copy(c.code, "Code")} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Copy ${c.code}`}>
                <Icon name="content_copy" size={20} />
              </Pressable>
            )}
          </View>
        ))}
      </Card>

      <Card>
        <Head title="Referral tier" right={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><TierBadge name={TIERS[tierI].name} /><Info k="tier" /></View>} />
        {next && (
          <>
            <Text style={[styles.cap, { color: colors.text }]}>
              <Text style={{ fontFamily: font.semibold }}>{S.active}</Text> of {next.min} for {next.name}
            </Text>
            <View style={[styles.meter, { backgroundColor: colors.segment }]}>
              <LinearGradient colors={["#FC5457", "#703AE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${(S.active / next.min) * 100}%`, height: "100%", borderRadius: 3 }} />
            </View>
          </>
        )}
        <View style={[styles.tiers, { backgroundColor: colors.bg }]}>
          {TIERS.map((t, i) => (
            <View key={t.name} style={[styles.tier, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <TierBadge name={t.name} />
              <Text style={[styles.cap, { color: colors.text, flex: 1, fontSize: 13 }]}>{t.need}</Text>
              <Text style={[styles.body15b, { color: i === tierI ? colors.link : colors.text }]}>{t.share}%</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 0 }}>
        <Head title="Friends" count={FRIENDS.length} />
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <PillTabs items={[["all", "All"], ["active", "Active"], ["verified", "Verified"], ["invited", "Joined"]] as [FF, string][]} value={ff} onChange={setFf} color="#703AE6" />
        </View>
        {list.map((f, i) => (
          <View key={f.name} style={[styles.fr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <XPic seed={f.name} name={f.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.body15b, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
              {f.x && (
                <View style={styles.xh}>
                  <XGlyph color={colors.muted} />
                  <Text style={[styles.cap, { color: colors.muted }]}>{f.x}</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={[styles.cap, { color: colors.text }]}>{f.joined}</Text>
              {stTag(f.st)}
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 0 }}>
        <Head title="How referrals work" right={<Info k="refhow" />} />
        {([["link", "Share your link or code"], ["mark_email_read", "Friend verifies email"], ["stars", "You earn referral points"]] as const).map(([ic, l], i) => (
          <View key={l} style={styles.step}>
            <View style={[styles.stepI, { backgroundColor: colors.purpleTint }]}>
              <Icon name={ic} size={20} color={colors.onPurpleTint} />
              <View style={[styles.stepN, { backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 10 }}>{i + 1}</Text>
              </View>
            </View>
            <Text style={[styles.body15b, { color: colors.text }]}>{l}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

/* ===================== LEADERBOARD ===================== */
const PER = 20;
function Who({ r }: { r: { name: string | null; x: string | null; anon: number; pic: "x" | "id" } }) {
  const { colors } = useTheme();
  return (
    <View style={styles.who}>
      {!r.name ? <AnonPic /> : <XPic seed={r.name} name={r.pic === "x" ? r.x ?? r.name : r.name} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.body15b, { color: colors.text }]} numberOfLines={1}>{r.name ?? `Anonymous #${r.anon}`}</Text>
        {r.name && r.x && (
          <View style={styles.xh}>
            <XGlyph color={colors.muted} />
            <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{r.x}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Board({ onProfile }: { onProfile: () => void }) {
  const { colors } = useTheme();
  const me = useRewards();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const rows = LEADERBOARD.filter((r) => !q.trim() || (r.name ?? `Anonymous #${r.anon}`).toLowerCase().includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / PER)), p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PER, p * PER + PER);
  const medal = (k: number) => (k === 1 ? ["#FC5457", "#B6479E"] : k === 2 ? [colors.purpleTint, colors.purpleTint] : k === 3 ? [colors.pinkTint, colors.pinkTint] : null);
  return (
    <>
      <Card>
        <View style={styles.meRow}>
          {me.show ? <MeAvatar /> : <AnonPic />}
          <Text style={[styles.body15b, { color: colors.text }]}>{me.show ? me.name : "Anonymous"}</Text>
          <Pill label="You" tone="purple" style={{ alignSelf: "center" }} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={onProfile} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.body15b, { color: colors.link }]}>Edit profile</Text>
          </Pressable>
        </View>
        <View style={[styles.stats, { backgroundColor: colors.bg }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cap, { color: colors.text }]}>Your rank</Text>
            <Text style={[styles.body15b, { color: colors.text }]}>#{MY_RANK}</Text>
            <Text style={[styles.cap, { color: colors.text }]}>of {nf(USERS)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2, borderLeftWidth: 1, borderLeftColor: colors.divider, paddingLeft: 12 }}>
            <Text style={[styles.cap, { color: colors.text }]}>Points</Text>
            <Text style={[styles.body15b, { color: colors.text }]}>{nf(OVERVIEW.points)}</Text>
            <Text style={[styles.cap, { color: colors.text }]}>{SEASON.tag}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ gap: 0 }}>
        <View style={[styles.search, { borderColor: colors.border }]}>
          <Icon name="search" size={22} />
          <TextInput value={q} onChangeText={(v) => (setQ(v), setPage(0))} placeholder="Search names" placeholderTextColor={colors.muted} style={[styles.searchIn, { color: colors.text }]} accessibilityLabel="Search names" />
        </View>
        <View style={[styles.th, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.cap, { color: colors.text, width: 40, textAlign: "center" }]}>Rank</Text>
          <Text style={[styles.cap, { color: colors.text, flex: 1 }]}>Name</Text>
          <Text style={[styles.cap, { color: colors.text }]}>Points</Text>
        </View>
        {shown.map((r, i) => {
          const m = medal(r.k);
          return (
            <View key={r.k} style={[styles.lr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <View style={{ width: 40, alignItems: "center" }}>
                {m ? (
                  <View style={styles.medal}>
                    <LinearGradient colors={m as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                    <Text style={[styles.body15b, { color: r.k === 1 ? "#FFFFFF" : r.k === 2 ? colors.onPurpleTint : colors.onPinkTint }]}>{r.k}</Text>
                  </View>
                ) : (
                  <Text style={[styles.body15b, { color: colors.text }]}>{r.k}</Text>
                )}
              </View>
              <Who r={r} />
              <Text style={[styles.body15b, { color: colors.text }]}>{nf(r.pts)}</Text>
            </View>
          );
        })}
        {!shown.length && <Text style={[styles.body14, { color: colors.muted, paddingVertical: 20, textAlign: "center" }]}>No one by that name</Text>}
        <View style={[styles.pg, { borderTopColor: colors.divider }]}>
          <Text style={[styles.cap, { color: colors.text, flex: 1 }]}>{rows.length ? `${p * PER + 1} to ${Math.min(rows.length, p * PER + PER)} of ${rows.length}` : "0 of 0"}</Text>
          <Pressable onPress={() => setPage(Math.max(0, p - 1))} disabled={p === 0} style={styles.pgB} accessibilityRole="button" accessibilityLabel="Previous page">
            <Icon name="chevron_left" size={22} color={p === 0 ? colors.disabled : colors.text} />
          </Pressable>
          {Array.from({ length: pages }, (_, i) => (
            <Pressable key={i} onPress={() => setPage(i)} style={[styles.pgN, i === p && { backgroundColor: colors.purpleTint }]} accessibilityRole="button" accessibilityState={{ selected: i === p }} accessibilityLabel={`Page ${i + 1}`}>
              <Text style={[styles.body15b, { color: i === p ? colors.onPurpleTint : colors.text }]}>{i + 1}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setPage(Math.min(pages - 1, p + 1))} disabled={p >= pages - 1} style={styles.pgB} accessibilityRole="button" accessibilityLabel="Next page">
            <Icon name="chevron_right" size={22} color={p >= pages - 1 ? colors.disabled : colors.text} />
          </Pressable>
        </View>
      </Card>
      <Text style={[styles.cap, { color: colors.text, textAlign: "center", paddingHorizontal: 16 }]}>{SEASON.tag} points, both chains together. Accounts under review are hidden.</Text>
    </>
  );
}

/* ===================== PROFILE =====================
   One identity block that is the leaderboard row itself (it changes live with the switch), then two settings rows: the display name
   (edited in its own sheet, so the screen never shows the name three times) and the leaderboard switch. */
function Profile() {
  const { colors } = useTheme();
  const me = useRewards();
  const shown = me.show ? me.name : `Anonymous #${ANON}`;
  return (
    <>
      <Card style={styles.pHero}>
        {me.show ? <MeAvatar size={72} /> : <AnonPic size={72} />}
        <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{shown}</Text>
        <View style={{ alignSelf: "center" }}>
          <Pill label="Copilot tester" tone="purple" />
        </View>
        <Text style={[styles.body14, { color: colors.muted, marginTop: 6 }]}>
          <Text style={{ fontFamily: font.semibold, color: colors.text }}>#{MY_RANK}</Text> of {nf(USERS)} · <Text style={{ fontFamily: font.semibold, color: colors.text }}>{nf(OVERVIEW.points)}</Text> points
        </Text>
      </Card>
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        <Pressable onPress={openEditName} style={styles.set} accessibilityRole="button" accessibilityLabel={`Display name, ${me.name}`}>
          <Text style={[styles.body15, { color: colors.text, flex: 1 }]}>Display name</Text>
          <Text style={[styles.body15b, { color: colors.muted }]} numberOfLines={1}>{me.name}</Text>
          <Icon name="chevron_right" size={20} color="muted" />
        </Pressable>
        <View style={[styles.set, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body15, { color: colors.text }]}>Show me on the leaderboard</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{me.show ? "Your name is public" : `You show as Anonymous #${ANON}`}</Text>
          </View>
          <Switch value={me.show} onValueChange={(v) => setRewards({ show: v })} accessibilityLabel="Show me on the leaderboard" trackColor={{ true: "#703AE6", false: colors.disabled }} thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined} />
        </View>
      </Card>
      <Text style={[styles.cap, { color: colors.muted, textAlign: "center" }]}>Your email is never shown.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  tk: { borderRadius: 16, overflow: "hidden" },
  tkTop: { padding: 16, paddingBottom: 14, gap: 4 },
  tkEdit: { flexDirection: "row", alignItems: "center", gap: 4 },
  tkCode: { fontFamily: font.semibold, fontSize: 40, lineHeight: 48, letterSpacing: 2, marginTop: 2 },
  tkLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  perf: { flexDirection: "row", alignItems: "center", height: 20 },
  notch: { width: 20, height: 20, borderRadius: 10 },
  dash: { flex: 1, borderTopWidth: 1, borderStyle: "dashed", marginHorizontal: 6 },
  tkBot: { padding: 16, paddingTop: 12, gap: 14 },
  byAvS: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  pHero: { alignItems: "center", gap: 6, paddingVertical: 24 },
  heroName: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, marginTop: 6 },
  set: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  sheetF: { height: 56, borderRadius: 10, borderWidth: 1, justifyContent: "center", paddingHorizontal: 14, marginTop: 18 },
  body: { padding: 16, paddingTop: 4, gap: 12, paddingBottom: 40 },
  sea: { flexDirection: "row", alignItems: "center", gap: 8 },
  lb: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 22, paddingHorizontal: 8, borderRadius: 8, alignSelf: "flex-start" },
  pillT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  capB: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  body14: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  body15: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  body15b: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, fontVariant: ["tabular-nums"] },
  v20: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, fontVariant: ["tabular-nums"] },
  hero: { borderRadius: 20, padding: 16, overflow: "hidden", gap: 4 },
  hl: { color: "rgba(255,255,255,0.92)", fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  big: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 40, lineHeight: 48, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  rank: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)" },
  rankT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 13 },
  hstats: { flexDirection: "row", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.26)" },
  hsep: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.28)" },
  hv: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
  chainT: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  quest: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  qi: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qbar: { flexDirection: "row", gap: 4, marginTop: 4, marginBottom: 10 },
  qseg: { flex: 1, height: 6, borderRadius: 3 },
  qdone: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  qstart: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, justifyContent: "center" },
  li: { flexDirection: "row", alignItems: "center", gap: 8 },
  gate: { borderRadius: 12 },
  gr: { flexDirection: "row", alignItems: "center", gap: 12 },
  gok: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#32EEE2", alignItems: "center", justifyContent: "center" },
  gno: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  mchips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 36 },
  mchip: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 13 },
  mchipT: { fontFamily: font.semibold, fontSize: 12 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: { fontFamily: font.semibold, fontSize: 30, lineHeight: 38, letterSpacing: 0.5 },
  link: { flexDirection: "row", alignItems: "center", gap: 8, height: 52, paddingHorizontal: 14, borderRadius: 12 },
  by: { borderTopWidth: 1, paddingTop: 12, gap: 8, marginTop: 4 },
  byRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  byAv: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", borderRadius: 12, padding: 12 },
  rp: { flexDirection: "row", alignItems: "center" },
  ic: { flexDirection: "row", alignItems: "center", minHeight: 60, borderTopWidth: 1, gap: 8 },
  icT: { fontFamily: font.semibold, fontSize: 16, letterSpacing: 0.3 },
  tb: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14 },
  tbT: { fontFamily: font.semibold, fontSize: 13 },
  meter: { height: 6, borderRadius: 3, overflow: "hidden" },
  tiers: { borderRadius: 12, paddingHorizontal: 12 },
  tier: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  fr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  xh: { flexDirection: "row", alignItems: "center", gap: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 72 },
  stepI: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stepN: { position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  who: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  meRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, marginBottom: 8 },
  searchIn: { flex: 1, fontFamily: font.regular, fontSize: 15, paddingVertical: 0 },
  th: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  lr: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 },
  medal: { width: 36, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pg: { flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  pgB: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  pgN: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pav: { flexDirection: "row", alignItems: "center", gap: 12 },
  nf: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  of: { flex: 1, height: 56, borderRadius: 10, borderWidth: 1, justifyContent: "center", paddingHorizontal: 14 },
  ofL: { position: "absolute", top: -9, left: 10, paddingHorizontal: 4, fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  ofIn: { fontFamily: font.semibold, fontSize: 16, paddingVertical: 0 },
  tg: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  prev: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 14, borderRadius: 12 },
});
