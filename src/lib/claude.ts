import { Holding, WatchlistItem, CompounderAnalysis } from '../types';

const WEEKLY_REPORT_SYSTEM_PROMPT = `あなたはDario Amodei / Demis Hassabisの描くAI未来像に基づいた投資戦略の参謀です。
以下のポートフォリオに対して週次レポートを生成してください。

## レポート構成（マークダウン形式で出力）
1. **テーゼ変動アラート** — 各銘柄のテーゼが生きているかの判定（🟢🟡🔴）
2. **エントリーチャンス** — ウォッチリスト銘柄で買い時が来ているもの
3. **売却検討** — バリュエーション過熱 or テーゼ弱体化の銘柄
4. **新規発掘** — AIバリューチェーンで見落としている有望銘柄（1-2銘柄）
5. **世界観チェック** — 「Amodei/Hassabisの世界は来ているか？」の判定と根拠
6. **推奨アクション** — 今週やるべきことのトップ3（優先順位付き）

## 原則
- Web検索を使って各銘柄の最新ニュースと株価を取得してください
- 忖度なし。悪いニュースも正直に。データに基づいて判断
- Terry Smith / Chuck Akre的なコンパウンディング視点
- 価格ではなくテーゼで売買判断
- 各銘柄のステータスは必ずテーゼの健全性で判定（株価の上下ではない）
- レポートは日本語で。ティッカーは英語のまま。`;

function buildReportPrompt(holdings: Holding[], watchlist: WatchlistItem[]): string {
  const holdingsSummary = holdings.map(h =>
    `- ${h.ticker} (${h.name}): AI適合度${h.aiAlignmentScore}/5, ステータス:${h.status}, テーゼ:${h.thesis.substring(0, 100)}...`
  ).join('\n');

  const watchlistSummary = watchlist.map(w =>
    `- ${w.ticker} (${w.name}): Tier${w.tier}, 目標価格$${w.targetPrice}, テーゼ:${w.thesis.substring(0, 80)}...`
  ).join('\n');

  return `## 現在のポートフォリオ
${holdingsSummary}

## ウォッチリスト
${watchlistSummary}

上記のポートフォリオに対して、Web検索で最新情報を取得した上で、週次レポートを生成してください。
今日の日付を基準に、今週の重要なニュース・決算・市場動向を反映してください。`;
}

export async function generateWeeklyReport(
  apiKey: string,
  holdings: Holding[],
  watchlist: WatchlistItem[]
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
      max_tokens: 4000,
      system: WEEKLY_REPORT_SYSTEM_PROMPT,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
      }],
      messages: [{
        role: 'user',
        content: buildReportPrompt(holdings, watchlist),
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  // Extract text blocks from response (may include tool use results)
  const textContent = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n\n');

  return textContent || 'レポートの生成に失敗しました。';
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
// 追加: レポートテキストをJSONに変換するパーサー
// ==========================================
export async function parseCompounderReport(
  apiKey: string,
  reportText: string
): Promise<CompounderAnalysis> {
  const systemPrompt = `あなたは投資アナリストのテキストレポートを構造化データ（JSON）に変換するデータ抽出AIです。
以下のTypeScriptの型定義に完全に一致するJSONのみを出力してください。マークダウンの装飾（\`\`\`json 等）や解説のテキストは一切含めないでください。

\`\`\`typescript
export interface CompounderAnalysis {
  fundamentalScore: number; // 0-100の数値
  fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  aiClassification: 'Sovereign' | 'Fuel' | 'Adopter' | 'Victim' | 'Unclassified';
  valuationStatus: '割安' | '適正' | '割高' | '未評価';
  fairValue: { base: number; bull: number; bear: number; };
  investmentSignal: 'Strong Buy' | 'Buy on Dip' | 'Watch' | 'Sell' | 'None';
  scoreBreakdown: { quality: number; aiImpact: number; compounding: number; unitEcon: number; };
  lastAnalyzed: string; // YYYY-MM-DD形式
}
\`\`\`

※注意点：
- 「Investment Signal」は、レポート内の表記に最も近いものを 'Strong Buy', 'Buy on Dip', 'Watch', 'Sell', 'None' から選んでください。
- 日付は本日の日付またはレポート内のデータ時点を使用してください。
- 抽出できない数値は 0 を入れてください。
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022', // JSON出力が得意なモデルを指定
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `以下のレポートを解析し、JSONで出力してください。\n\n${reportText}`,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const textContent = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  try {
    // Claudeがマークダウン記法(```json ... ```)を含めてしまった場合の対策
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : textContent;
    return JSON.parse(jsonString) as CompounderAnalysis;
  } catch (err) {
    throw new Error('レポートの解析に失敗しました。JSONフォーマットが不正です。');
  }
}
