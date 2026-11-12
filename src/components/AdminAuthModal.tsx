/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, AlertCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export default function AdminAuthModal({
  isOpen,
  onClose,
  onSuccess
}: AdminAuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '비밀번호가 올바르지 않습니다.');
      }

      setPassword('');
      onSuccess(data.token);
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b2322] border border-[#d9e0de] dark:border-[#2c3836] rounded-3xl p-6 w-full max-w-[380px] shadow-2xl flex flex-col gap-4 text-[#1d2826] dark:text-[#e4ebe9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2c5f5d]/10 dark:bg-[#7fb8b4]/10 text-[#2c5f5d] dark:text-[#7fb8b4] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif-batang font-bold text-lg">
              관리자 인증
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9] p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#5d6b68] dark:text-[#9aaba7] leading-relaxed">
          AI 추천 파이프라인, 시스템 프롬프트, 공감 어조를 세밀하게 조정할 수 있는 관리자 전용 공간입니다.
        </p>

        {error && (
          <div className="p-3 bg-[#f9e8e6] dark:bg-[#3a2221] border border-[#f0a19a]/40 rounded-xl text-xs text-[#9b2c2c] dark:text-[#f0a19a] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5d6b68] dark:text-[#9aaba7]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="관리자 비밀번호 입력"
              autoFocus
              className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-[#d9e0de] dark:border-[#2c3836] bg-[#f3f5f4] dark:bg-[#121817] focus:outline-none focus:ring-2 focus:ring-[#2c5f5d] dark:focus:ring-[#7fb8b4]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5d6b68] dark:text-[#9aaba7] hover:text-[#1d2826] dark:hover:text-[#e4ebe9]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-[11px] text-[#5d6b68] dark:text-[#9aaba7] flex items-center justify-between">
            <span>초기 비밀번호: <code className="font-mono font-bold">admin1234</code></span>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-[#d9e0de] dark:border-[#2c3836] text-[#5d6b68] dark:text-[#9aaba7] hover:bg-[#f3f5f4] dark:hover:bg-[#2c3836]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-[#2c5f5d] dark:bg-[#7fb8b4] text-white dark:text-[#0f1a19] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? '인증 중...' : '관리자 입장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
