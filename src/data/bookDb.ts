export interface BookItem {
  id: string;
  t: string;
  a: string;
  w: string;
  emos: string[];
}

export interface EmotionGroup {
  emo: string;
  color: string;
  words: string[];
  books: { t: string; a: string; w: string }[];
}

export const DB: EmotionGroup[] = [
  {
    emo: "불안",
    color: "#5b6c8f",
    words: ["불안", "걱정", "초조", "긴장", "두려", "무서", "겁"],
    books: [
      { t: "미움받을 용기", a: "기시미 이치로·고가 후미타케", w: "남의 시선 때문에 생기는 걱정을 대화 형식으로 풀어 줍니다." },
      { t: "불안", a: "알랭 드 보통", w: "지위와 평가에 대한 불안이 어디서 오는지 차분하게 설명합니다." },
      { t: "아주 작은 습관의 힘", a: "제임스 클리어", w: "통제할 수 있는 작은 행동부터 잡게 해 막연함을 줄여 줍니다." }
    ]
  },
  {
    emo: "슬픔",
    color: "#4f6f8a",
    words: ["슬픔", "슬퍼", "우울", "눈물", "울고", "상실", "허전", "서러"],
    books: [
      { t: "죽고 싶지만 떡볶이는 먹고 싶어", a: "백세희", w: "우울한 날의 감정을 솔직한 상담 기록으로 따라가 봅니다." },
      { t: "아몬드", a: "손원평", w: "감정을 잘 느끼지 못하는 소년을 통해 슬픔과 공감을 다시 봅니다." },
      { t: "밝은 밤", a: "최은영", w: "여러 세대의 여성이 서로를 위로하는 이야기로 마음을 덥혀 줍니다." }
    ]
  },
  {
    emo: "외로움",
    color: "#6a5f8c",
    words: ["외로", "고독", "혼자", "쓸쓸", "소외"],
    books: [
      { t: "우리가 빛의 속도로 갈 수 없다면", a: "김초엽", w: "멀리 떨어진 존재들이 서로를 그리워하는 SF 단편집입니다." },
      { t: "어린 왕자", a: "앙투안 드 생텍쥐페리", w: "관계를 길들인다는 의미를 짧고 깊게 생각하게 합니다." },
      { t: "불편한 편의점", a: "김호연", w: "낯선 사람들이 편의점에서 조금씩 연결되는 이야기입니다." }
    ]
  },
  {
    emo: "지침",
    color: "#5f7a64",
    words: ["지침", "지쳤", "지쳐", "피곤", "번아웃", "힘들", "탈진", "녹초"],
    books: [
      { t: "월든", a: "헨리 데이비드 소로", w: "속도를 내려놓고 단순하게 사는 법을 보여 줍니다." },
      { t: "달러구트 꿈 백화점", a: "이미예", w: "잠과 꿈을 파는 가게 이야기로 가볍게 쉬어 가기 좋습니다." },
      { t: "메리골드 마음 세탁소", a: "윤정은", w: "상처 난 마음을 씻어 주는 세탁소라는 설정의 힐링 소설입니다." }
    ]
  },
  {
    emo: "분노",
    color: "#9a5545",
    words: ["분노", "화나", "화가", "짜증", "억울", "열받"],
    books: [
      { t: "화", a: "틱낫한", w: "화를 억누르지 않고 다루는 방법을 쉬운 말로 알려 줍니다." },
      { t: "미움받을 용기", a: "기시미 이치로·고가 후미타케", w: "타인에 대한 화가 내 과제인지 남의 과제인지 나눠 보게 합니다." },
      { t: "데미안", a: "헤르만 헤세", w: "세상과 부딪히는 감정을 성장의 과정으로 다시 읽게 합니다." }
    ]
  },
  {
    emo: "무기력",
    color: "#7a7466",
    words: ["무기력", "귀찮", "공허", "노잼", "의욕이 없", "의욕 없"],
    books: [
      { t: "아주 작은 습관의 힘", a: "제임스 클리어", w: "의욕이 없어도 시작할 수 있는 1% 단위 행동을 제안합니다." },
      { t: "연금술사", a: "파울로 코엘료", w: "잊고 있던 바람을 다시 떠올리게 하는 짧은 우화입니다." },
      { t: "불편한 편의점", a: "김호연", w: "바닥에 있던 인물이 다시 일어서는 과정을 따뜻하게 그립니다." }
    ]
  },
  {
    emo: "막막함",
    color: "#5c7480",
    words: ["막막", "진로", "방황", "모르겠"],
    books: [
      { t: "데미안", a: "헤르만 헤세", w: "내가 누구인지 묻는 시기에 오래 읽혀 온 성장 소설입니다." },
      { t: "연금술사", a: "파울로 코엘료", w: "자기 길을 찾아 떠나는 여정을 단순한 이야기로 보여 줍니다." },
      { t: "미움받을 용기", a: "기시미 이치로·고가 후미타케", w: "정답 대신 지금 할 수 있는 선택에 집중하게 합니다." }
    ]
  },
  {
    emo: "그리움",
    color: "#8a6a55",
    words: ["그리움", "그리워", "보고싶", "추억", "향수"],
    books: [
      { t: "나의 라임오렌지나무", a: "J. M. 바스콘셀로스", w: "어린 시절의 기억과 이별을 다룬 오래된 성장 소설입니다." },
      { t: "밝은 밤", a: "최은영", w: "떠난 사람들의 이야기를 이어 붙이며 그리움을 견디게 합니다." },
      { t: "어린 왕자", a: "앙투안 드 생텍쥐페리", w: "보이지 않는 것을 오래 기억하는 법을 이야기합니다." }
    ]
  },
  {
    emo: "설렘",
    color: "#a0703a",
    words: ["설렘", "설레", "기쁨", "기뻐", "행복", "신나", "두근"],
    books: [
      { t: "연금술사", a: "파울로 코엘료", w: "새로운 시작을 앞둔 마음에 방향을 더해 줍니다." },
      { t: "달러구트 꿈 백화점", a: "이미예", w: "상상력이 가득한 세계라 들뜬 기분을 그대로 이어 가기 좋습니다." },
      { t: "우리가 빛의 속도로 갈 수 없다면", a: "김초엽", w: "낯선 세계에 대한 호기심을 크게 넓혀 주는 단편들입니다." }
    ]
  }
];

export const EMOS = DB.map((d) => d.emo);

export const emoOf = (e: string): EmotionGroup => {
  return DB.find((d) => d.emo === e) || DB[0];
};

export const CATALOG: BookItem[] = [];
DB.forEach((d) => {
  d.books.forEach((b) => {
    let c = CATALOG.find((x) => x.t === b.t);
    if (!c) {
      c = {
        id: "B" + String(CATALOG.length + 1).padStart(2, "0"),
        t: b.t,
        a: b.a,
        w: b.w,
        emos: []
      };
      CATALOG.push(c);
    }
    c.emos.push(d.emo);
  });
});

export const byId = (id: string): BookItem | undefined =>
  CATALOG.find((c) => c.id === String(id || "").trim());

export const byTitle = (t: string): BookItem | undefined =>
  CATALOG.find((c) => c.t === t);

export const SYNONYM: Record<string, string> = {
  "쓸쓸함": "외로움",
  "고독": "외로움",
  "허전함": "슬픔",
  "서러움": "슬픔",
  "우울": "슬픔",
  "상실감": "슬픔",
  "걱정": "불안",
  "초조": "불안",
  "긴장": "불안",
  "두려움": "불안",
  "피곤": "지침",
  "피로": "지침",
  "번아웃": "지침",
  "짜증": "분노",
  "억울함": "분노",
  "공허함": "무기력",
  "권태": "무기력",
  "혼란": "막막함",
  "답답함": "막막함",
  "향수": "그리움",
  "아쉬움": "그리움",
  "기쁨": "설렘",
  "행복": "설렘",
  "기대": "설렘",
  "평온": "설렘",
  "차분함": "그리움"
};

export function toEmo(name?: string | null): string | null {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  if (EMOS.includes(trimmed)) return trimmed;
  if (SYNONYM[trimmed]) return SYNONYM[trimmed];
  const d = DB.find((group) => group.words.some((w) => trimmed.includes(w)));
  return d ? d.emo : null;
}

export const EXAMPLES = [
  "오늘은 날씨가 좀 쌀쌀해",
  "발표 앞두고 계속 떨려",
  "퇴근길 지하철이 꽉 찼어",
  "하나도 안 불안해, 그냥 좀 허전해"
];

export const FALLBACK_PICKS = [
  { text: "요즘 이유 없이 마음이 허전해", emotion: "슬픔" },
  { text: "해야 할 일은 많은데 손에 안 잡혀", emotion: "무기력" },
  { text: "새로운 일을 앞두고 괜히 설레", emotion: "설렘" }
];

export const norm = (s: string) =>
  s.toLowerCase().replace(/[\s\d\.\,\!\?\-_~\*\#\@\^\(\)\[\]\/\\'"`:;+=|<>]/g, "");

export const BLOCK = [
  "시발", "씨발", "씨바", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새", "좆",
  "존나", "졸라", "ㅈㄴ", "지랄", "미친놈", "미친년", "닥쳐", "엿먹", "fuck", "shit", "bitch"
];

export const CRISIS = ["죽고싶", "자살", "사라지고싶", "살기싫", "자해", "끝내고싶", "죽어버리"];

export const isBlocked = (s: string) => {
  const n = norm(s);
  return BLOCK.some((w) => n.includes(norm(w)));
};

export const isCrisis = (s: string) => {
  const n = norm(s);
  return CRISIS.some((w) => n.includes(w));
};
