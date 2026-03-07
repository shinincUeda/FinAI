import { Holding, WatchlistItem, CompounderAnalysis } from '../types';

// ==========================================
// 新規銘柄登録用 AI分析
// ==========================================
export interface StockAnalysisResult {
  name: string;
  sector: Holding['sector'];
  aiAlignmentScore: 1 | 2 | 3 | 4 | 5;
  thesis: string;
  sellTriggers: string;
  watchMetrics: string;
  notes: string;
}

export async function analyzeStockForRegistration(ticker: string): Promise<StockAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY が設定されていません');

  const systemPrompt = `あなたは個人投資家向けの投資分析AIです。ティッカーシンボルを受け取り、Google検索で最新情報を取得して、以下のJSON形式のみで回答してください。マークダウンコードブロックや説明文は不要です。純粋なJSONのみを返してください。

{
  "name": "企業名（英語）",
  "sector": "ai-infra" または "hyperscaler" または "ai-drug" または "energy" または "fintech" または "robotics" または "other" のいずれか,
  "aiAlignmentScore": 1から5の整数,
  "thesis": "投資テーゼ（200文字程度、日本語）",
  "sellTriggers": "売却トリガー条件（日本語）",
  "watchMetrics": "注目すべき指標（日本語）",
  "notes": "補足メモ（日本語）"
}

セクター定義:
- ai-infra: AI半導体・データセンター・ネットワーク
- hyperscaler: クラウド大手（AWS/Azure/GCP等）
- ai-drug: AI創薬・バイオ・ヘルスケア
- energy: エネルギー（AI電力需要関連）
- fintech: フィンテック・デジタル金融
- robotics: ロボティクス・自動化
- other: その他

AI戦略適合度スコア基準:
5: AI事業が中核、AGI時代に不可欠な存在
4: AI活用が競争優位の主要因
3: AI活用中だが他社に代替可能
2: AI恩恵は限定的
1: AIと無関係またはAIに置き換えられるリスクが高い`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: 'user',
        parts: [{ text: `${ticker}について分析してください。Google検索で最新の情報（事業内容、AI戦略、競合優位性）を取得し、Dario Amodei / Demis Hassabisが描くAI未来像の観点から投資テーゼを構築してJSONで回答してください。` }],
      }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // JSON部分を抽出してパース
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI応答からJSONを抽出できませんでした');

  try {
    const parsed = JSON.parse(jsonMatch[0]) as StockAnalysisResult;
    // aiAlignmentScore を1〜5の範囲に収める
    parsed.aiAlignmentScore = Math.max(1, Math.min(5, Math.round(parsed.aiAlignmentScore))) as 1 | 2 | 3 | 4 | 5;
    return parsed;
  } catch {
    throw new Error('AI応答のJSONパースに失敗しました');
  }
}

export interface ParsedReportData {
  ticker: string;
  name: string;
  sector: 'ai-infra' | 'hyperscaler' | 'ai-drug' | 'energy' | 'fintech' | 'robotics' | 'other';
  aiAlignmentScore: 1 | 2 | 3 | 4 | 5;
  thesis: string;
  sellTriggers: string;
  watchMetrics: string;
  currentPrice?: number;
  analysis: CompounderAnalysis;
}

const WEEKLY_REPORT_SYSTEM_PROMPT = `あなたはDario Amodei / Demis Hassabisの描くAI未来像に基づいた投資戦略の参謀です。
以下のポートフォリオに対して週次レポートを生成してください。

## レポート構成（マークダウン形式で出力）
1. **テーゼ変動アラート** — 各銘柄のテーゼが生きているかの判定（🟢🟡🔴）
2. **エントリーチャンス** — 提示された「エントリー候補（S/A評価）」の中から、最新ニュース・株価動向を踏まえて買い時が来ているものを厳選して提示
3. **売却検討** — バリュエーション過熱 or テーゼ弱体化の銘柄
4. **新規発掘** — AIバリューチェーンで見落としている有望銘柄（1-2銘柄）
5. **世界観チェック** — 「Amodei/Hassabisの世界は来ているか？」の判定と根拠
6. **推奨アクション** — 今週やるべきことのトップ3（優先順位付き）

## 原則
- Google検索を使って各銘柄の最新ニュースと株価を取得してください
- 忖度なし。悪いニュースも正直に。データに基づいて判断
- Terry Smith / Chuck Akre的なコンパウンディング視点
- 価格ではなくテーゼで売買判断
- 各銘柄のステータスは必ずテーゼの健全性で判定（株価の上下ではない）
- レポートは日本語で。ティッカーは英語のまま。`;

function buildReportPrompt(holdings: Holding[], watchlist: WatchlistItem[]): string {
  // ポートフォリオ全体像（状況把握・テーゼ検証用）
  const holdingsSummary = holdings.map(h =>
    `- ${h.ticker} (${h.name}): AI適合度${h.aiAlignmentScore}/5, ステータス:${h.status}, テーゼ:${h.thesis.substring(0, 100)}...`
  ).join('\n');

  // エントリー候補の厳選（SまたはA評価のみ。未評価やB以下は除外）
  const isGradeSA = (grade?: string) => grade === 'S' || grade === 'A';
  const entryCandidates = [
    ...holdings.filter(h => isGradeSA(h.analysis?.fundamentalGrade)),
    ...watchlist.filter(w => isGradeSA(w.analysis?.fundamentalGrade))
  ];

  const candidatesSummary = entryCandidates.length > 0
    ? entryCandidates.map(c => `- ${c.ticker} (${c.name}): Grade ${c.analysis?.fundamentalGrade}, テーゼ:${c.thesis.substring(0, 80)}...`).join('\n')
    : '現在、S/A評価のエントリー候補はありません。新規発掘に注力してください。';

  return `## 現在のポートフォリオ（テーゼ検証・売却検討用）
${holdingsSummary}

## エントリー候補（S/A評価の厳選銘柄。この中から買い時を探してください）
${candidatesSummary}

上記のデータに対して、Google検索で最新情報を取得した上で、週次レポートを生成してください。
今日の日付を基準に、今週の重要なニュース・決算・市場動向を反映してください。`;
}

export async function generateWeeklyReport(
  apiKey: string, // VITE_GEMINI_API_KEY が渡ってくる想定
  holdings: Holding[],
  watchlist: WatchlistItem[]
): Promise<string> {
  // 無料枠で利用可能な Gemini 2.5 Flash を使用（Pro は無料枠 limit: 0）
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: WEEKLY_REPORT_SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [{ text: buildReportPrompt(holdings, watchlist) }],
      }],
      // ツール名を正しいプロパティ名(googleSearch)に変更
      tools: [{ googleSearch: {} }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  // テキストが複数パーツに分割されている（検索ソース等が含まれる）場合を考慮し、全てのテキストを結合して抽出する
  const textContent = candidate?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join('\n');

  if (!textContent) {
    const finishReason = candidate?.finishReason;
    console.error("Gemini API Raw Response:", JSON.stringify(data, null, 2));
    throw new Error(`レポートのテキストが抽出できませんでした (理由: ${finishReason})。F12キーでコンソールを確認してください。`);
  }

  return textContent;
}

export async function analyzeEarnings(
  apiKey: string,
  ticker: string,
  holding: Holding
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `あなたは決算分析の専門家です。投資テーゼの検証を最優先にして分析してください。
テーゼ: ${holding.thesis}
売却トリガー: ${holding.sellTriggers}`,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
      }],
      messages: [{
        role: 'user',
        content: `${ticker}の最新決算を分析してください。Web検索で決算データを取得し、以下を報告:
1. 決算サマリー（売上、EPS、ガイダンス vs 予想）
2. テーゼへの影響（🟢健在/🟡要注意/🔴崩壊）
3. 推奨アクション（追加買い/保有継続/利確/売却）
4. 注目ポイント`,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n\n');
}

// ==========================================
// 更新: Gemini APIを使用した無料＆高性能なJSONパーサー
// ==========================================
export async function parseCompounderReport(
  apiKey: string, // VITE_GEMINI_API_KEY が渡ってくる
  reportText: string
): Promise<ParsedReportData> {
  const systemPrompt = `あなたは投資アナリストのテキストレポートを構造化データ（JSON）に変換するデータ抽出AIです。
以下のTypeScriptの型定義に完全に一致するJSON構造を出力してください。

export interface ParsedReportData {
  ticker: string;
  name: string;
  sector: 'ai-infra' | 'hyperscaler' | 'ai-drug' | 'energy' | 'fintech' | 'robotics' | 'other';
  aiAlignmentScore: 1 | 2 | 3 | 4 | 5;
  thesis: string;
  sellTriggers: string;
  watchMetrics: string;
  currentPrice?: number;
  analysis: {
    fundamentalScore: number;
    fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
    aiClassification: 'Sovereign' | 'Fuel & Infra' | 'Adopter' | 'At Risk' | 'Unclassified';
    valuationStatus: '◎' | '○' | '△' | '▲' | '×' | '未評価';
    valuationLabel: string;
    fairValue: { base: number; bull: number; bear: number; };
    entryZone: { min: number; max: number; }; // レポートの「エントリー条件」から推奨購入レンジを抽出（例:$950〜$1,050なら min:950, max:1050）。「$1060以下」のように上限のみの場合は min:0, max:1060。記述がない場合は min:0, max:0。
    investmentSignal: 'Strong Buy' | 'Buy' | 'Buy on Dip' | 'Watch' | 'Sell' | 'None';
    scoreBreakdown: { quality: number; aiImpact: number; compounding: number; unitEcon: number; };
    lastAnalyzed: string;
  }
}

※注意点：
- 「Investment Signal」は、レポート内の表記と完全に一致させてください。
- entryZoneはレポート内の「推奨エントリー価格帯」「買いゾーン」などの記述から抽出してください。抽出できない場合は min:0, max:0 を入れてください。
- 抽出できない数値は 0 を入れてください。`;

  // 最新の Gemini 2.5 Flashのエンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `以下のレポートを解析し、JSONで出力してください。\n\n${reportText}` }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('レポートの解析に失敗しました。Geminiから有効な応答が返りませんでした。');
  }

  try {
    const parsed = JSON.parse(textContent) as ParsedReportData;
    parsed.analysis.rawReport = reportText;
    if (!parsed.analysis.entryZone) {
      parsed.analysis.entryZone = { min: 0, max: 0 };
    }
    return parsed;
  } catch (err) {
    throw new Error('レポートの解析に失敗しました。JSONフォーマットが不正です。');
  }
}
