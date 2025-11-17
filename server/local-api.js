// Lightweight local JSON API for saving/loading experiences.
// Run with `npm run api` or `pnpm api`, then the frontend can call http://localhost:4000/api/experiences

const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('cross-fetch');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'experiences.json');

const readJsonBody = req =>
  new Promise(resolve => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        console.error('[local-api] failed to parse body', err);
        resolve({});
      }
    });
  });

const ensureDataFile = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ experiences: [] }, null, 2));
  }
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const buildAiRequest = ({ raw, feature = 'summarize', model, settings }) => {
  const models = (settings && settings.models) || {};
  const prompts = (settings && settings.prompts) || {};
  const modelConfig = models[model] || {};
  const systemPrompt = prompts[feature];

  if (!raw || !raw.trim()) {
    throw new Error('没有可供总结的内容');
  }
  if (!modelConfig.apiKey) {
    throw new Error(`模型“${model || ''}”缺少 API Key`);
  }
  if (!systemPrompt) {
    throw new Error(`缺少 “${feature}” 的 Prompt`);
  }

  const endpoint = modelConfig.endpoint;
  const lowerEndpoint = (endpoint || '').toLowerCase();
  const isGemini = lowerEndpoint.includes('generativelanguage.googleapis.com');

  const requestBody = isGemini
    ? {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }
    : {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `以下是候选人的个人经历，请根据要求输出：\n${raw}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      };

  const headers = { 'Content-Type': 'application/json' };
  let fetchUrl = endpoint;
  if (isGemini) {
    const separator = endpoint.includes('?') ? '&' : '?';
    fetchUrl = `${endpoint}${separator}key=${modelConfig.apiKey}`;
  } else {
    headers.Authorization = `Bearer ${modelConfig.apiKey}`;
  }

  return { fetchUrl, headers, requestBody, isGemini };
};

const handleAiSummarize = async (req, res) => {
  const payload = await readJsonBody(req);

  try {
    const { fetchUrl, headers, requestBody, isGemini } = buildAiRequest(payload);
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      let reason = response.statusText || '请求失败';
      try {
        const parsed = JSON.parse(text);
        reason = parsed?.error?.message || parsed?.message || reason;
      } catch (err) {
        // ignore
      }
      sendJson(res, response.status, { error: reason });
      return;
    }

    const data = await response.json();
    let content;
    if (isGemini) {
      const parts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        content = parts
          .map(part => (typeof part?.text === 'string' ? part.text : ''))
          .filter(Boolean)
          .join('\n');
      }
    } else {
      content = data?.choices?.[0]?.message?.content;
    }

    if (!content) {
      sendJson(res, 500, { error: '模型未返回任何内容' });
      return;
    }

    sendJson(res, 200, { content });
  } catch (err) {
    console.error('[local-api] ai proxy error', err);
    sendJson(res, 500, { error: err.message || 'AI 调用失败' });
  }
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.url === '/api/ai/summarize' && req.method === 'POST') {
    handleAiSummarize(req, res);
    return;
  }

  if (req.url !== '/api/experiences') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  ensureDataFile();

  if (req.method === 'GET') {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw || '{}');
      sendJson(res, 200, { experiences: data.experiences || [] });
    } catch (err) {
      console.error('[local-api] read error', err);
      sendJson(res, 500, { error: 'Failed to read data file' });
    }
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!Array.isArray(payload.experiences)) {
          sendJson(res, 400, { error: 'Invalid payload, expected experiences array' });
          return;
        }
        const data = { experiences: payload.experiences, savedAt: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        sendJson(res, 200, { ok: true });
      } catch (err) {
        console.error('[local-api] write error', err);
        sendJson(res, 500, { error: 'Failed to save data file' });
      }
    });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`[local-api] listening on http://localhost:${PORT}/api/experiences`);
});
