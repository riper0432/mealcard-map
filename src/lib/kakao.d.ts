// 카카오맵 JS SDK는 공식 타입이 없어 필요한 만큼만 any로 둔다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { kakao: any } }
export {};
