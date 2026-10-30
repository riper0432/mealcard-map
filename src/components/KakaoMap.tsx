"use client";

// 카카오맵에 학교·가맹점·미가맹 식당·권유 식당을 그린다.
// 점이 수천 개라 가맹점·미가맹 점과 가맹 원은 "화면 안 + 충분히 확대했을 때"만 그린다.
import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MapData, Mode } from "@/lib/types";

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
const DETAIL_LEVEL = 6; // 이 레벨 이하(더 확대)일 때 가맹점·미가맹 점과 가맹 원을 그린다
const COLOR = { member: "#2a78d6", cvs: "#eda100", non: "#eb6834", ask: "#1baf7a", covered: "#9a9993", city: "#6250d6", ink: "#0b0b0b" };

export interface Layers { ring: boolean; schoolRing: boolean; non: boolean }
export interface KakaoMapHandle { focus: (lat: number, lng: number) => void }
interface Props { data: MapData; R: number; M: Mode; layers: Layers; onDetailChange?: (on: boolean) => void }

/* eslint-disable @typescript-eslint/no-explicit-any */
type K = any;

function dot(color: string, size: number, ring?: string) {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};` +
    `box-shadow:0 0 0 ${ring ? 2 : 1}px ${ring ?? "#fff"};cursor:pointer;transform:translate(-50%,-50%)`;
  return el;
}

const KakaoMap = forwardRef<KakaoMapHandle, Props>(function KakaoMap({ data, R, M, layers, onDetailChange }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<K>(null);
  const tip = useRef<K>(null);                 // 마우스 올리면 뜨는 설명 상자(하나를 돌려 씀)
  const fixed = useRef<{ schoolRings: K[]; schoolDots: { ov: K; el: HTMLDivElement }[]; recs: K[] }>({ schoolRings: [], schoolDots: [], recs: [] });
  const dyn = useRef<K[]>([]);                 // 화면에 따라 다시 그리는 것들
  const [ready, setReady] = useState(false);
  const state = useRef({ R, M, layers });
  state.current = { R, M, layers };

  useImperativeHandle(ref, () => ({
    focus(lat, lng) {
      if (!map.current) return;
      const k = window.kakao;
      map.current.setLevel(3);
      map.current.panTo(new k.maps.LatLng(lat, lng));
    },
  }));

  const showTip = useCallback((lat: number, lng: number, html: string) => {
    const k = window.kakao;
    tip.current.setContent(`<div class="map-tip">${html}</div>`);
    tip.current.setPosition(new k.maps.LatLng(lat, lng));
    tip.current.setMap(map.current);
  }, []);
  const hideTip = useCallback(() => tip.current?.setMap(null), []);

  const hoverable = useCallback((el: HTMLElement, lat: number, lng: number, html: () => string) => {
    el.addEventListener("mouseenter", () => showTip(lat, lng, html()));
    el.addEventListener("mouseleave", hideTip);
  }, [showTip, hideTip]);

  // 처음 한 번: 지도, 춘천시 구역, 학교
  const init = useCallback(() => {
    const k = window.kakao;
    if (!box.current || map.current) return;
    const m = new k.maps.Map(box.current, { center: new k.maps.LatLng(37.88, 127.73), level: 9 });
    map.current = m;
    tip.current = new k.maps.CustomOverlay({ yAnchor: 1.25, zIndex: 10 });

    for (const f of data.boundary.features) {
      const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
      const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      for (const p of polys) {
        new k.maps.Polygon({
          map: m, path: p.map((ring) => ring.map(([x, y]) => new k.maps.LatLng(y, x))),
          strokeWeight: 2, strokeColor: COLOR.city, strokeOpacity: 0.9, fillColor: COLOR.city, fillOpacity: 0.08,
        });
      }
    }

    const b = new k.maps.LatLngBounds();
    fixed.current.schoolRings = data.schools.map((s) => {
      b.extend(new k.maps.LatLng(s.y, s.x));
      return new k.maps.Circle({ map: m, center: new k.maps.LatLng(s.y, s.x), radius: data.schoolR,
        strokeWeight: 1, strokeStyle: "dash", strokeColor: COLOR.covered, strokeOpacity: 0.8, fillColor: COLOR.covered, fillOpacity: 0.04 });
    });
    fixed.current.schoolDots = data.schools.map((s) => {
      const el = dot(COLOR.covered, 16);
      hoverable(el, s.y, s.x, () => {
        const { R, M } = state.current;
        return `<b>${s.n}</b> (${s.d})<br>1km 안 가맹점 ${s.k1[M].toLocaleString()}곳 (편의점 ${M})<br>1km 안 권유 식당 ${s.rc[M][R]}곳 (가맹 원 ${R}m)`;
      });
      const ov = new k.maps.CustomOverlay({ map: m, position: new k.maps.LatLng(s.y, s.x), content: el, zIndex: 5 });
      return { ov, el };
    });
    m.setBounds(b);
    k.maps.event.addListener(m, "idle", () => drawDynamic());
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // 화면 안의 가맹점·미가맹 점과 가맹 원
  const drawDynamic = useCallback(() => {
    const k = window.kakao, m = map.current;
    if (!m) return;
    dyn.current.forEach((o) => o.setMap(null));
    dyn.current = [];
    const detail = m.getLevel() <= DETAIL_LEVEL;
    onDetailChange?.(detail);
    if (!detail) return;
    const { R, M, layers } = state.current;
    const bounds = m.getBounds();
    const inView = (y: number, x: number) => bounds.contain(new k.maps.LatLng(y, x));
    const add = (y: number, x: number, color: string, size: number, html: string, circle: boolean) => {
      if (!inView(y, x)) return;
      const pos = new k.maps.LatLng(y, x);
      if (circle && layers.ring) {
        dyn.current.push(new k.maps.Circle({ map: m, center: pos, radius: R, strokeWeight: 0, fillColor: color, fillOpacity: 0.12 }));
      }
      const el = dot(color, size);
      hoverable(el, y, x, () => html);
      dyn.current.push(new k.maps.CustomOverlay({ map: m, position: pos, content: el, zIndex: 2 }));
    };
    for (const [y, x, n, t] of data.members) add(y, x, COLOR.member, 6, `<b>${n}</b><br>가맹 · ${t}`, true);
    if (M === "포함") for (const [y, x, n] of data.cvs) add(y, x, COLOR.cvs, 6, `<b>${n}</b><br>가맹 · 편의점`, true);
    if (layers.non) for (const [y, x, n, t] of data.non) add(y, x, COLOR.non, 7, `<b>${n}</b><br>미가맹 · ${t}`, false);
  }, [data, hoverable, onDetailChange]);

  // 반경·편의점·레이어가 바뀌면 학교 색, 권유 식당, 화면 안 점을 다시 그린다
  useEffect(() => {
    if (!ready) return;
    const k = window.kakao, m = map.current;
    data.schools.forEach((s, i) => {
      const has = s.rc[M][R] > 0;
      const col = has ? COLOR.ask : COLOR.covered;
      const { el } = fixed.current.schoolDots[i];
      el.style.background = col;
      el.style.width = el.style.height = has ? "22px" : "16px";
      el.style.boxShadow = `0 0 0 ${has ? 3 : 2}px ${has ? COLOR.ink : "#fff"}`;
      fixed.current.schoolRings[i].setOptions({ strokeColor: col, fillColor: col, strokeWeight: has ? 2 : 1 });
      fixed.current.schoolRings[i].setMap(layers.schoolRing ? m : null);
    });
    fixed.current.recs.forEach((o) => o.setMap(null));
    fixed.current.recs = data.recs.filter((d) => d[0] === M && d[1] === R).map((d) => {
      const [, , rank, y, x, n, t, school, toSchool, toMember] = d;
      const el = dot(COLOR.non, 13, COLOR.ink);
      hoverable(el, y, x, () => `<b>${n}</b> (${t})<br>가맹 권유 ${rank}위<br>가장 가까운 가맹점 ${toMember.toLocaleString()}m<br>${school}까지 ${toSchool.toLocaleString()}m`);
      return new k.maps.CustomOverlay({ map: m, position: new k.maps.LatLng(y, x), content: el, zIndex: 4 });
    });
    drawDynamic();
  }, [ready, R, M, layers, data, drawDynamic, hoverable]);

  // SDK가 이미 로드돼 있으면(페이지 이동 후) 바로 시작
  useEffect(() => { if (window.kakao?.maps) window.kakao.maps.load(init); }, [init]);

  if (!KEY) {
    return <div className="map-missing">.env.local에 NEXT_PUBLIC_KAKAO_JS_KEY(카카오 JavaScript 키)를 넣고 개발 서버를 다시 켜세요.</div>;
  }
  return (
    <>
      <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`} strategy="afterInteractive"
        onLoad={() => window.kakao.maps.load(init)} />
      <div ref={box} className="map" role="img" aria-label="춘천 학교 1km 원과 가맹·미가맹 식당 지도" />
    </>
  );
});

export default KakaoMap;
