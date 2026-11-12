import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { CATALOG, EMOS, isBlocked, isCrisis } from './src/data/bookDb.ts';
import {
  AdminConfig,
  DEFAULT_ADMIN_CONFIG,
  TONE_PRESETS,
  AIModelType,
} from './src/data/adminConfig.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve(__dirname, 'admin-config.json');

// Helper: Load persistent admin config from disk
function loadAdminConfig(): AdminConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('관리자 설정 파일을 읽는 중 오류가 발생하여 기본 설정을 사용합니다:', err);
  }
  return { ...DEFAULT_ADMIN_CONFIG };
}

// Helper: Save persistent admin config to disk
function saveAdminConfig(config: AdminConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log('관리자 설정이 admin-config.json에 성공적으로 저장되었습니다.');
  } catch (err) {
    console.error('관리자 설정 파일 저장 실패:', err);
  }
}

let activeConfig: AdminConfig = loadAdminConfig();

function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (_) {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch (_) {}
  }
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(text.slice(a, b + 1));
    } catch (_) {}
  }
  throw new Error('유효한 JSON 형식의 응답을 파싱하지 못했습니다.');
}

function buildPromptWithConfig(
  input: string,
  config: AdminConfig,
  exclude: string[] = []
): string {
  const cat = CATALOG.map(
    (c) => `${c.id} | 『${c.t}』 ${c.a} | 태그: ${c.emos.join(', ')} | 소개: ${c.w}`
  ).join('\n');

  const toneInfo =
    config.tonePreset === 'custom'
      ? config.customToneInstructions || TONE_PRESETS.warm.instruction
      : TONE_PRESETS[config.tonePreset]?.instruction || TONE_PRESETS.warm.instruction;

  const excludeText = exclude.length
    ? ` 다음 id는 이미 보여 줬으니 제외: ${exclude.join(', ')}`
    : '';

  const template =
    config.systemPromptTemplate || DEFAULT_ADMIN_CONFIG.systemPromptTemplate;

  return template
    .replace('{TONE_INSTRUCTION}', toneInfo)
    .replace('{EMOS}', EMOS.join(', '))
    .replace('{EXCLUDE_RULE}', excludeText)
    .replace('{CATALOG}', cat)
    .replace('{USER_INPUT}', input.slice(0, 300));
}

async function executeAI(
  prompt: string,
  targetModel: AIModelType,
  customApiKey?: string
): Promise<{ text: string; modelUsed: string }> {
  // Claude model requested or custom Claude API key provided
  if (
    targetModel === 'claude-3-5-haiku-20241022' ||
    (customApiKey && String(customApiKey).startsWith('sk-ant-'))
  ) {
    const claudeKey =
      customApiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!claudeKey) {
      throw {
        code: 'need_api_key',
        provider: 'claude',
        message: 'Claude API 키를 입력해 주세요.'
      };
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeRes.ok) {
      const errData = (await claudeRes.json().catch(() => ({}))) as any;
      throw {
        code:
          claudeRes.status === 401 || claudeRes.status === 403
            ? 'bad_key'
            : 'upstream_error',
        message: errData?.error?.message || 'Claude API 호출에 실패했습니다.'
      };
    }

    const data = (await claudeRes.json()) as any;
    const rawText = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    return { text: rawText, modelUsed: 'claude-3-5-haiku-20241022' };
  }

  // Google Gemini API call
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw {
      code: 'need_api_key',
      provider: 'gemini',
      message:
        'Gemini API 키가 설정되지 않았습니다. Gemini 키 또는 Claude 키를 입력해 주세요.'
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const primaryModel =
    targetModel === 'gemini-flash-latest' ? 'gemini-flash-latest' : 'gemini-3.8-flash';

  let response;
  let modelUsed = primaryModel;
  try {
    response = await ai.models.generateContent({
      model: primaryModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
  } catch (geminiErr: any) {
    console.warn(`${primaryModel} 1차 요청 오류, 재시도합니다:`, geminiErr?.message || geminiErr);
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
    } catch (retryErr: any) {
      console.warn('재시도 오류, gemini-flash-latest로 시도합니다:', retryErr?.message || retryErr);
      modelUsed = 'gemini-flash-latest';
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
    }
  }

  return { text: response.text || '{}', modelUsed };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Public Configuration check endpoint
  app.get('/api/config', (req, res) => {
    res.json({
      hasServerGeminiKey: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
      defaultProvider: 'gemini',
      model: activeConfig.model,
      tonePreset: activeConfig.tonePreset,
      keyPrefix: process.env.GEMINI_API_KEY
        ? process.env.GEMINI_API_KEY.substring(0, 6) + '...'
        : 'none'
    });
  });

  // Git Push endpoint using server GITHUB_TOKEN secret
  app.post('/api/admin/git-push', async (req, res) => {
    try {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        return res.status(400).json({
          error: 'GITHUB_TOKEN 환경변수가 감지되지 않았습니다. AI Studio의 Secrets 메뉴에서 GITHUB_TOKEN이 등록되어 있는지 확인해 주세요.'
        });
      }

      const { execSync } = await import('child_process');
      const cleanToken = token.trim();
      const repoUrl = `https://${cleanToken}@github.com/loreenkim0301/aipm-maumlibrary-251112.git`;

      execSync('git config --global --add safe.directory /app/applet || true', { encoding: 'utf-8' });
      execSync('git branch -M main', { encoding: 'utf-8' });

      execSync(`git push -u "${repoUrl}" main`, { encoding: 'utf-8' });
      execSync('git remote set-url origin https://github.com/loreenkim0301/aipm-maumlibrary-251112.git', { encoding: 'utf-8' });
      console.log('Git push succeeded to remote main.');
      res.json({ success: true, message: '깃헙 저장소(main 브랜치)로 성공적으로 푸시되었습니다.' });
    } catch (err: any) {
      console.error('Git push failed');
      res.status(500).json({ error: '깃헙 푸시 중 오류가 발생했습니다.' });
    }
  });

  // Admin Auth endpoint
  app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해 주세요.' });
    }
    if (password === activeConfig.adminPassword) {
      return res.json({ success: true, token: 'admin-authorized-session' });
    }
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  });

  // Admin Config Get endpoint
  app.get('/api/admin/config', (req, res) => {
    // Return active configuration without exposing full password
    res.json({
      model: activeConfig.model,
      tonePreset: activeConfig.tonePreset,
      customToneInstructions: activeConfig.customToneInstructions,
      systemPromptTemplate: activeConfig.systemPromptTemplate,
      updatedAt: activeConfig.updatedAt
    });
  });

  // Admin Config Save endpoint
  app.post('/api/admin/config', (req, res) => {
    const authHeader = req.headers['x-admin-token'];
    const {
      model,
      tonePreset,
      customToneInstructions,
      systemPromptTemplate,
      newPassword,
      currentPassword
    } = req.body;

    // Verify auth
    if (authHeader !== 'admin-authorized-session' && currentPassword !== activeConfig.adminPassword) {
      return res.status(401).json({ error: '관리자 권한이 필요합니다.' });
    }

    if (model) activeConfig.model = model;
    if (tonePreset) activeConfig.tonePreset = tonePreset;
    if (typeof customToneInstructions === 'string') {
      activeConfig.customToneInstructions = customToneInstructions;
    }
    if (typeof systemPromptTemplate === 'string') {
      activeConfig.systemPromptTemplate = systemPromptTemplate;
    }
    if (newPassword && String(newPassword).trim().length >= 4) {
      activeConfig.adminPassword = String(newPassword).trim();
    }
    activeConfig.updatedAt = new Date().toISOString();

    saveAdminConfig(activeConfig);

    res.json({
      success: true,
      message: '관리자 AI 설정이 서버에 성공적으로 저장되고 실시간 반영되었습니다.',
      config: {
        model: activeConfig.model,
        tonePreset: activeConfig.tonePreset,
        customToneInstructions: activeConfig.customToneInstructions,
        systemPromptTemplate: activeConfig.systemPromptTemplate,
        updatedAt: activeConfig.updatedAt
      }
    });
  });

  // Admin Reset endpoint
  app.post('/api/admin/reset', (req, res) => {
    const authHeader = req.headers['x-admin-token'];
    if (authHeader !== 'admin-authorized-session') {
      return res.status(401).json({ error: '관리자 권한이 필요합니다.' });
    }

    const currentPwd = activeConfig.adminPassword;
    activeConfig = {
      ...DEFAULT_ADMIN_CONFIG,
      adminPassword: currentPwd,
      updatedAt: new Date().toISOString()
    };
    saveAdminConfig(activeConfig);

    res.json({
      success: true,
      message: '관리자 AI 설정이 기본값으로 초기화되었습니다.',
      config: {
        model: activeConfig.model,
        tonePreset: activeConfig.tonePreset,
        customToneInstructions: activeConfig.customToneInstructions,
        systemPromptTemplate: activeConfig.systemPromptTemplate,
        updatedAt: activeConfig.updatedAt
      }
    });
  });

  // Admin Playground / Test endpoint
  app.post('/api/admin/test', async (req, res) => {
    try {
      const {
        input,
        model,
        tonePreset,
        customToneInstructions,
        systemPromptTemplate,
        customApiKey
      } = req.body;

      const text = String(input || '오늘은 날씨가 좀 쌀쌀해').trim();
      const testConfig: AdminConfig = {
        model: model || activeConfig.model,
        tonePreset: tonePreset || activeConfig.tonePreset,
        customToneInstructions:
          typeof customToneInstructions === 'string'
            ? customToneInstructions
            : activeConfig.customToneInstructions,
        systemPromptTemplate:
          systemPromptTemplate || activeConfig.systemPromptTemplate,
        adminPassword: activeConfig.adminPassword,
        updatedAt: new Date().toISOString()
      };

      const prompt = buildPromptWithConfig(text, testConfig, []);
      const { text: resultText, modelUsed } = await executeAI(
        prompt,
        testConfig.model,
        customApiKey
      );
      const parsed = parseJSON(resultText);

      res.json({
        ...parsed,
        _meta: {
          modelUsed,
          toneUsed: testConfig.tonePreset,
          isPlaygroundTest: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Playground test error:', err);
      res.status(500).json({
        error: err?.message || '테스트 생성 중 오류가 발생했습니다.',
        code: err?.code || 'test_error'
      });
    }
  });

  // Main recommendation endpoint (used by client)
  app.post('/api/recommend', async (req, res) => {
    try {
      const {
        input,
        shownIds = [],
        provider,
        customApiKey
      } = req.body;

      const text = String(input || '').trim();

      if (!text) {
        return res.status(400).json({ error: '문장을 입력해 주세요.' });
      }

      // Immediate pre-AI safety checks
      if (isCrisis(text)) {
        return res.json({ mode: 'crisis' });
      }
      if (isBlocked(text)) {
        return res.json({ mode: 'block' });
      }

      // Build prompt using the live active admin config
      const prompt = buildPromptWithConfig(text, activeConfig, shownIds);

      // Determine model: if user explicitly requested Claude or provided Claude key, use that; otherwise activeConfig.model
      let targetModel = activeConfig.model;
      if (
        provider === 'claude' ||
        (customApiKey && String(customApiKey).startsWith('sk-ant-'))
      ) {
        targetModel = 'claude-3-5-haiku-20241022';
      }

      const { text: resultText, modelUsed } = await executeAI(
        prompt,
        targetModel,
        customApiKey
      );

      const parsed = parseJSON(resultText);
      return res.json({
        ...parsed,
        _meta: {
          modelUsed,
          toneUsed: activeConfig.tonePreset,
          keyType: customApiKey ? 'custom' : 'built-in-aistudio',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Error generating recommendation:', err);
      const errMsg = err?.message || String(err);
      const isBadKey =
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('401') ||
        errMsg.includes('403');
      const isRateLimited =
        errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429');

      return res.status(500).json({
        code: err?.code || (isBadKey ? 'bad_key' : isRateLimited ? 'rate_limited' : 'upstream_error'),
        provider: err?.provider,
        error: errMsg || 'AI 추천을 생성하는 중 문제가 발생했습니다.'
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`마음책방 서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
