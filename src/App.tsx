/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';
import AdminAuthModal from './components/AdminAuthModal';
import AdminConsole from './components/AdminConsole';
import {
  CATALOG,
  DB,
  EMOS,
  emoOf,
  byId,
  byTitle,
  toEmo,
  EXAMPLES,
  FALLBACK_PICKS,
  isBlocked,
  isCrisis,
  type BookItem
} from './data/bookDb';

type ScreenType = 'input' | 'loading' | 'result' | 'pick' | 'notice_policy' | 'notice_crisis';

interface RecommendedBook extends BookItem {
  why: string;
  filled: boolean;
}

interface ResultData {
  primary: string;
  secondary: string[];
  keywords: string[];
  empathy: string;
  books: RecommendedBook[];
  changed?: boolean;
  note?: string;
}

interface SuggestionItem {
  text: string;
  emotion: string;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('input');
  const [inputVal, setInputVal] = useState('');
  const [loadingTitle, setLoadingTitle] = useState('마음을 읽고 있어요');
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(FALLBACK_PICKS);
  const [pickNote, setPickNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<boolean>(false);
  const [rawResponse, setRawResponse] = useState<any>(null);

  // API Provider & Key Management
  const [provider, setProvider] = useState<'gemini' | 'claude'>('gemini');
  const [customKey, setCustomKey] = useState<string>('');
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>('');
  const [selectedModalTab, setSelectedModalTab] = useState<'gemini' | 'claude'>('gemini');

  // Admin Console State
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem('mb_admin_token') || '';
    } catch (_) {
      return '';
    }
  });
  const [activeServerModel, setActiveServerModel] = useState<string>('gemini-3.8-flash');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize saved settings & check server config
  useEffect(() => {
    const savedKey = localStorage.getItem('mb_custom_key') || '';
    const savedProvider = (localStorage.getItem('mb_provider') as 'gemini' | 'claude') || 'gemini';
    const savedTest = localStorage.getItem('mb_testmode') === '1';

    setCustomKey(savedKey);
    setProvider(savedProvider);
    setTestMode(savedTest);

    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setHasServerKey(Boolean(data.hasServerGeminiKey));
        if (data.model) setActiveServerModel(data.model);
      })
      .catch(() => {
        setHasServerKey(false);
      });
  }, []);

  const handleOpenAdmin = () => {
    if (adminToken) {
      setIsAdminConsoleOpen(true);
    } else {
      setIsAdminAuthOpen(true);
    }
  };

  const handleAdminAuthSuccess = (token: string) => {
    setAdminToken(token);
    try {
      sessionStorage.setItem('mb_admin_token', token);
    } catch (_) {}
    setIsAdminAuthOpen(false);
    setIsAdminConsoleOpen(true);
  };

  const openKeyModal = (defaultTab?: 'gemini' | 'claude') => {
    setSelectedModalTab(defaultTab || provider);
    setTempKey(customKey);
    setShowKeyModal(true);
  };

  const saveKeySettings = () => {
    setProvider(selectedModalTab);
    setCustomKey(tempKey.trim());
    localStorage.setItem('mb_provider', selectedModalTab);
    localStorage.setItem('mb_custom_key', tempKey.trim());
    setShowKeyModal(false);
    setErrorMessage(null);
  };

  const clearCustomKey = () => {
    setCustomKey('');
    setTempKey('');
    localStorage.removeItem('mb_custom_key');
  };

  // Rule-based fallback calculation
  const runFallback = (text: string, noteMsg?: string) => {
    const q = text.replace(/\s+/g, '');
    const matchedGroup = DB.find((group) =>
      group.words.some((word) => q.includes(word.replace(/\s+/g, '')))
    );

    if (!matchedGroup) {
      setSuggestions(FALLBACK_PICKS);
      setPickNote(noteMsg || '');
      setScreen('pick');
      return;
    }

    const pickedBooks: RecommendedBook[] = [];
    const seen = new Set<string>(shownIds);
    fillRemainingBooks(pickedBooks, matchedGroup.emo, seen);
    pickedBooks.forEach((b) => (b.filled = false));

    setResult({
      primary: matchedGroup.emo,
      secondary: [],
      keywords: [],
      empathy: '',
      books: pickedBooks,
      note: noteMsg
    });
    setScreen('result');
  };

  // Fill up to 3 books: prioritize target emotion, then catalog
  const fillRemainingBooks = (
    picked: RecommendedBook[],
    primaryEmo: string,
    seen: Set<string>
  ) => {
    const emoGroup = emoOf(primaryEmo);
    const pool = [
      ...emoGroup.books.map((b) => {
        const catItem = byTitle(b.t);
        return {
          id: catItem?.id || 'B00',
          t: b.t,
          a: b.a,
          w: b.w,
          emos: catItem?.emos || [primaryEmo]
        };
      }),
      ...CATALOG
    ];

    for (const item of pool) {
      if (picked.length >= 3) break;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        picked.push({
          ...item,
          why: item.w,
          filled: true
        });
      }
    }
  };

  // Change emotion manually
  const handleChangeEmotion = (newEmo: string) => {
    setShownIds([]);
    setRawResponse(null);
    const picked: RecommendedBook[] = [];
    const seen = new Set<string>();
    fillRemainingBooks(picked, newEmo, seen);
    picked.forEach((b) => (b.filled = false));

    setResult({
      primary: newEmo,
      secondary: [],
      keywords: [],
      empathy: '',
      books: picked,
      changed: true
    });
    setScreen('result');
  };

  // Reset to input screen
  const resetToHome = () => {
    setInputVal('');
    setErrorMessage(null);
    setRawResponse(null);
    setScreen('input');
  };

  // Submit input for recommendation
  const handleStart = async (text: string, options: { more?: boolean } = {}) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputVal(trimmed);
    setErrorMessage(null);
    setRawResponse(null);

    const currentShown = options.more ? shownIds : [];
    if (!options.more) {
      setShownIds([]);
    }

    // Safety checks prior to network call
    if (isCrisis(trimmed)) {
      setScreen('notice_crisis');
      return;
    }
    if (isBlocked(trimmed)) {
      setScreen('notice_policy');
      return;
    }

    setLoadingTitle(options.more ? '다른 책을 고르고 있어요' : '마음을 읽고 있어요');
    setScreen('loading');

    // Abort previous request if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          input: trimmed,
          shownIds: currentShown,
          provider: provider,
          customApiKey: customKey || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'need_api_key') {
          setErrorMessage(data.error || 'API 키가 필요합니다.');
          setScreen('input');
          openKeyModal(data.provider || provider);
          return;
        }

        if (data.code === 'bad_key') {
          setErrorMessage('API 키를 확인할 수 없습니다. 키를 다시 확인해 주세요.');
          setScreen('input');
          openKeyModal(provider);
          return;
        }

        throw new Error(data.error || 'AI 응답 처리에 실패했습니다.');
      }

      setRawResponse(data);

      // Route response
      if (data.mode === 'crisis') {
        setScreen('notice_crisis');
        return;
      }
      if (data.mode === 'block') {
        setScreen('notice_policy');
        return;
      }

      if (data.mode === 'suggest') {
        const rawPicks = Array.isArray(data.suggestions) ? data.suggestions : [];
        const validPicks: SuggestionItem[] = rawPicks
          .map((s: any) => ({
            text: String(s?.text || '').slice(0, 60),
            emotion: toEmo(s?.emotion) || '설렘'
          }))
          .filter((s: SuggestionItem) => Boolean(s.text));

        const uniquePicks: SuggestionItem[] = [];
        for (const item of validPicks) {
          if (uniquePicks.length < 3 && !uniquePicks.some((u) => u.emotion === item.emotion)) {
            uniquePicks.push(item);
          }
        }

        setSuggestions(uniquePicks.length >= 2 ? uniquePicks : FALLBACK_PICKS);
        setScreen('pick');
        return;
      }

      // Recommend mode
      const primary = toEmo(data.primary);
      if (!primary) {
        setSuggestions(FALLBACK_PICKS);
        setScreen('pick');
        return;
      }

      const secondary = (Array.isArray(data.secondary) ? data.secondary : [])
        .map((s: any) => toEmo(s))
        .filter((e: string | null): e is string => Boolean(e && e !== primary))
        .filter((e: string, idx: number, arr: string[]) => arr.indexOf(e) === idx)
        .slice(0, 2);

      const keywords = (Array.isArray(data.keywords) ? data.keywords : [])
        .map((k: any) => String(k).slice(0, 14))
        .filter(Boolean)
        .slice(0, 3);

      const pickedBooks: RecommendedBook[] = [];
      const seen = new Set<string>(currentShown);

      if (Array.isArray(data.books)) {
        for (const b of data.books) {
          const catBook = byId(b?.id);
          if (catBook && !seen.has(catBook.id) && pickedBooks.length < 3) {
            seen.add(catBook.id);
            pickedBooks.push({
              ...catBook,
              why: String(b.why || '').slice(0, 90) || catBook.w,
              filled: false
            });
          }
        }
      }

      fillRemainingBooks(pickedBooks, primary, seen);

      const newShown = Array.from(new Set([...currentShown, ...pickedBooks.map((b) => b.id)]));
      setShownIds(newShown);

      setResult({
        primary,
        secondary,
        keywords,
        empathy: String(data.empathy || '').slice(0, 60),
        books: pickedBooks
      });
      setScreen('result');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setScreen('input');
        return;
      }
      console.warn('API 호출 실패, 기본 규칙 추천으로 전환합니다:', err);
      runFallback(trimmed, 'AI 통신 상태로 인해 간단 추천 목록으로 보여 드립니다.');
    }
  };

  const cancelLoading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setScreen('input');
  };

  return (
    <div className="min-h-screen bg-[#f3f5f4] dark:bg-[#121817] text-[#1d2826] dark:text-[#e4ebe9] font-sans px-4 py-5 pb-12 transition-colors duration-200">
      <div className="max-w-[480px] mx-auto flex flex-col gap-5">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-[#d9e0de] dark:border-[#2c3836] pb-3">
          <button
            onClick={resetToHome}
            className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity"
            aria-label="마음책방 홈으로 가기"
          >
            <div className="w-8 h-8 rounded-lg bg-[#2c5f5d] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif-batang font-bold text-xl tracking-tight text-[#1d2826] dark:text-[#e4ebe9]">
                마음책방
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdmin}
              className="text-xs px-2.5 py-1.5 rounded-full border border-[#2c5f5d]/30 dark:border-[#7fb8b4]/30 bg-[#e2ecea]/50 dark:bg-[#22312f]/40 hover:bg-[#2c5f5d] hover:text-white dark:hover:bg-[#7fb8b4] dark:hover:text-[#0f1a19] flex items-center gap-1.5 text-[#2c5f5d] dark:text-[#7fb8b4] transition-all font-semibold"
              title="AI 관리자 콘솔"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>관리자</span>
            </button>

            <button
              onClick={() => openKeyModal()}
              className="text-xs px-2.5 py-1.5 rounded-full border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] hover:bg-[#e2ecea] dark:hover:bg-[#22312f] flex items-center gap-1.5 text-[#5d6b68] dark:text-[#9aaba7] transition-colors"
              title="API 키 설정"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#2c5f5d] dark:text-[#7fb8b4]" />
              <span className="font-medium">
                {customKey
                  ? provider === 'gemini'
                    ? 'Gemini (내 키)'
                    : 'Claude'
                  : hasServerKey
                  ? activeServerModel === 'claude-3-5-haiku-20241022'
                    ? 'Claude 3.5 Haiku'
                    : activeServerModel === 'gemini-flash-latest'
                    ? '✨ Gemini Flash'
                    : '✨ Gemini 3.8 Flash'
                  : '키 설정 필요'}
              </span>
            </button>

            {screen !== 'input' && (
              <button
                onClick={resetToHome}
                className="text-xs text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9] px-2 py-1 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>처음으로</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="p-3.5 bg-[#f8efdf] dark:bg-[#33291a] border border-[#e3b46a]/40 rounded-xl text-xs text-[#8a5a12] dark:text-[#e3b46a] flex items-start justify-between gap-2 shadow-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => openKeyModal()}
              className="underline font-semibold shrink-0 hover:opacity-80"
            >
              키 입력하기
            </button>
          </div>
        )}

        {/* Screen 1: Input */}
        {screen === 'input' && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div>
              <h1 className="font-serif-batang font-bold text-2xl sm:text-[1.7rem] leading-snug tracking-tight text-[#1d2826] dark:text-[#e4ebe9]">
                오늘 마음을<br />한 문장으로 적어 주세요
              </h1>
              <p className="text-sm text-[#5d6b68] dark:text-[#9aaba7] mt-1.5 leading-relaxed">
                감정 단어가 없어도 괜찮아요. 날씨나 있었던 일만 적어도 어울리는 책 3권을 골라 드려요.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStart(inputVal);
              }}
              className="flex flex-col"
            >
              <div className="relative">
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.slice(0, 300))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleStart(inputVal);
                    }
                  }}
                  maxLength={300}
                  placeholder="예: 오늘은 날씨가 좀 쌀쌀해, 발표 앞두고 너무 긴장돼"
                  className="w-full min-h-[120px] p-3.5 text-base rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] text-[#1d2826] dark:text-[#e4ebe9] focus:outline-none focus:ring-2 focus:ring-[#2c5f5d] dark:focus:ring-[#7fb8b4] transition-all resize-y shadow-xs"
                />
                <div className="text-right text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-1.5 tabular-nums">
                  <span>{inputVal.length}</span>/300
                </div>
              </div>

              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="mt-3 w-full min-h-[50px] rounded-2xl bg-[#2c5f5d] hover:bg-[#234c4a] dark:bg-[#7fb8b4] dark:hover:bg-[#68a09c] text-white dark:text-[#0f1a19] font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>책 추천받기</span>
              </button>
            </form>

            <div className="mt-1">
              <p className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7] mb-2 tracking-wide">
                이렇게 써 보세요
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputVal(sample);
                      handleStart(sample);
                    }}
                    className="text-xs px-3 py-2 rounded-full border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] text-[#1d2826] dark:text-[#e4ebe9] hover:border-[#2c5f5d] dark:hover:border-[#7fb8b4] hover:bg-[#e2ecea]/40 dark:hover:bg-[#22312f]/40 transition-colors text-left"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2c5f5d] dark:text-[#7fb8b4] shrink-0" />
              <span>적은 문장은 책 추천을 위해 AI에게만 전달되고 저장되지 않습니다.</span>
            </p>
          </section>
        )}

        {/* Screen 2: Loading */}
        {screen === 'loading' && (
          <section className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-8 flex flex-col items-center text-center gap-4 shadow-xs animate-in fade-in duration-150">
            <div className="flex gap-1.5 items-end h-9">
              <span className="w-2.5 h-7 rounded-sm bg-[#2c5f5d] dark:bg-[#7fb8b4] animate-pulse"></span>
              <span className="w-2.5 h-8 rounded-sm bg-[#2c5f5d] dark:bg-[#7fb8b4] animate-pulse delay-100"></span>
              <span className="w-2.5 h-7 rounded-sm bg-[#2c5f5d] dark:bg-[#7fb8b4] animate-pulse delay-200"></span>
            </div>

            <div>
              <h2 className="font-serif-batang font-bold text-lg text-[#1d2826] dark:text-[#e4ebe9]">
                {loadingTitle}
              </h2>
              <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-1">
                작성하신 문장의 분위기와 마음을 연결하고 있어요.
              </p>
            </div>

            <button
              onClick={cancelLoading}
              className="mt-2 px-4 py-2 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7] transition-colors"
            >
              취소
            </button>
          </section>
        )}

        {/* Screen 3: Result */}
        {screen === 'result' && result && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            {result.note && (
              <div className="p-3 bg-[#f8efdf] dark:bg-[#33291a] border border-[#e3b46a]/40 rounded-xl text-xs text-[#8a5a12] dark:text-[#e3b46a]">
                {result.note}
              </div>
            )}

            {/* Empathy and Mood Card */}
            <div className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-4 sm:p-5 shadow-xs">
              <p className="font-serif-batang text-lg sm:text-xl font-bold leading-relaxed text-[#1d2826] dark:text-[#e4ebe9]">
                {result.changed
                  ? `『${result.primary}』 마음에 어울리는 책으로 다시 골랐어요.`
                  : result.empathy || '지금 당신의 마음에 닿는 문장과 책을 찾았어요.'}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="bg-[#e2ecea] dark:bg-[#22312f] text-[#2c5f5d] dark:text-[#7fb8b4] px-3 py-1 rounded-full text-xs font-bold">
                  {result.primary}
                </span>
                {result.secondary.map((s, i) => (
                  <span
                    key={i}
                    className="border border-[#d9e0de] dark:border-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7] px-2.5 py-0.5 rounded-full text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>

              {result.keywords.length > 0 && (
                <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-3 pt-2.5 border-t border-[#d9e0de]/60 dark:border-[#2c3836]/60">
                  이렇게 읽었어요: <b className="text-[#1d2826] dark:text-[#e4ebe9] font-medium">{result.keywords.join(' · ')}</b>
                </p>
              )}
            </div>

            {/* Book List */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7] tracking-wide">
                  이 마음에 어울리는 책 3권
                </p>
                <span className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">
                  목록 {shownIds.length} / {CATALOG.length}
                </span>
              </div>

              <ol className="flex flex-col gap-3 list-none p-0 m-0">
                {result.books.map((book, idx) => {
                  const spineColor = emoOf(book.emos[0] || result.primary).color;
                  return (
                    <li
                      key={book.id + '-' + idx}
                      className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-3.5 sm:p-4 flex gap-3.5 items-start shadow-xs hover:border-[#2c5f5d]/50 dark:hover:border-[#7fb8b4]/50 transition-colors"
                    >
                      {/* Tactile Book Spine */}
                      <div
                        className="w-[46px] h-[68px] sm:w-[50px] sm:h-[72px] shrink-0 rounded-r-md rounded-l-xs flex items-end justify-center pb-2 text-white font-serif-batang font-bold text-sm sm:text-base shadow-sm"
                        style={{ backgroundColor: spineColor }}
                        aria-hidden="true"
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif-batang font-bold text-base sm:text-lg leading-snug text-[#1d2826] dark:text-[#e4ebe9]">
                          {book.t}
                        </h3>
                        <div className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-0.5">
                          {book.a}
                        </div>
                        <p className="text-xs sm:text-sm text-[#1d2826]/85 dark:text-[#e4ebe9]/85 mt-2 leading-relaxed">
                          {book.why}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(book.t + ' ' + book.a + ' 책')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#2c5f5d] dark:text-[#7fb8b4] font-medium hover:underline"
                          >
                            <span>서점에서 찾아보기</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {book.filled && (
                            <span className="text-[11px] px-2 py-0.5 rounded border border-dashed border-[#d9e0de] dark:border-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7]">
                              기본 추천
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Emotion Correction Chips */}
            <div className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7] mb-2.5">
                이 감정이 맞나요? 다르면 골라 주세요
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EMOS.map((emo) => {
                  const isSelected = emo === result.primary;
                  return (
                    <button
                      key={emo}
                      onClick={() => {
                        if (!isSelected) handleChangeEmotion(emo);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] border-[#2c5f5d] dark:border-[#7fb8b4] font-bold shadow-xs'
                          : 'border-[#d9e0de] dark:border-[#2c3836] bg-transparent text-[#1d2826] dark:text-[#e4ebe9] hover:bg-[#e2ecea]/40 dark:hover:bg-[#22312f]/40'
                      }`}
                    >
                      {emo}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetToHome}
                className="flex-1 min-h-[48px] rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] text-[#1d2826] dark:text-[#e4ebe9] font-medium text-sm hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836] transition-colors"
              >
                다시 쓰기
              </button>
              <button
                onClick={() => handleStart(inputVal, { more: true })}
                disabled={CATALOG.length - shownIds.length <= 0}
                className="flex-1 min-h-[48px] rounded-2xl bg-[#2c5f5d] hover:bg-[#234c4a] dark:bg-[#7fb8b4] dark:hover:bg-[#68a09c] text-white dark:text-[#0f1a19] font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                다른 책 보기
              </button>
            </div>
          </section>
        )}

        {/* Screen 4: Pick Alternate Sentences */}
        {screen === 'pick' && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            {pickNote && (
              <div className="p-3 bg-[#f8efdf] dark:bg-[#33291a] border border-[#e3b46a]/40 rounded-xl text-xs text-[#8a5a12] dark:text-[#e3b46a]">
                {pickNote}
              </div>
            )}

            <div>
              <h2 className="font-serif-batang font-bold text-xl sm:text-2xl text-[#1d2826] dark:text-[#e4ebe9]">
                어떤 마음에 더 가까운가요?
              </h2>
              <p className="text-xs sm:text-sm text-[#5d6b68] dark:text-[#9aaba7] mt-1">
                적어 주신 문장만으로는 마음을 읽기 어려웠어요. 아래 문장 중 가까운 것을 골라 주세요.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              {suggestions.map((item, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => {
                      setInputVal(item.text);
                      handleStart(item.text);
                    }}
                    className="w-full text-left bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] hover:border-[#2c5f5d] dark:hover:border-[#7fb8b4] rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors shadow-xs group"
                  >
                    <span className="text-sm font-medium text-[#1d2826] dark:text-[#e4ebe9]">
                      {item.text}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e2ecea] dark:bg-[#22312f] text-[#2c5f5d] dark:text-[#7fb8b4]">
                        {item.emotion}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#5d6b68] dark:text-[#9aaba7] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={resetToHome}
              className="w-full min-h-[48px] rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] text-[#1d2826] dark:text-[#e4ebe9] font-medium text-sm hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836] transition-colors"
            >
              직접 다시 쓰기
            </button>
          </section>
        )}

        {/* Screen 5-A: Policy Warning */}
        {screen === 'notice_policy' && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="bg-[#f8efdf] dark:bg-[#33291a] border border-[#e3b46a]/40 rounded-2xl p-5 text-[#8a5a12] dark:text-[#e3b46a]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="font-serif-batang font-bold text-lg">
                  이 문장에는 추천을 드리지 않아요
                </h2>
              </div>
              <p className="text-xs sm:text-sm mt-2 leading-relaxed">
                마음책방은 모두가 편안하게 머무는 공간이라, 아래 표현이 담긴 문장에는 답하지 않습니다.
              </p>
              <ul className="text-xs sm:text-sm list-disc pl-5 mt-2 space-y-1">
                <li>욕설이나 비속어</li>
                <li>특정 사람이나 집단을 비하·혐오하는 말</li>
                <li>다른 사람을 공격하거나 위협하는 말</li>
              </ul>
              <p className="text-xs sm:text-sm mt-3 pt-2.5 border-t border-[#e3b46a]/30">
                화가 나거나 속상한 마음 자체는 자연스러운 감정입니다. 거친 표현 대신 지금 느끼는 마음을 적어 주시면 따뜻한 책을 골라 드릴게요.
              </p>
            </div>

            <button
              onClick={resetToHome}
              className="w-full min-h-[48px] rounded-2xl bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] font-bold text-sm shadow-xs"
            >
              다시 쓰기
            </button>
          </section>
        )}

        {/* Screen 5-B: Crisis Counseling Hotline */}
        {screen === 'notice_crisis' && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="bg-[#f9e8e6] dark:bg-[#3a2221] border border-[#f0a19a]/40 rounded-2xl p-5 text-[#9b2c2c] dark:text-[#f0a19a]">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-[#9b2c2c] dark:text-[#f0a19a]" />
                <h2 className="font-serif-batang font-bold text-lg">
                  지금 많이 힘드신 것 같아요
                </h2>
              </div>
              <p className="text-xs sm:text-sm mt-2 leading-relaxed">
                이런 마음은 책보다 따뜻한 사람의 온기를 먼저 나누는 것이 좋습니다. 혼자 견디지 마시고 이야기해 주세요.
              </p>

              <div className="my-4 p-3 bg-white/70 dark:bg-black/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7]">
                    24시간 자살예방 상담전화
                  </div>
                  <div className="text-2xl font-bold tracking-wider text-[#9b2c2c] dark:text-[#f0a19a] tabular-nums">
                    109
                  </div>
                </div>
                <a
                  href="tel:109"
                  className="px-3.5 py-1.5 rounded-xl bg-[#9b2c2c] text-white text-xs font-bold hover:bg-[#802222]"
                >
                  전화 연결
                </a>
              </div>

              <p className="text-xs leading-relaxed">
                위급한 상황이면 <b>119</b>에 바로 연락해 주세요. 가까운 소중한 사람에게 한 줄 메시지를 건네는 것도 큰 도움이 됩니다.
              </p>
            </div>

            <button
              onClick={resetToHome}
              className="w-full min-h-[48px] rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] text-[#1d2826] dark:text-[#e4ebe9] font-medium text-sm hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836] transition-colors"
            >
              처음으로
            </button>
          </section>
        )}

        {/* Test Mode JSON Details */}
        {testMode && rawResponse && (
          <details className="text-xs bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-3.5 shadow-xs">
            <summary className="font-mono text-[#5d6b68] dark:text-[#9aaba7] cursor-pointer">
              테스트 모드 · AI 원본 JSON 확인
            </summary>
            <pre className="mt-2.5 p-2.5 bg-[#f3f5f4] dark:bg-[#121817] rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </details>
        )}

        {/* Footer */}
        <footer className="mt-4 pt-3 border-t border-[#d9e0de] dark:border-[#2c3836] text-[11px] text-[#5d6b68] dark:text-[#9aaba7] flex flex-wrap items-center justify-between gap-2">
          <span>책 목록 16권 안에서 추천합니다 · 프로토타입 v4</span>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => {
                  setTestMode(e.target.checked);
                  localStorage.setItem('mb_testmode', e.target.checked ? '1' : '0');
                }}
                className="rounded border-[#d9e0de] text-[#2c5f5d] focus:ring-0"
              />
              <span>테스트 모드</span>
            </label>

            <button
              onClick={() => openKeyModal()}
              className="hover:underline flex items-center gap-1 text-[#5d6b68] dark:text-[#9aaba7]"
            >
              <KeyRound className="w-3 h-3" />
              <span>엔진 설정</span>
            </button>

            <button
              onClick={handleOpenAdmin}
              className="hover:underline flex items-center gap-1 text-[#2c5f5d] dark:text-[#7fb8b4] font-medium"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>AI 관리자</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Modal: API Key Configuration */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-3xl p-5 sm:p-6 w-full max-w-[440px] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                <h3 className="font-serif-batang font-bold text-lg text-[#1d2826] dark:text-[#e4ebe9]">
                  AI 엔진 및 API 키 설정
                </h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] leading-relaxed">
              요청하신 <b>Gemini API</b> 또는 <b>Claude API</b> 중 원하는 모델을 선택하여 연결할 수 있습니다.
            </p>

            {/* Provider Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f3f5f4] dark:bg-[#121817] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedModalTab('gemini')}
                className={`py-2 rounded-lg transition-all ${
                  selectedModalTab === 'gemini'
                    ? 'bg-white dark:bg-[#1b2322] text-[#2c5f5d] dark:text-[#7fb8b4] shadow-xs'
                    : 'text-[#5d6b68] dark:text-[#9aaba7]'
                }`}
              >
                ✨ Gemini (기본 추천)
              </button>
              <button
                type="button"
                onClick={() => setSelectedModalTab('claude')}
                className={`py-2 rounded-lg transition-all ${
                  selectedModalTab === 'claude'
                    ? 'bg-white dark:bg-[#1b2322] text-[#2c5f5d] dark:text-[#7fb8b4] shadow-xs'
                    : 'text-[#5d6b68] dark:text-[#9aaba7]'
                }`}
              >
                Claude API
              </button>
            </div>

            {selectedModalTab === 'gemini' ? (
              <div className="flex flex-col gap-2.5">
                <div className="p-3 bg-[#e2ecea]/50 dark:bg-[#22312f]/40 rounded-xl text-xs text-[#2c5f5d] dark:text-[#7fb8b4] leading-relaxed">
                  {hasServerKey ? (
                    <p className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4] shrink-0" />
                      <span>Google AI Studio 내장 Gemini API가 자동으로 활성화되어 있습니다.</span>
                    </p>
                  ) : (
                    <p>
                      직접 발급받은 Google Gemini API 키가 있다면 아래에 입력해 주세요. (입력 시 브라우저 로컬 저장소에 안전하게 유지됩니다)
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#5d6b68] dark:text-[#9aaba7] block mb-1">
                    Gemini API Key (선택사항, 기본키 우선)
                  </label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder={hasServerKey ? '서버 내장 키 사용 중 (직접 입력도 가능)' : 'AIzaSy...'}
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#121817] text-[#1d2826] dark:text-[#e4ebe9] focus:outline-none focus:ring-2 focus:ring-[#2c5f5d]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="p-3 bg-[#f8efdf] dark:bg-[#33291a] rounded-xl text-xs text-[#8a5a12] dark:text-[#e3b46a] leading-relaxed">
                  Anthropic Console에서 발급받은 Claude API 키(<code className="font-mono">sk-ant-...</code>)를 입력하시면 Claude 모델(Claude 3.5 Haiku)로 책 추천을 생성합니다.
                </div>

                <div>
                  <label className="text-xs font-medium text-[#5d6b68] dark:text-[#9aaba7] block mb-1">
                    Claude API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#121817] text-[#1d2826] dark:text-[#e4ebe9] focus:outline-none focus:ring-2 focus:ring-[#2c5f5d]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#d9e0de] dark:border-[#2c3836]">
              {customKey ? (
                <button
                  type="button"
                  onClick={clearCustomKey}
                  className="text-xs text-red-500 hover:underline"
                >
                  입력 키 초기화
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7] hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveKeySettings}
                  className="px-4 py-2 text-xs rounded-xl bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] font-bold hover:opacity-90"
                >
                  설정 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Admin Tuning Console */}
      <AdminConsole
        isOpen={isAdminConsoleOpen}
        onClose={() => setIsAdminConsoleOpen(false)}
        adminToken={adminToken}
        onConfigUpdated={(cfg) => {
          setActiveServerModel(cfg.model);
        }}
      />
    </div>
  );
}
