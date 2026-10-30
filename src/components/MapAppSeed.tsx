"use client";

// 당근 SEED Design(Apache-2.0) 부품으로 만든 화면. 구성은 MapAppShadcn과 같다.
// 헤더 / 지도(+ 조작 패널, 선택한 식당 카드) / 오른쪽 사이드바(요약·탭). 좁은 화면에서는 사이드바가 지도 아래로 내려간다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionButton, Icon } from "@seed-design/react";
import { Badge, List, SegmentedControl, Switch, Tabs, TextField } from "@seed-design/react";
import { IconChevronLeftLine, IconChevronRightLine, IconForkSpoonFill, IconMagnifyingglassLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import KakaoMap, { type KakaoMapHandle, type Layers } from "./KakaoMap";
import type { MapData, Mode, Rec } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("ko-KR");
const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

function Seg({ value, onChange, items, label }: { value: string; onChange: (v: string) => void; items: [string, string][]; label: string }) {
  return (
    <SegmentedControl.Root value={value} onValueChange={onChange} aria-label={label} style={{ width: "100%" }}>
      <SegmentedControl.Indicator />
      {items.map(([v, text]) => (
        <SegmentedControl.Item key={v} value={v} style={{ flex: 1, minWidth: 0 }}>
          <SegmentedControl.ItemHiddenInput />
          {text}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (c: boolean) => void; label: string }) {
  return (
    <Switch.Root checked={checked} onCheckedChange={onChange} size="16">
      <Switch.HiddenInput />
      <Switch.Control><Switch.Thumb /></Switch.Control>
      <Switch.Label>{label}</Switch.Label>
    </Switch.Root>
  );
}

function Dot({ color, ring, square }: { color: string; ring?: boolean; square?: boolean }) {
  return (
    <span
      className={square ? "inline-block size-3 shrink-0 rounded-[3px]" : "inline-block size-2.5 shrink-0 rounded-full"}
      style={{ background: color, boxShadow: ring ? "0 0 0 2px #1a1c20" : undefined }}
    />
  );
}

const panel = "rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-floating)] shadow-[0_4px_16px_rgb(0_0_0/0.08)]";
const muted = "text-[var(--seed-color-fg-neutral-muted)]";

export default function MapAppSeed() {
  const [data, setData] = useState<MapData | null>(null);
  const [R, setR] = useState(100);
  const [M, setM] = useState<Mode>("미포함");
  const [layers, setLayers] = useState<Layers>({ ring: true, schoolRing: true, non: true });
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState("recs");
  const [q, setQ] = useState("");
  const [dong, setDong] = useState<string | null>(null); // 동네 탭: 고른 행정동(없으면 춘천시 전체)
  const [more, setMore] = useState(false);              // 동네 탭: 가맹 식당 전체 보기
  const [ctrlOpen, setCtrlOpen] = useState(false);     // 휴대폰: 조건 패널 펼침
  const [drawerOpen, setDrawerOpen] = useState(false); // 휴대폰: 아래 목록 서랍 펼침
  const mapRef = useRef<KakaoMapHandle>(null);

  useEffect(() => {
    fetch("/data/map-data.json").then((r) => r.json()).then(setData);
  }, []);

  const recs = useMemo(() => (data ? data.recs.filter((d) => d[0] === M && d[1] === R) : []), [data, M, R]);
  const sum = data?.recSummary.find((d) => d.편의점 === M && d.가맹원반경_m === R);
  const bars = data?.recSummary.filter((d) => d.편의점 === M) ?? [];
  const barMax = Math.max(1, ...(data?.recSummary.map((d) => d.권유식당) ?? [1]));
  const sel: Rec | undefined = recs.find((d) => d[2] === selected);

  // 동네(행정동)별 식당 수. 권유 식당은 지금 고른 반경·편의점 기준
  const dongStats = useMemo(() => {
    if (!data) return [];
    return data.dongs.map((d) => ({
      ...d,
      rec: recs.filter((r) => r[11] === d.c).length,
      non: data.non.filter((p) => p[4] === d.c).length,
      mem: data.members.filter((p) => p[4] === d.c).length,
      school: data.schools.filter((s) => s.g === d.c).length,
    })).sort((a, b) => b.rec - a.rec || b.non - a.non || a.n.localeCompare(b.n, "ko"));
  }, [data, recs]);
  const inDong = useMemo(() => {
    if (!data || !dong) return null;
    return {
      name: data.dongs.find((d) => d.c === dong)?.n ?? "",
      recs: recs.filter((r) => r[11] === dong),
      non: data.non.filter((p) => p[4] === dong),
      mem: data.members.filter((p) => p[4] === dong),
    };
  }, [data, dong, recs]);
  const openDong = useCallback((c: string) => {
    if (!data) return;
    setDong(c);
    setMore(false);
    const pts: [number, number][] = [...data.members, ...data.non].filter((p) => p[4] === c).map((p) => [p[0], p[1]]);
    data.schools.filter((s) => s.g === c).forEach((s) => pts.push([s.y, s.x]));
    mapRef.current?.fit(pts);
  }, [data]);

  const schools = useMemo(() => {
    if (!data) return [];
    const k = q.trim();
    return data.schools
      .filter((s) => !k || s.n.includes(k) || s.d.includes(k))
      .sort((a, b) => b.rc[M][R] - a.rc[M][R] || a.n.localeCompare(b.n, "ko"));
  }, [data, q, M, R]);

  const pickRec = useCallback((d: Rec) => {
    setSelected(d[2]);
    setDong(d[11]);          // 그 식당이 있는 동네의 원·점을 그린다
    setDrawerOpen(false);
    mapRef.current?.focus(d[3], d[4], 3);
  }, []);

  useEffect(() => { if (selected !== null && !recs.some((d) => d[2] === selected)) setSelected(null); }, [recs, selected]);

  const stats = (
          <div className="grid grid-cols-3 gap-2">
      {[
        { v: sum?.권유식당, l: "권유 식당", brand: true },
        { v: sum?.권유식당있는학교, l: "권유 식당 있는 학교" },
        { v: data?.schools.length, l: "전체 학교" },
      ].map((t) => (
        <div key={t.l} className={`rounded-2xl p-3 ${t.brand ? "bg-[var(--seed-color-bg-brand-weak)]" : "bg-[var(--seed-color-bg-neutral-weak)]"}`}>
          <div className={`font-mono text-2xl font-bold tabular-nums leading-none ${t.brand ? "text-[var(--seed-color-fg-brand)]" : ""}`}>{t.v ?? "–"}</div>
          <div className={`mt-1.5 text-[11.5px] leading-tight ${muted}`}>{t.l}</div>
        </div>
      ))}
    </div>
  );
  const tabs = (
          <Tabs.Root value={tab} onValueChange={setTab} triggerLayout="fill" size="medium" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* 탭 영역만 스크롤한다. 탭 머리는 위에 붙여 둔다 */}
      <Tabs.List className="sticky top-0 z-10 bg-[var(--seed-color-bg-layer-default)]">
        <Tabs.Trigger value="recs">권유 식당</Tabs.Trigger>
        <Tabs.Trigger value="dongs">동네</Tabs.Trigger>
        <Tabs.Trigger value="schools">학교</Tabs.Trigger>
        <Tabs.Trigger value="info">정보</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>

      <Tabs.Content value="recs" className="pt-3">
        <p className={`mb-1 px-1 text-xs ${muted}`}>가장 가까운 가맹점이 먼 순서예요.</p>
        <List.Root>
          {recs.map((d) => (
            <List.Item key={`${d[5]}-${d[3]}`} onClick={() => pickRec(d)}
              className={`cursor-pointer rounded-xl ${d[2] === selected ? "bg-[var(--seed-color-bg-brand-weak)]" : "hover:bg-[var(--seed-color-bg-neutral-weak)]"}`}>
              <List.Prefix>
                <span className="grid size-7 place-items-center rounded-full bg-[var(--map-non)] font-mono text-xs font-bold text-white">{d[2]}</span>
              </List.Prefix>
              <List.Content>
                <List.Title>{d[5]}</List.Title>
                <List.Detail>{d[6]} · {d[7]} {fmt(d[8])}m</List.Detail>
              </List.Content>
              <List.Suffix>
                <Badge.Root tone="brand" variant="weak" size="medium"><Badge.Label>{fmt(d[9])}m</Badge.Label></Badge.Root>
              </List.Suffix>
            </List.Item>
          ))}
        </List.Root>
        {recs.length === 0 && <p className={`p-6 text-center text-sm ${muted}`}>이 기준에서는 권유 식당이 없어요</p>}
      </Tabs.Content>

      <Tabs.Content value="dongs" className="pt-3">
        {/* 경로: 춘천시 > 동네 */}
        <div className="mb-2 flex items-center gap-1 px-1 text-sm">
          {dong && (
            <ActionButton variant="ghost" size="xsmall" layout="iconOnly" aria-label="춘천시로" onClick={() => { setDong(null); if (data) mapRef.current?.fit(data.schools.map((s) => [s.y, s.x])); }}>
              <Icon svg={<IconChevronLeftLine />} />
            </ActionButton>
          )}
          <button className={dong ? muted : "font-bold"} onClick={() => setDong(null)}>춘천시</button>
          {inDong && (<><span className={muted}>›</span><span className="font-bold">{inDong.name}</span></>)}
        </div>

        {!inDong && (
          <List.Root>
            {dongStats.map((d) => (
              <List.Item key={d.c} onClick={() => openDong(d.c)} className="cursor-pointer rounded-xl hover:bg-[var(--seed-color-bg-neutral-weak)]">
                <List.Content>
                  <List.Title>{d.n}</List.Title>
                  <List.Detail>미가맹 {fmt(d.non)} · 가맹 {fmt(d.mem)} · 학교 {d.school}</List.Detail>
                </List.Content>
                <List.Suffix>
                  <span className="flex items-center gap-1">
                    {d.rec > 0 && <Badge.Root tone="brand" variant="weak" size="medium"><Badge.Label>권유 {d.rec}</Badge.Label></Badge.Root>}
                    <IconChevronRightLine width={16} height={16} className={muted} />
                  </span>
                </List.Suffix>
              </List.Item>
            ))}
          </List.Root>
        )}

        {inDong && (
          <div className="flex flex-col gap-4">
            <section>
              <h3 className={`mb-1 px-1 text-xs font-bold ${muted}`}>권유 식당 {inDong.recs.length}곳 (가맹 원 {R}m · 편의점 {M})</h3>
              {inDong.recs.length === 0 && <p className={`px-1 text-sm ${muted}`}>이 동네에는 지금 기준으로 권유 식당이 없어요</p>}
              <List.Root>
                {inDong.recs.map((d) => (
                  <List.Item key={`${d[5]}-${d[3]}`} onClick={() => pickRec(d)} className="cursor-pointer rounded-xl hover:bg-[var(--seed-color-bg-neutral-weak)]">
                    <List.Prefix><span className="grid size-7 place-items-center rounded-full bg-[var(--map-non)] font-mono text-xs font-bold text-white">{d[2]}</span></List.Prefix>
                    <List.Content><List.Title>{d[5]}</List.Title><List.Detail>{d[6]} · {d[7]} {fmt(d[8])}m</List.Detail></List.Content>
                  </List.Item>
                ))}
              </List.Root>
            </section>
            <section>
              <h3 className={`mb-1 px-1 text-xs font-bold ${muted}`}>미가맹 식당 {inDong.non.length}곳</h3>
              <List.Root>
                {inDong.non.map((p) => (
                  <List.Item key={`${p[2]}-${p[0]}`} onClick={() => mapRef.current?.focus(p[0], p[1], 3)} className="cursor-pointer rounded-xl hover:bg-[var(--seed-color-bg-neutral-weak)]">
                    <List.Prefix><Dot color="var(--map-non)" /></List.Prefix>
                    <List.Content><List.Title>{p[2]}</List.Title><List.Detail>{p[3]}</List.Detail></List.Content>
                  </List.Item>
                ))}
              </List.Root>
            </section>
            <section>
              <h3 className={`mb-1 px-1 text-xs font-bold ${muted}`}>가맹 식당 {fmt(inDong.mem.length)}곳</h3>
              <List.Root>
                {(more ? inDong.mem : inDong.mem.slice(0, 30)).map((p) => (
                  <List.Item key={`${p[2]}-${p[0]}-${p[1]}`} onClick={() => mapRef.current?.focus(p[0], p[1], 3)} className="cursor-pointer rounded-xl hover:bg-[var(--seed-color-bg-neutral-weak)]">
                    <List.Prefix><Dot color="var(--map-member)" /></List.Prefix>
                    <List.Content><List.Title>{p[2]}</List.Title><List.Detail>{p[3]}</List.Detail></List.Content>
                  </List.Item>
                ))}
              </List.Root>
              {!more && inDong.mem.length > 30 && (
                <div className="px-1 pt-1"><ActionButton variant="neutralWeak" size="small" onClick={() => setMore(true)}>가맹 식당 {fmt(inDong.mem.length - 30)}곳 더 보기</ActionButton></div>
              )}
            </section>
          </div>
        )}
      </Tabs.Content>

      <Tabs.Content value="schools" className="flex flex-col gap-2 pt-3">
        <TextField.Root size="medium" variant="outline">
          <TextField.PrefixIcon svg={<IconMagnifyingglassLine />} />
          <TextField.Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="학교·읍면동 검색" />
        </TextField.Root>
        <div>
          <List.Root>
            {schools.map((s) => (
              <List.Item key={s.n} onClick={() => { setDong(s.g); mapRef.current?.focus(s.y, s.x, 6); }} className="cursor-pointer rounded-xl hover:bg-[var(--seed-color-bg-neutral-weak)]">
                <List.Prefix><Dot square color={s.rc[M][R] > 0 ? "var(--map-ask)" : "var(--map-covered)"} /></List.Prefix>
                <List.Content>
                  <List.Title>{s.n}</List.Title>
                  <List.Detail>{s.d} · 1km 안 가맹점 {fmt(s.k1[M])}곳</List.Detail>
                </List.Content>
                {s.rc[M][R] > 0 && (
                  <List.Suffix><Badge.Root tone="positive" variant="weak" size="medium"><Badge.Label>권유 {s.rc[M][R]}</Badge.Label></Badge.Root></List.Suffix>
                )}
              </List.Item>
            ))}
          </List.Root>
        </div>
      </Tabs.Content>

      <Tabs.Content value="info" className="pt-3">
        <div className="flex flex-col gap-5 text-sm">
          <section>
            <h3 className={`mb-2 text-xs font-bold ${muted}`}>가맹 원 반경별 권유 식당 수 (편의점 {M})</h3>
            <div className="flex flex-col gap-1.5">
              {bars.map((d) => (
                <button key={d.가맹원반경_m} onClick={() => setR(d.가맹원반경_m)} className="grid grid-cols-[44px_1fr_28px] items-center gap-2 text-left">
                  <span className={`font-mono text-xs ${d.가맹원반경_m === R ? "" : muted}`}>{d.가맹원반경_m}m</span>
                  <span className="h-4"><span className="block h-full min-w-0.5 rounded bg-[var(--seed-color-bg-brand-solid)]" style={{ width: `${(d.권유식당 / barMax) * 100}%`, opacity: d.가맹원반경_m === R ? 1 : 0.35 }} /></span>
                  <span className="font-mono text-xs">{d.권유식당}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-1.5">
            <h3 className={`text-xs font-bold ${muted}`}>범례</h3>
            <div className="flex items-center gap-2"><Dot square color="var(--map-ask)" />학교: 1km 안에 권유 식당 있음</div>
            <div className="flex items-center gap-2"><Dot square color="var(--map-covered)" />학교: 권유 식당 없음</div>
            <div className="flex items-center gap-2"><Dot color="var(--map-member)" />식사형 가맹 식당</div>
            <div className="flex items-center gap-2"><Dot color="var(--map-cvs)" />편의점 가맹점 (편의점 포함일 때)</div>
            <div className="flex items-center gap-2"><Dot color="var(--map-non)" />미가맹 식당</div>
            <div className="flex items-center gap-2"><Dot ring color="var(--map-non)" />가맹 권유 식당</div>
            <div className="flex items-center gap-2"><Dot square color="color-mix(in oklab, var(--map-city) 25%, transparent)" />춘천시 구역</div>
          </section>
          <section className={`flex flex-col gap-1.5 text-xs leading-relaxed ${muted}`}>
            <h3 className="font-bold">고른 규칙</h3>
            <p>공식 업종이 일반음식점이고 식사형 업태인 곳만 봤어요. 술집·카페·편의점과 상호에 술집·비식당 표현이 있는 곳은 뺐고, 팀이 확인해 7곳을 더 뺐어요.</p>
            <h3 className="mt-2 font-bold">출처</h3>
            <p>춘천시 요식업소 현황(공공데이터포털 15003349, 2026-05-27), 춘천시 아동급식카드 가맹점(2026-08-26, 팀 전처리 4,395곳), 상가(상권)정보(15083033, 2026-06), 아동복지급식정보표준데이터(15034530), 초중등학교위치표준데이터(15021148, 2026-10). 춘천시 경계 © OpenStreetMap 기여자(ODbL). 지도 © Kakao. UI: SEED Design(Apache-2.0). 거리는 직선거리.</p>
          </section>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--seed-color-bg-layer-basement)] text-[var(--seed-color-fg-neutral)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] px-4">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--seed-color-bg-brand-solid)] text-white"><IconForkSpoonFill width={18} height={18} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-bold leading-tight">춘천 급식카드 가맹 권유 지도</h1>
          <p className={`truncate text-xs ${muted}`}>학교 1km 안, 기존 가맹점이 닿지 않는 미가맹 식당</p>
        </div>
        <span className="hidden sm:block"><Badge.Root tone="neutral" variant="weak" size="medium"><Badge.Label>2026 KNU 데이터톤 5조</Badge.Label></Badge.Root></span>
      </header>

      <main className="relative flex min-h-0 flex-1">
        <section className="relative min-w-0 flex-1">
          {data ? (
            <KakaoMap ref={mapRef} data={data} R={R} M={M} layers={layers} dong={dong} onSelectRec={(rank) => { setSelected(rank); const r = recs.find((d) => d[2] === rank); if (r) setDong(r[11]); }} selectedRank={selected} />
          ) : (
            <div className={`grid h-full place-items-center text-sm ${muted}`}>데이터를 불러오는 중…</div>
          )}

          {/* 조작 패널. 휴대폰에서는 한 줄로 접어 두고 누르면 펼친다 */}
          <button onClick={() => setCtrlOpen(true)}
            className={`${panel} absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 text-sm font-bold lg:hidden ${ctrlOpen ? "hidden" : ""}`}>
            <span className="text-[var(--seed-color-fg-brand)]">가맹 원 {R}m</span>
            <span className={muted}>·</span>
            <span>편의점 {M}</span>
            <span className={`text-xs font-normal ${muted}`}>바꾸기</span>
          </button>
          <div className={`${panel} absolute top-3 left-3 z-10 w-[min(420px,calc(100%-24px))] flex-col gap-3 p-3 lg:flex ${ctrlOpen ? "flex" : "hidden"}`}>
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm font-bold">조건</span>
              <ActionButton variant="ghost" size="small" layout="iconOnly" aria-label="조건 닫기" onClick={() => setCtrlOpen(false)}>
                <Icon svg={<IconXmarkLine />} />
              </ActionButton>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={`text-xs font-medium ${muted}`}>가맹 식당 원 반경</span>
              <Seg label="가맹 식당 원 반경" value={String(R)} onChange={(v) => setR(Number(v))}
                items={(data?.radii ?? [100, 200, 300, 400, 500]).map((r) => [String(r), `${r}m`])} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={`text-xs font-medium ${muted}`}>편의점 가맹점</span>
              <Seg label="편의점 가맹점" value={M} onChange={(v) => setM(v as Mode)} items={[["미포함", "미포함"], ["포함", "포함"]]} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Toggle checked={layers.ring} onChange={(c) => setLayers({ ...layers, ring: c })} label="가맹 원" />
              <Toggle checked={layers.schoolRing} onChange={(c) => setLayers({ ...layers, schoolRing: c })} label="학교 1km" />
              <Toggle checked={layers.non} onChange={(c) => setLayers({ ...layers, non: c })} label="미가맹 식당" />
            </div>
          </div>

          {KEY && data && !dong && !sel && (
            <button onClick={() => { setTab("dongs"); setDrawerOpen(true); }}
              className={`${panel} absolute bottom-[162px] left-3 z-10 px-3 py-1.5 text-xs lg:bottom-3`}>
              <span className="font-bold text-[var(--seed-color-fg-brand)]">동네를 고르면</span> <span className={muted}>그 동네의 가맹 원과 식당 점이 보여요</span>
            </button>
          )}

          {/* 선택한 권유 식당 */}
          {sel && (
            <div className={`${panel} absolute bottom-[162px] left-3 z-10 flex w-[min(360px,calc(100%-24px))] flex-col gap-3 p-4 lg:bottom-3`}>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--map-non)] font-mono text-sm font-bold text-white">{sel[2]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-bold">{sel[5]}</div>
                  <div className={`truncate text-[13px] ${muted}`}>{sel[6]} · {sel[10]}</div>
                </div>
                <ActionButton variant="ghost" size="small" layout="iconOnly" aria-label="닫기" onClick={() => setSelected(null)}>
                  <Icon svg={<IconXmarkLine />} />
                </ActionButton>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-[var(--seed-color-bg-neutral-weak)] p-3">
                  <div className={`text-xs ${muted}`}>가장 가까운 학교</div>
                  <div className="truncate font-bold">{sel[7]}</div>
                  <div className="font-mono text-xs">{fmt(sel[8])}m</div>
                </div>
                <div className="rounded-xl bg-[var(--seed-color-bg-brand-weak)] p-3">
                  <div className={`text-xs ${muted}`}>가장 가까운 가맹점</div>
                  <div className="font-mono text-lg font-bold leading-tight text-[var(--seed-color-fg-brand)]">{fmt(sel[9])}m</div>
                  <div className={`text-xs ${muted}`}>가맹 원 {R}m 밖</div>
                </div>
              </div>
              <p className={`text-[13px] leading-relaxed ${muted}`}>학교 1km 안이지만 주변에 카드를 쓸 수 있는 식당이 없는 자리예요. 가맹하면 아이들이 갈 곳이 새로 생겨요.</p>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 w-[400px] shrink-0 flex-col gap-4 overflow-hidden border-l border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] p-4 lg:flex">
          {stats}
          {tabs}
        </aside>

        {/* 휴대폰: 아래에서 올라오는 목록 서랍. 접으면 요약만, 펼치면 탭과 목록 */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 rounded-t-3xl border-t border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] px-4 pb-4 shadow-[0_-6px_24px_rgb(0_0_0/0.10)] transition-[height] duration-300 lg:hidden"
          style={{ height: drawerOpen ? "72dvh" : 150 }}>
          <button onClick={() => setDrawerOpen(!drawerOpen)} className="flex flex-col items-center gap-1 pt-2" aria-label={drawerOpen ? "목록 접기" : "목록 펼치기"}>
            <span className="h-1 w-10 rounded-full bg-[var(--seed-color-bg-neutral-muted)]" />
            <span className={`text-xs ${muted}`}>{drawerOpen ? "지도 보기" : `권유 식당 ${sum?.권유식당 ?? "–"}곳 목록 보기`}</span>
          </button>
          {stats}
          {drawerOpen && tabs}
        </div>
      </main>
    </div>
  );
}
