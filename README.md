# mealcard-map: 춘천 급식카드 가맹 권유 지도 (카카오맵 웹)

학교 1km 안에 있는데, 기존 아동급식카드 가맹점이 덮지 못한 자리에 있는 **미가맹 식당**을 카카오맵에 보여 준다.
분석은 `~/Desktop/급식카드 사각지대` 폴더(파이썬)에서 하고, 이 프로젝트는 결과 JSON을 화면에 그리기만 한다.

## 처음 실행

1. Node.js 20 이상이 필요하다. 이 맥에는 Homebrew로 v26이 설치돼 있다.
2. 카카오 JavaScript 키를 준비한다.
   - https://developers.kakao.com → 내 애플리케이션 → 앱 만들기 → **앱 키 > JavaScript 키**
   - **플랫폼 > Web > 사이트 도메인**에 `http://localhost:3000`을 등록한다. 배포하면 배포 주소도 등록한다.
3. `.env.local`을 열어 키를 넣는다(`.env.example` 참고). `.env.local`은 git에 올라가지 않는다.
   ```
   NEXT_PUBLIC_KAKAO_JS_KEY=발급받은_키
   ```
4. 실행
   ```bash
   npm install
   npm run dev
   ```
   브라우저에서 http://localhost:3000 을 연다.

키가 없으면 지도 자리에 "키를 넣으라"는 안내가 나온다. 조작 버튼과 오른쪽 목록은 키 없이도 동작한다.

## 구조

| 경로 | 내용 |
|---|---|
| `public/data/map-data.json` | 지도 데이터(학교, 가맹점, 미가맹 식당, 권유 식당, 요약, 춘천시 경계) |
| `src/lib/types.ts` | JSON 형식 정의 |
| `src/components/MapApp.tsx` | 화면 전체: 버튼(반경·편의점·레이어), 요약, 반경별 막대, 권유 목록, 범례 |
| `src/components/KakaoMap.tsx` | 카카오맵 그리기. 학교·권유 식당은 항상, 가맹점·미가맹 점과 가맹 원은 **레벨 6 이하로 확대했을 때 화면 안의 것만** 그린다(점이 수천 개라서) |
| `next.config.ts` | `output: "export"`: 정적 사이트로 빌드 |

## 데이터 갱신

분석 폴더에서 아래를 실행하면 `public/data/map-data.json`이 자동으로 바뀐다.

```bash
cd ~/Desktop/급식카드\ 사각지대
python3 6_코드/반경별_공백학교_후보식당.py
python3 6_코드/지도_만들기.py
```

## 배포 (서버 필요 없음)

```bash
npm run build      # out/ 폴더에 정적 사이트가 만들어진다
```

`out/`을 Vercel, Netlify, GitHub Pages 중 하나에 올리면 된다. 서버가 필요 없는 이유는 미리 계산된 JSON을 읽기만 하기 때문이다.
배포 주소를 카카오 앱의 Web 사이트 도메인에 꼭 추가한다.

## 지킬 것

- 카카오맵은 **지도 표시용으로만** 쓴다. 카카오 장소 검색으로 식당 정보를 수집하지 않는다.
- 지도의 카카오 로고·저작권 표시를 가리지 않는다.
- 데이터 출처는 화면 아래와 분석 폴더 `7_공유용_권유지도/README.md`에 있다.
