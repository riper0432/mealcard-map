// public/data/map-data.json 형식. 분석 폴더의 6_코드/지도_만들기.py가 만든다.
export type Mode = "미포함" | "포함"; // 편의점 가맹점을 가맹 원에 넣는지

export interface School {
  n: string; // 학교명
  k: string; // 학교급
  d: string; // 읍면동
  y: number;
  x: number;
  m: number; // 가장 가까운 식사형 가맹 식당(m)
  u: number; // 가장 가까운 미가맹 식당(m)
  k1: Record<Mode, number>; // 1km 안 가맹점 수
  rc: Record<Mode, Record<string, number>>; // 1km 안 권유 식당 수 [모드][반경]
  g: string; // 행정동 코드
}

// [위도, 경도, 상호, 업태, 행정동 코드]
export type Place = [number, number, string, string, string];
// [위도, 경도, 상호, 행정동 코드]
export type Cvs = [number, number, string, string];
// [모드, 가맹원 반경, 순위, 위도, 경도, 상호, 업태, 가장 가까운 학교, 그 학교까지 m, 가장 가까운 가맹점 m, 도로명주소, 행정동 코드]
export type Rec = [Mode, number, number, number, number, string, string, string, number, number, string, string];

export interface RecSummary {
  편의점: Mode;
  가맹원반경_m: number;
  권유식당: number;
  권유식당있는학교: number;
}

export interface MapData {
  boundary: GeoJSON.FeatureCollection;
  radii: number[];
  schoolR: number;
  schools: School[];
  members: Place[];
  cvs: Cvs[];
  non: Place[];
  recs: Rec[];
  recSummary: RecSummary[];
  dongs: { c: string; n: string }[]; // 춘천 행정동(읍·면·동) 25곳
}
