"use client";

// 화면 전체: 조작 버튼, 지도, 오른쪽 요약·권유 목록·범례
import { useEffect, useMemo, useRef, useState } from "react";
import KakaoMap, { type KakaoMapHandle, type Layers } from "./KakaoMap";
import type { MapData, Mode } from "@/lib/types";

export default function MapApp() {
  const [data, setData] = useState<MapData | null>(null);
  const [R, setR] = useState(100);
  const [M, setM] = useState<Mode>("미포함");
  const [layers, setLayers] = useState<Layers>({ ring: true, schoolRing: true, non: true });
  const [detail, setDetail] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);

  useEffect(() => {
    fetch("data/map-data.json").then((r) => r.json()).then(setData);
  }, []);

  const recs = useMemo(() => (data ? data.recs.filter((d) => d[0] === M && d[1] === R) : []), [data, M, R]);
  const sum = data?.recSummary.find((d) => d.편의점 === M && d.가맹원반경_m === R);
  const bars = data?.recSummary.filter((d) => d.편의점 === M) ?? [];
  const barMax = Math.max(1, ...(data?.recSummary.map((d) => d.권유식당) ?? [1]));

  return (
    <div className="wrap">
      <header>
        <h1>춘천 급식카드 가맹 권유 지도</h1>
        <p className="sub">
          학교마다 1km 원(점선)을 그리고, 가맹 식당마다 반경 원(파랑, 편의점 포함이면 편의점 가맹점도 노랑)을 그렸다.
          학교 1km 원 안에 있으면서 어떤 가맹점 원에도 들지 않는 미가맹 식당(검은 테두리 주황)을 가맹 권유 대상으로 본다.
        </p>
      </header>

      <div className="controls">
        <span className="note">가맹 식당 원 반경</span>
        <div className="seg" role="group" aria-label="가맹 식당 원 반경">
          {(data?.radii ?? [100, 200, 300, 400, 500]).map((r) => (
            <button key={r} aria-pressed={r === R} onClick={() => setR(r)}>{r}m</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="편의점 가맹점">
          {(["미포함", "포함"] as Mode[]).map((m) => (
            <button key={m} aria-pressed={m === M} onClick={() => setM(m)}>편의점 {m}</button>
          ))}
        </div>
        {([["ring", "가맹 식당 원"], ["schoolRing", "학교 1km 원"], ["non", "미가맹 식당"]] as [keyof Layers, string][]).map(([k, label]) => (
          <label key={k} className="tg">
            <input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} /> {label}
          </label>
        ))}
      </div>

      <div className="grid">
        <div className="mapbox">
          {data ? <KakaoMap ref={mapRef} data={data} R={R} M={M} layers={layers} onDetailChange={setDetail} /> : <div className="map-missing">데이터를 불러오는 중…</div>}
          {data && !detail && process.env.NEXT_PUBLIC_KAKAO_JS_KEY && <div className="hint">더 확대하면 가맹 식당 원과 식당 점이 보입니다</div>}
        </div>

        <aside className="panel">
          <div className="card">
            <h2>가맹 원 {R}m · 편의점 {M}</h2>
            <div className="tiles">
              <div className="tile"><div className="v">{sum?.권유식당 ?? "–"}</div><div className="l"><span className="sw rec" />권유 식당</div></div>
              <div className="tile"><div className="v">{sum?.권유식당있는학교 ?? "–"}</div><div className="l"><span className="sw sq ask" />권유 식당 있는 학교</div></div>
              <div className="tile"><div className="v">{data?.schools.length ?? "–"}</div><div className="l">학교</div></div>
            </div>
          </div>

          <div className="card">
            <h2>가맹 식당 원 반경별 권유 식당 수</h2>
            <div className="bars">
              {bars.map((d) => (
                <button key={d.가맹원반경_m} className={d.가맹원반경_m === R ? "bar on" : "bar"} onClick={() => setR(d.가맹원반경_m)}
                  title={`권유 식당 ${d.권유식당}곳 · 권유 식당 있는 학교 ${d.권유식당있는학교}곳`}>
                  <span className="bl">{d.가맹원반경_m}m</span>
                  <span className="bt"><span className="bf" style={{ width: `${(d.권유식당 / barMax) * 100}%` }} /></span>
                  <span className="bv">{d.권유식당}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>가맹 권유 식당 {recs.length}곳</h2>
            <p className="note">가장 가까운 가맹점이 먼 순. 누르면 지도가 이동한다.</p>
            <ul className="list">
              {recs.map((d) => (
                <li key={`${d[5]}-${d[3]}`} onClick={() => mapRef.current?.focus(d[3], d[4])}>
                  <span className="d">{d[2]}</span>
                  <span>{d[5]} <span className="d">{d[7]}</span></span>
                  <span className="d">{d[9].toLocaleString()}m</span>
                </li>
              ))}
              {recs.length === 0 && <li className="empty">이 기준에서는 권유 식당이 없다</li>}
            </ul>
          </div>

          <div className="card legend">
            <div><span className="sw sq ask" />학교: 1km 안에 권유 식당 있음</div>
            <div><span className="sw sq covered" />학교: 권유 식당 없음</div>
            <div><span className="sw member" />식사형 가맹 식당</div>
            <div><span className="sw cvs" />편의점 가맹점 (편의점 포함일 때)</div>
            <div><span className="sw non" />미가맹 식당</div>
            <div><span className="sw rec" />가맹 권유 식당</div>
            <div><span className="sw sq city" />춘천시 구역</div>
          </div>
        </aside>
      </div>

      <p className="note">
        거리는 직선거리. 출처: 춘천시 요식업소 현황(공공데이터포털 15003349, 2026-05-27), 춘천시 아동급식카드 가맹점(2026-08-26, 팀 전처리 4,395곳),
        상가(상권)정보(15083033, 2026-06), 아동복지급식정보표준데이터(15034530), 초중등학교위치표준데이터(15021148, 2026-10).
        춘천시 경계: © OpenStreetMap 기여자(ODbL). 지도: © Kakao.
      </p>
    </div>
  );
}
