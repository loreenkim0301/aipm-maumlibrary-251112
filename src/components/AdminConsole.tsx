/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  FileCode,
  FlaskConical,
  KeyRound,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  X,
  Play,
  Info,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import {
  AdminConfig,
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_SYSTEM_PROMPT_TEMPLATE,
  TONE_PRESETS,
  AIModelType,
  TonePresetType
} from '../data/adminConfig';
import { emoOf, byId } from '../data/bookDb';

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string;
  onConfigUpdated?: (config: AdminConfig) => void;
}

export default function AdminConsole({
  isOpen,
  onClose,
  adminToken,
  onConfigUpdated
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'tone' | 'prompt' | 'test' | 'security'>('tone');
  const [config, setConfig] = useState<AdminConfig>(DEFAULT_ADMIN_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Playground state
  const [testInput, setTestInput] = useState('오늘 퇴근길에 비가 와서 마음이 좀 쓸쓸해');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error('설정 정보를 불러오지 못했습니다.');
      const data = await res.json();
      setConfig((prev) => ({
        ...prev,
        ...data
      }));
    } catch (err: any) {
      setErrorMsg(err.message || '설정 로드 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    // Password validation if entered
    if (newPassword) {
      if (newPassword.length < 4) {
        setErrorMsg('새 비밀번호는 4자리 이상이어야 합니다.');
        setIsSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('새 비밀번호 확인이 일치하지 않습니다.');
        setIsSaving(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          model: config.model,
          tonePreset: config.tonePreset,
          customToneInstructions: config.customToneInstructions,
          systemPromptTemplate: config.systemPromptTemplate,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');

      setSaveSuccessMsg('설정이 서버에 영구 저장되었으며, 추천 서비스에 실시간 적용되었습니다!');
      if (newPassword) {
        setNewPassword('');
        setConfirmPassword('');
      }
      if (onConfigUpdated && data.config) {
        onConfigUpdated(data.config);
      }
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('모든 AI 프롬프트와 어조 설정을 공식 기본값으로 복원하시겠습니까?')) {
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '초기화 실패');

      setConfig((prev) => ({
        ...prev,
        ...data.config
      }));
      setSaveSuccessMsg('모든 AI 설정이 기본값으로 초기화되었습니다.');
      if (onConfigUpdated && data.config) {
        onConfigUpdated(data.config);
      }
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || '초기화 중 오류 발생');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunPlaygroundTest = async () => {
    if (!testInput.trim()) return;
    setTestRunning(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          input: testInput.trim(),
          model: config.model,
          tonePreset: config.tonePreset,
          customToneInstructions: config.customToneInstructions,
          systemPromptTemplate: config.systemPromptTemplate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '테스트 생성 실패');
      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || '테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setTestRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-3xl w-full max-w-[860px] max-h-[92vh] shadow-2xl flex flex-col text-[#1d2826] dark:text-[#e4ebe9] overflow-hidden">
        {/* Header */}
        <header className="px-5 py-4 border-b border-[#d9e0de] dark:border-[#2c3836] flex items-center justify-between shrink-0 bg-[#f3f5f4]/50 dark:bg-[#121817]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2c5f5d] text-white flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-batang font-bold text-base sm:text-lg">
                마음책방 AI 관리자 콘솔
              </h2>
              <div className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>서버 실시간 반영 활성화 (`admin-config.json`)</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#d9e0de] dark:border-[#2c3836] px-5 bg-white dark:bg-[#1b2322] shrink-0 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('tone')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'tone'
                ? 'border-[#2c5f5d] dark:border-[#7fb8b4] text-[#2c5f5d] dark:text-[#7fb8b4] font-bold'
                : 'border-transparent text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>모델 & 공감 어조</span>
          </button>

          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'prompt'
                ? 'border-[#2c5f5d] dark:border-[#7fb8b4] text-[#2c5f5d] dark:text-[#7fb8b4] font-bold'
                : 'border-transparent text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>시스템 프롬프트 편집기</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'test'
                ? 'border-[#2c5f5d] dark:border-[#7fb8b4] text-[#2c5f5d] dark:text-[#7fb8b4] font-bold'
                : 'border-transparent text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9]'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>실시간 테스트 랩</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'security'
                ? 'border-[#2c5f5d] dark:border-[#7fb8b4] text-[#2c5f5d] dark:text-[#7fb8b4] font-bold'
                : 'border-transparent text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>관리자 보안</span>
          </button>
        </div>

        {/* Global Notification Banners */}
        {saveSuccessMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Contents (Scrollable body) */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: MODEL & TONE */}
          {activeTab === 'tone' && (
            <div className="space-y-6">
              {/* Section 1: AI Model Selector */}
              <div>
                <h3 className="text-sm font-bold text-[#1d2826] dark:text-[#e4ebe9] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                  <span>서비스 엔진 모델 선택</span>
                </h3>
                <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-1 mb-3">
                  사용자 요청을 해석하고 도서를 추천할 기본 AI 모델을 선택합니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'gemini-3.8-flash',
                        name: 'Gemini 3.8 Flash',
                        badge: '기본 권장',
                        desc: '빠른 응답 속도와 섬세한 감정 분석력'
                      },
                      {
                        id: 'gemini-flash-latest',
                        name: 'Gemini Flash Latest',
                        badge: '최신 플래시',
                        desc: '구글 최신 프로덕션 플래시 엔진'
                      },
                      {
                        id: 'claude-3-5-haiku-20241022',
                        name: 'Claude 3.5 Haiku',
                        badge: 'Anthropic',
                        desc: '경량 고속 앤트로픽 언어 모델'
                      }
                    ] as const
                  ).map((m) => {
                    const isSelected = config.model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setConfig({ ...config, model: m.id as AIModelType })}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-[#2c5f5d] dark:border-[#7fb8b4] bg-[#e2ecea]/40 dark:bg-[#22312f]/40 shadow-xs'
                            : 'border-[#d9e0de] dark:border-[#2c3836] hover:border-[#2c5f5d]/50 bg-white dark:bg-[#1b2322]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#5d6b68] dark:text-[#9aaba7]">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7] leading-relaxed">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Empathy Tone Presets */}
              <div>
                <h3 className="text-sm font-bold text-[#1d2826] dark:text-[#e4ebe9] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                  <span>공감 어조 & 톤앤매너 프리셋</span>
                </h3>
                <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-1 mb-3">
                  도서 추천 상단에 표시되는 공감 한 줄 및 추천 이유의 문체를 선택합니다.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['warm', 'calm', 'poetic', 'plain', 'custom'] as TonePresetType[]).map((tId) => {
                    const preset = TONE_PRESETS[tId];
                    const isSelected = config.tonePreset === tId;
                    return (
                      <button
                        key={tId}
                        type="button"
                        onClick={() => setConfig({ ...config, tonePreset: tId })}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#2c5f5d] dark:border-[#7fb8b4] bg-[#e2ecea]/40 dark:bg-[#22312f]/40 ring-1 ring-[#2c5f5d] dark:ring-[#7fb8b4]'
                            : 'border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] hover:border-[#2c5f5d]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{preset.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />}
                        </div>
                        <p className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">
                          {preset.description}
                        </p>
                        {preset.exampleEmpathy && (
                          <div className="mt-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] font-serif-batang italic text-[#1d2826]/80 dark:text-[#e4ebe9]/80">
                            "{preset.exampleEmpathy}"
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {config.tonePreset === 'custom' && (
                  <div className="mt-4 p-4 rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-[#f3f5f4]/50 dark:bg-[#121817]/40 space-y-2">
                    <label className="text-xs font-bold text-[#1d2826] dark:text-[#e4ebe9] block">
                      사용자 정의 어조 지침 직접 입력
                    </label>
                    <textarea
                      value={config.customToneInstructions}
                      onChange={(e) => setConfig({ ...config, customToneInstructions: e.target.value })}
                      placeholder="예: 위트 있고 명랑한 친구처럼 쾌활한 존댓말로, 무거운 고민도 가볍게 털어낼 수 있도록 기분 좋은 에너지를 불어넣어 주세요."
                      rows={3}
                      className="w-full p-3 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] focus:ring-2 focus:ring-[#2c5f5d] focus:outline-none"
                    />
                    <p className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">
                      * 시스템 프롬프트의 <code className="font-mono font-bold text-[#2c5f5d] dark:text-[#7fb8b4]">{`{TONE_INSTRUCTION}`}</code> 자리에 실시간 치환되어 전달됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM PROMPT EDITOR */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1d2826] dark:text-[#e4ebe9] flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                    <span>시스템 프롬프트 템플릿</span>
                  </h3>
                  <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-0.5">
                    AI가 사용자의 문장을 해석하고 도서를 큐레이션하는 핵심 판단 지침입니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('프롬프트 템플릿을 공식 기본값으로 복구하시겠습니까?')) {
                      setConfig({ ...config, systemPromptTemplate: DEFAULT_SYSTEM_PROMPT_TEMPLATE });
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#d9e0de] dark:border-[#2c3836] hover:bg-black/5 dark:hover:bg-white/5 text-xs text-[#5d6b68] dark:text-[#9aaba7] flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>기본 템플릿 복원</span>
                </button>
              </div>

              {/* Template Variable Reference Bar */}
              <div className="p-3 bg-[#e2ecea]/40 dark:bg-[#22312f]/40 rounded-xl text-xs space-y-1.5">
                <div className="font-semibold text-[#2c5f5d] dark:text-[#7fb8b4] text-[11px]">
                  사용 가능한 동적 치환 변수:
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-[#d9e0de] dark:border-[#2c3836]">
                    {`{TONE_INSTRUCTION}`} (선택된 공감 어조 지침)
                  </span>
                  <span className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-[#d9e0de] dark:border-[#2c3836]">
                    {`{EMOS}`} (9대 감정 목록)
                  </span>
                  <span className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-[#d9e0de] dark:border-[#2c3836]">
                    {`{CATALOG}`} (16권 도서 DB)
                  </span>
                  <span className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-[#d9e0de] dark:border-[#2c3836]">
                    {`{EXCLUDE_RULE}`} (중복 도서 제외 규칙)
                  </span>
                  <span className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-[#d9e0de] dark:border-[#2c3836]">
                    {`{USER_INPUT}`} (사용자가 적은 마음 문장)
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={config.systemPromptTemplate}
                  onChange={(e) => setConfig({ ...config, systemPromptTemplate: e.target.value })}
                  rows={16}
                  className="w-full p-4 font-mono text-xs leading-relaxed rounded-2xl border border-[#d9e0de] dark:border-[#2c3836] bg-[#f3f5f4]/50 dark:bg-[#121817] text-[#1d2826] dark:text-[#e4ebe9] focus:outline-none focus:ring-2 focus:ring-[#2c5f5d] resize-y"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* TAB 3: PLAYGROUND / TESTING LAB */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1d2826] dark:text-[#e4ebe9] flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                  <span>실시간 테스트 랩 (Playground)</span>
                </h3>
                <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-0.5">
                  현재 편집 중인 모델(`{config.model}`)과 어조(`{TONE_PRESETS[config.tonePreset]?.name}`)를 즉시 테스트해 볼 수 있습니다.
                </p>
              </div>

              {/* Test Input Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="테스트할 마음 문장을 입력해 보세요"
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] focus:ring-2 focus:ring-[#2c5f5d] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunPlaygroundTest();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleRunPlaygroundTest}
                  disabled={testRunning || !testInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{testRunning ? '생성 중...' : '테스트 실행'}</span>
                </button>
              </div>

              {/* Quick sample chips for testing */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">예시 문장:</span>
                {[
                  '오늘 퇴근길에 비가 와서 마음이 좀 쓸쓸해',
                  '새로운 프로젝트 발표를 앞두고 너무 긴장돼',
                  '주말 내내 아무것도 안 하고 누워만 있었어',
                  '오랜만에 친구를 만나서 괜히 설렜어'
                ].map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTestInput(s);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {testError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                  {testError}
                </div>
              )}

              {/* Test Result View */}
              {testResult && (
                <div className="border border-[#d9e0de] dark:border-[#2c3836] rounded-2xl p-4 bg-[#f3f5f4]/40 dark:bg-[#121817]/40 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-[#d9e0de] dark:border-[#2c3836] pb-2.5">
                    <span className="font-bold text-[#2c5f5d] dark:text-[#7fb8b4] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>테스트 결과 생성 완료</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#5d6b68] dark:text-[#9aaba7]">
                      <span>모델: {testResult._meta?.modelUsed}</span>
                      <span>·</span>
                      <span>어조: {testResult._meta?.toneUsed}</span>
                    </div>
                  </div>

                  {/* Empathy Sentence */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#5d6b68] dark:text-[#9aaba7] block mb-1">
                      AI 공감 문장 (Empathy):
                    </span>
                    <p className="font-serif-batang font-bold text-sm text-[#1d2826] dark:text-[#e4ebe9] bg-white dark:bg-[#1b2322] p-3 rounded-xl border border-[#d9e0de] dark:border-[#2c3836]">
                      "{testResult.empathy || '공감 문장 없음'}"
                    </p>
                  </div>

                  {/* Emotion & Keywords */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-[#5d6b68] dark:text-[#9aaba7]">
                      분석된 감정:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] font-bold text-xs">
                      {testResult.primary}
                    </span>
                    {Array.isArray(testResult.secondary) &&
                      testResult.secondary.map((sec: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full border border-[#d9e0de] dark:border-[#2c3836] text-xs"
                        >
                          {sec}
                        </span>
                      ))}

                    {Array.isArray(testResult.keywords) && testResult.keywords.length > 0 && (
                      <span className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7] ml-2">
                        키워드: {testResult.keywords.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Recommended Books */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#5d6b68] dark:text-[#9aaba7] block mb-1.5">
                      추천된 도서 3권:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {Array.isArray(testResult.books) &&
                        testResult.books.map((b: any, idx: number) => {
                          const catBook = byId(b.id);
                          const spineCol = emoOf(catBook?.emos[0] || testResult.primary).color;
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white dark:bg-[#1b2322] rounded-xl border border-[#d9e0de] dark:border-[#2c3836] flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: spineCol }}
                                  />
                                  <span className="font-bold text-xs truncate">
                                    {catBook?.t || b.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">
                                  {catBook?.a}
                                </div>
                                <p className="text-[11px] text-[#1d2826]/80 dark:text-[#e4ebe9]/80 mt-1.5 line-clamp-3">
                                  {b.why || catBook?.w}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-md">
              <div>
                <h3 className="text-sm font-bold text-[#1d2826] dark:text-[#e4ebe9] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#2c5f5d] dark:text-[#7fb8b4]" />
                  <span>관리자 비밀번호 변경</span>
                </h3>
                <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] mt-0.5">
                  관리자 콘솔에 접근할 수 있는 간편 비밀번호를 변경할 수 있습니다.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7] block mb-1">
                    새 비밀번호 (4자리 이상)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 관리자 비밀번호"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] focus:ring-2 focus:ring-[#2c5f5d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#5d6b68] dark:text-[#9aaba7] block mb-1">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-white dark:bg-[#1b2322] focus:ring-2 focus:ring-[#2c5f5d] focus:outline-none"
                  />
                </div>

                <p className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7]">
                  * 하단의 <b>[설정 저장 및 서비스 즉시 반영]</b>을 누르면 새 비밀번호가 저장됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        <footer className="px-5 py-3.5 border-t border-[#d9e0de] dark:border-[#2c3836] bg-[#f3f5f4]/80 dark:bg-[#121817]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving || isLoading}
            className="px-3 py-2 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] text-[#8a5a12] dark:text-[#e3b46a] hover:bg-amber-500/10 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값으로 전체 초기화</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl border border-[#d9e0de] dark:border-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '서버 저장 중...' : '설정 저장 및 서비스 즉시 반영'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
