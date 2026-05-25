require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// =========================
// カラーパレット（リブランディング）
// =========================
const COLOR = {
  greige: '#E8DFD8',     // メイン背景（柔らかい）
  paper:  '#F4EFEA',     // 質問画面の少し明るい背景
  brown:  '#3B2F2F',     // ダークブラウン（メインボタン・見出し）
  black:  '#1E1E1E',     // ソフトブラック（結果画面）
  gold:   '#C6A969',     // ゴールド（アクセント）
  olive:  '#7A8B6F',     // オリーブ（補助）
  textOnDark:  '#CFC6BC',
  subOnDark:   '#B8AFA6',
  textOnLight: '#3B2F2F',
  subOnLight:  '#7A6F66',
  hintOnLight: '#9A8E84',
  cardOnDark:  '#262220',
  trackLight:  '#E2D8CF',
  trackDark:   '#333333'
};

// =========================
// 回答スケール（3段階）
// あてはまる=10 / 少し気になる=5 / 気にならない=0
// =========================
const ANSWERS = {
  'あてはまる': 10,
  '少し気になる': 5,
  '気にならない': 0
};
const ANSWER_LABELS = Object.keys(ANSWERS);

// =========================
// 質問一覧（文言を心理分析トーンへ）
// カテゴリ：距離感 / 連絡の変化 / 生活リズム / 気持ちの揺れ
// =========================
const questions = [
  // 連絡の変化
  { text: '最近、連絡の返信が前よりそっけなく感じる', category: '連絡の変化' },
  { text: 'スマホを見せたがらない様子が増えた気がする', category: '連絡の変化' },
  { text: '一緒にいる時、スマホを裏返して置くようになった', category: '連絡の変化' },
  { text: '通知や画面を、さりげなく隠すことがある', category: '連絡の変化' },

  // 生活リズム
  { text: '予定を前ほど教えてくれなくなった', category: '生活リズム' },
  { text: '急な外出や残業・飲み会が増えた', category: '生活リズム' },
  { text: '特定の曜日だけ、予定が入りやすい気がする', category: '生活リズム' },
  { text: '休日の過ごし方が、以前と変わってきた', category: '生活リズム' },

  // 気持ちの揺れ
  { text: '急に優しくなったり、冷たくなったりする', category: '気持ちの揺れ' },
  { text: '身だしなみや見た目を、急に気にし始めた', category: '気持ちの揺れ' },
  { text: '知らない香りがすることがある', category: '気持ちの揺れ' },
  { text: '持ち物や雰囲気に、小さな変化を感じる', category: '気持ちの揺れ' },

  // 距離感
  { text: '一緒に過ごす時間を、面倒がるようになった', category: '距離感' },
  { text: '以前よりスキンシップや会話が減った', category: '距離感' },
  { text: '異性の話題を、なんとなく避ける', category: '距離感' },
  { text: '「前と違う」と感じる瞬間が増えた', category: '距離感' }
];

// カテゴリごとの最大点（質問数 × 10）
const categoryMax = questions.reduce((acc, q) => {
  acc[q.category] = (acc[q.category] || 0) + 10;
  return acc;
}, {});

// =========================
// ユーザー状態
// =========================
const userData = {};

const RADAR_KEYS = ['距離感', '連絡の変化', '生活リズム', '気持ちの揺れ'];

// =========================
// 共通：ヘッダー行
// =========================
function brandHeader(rightText) {
  const contents = [
    {
      type: 'text',
      text: 'STEALTH FILE',
      size: 'xs',
      weight: 'bold',
      color: COLOR.gold,
      flex: 0
    }
  ];
  if (rightText) {
    contents.push({
      type: 'text',
      text: rightText,
      size: 'xs',
      color: COLOR.hintOnLight,
      align: 'end'
    });
  }
  return {
    type: 'box',
    layout: 'horizontal',
    contents
  };
}

// =========================
// ① 診断開始画面
// =========================
function createStartMessage() {
  return {
    type: 'flex',
    altText: 'パートナー心理分析をはじめる',
    contents: {
      type: 'bubble',
      styles: { body: { backgroundColor: COLOR.greige } },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '22px',
        contents: [
          { type: 'text', text: 'STEALTH FILE', size: 'xs', weight: 'bold', color: COLOR.gold, align: 'center' },
          { type: 'text', text: 'パートナー心理分析', size: 'xl', weight: 'bold', color: COLOR.textOnLight, align: 'center', margin: 'md' },
          { type: 'text', text: 'その違和感、気のせいですか？\n30秒で関係性をそっとチェック。', wrap: true, size: 'sm', color: COLOR.subOnLight, align: 'center', margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: COLOR.brown,
                height: 'md',
                action: { type: 'message', label: '診断をはじめる', text: '診断開始' }
              }
            ]
          },
          { type: 'text', text: '匿名OK・記録は残りません', size: 'xs', color: COLOR.hintOnLight, align: 'center', margin: 'lg' }
        ]
      }
    }
  };
}

// =========================
// ② 質問画面
// =========================
function createQuestionMessage(questionNumber, questionData) {
  const total = questions.length;
  const ratio = Math.round((questionNumber - 1) / total * 100);

  return {
    type: 'flex',
    altText: `恋愛心理チェック Q${questionNumber}`,
    contents: {
      type: 'bubble',
      styles: { body: { backgroundColor: COLOR.paper } },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '22px',
        contents: [
          brandHeader(`Q${questionNumber} / ${total}`),
          // 進捗バー
          {
            type: 'box',
            layout: 'vertical',
            height: '5px',
            backgroundColor: COLOR.trackLight,
            cornerRadius: '99px',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                width: `${Math.max(ratio, 3)}%`,
                height: '5px',
                backgroundColor: COLOR.gold,
                cornerRadius: '99px',
                contents: []
              }
            ]
          },
          {
            type: 'text',
            text: questionData.text,
            wrap: true,
            size: 'md',
            weight: 'bold',
            color: COLOR.textOnLight,
            align: 'center',
            margin: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'xl',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: COLOR.brown,
                height: 'md',
                action: { type: 'message', label: 'あてはまる', text: 'あてはまる' }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'md',
                action: { type: 'message', label: '少し気になる', text: '少し気になる' }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'md',
                action: { type: 'message', label: '気にならない', text: '気にならない' }
              }
            ]
          }
        ]
      }
    }
  };
}

// =========================
// ④ CTA画面（結果のあとに送る2通目）
// =========================
function createCtaMessage() {
  return {
    type: 'flex',
    altText: '次の一歩をご案内します',
    contents: {
      type: 'bubble',
      styles: { body: { backgroundColor: COLOR.greige } },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '22px',
        contents: [
          { type: 'text', text: '気持ちを、そのままにしないで。', wrap: true, size: 'md', weight: 'bold', color: COLOR.textOnLight, align: 'center' },
          { type: 'text', text: 'あなたの状況に合わせて、\n次の一歩をそっとご案内します。', wrap: true, size: 'sm', color: COLOR.subOnLight, align: 'center', margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'xl',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: COLOR.brown,
                height: 'md',
                action: { type: 'message', label: '匿名でカウンセラーに相談', text: '相談したい' }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'md',
                action: { type: 'message', label: 'もう一度診断する', text: '診断開始' }
              }
            ]
          },
          { type: 'text', text: '無理な勧誘は一切ありません。\nまずは話すだけでも大丈夫です。', wrap: true, size: 'xs', color: COLOR.hintOnLight, align: 'center', margin: 'lg' }
        ]
      }
    }
  };
}

// =========================
// ③ 結果画面
// =========================
function buildResult(current) {
  const maxScore = questions.length * 10;
  const score = Math.min(100, Math.round((current.score / maxScore) * 100));
  const analysis = current.analysis;

  // レーダー（0〜5）
  const radar = {};
  for (const key of RADAR_KEYS) {
    radar[key] = Math.min(5, Math.round((analysis[key] / categoryMax[key]) * 5));
  }
  const bar = (n) => '●'.repeat(n) + '○'.repeat(5 - n);

  // 全国比較
  const nationalAverage = 42;
  const diff = score - nationalAverage;
  let compareText;
  if (diff >= 30) compareText = `平均より ${diff}pt 高めの傾向です。`;
  else if (diff >= 10) compareText = `平均より ${diff}pt やや高めです。`;
  else if (diff >= -10) compareText = '平均に近い傾向です。';
  else compareText = `平均より ${Math.abs(diff)}pt 低めの傾向です。`;

  // 危険度 → 「関係性の状態」
  let title, comment;
  if (score >= 80) {
    title = '関係性の状態：要セルフケア';
    comment = '気になるシグナルが多く出ています。違和感は早めに整理しておくと、心の負担が軽くなります。';
  } else if (score >= 60) {
    title = '関係性の状態：少し注意';
    comment = '気になる変化がいくつか見られます。今の気持ちを、そのままにしすぎないことが大切です。';
  } else if (score >= 40) {
    title = '関係性の状態：ゆらぎあり';
    comment = '小さな違和感が見られます。焦らず、自分の感じ方を大切にしていきましょう。';
  } else {
    title = '関係性の状態：おだやか';
    comment = '今のところ、大きな揺らぎは見られませんでした。';
  }

  // 心理カウンセラーコメント
  const counselorPatterns = {
    距離感: [
      '距離を感じる時間が増えたなら、関係の温度差を見つめ直すタイミングかもしれません。',
      '言葉よりも、態度の変化のほうが本音に近いことがあります。'
    ],
    連絡の変化: [
      '「前と違う」という感覚は、あなたの心がすでに小さな変化を拾っているサインかもしれません。',
      '連絡の取り方の変化には、気持ちの優先順位が表れることがあります。'
    ],
    生活リズム: [
      '生活リズムのズレが続くなら、理由の一貫性をそっと見てみてください。',
      '予定が読めなくなってきた時は、関係の透明度が少し下がっているのかもしれません。'
    ],
    気持ちの揺れ: [
      '急な優しさや冷たさの落差には、心の揺れが表れていることがあります。',
      '見た目や雰囲気の変化が重なる時は、慌てず様子を見るのが安心です。'
    ]
  };
  // 一番高いカテゴリのコメントを選ぶ
  let topCat = RADAR_KEYS[0];
  for (const k of RADAR_KEYS) {
    if (analysis[k] > analysis[topCat]) topCat = k;
  }
  const pool = counselorPatterns[topCat];
  const counselorComment = pool[Math.floor(Math.random() * pool.length)];

  // 心理タイプ（ポジティブ寄りの言い換え）
  const types = [
    { name: '慎重サイン型', desc: '小さな変化をていねいに感じ取れるタイプ。直感を大切にしてあげてください。' },
    { name: 'リズム変化型', desc: '生活パターンの揺れに気づきやすいタイプ。一貫性をそっと見ていきましょう。' },
    { name: '心の機微型', desc: '相手の感情の波を敏感に感じ取れるタイプ。無理に飲み込みすぎないことも大切です。' },
    { name: '安心重視型', desc: '安心できる関係を大切にしたいタイプ。気持ちを言葉にすることが助けになります。' }
  ];
  const selectedType = types[Math.floor(Math.random() * types.length)];

  return {
    type: 'flex',
    altText: '心理分析レポート',
    contents: {
      type: 'bubble',
      styles: { body: { backgroundColor: COLOR.black } },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '22px',
        contents: [
          { type: 'text', text: 'PSYCHOLOGY REPORT', size: 'xs', weight: 'bold', color: COLOR.gold, align: 'center' },
          { type: 'text', text: 'あなたの関係性スコア', size: 'sm', color: COLOR.subOnDark, align: 'center', margin: 'lg' },
          { type: 'text', text: '注意シグナル', size: 'xs', color: COLOR.gold, align: 'center', margin: 'md' },
          { type: 'text', text: `${score}%`, size: '3xl', weight: 'bold', color: COLOR.greige, align: 'center' },

          // スコアバー
          {
            type: 'box',
            layout: 'vertical',
            height: '8px',
            backgroundColor: COLOR.trackDark,
            cornerRadius: '99px',
            margin: 'lg',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                width: `${Math.max(score, 2)}%`,
                height: '8px',
                backgroundColor: COLOR.gold,
                cornerRadius: '99px',
                contents: []
              }
            ]
          },

          { type: 'text', text: title, weight: 'bold', size: 'md', color: COLOR.textOnDark, align: 'center', margin: 'lg' },
          { type: 'text', text: comment, wrap: true, size: 'sm', color: COLOR.subOnDark, align: 'center', margin: 'sm' },

          // 全国比較
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: COLOR.cardOnDark,
            cornerRadius: 'md',
            paddingAll: '12px',
            margin: 'lg',
            contents: [
              { type: 'text', text: '📊 平均との比較', size: 'xs', weight: 'bold', color: COLOR.gold },
              { type: 'text', text: compareText, wrap: true, size: 'sm', color: COLOR.textOnDark, margin: 'sm' }
            ]
          },

          // レーダー
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: COLOR.cardOnDark,
            cornerRadius: 'md',
            paddingAll: '12px',
            margin: 'md',
            contents: [
              { type: 'text', text: '心理分析レーダー', size: 'xs', weight: 'bold', color: COLOR.gold },
              {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: '距離感', size: 'sm', color: COLOR.textOnDark, flex: 4 },
                  { type: 'text', text: bar(radar['距離感']), size: 'sm', color: COLOR.gold, align: 'end', flex: 5 }
                ]
              },
              {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: '連絡の変化', size: 'sm', color: COLOR.textOnDark, flex: 4 },
                  { type: 'text', text: bar(radar['連絡の変化']), size: 'sm', color: COLOR.gold, align: 'end', flex: 5 }
                ]
              },
              {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: '生活リズム', size: 'sm', color: COLOR.textOnDark, flex: 4 },
                  { type: 'text', text: bar(radar['生活リズム']), size: 'sm', color: COLOR.gold, align: 'end', flex: 5 }
                ]
              },
              {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: '気持ちの揺れ', size: 'sm', color: COLOR.textOnDark, flex: 4 },
                  { type: 'text', text: bar(radar['気持ちの揺れ']), size: 'sm', color: COLOR.gold, align: 'end', flex: 5 }
                ]
              }
            ]
          },

          // カウンセラーコメント
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: COLOR.cardOnDark,
            cornerRadius: 'md',
            paddingAll: '12px',
            margin: 'md',
            contents: [
              { type: 'text', text: '💬 心理カウンセラーより', size: 'xs', weight: 'bold', color: COLOR.gold },
              { type: 'text', text: counselorComment, wrap: true, size: 'sm', color: COLOR.textOnDark, margin: 'sm' }
            ]
          },

          // 心理タイプ
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: COLOR.cardOnDark,
            cornerRadius: 'md',
            paddingAll: '12px',
            margin: 'md',
            contents: [
              { type: 'text', text: 'あなたの心理タイプ', size: 'xs', weight: 'bold', color: COLOR.gold },
              { type: 'text', text: selectedType.name, size: 'lg', weight: 'bold', color: COLOR.textOnDark, margin: 'sm' },
              { type: 'text', text: selectedType.desc, wrap: true, size: 'sm', color: COLOR.subOnDark, margin: 'sm' }
            ]
          }
        ]
      }
    }
  };
}

// =========================
// Webhook
// =========================
app.post('/webhook', line.middleware(config), async (req, res) => {
  res.status(200).end();
  try {
    await Promise.all(req.body.events.map(handleEvent));
  } catch (err) {
    console.error(err);
  }
});

// =========================
// イベント処理
// =========================
async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

    // 診断開始 / リスタート
    if (text === '診断開始' || text === '診断' || text === 'はじめる') {
      userData[userId] = {
        step: 0,
        score: 0,
        analysis: { 距離感: 0, 連絡の変化: 0, 生活リズム: 0, 気持ちの揺れ: 0 }
      };
      return client.replyMessage(event.replyToken, createQuestionMessage(1, questions[0]));
    }

    // 相談導線（CTAの受け皿）
    if (text === '相談したい') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'メッセージありがとうございます。\nどんな小さなことでも大丈夫です。気になっていることを、よかったらこのまま送ってくださいね。担当者がやさしくお返事します。'
      });
    }

    // 診断未開始 → 案内（無反応にしない）
    if (!userData[userId]) {
      return client.replyMessage(event.replyToken, createStartMessage());
    }

    const current = userData[userId];

    // 想定外の回答 → やさしく促す（詰まらせない）
    if (!(text in ANSWERS)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '下のボタンから「あてはまる」「少し気になる」「気にならない」のいずれかを選んでくださいね。'
      });
    }

    // 加点
    const q = questions[current.step];
    const point = ANSWERS[text];
    current.score += point;
    current.analysis[q.category] += point;
    current.step++;

    // 次の質問
    if (current.step < questions.length) {
      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(current.step + 1, questions[current.step])
      );
    }

    // 結果 ＋ CTA（2通同時）
    const resultMessage = buildResult(current);
    delete userData[userId];
    return client.replyMessage(event.replyToken, [resultMessage, createCtaMessage()]);

  } catch (err) {
    console.error(err);
  }
}

// =========================
// 起動
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
