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
// 質問一覧
// =========================

const questions = [

  // 隠し事
  {
    text: "最近、スマホを見せなくなった",
    point: 10,
    category: "隠し事"
  },

  {
    text: "LINEや通知を隠すことが増えた",
    point: 10,
    category: "隠し事"
  },

  {
    text: "一緒にいる時にスマホを裏向きに置く",
    point: 10,
    category: "隠し事"
  },

  {
    text: "スマホを常に持ち歩くようになった",
    point: 10,
    category: "隠し事"
  },

  // 連絡
  {
    text: "返信が前より遅くなった",
    point: 10,
    category: "連絡"
  },

  {
    text: "既読・未読スルーが増えた",
    point: 10,
    category: "連絡"
  },

  {
    text: "電話に出ないことが増えた",
    point: 10,
    category: "連絡"
  },

  {
    text: "連絡の内容がそっけなくなった",
    point: 10,
    category: "連絡"
  },

  // 行動
  {
    text: "急に予定を教えてくれなくなった",
    point: 10,
    category: "行動"
  },

  {
    text: "休日の行動が不自然に増えた",
    point: 10,
    category: "行動"
  },

  {
    text: "急に残業や飲み会が増えた",
    point: 10,
    category: "行動"
  },

  {
    text: "特定の曜日だけ予定が増えている",
    point: 10,
    category: "行動"
  },

  // 外見
  {
    text: "外見や服装へのこだわりが急に増えた",
    point: 10,
    category: "外見"
  },

  {
    text: "知らない香水の匂いがすることがある",
    point: 10,
    category: "外見"
  },

  {
    text: "急に美容や体型を気にするようになった",
    point: 10,
    category: "外見"
  },

  {
    text: "下着や持ち物に変化が増えた",
    point: 10,
    category: "外見"
  },

  // 態度
  {
    text: "急に優しくなった、または冷たくなった",
    point: 10,
    category: "態度"
  },

  {
    text: "以前よりスキンシップが減った",
    point: 10,
    category: "態度"
  },

  {
    text: "異性の話題を避けるようになった",
    point: 10,
    category: "態度"
  },

  {
    text: "一緒にいる時間を面倒がるようになった",
    point: 10,
    category: "態度"
  }
];

// =========================
// カテゴリ最大値
// =========================

const categoryMax = {

  隠し事: 40,
  連絡: 40,
  行動: 40,
  外見: 40,
  態度: 40
};

// =========================
// ユーザー状態
// =========================

const userData = {};

// =========================
// 質問表示
// =========================

function createQuestionMessage(questionNumber, questionData) {

  return {
    type: "flex",

    altText: `浮気診断 Q${questionNumber}`,

    contents: {

      type: "bubble",

      styles: {
        body: {
          backgroundColor: "#0b0b0b"
        },

        footer: {
          backgroundColor: "#0b0b0b"
        }
      },

      body: {

        type: "box",

        layout: "vertical",

        spacing: "lg",

        contents: [

          {
            type: "text",
            text: "STEALTH FILE",
            weight: "bold",
            size: "sm",
            color: "#bfbfbf",
            align: "center"
          },

          {
            type: "text",
            text: "浮気診断 🕵",
            weight: "bold",
            size: "xl",
            color: "#ffffff",
            align: "center"
          },

          {
            type: "separator",
            color: "#555555"
          },

          {
            type: "text",
            text: `Q${questionNumber}`,
            weight: "bold",
            size: "xxl",
            color: "#ffffff",
            align: "center"
          },

          {
            type: "text",
            text: questionData.text,
            wrap: true,
            size: "md",
            margin: "md",
            color: "#d9d9d9",
            align: "center"
          }
        ]
      },

      footer: {

        type: "box",

        layout: "vertical",

        spacing: "md",

        contents: [

          {
            type: "button",

            style: "primary",

            height: "md",

            color: "#222222",

            action: {
              type: "message",
              label: "はい",
              text: "はい"
            }
          },

          {
            type: "button",

            style: "secondary",

            height: "md",

            action: {
              type: "message",
              label: "いいえ",
              text: "いいえ"
            }
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

    await Promise.all(
      req.body.events.map(handleEvent)
    );

  } catch (err) {

    console.error(err);
  }
});

// =========================
// イベント処理
// =========================

async function handleEvent(event) {

  try {

    if (
      event.type !== 'message' ||
      event.message.type !== 'text'
    ) {
      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

    // =========================
    // 診断開始
    // =========================

    if (text === '診断開始') {

      userData[userId] = {

        step: 0,

        score: 0,

        analysis: {

          隠し事: 0,
          連絡: 0,
          行動: 0,
          外見: 0,
          態度: 0
        }
      };

      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(
          1,
          questions[0]
        )
      );
    }

    if (!userData[userId]) {
      return null;
    }

    const current = userData[userId];

    if (
      text !== 'はい' &&
      text !== 'いいえ'
    ) {
      return null;
    }

    // =========================
    // 点数加算
    // =========================

    if (text === 'はい') {

      const q = questions[current.step];

      current.score += q.point;

      current.analysis[q.category] += q.point;
    }

    current.step++;

    // =========================
    // 次の質問
    // =========================

    if (current.step < questions.length) {

      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(
          current.step + 1,
          questions[current.step]
        )
      );
    }

    // =========================
    // スコア
    // =========================

    const maxScore = questions.reduce(
      (total, q) => total + q.point,
      0
    );

    const score = Math.min(
      100,
      Math.round(
        (current.score / maxScore) * 100
      )
    );

    const analysis = current.analysis;

    // =========================
    // レーダー
    // =========================

    const radar = {

      隠し事: Math.min(
        5,
        Math.round(
          (analysis['隠し事'] /
            categoryMax['隠し事']) * 5
        )
      ),

      連絡: Math.min(
        5,
        Math.round(
          (analysis['連絡'] /
            categoryMax['連絡']) * 5
        )
      ),

      行動: Math.min(
        5,
        Math.round(
          (analysis['行動'] /
            categoryMax['行動']) * 5
        )
      ),

      外見: Math.min(
        5,
        Math.round(
          (analysis['外見'] /
            categoryMax['外見']) * 5
        )
      ),

      態度: Math.min(
        5,
        Math.round(
          (analysis['態度'] /
            categoryMax['態度']) * 5
        )
      )
    };

    // =========================
    // 全国比較
    // =========================

    const nationalAverage = 42;

    const compareScore =
      score - nationalAverage;

    let compareText = "";

    if (compareScore >= 30) {

      compareText =
        `全国平均より ${compareScore}% 高い危険傾向です。`;

    } else if (compareScore >= 10) {

      compareText =
        `全国平均より ${compareScore}% やや高めです。`;

    } else if (compareScore >= -10) {

      compareText =
        "全国平均と近い傾向です。";

    } else {

      compareText =
        `全国平均より ${Math.abs(compareScore)}% 低い傾向です。`;
    }

    // =========================
    // 危険度
    // =========================

    let title = "";
    let comment = "";

    if (score >= 80) {

      title = "危険レベル：極秘警戒";

      comment =
        "浮気の可能性がかなり高い傾向があります。\n\n" +
        "違和感を放置すると、後から確認が難しくなるケースもあります。";

    } else if (score >= 60) {

      title = "危険レベル：高";

      comment =
        "気になる行動が複数見られます。\n\n" +
        "今後の変化には注意が必要です。";

    } else if (score >= 40) {

      title = "危険レベル：中";

      comment =
        "一部に気になる傾向があります。\n\n" +
        "小さな違和感を見逃さないようにしましょう。";

    } else {

      title = "危険レベル：低";

      comment =
        "現時点では大きな問題は見られませんでした。";
    }

    // =========================
    // AIコメント
    // =========================

    const aiPatterns = {

      隠し事: [
        "『見せられないものが増えた』と感じるなら、その違和感は無視しない方がいいかもしれません。",
        "スマホを隠す行動は、関係性の中で不安が生まれやすいサインです。",
        "本当に何もなければ、隠す必要は少ないはずです。",
        "疑いすぎる必要はありませんが、安心できない状態が続くなら注意です。",
        "相手の行動よりも、あなたが不安を感じ続けていること自体が重要なサインです。"
      ],

      連絡: [
        "返信の遅さよりも、『前と違う』と感じる変化に注意が必要です。",
        "連絡頻度の変化は、気持ちの距離が表れやすいポイントです。",
        "説明のない変化が続くなら注意が必要かもしれません。",
        "連絡が雑になったと感じる時、優先順位が変わっている可能性もあります。",
        "不安なまま我慢し続けるより、冷静に状況を見直すタイミングかもしれません。"
      ],

      行動: [
        "予定の変化が増えているなら、行動パターンのズレに注意してください。",
        "『なんとなく怪しい』という直感は、細かな変化を拾っている場合があります。",
        "急な外出や予定変更が続く場合、理由の一貫性を見ることが大切です。",
        "違和感を感じた時点で、すでに普段とのズレが起きている可能性があります。",
        "行動が読めなくなってきた時は、関係の透明度が下がっているサインかもしれません。"
      ],

      外見: [
        "外見の変化そのものより、『誰に向けた変化なのか』が気になるポイントです。",
        "急な美容意識の高まりは、心理的な変化とつながる場合があります。",
        "服装や香りの変化が続くなら、生活の中に新しい刺激が入っている可能性もあります。",
        "自分磨きは悪いことではありません。ただ、理由が曖昧な変化には注意です。",
        "見た目の変化と行動の変化が重なる時は、慎重に様子を見るべきタイミングです。"
      ],

      態度: [
        "急に優しい、急に冷たい。その落差は、心の揺れが表れている可能性があります。",
        "態度の変化は、相手の中で何かが変わっているサインかもしれません。",
        "距離を感じる時間が増えたなら、関係性の温度差を見直すタイミングです。",
        "言葉よりも、態度の変化の方が本音に近いことがあります。",
        "あなたが『前と違う』と感じているなら、その感覚は大切にしてください。"
      ]
    };

    const categories =
      Object.keys(aiPatterns);

    const randomCategory =
      categories[
        Math.floor(
          Math.random() *
          categories.length
        )
      ];

    const aiComment =
      aiPatterns[randomCategory][
        Math.floor(
          Math.random() *
          aiPatterns[randomCategory].length
        )
      ];

    // =========================
    // 危険人物タイプ
    // =========================

    const dangerTypes = [

      {
        name: '隠密行動型',
        desc:
          '秘密行動が増えやすいタイプ。\n\n慎重に行動する傾向があります。'
      },

      {
        name: '夜行動型',
        desc:
          '外出・予定変化が増えやすいタイプ。\n\n生活パターンの乱れに注意です。'
      },

      {
        name: '承認欲求型',
        desc:
          '外見意識が高まりやすいタイプ。\n\n美容や服装変化が特徴です。'
      },

      {
        name: '感情変化型',
        desc:
          '感情距離に変化が出やすいタイプ。\n\n接し方に波が出る傾向があります。'
      },

      {
        name: '自由奔放型',
        desc:
          '自由行動が増えやすいタイプ。\n\n予定変更が特徴として出やすい傾向があります。'
      },

      {
        name: '二面性タイプ',
        desc:
          '表向きは自然でも、裏で行動変化が起きやすいタイプです。'
      },

      {
        name: '刺激追求型',
        desc:
          '新しい刺激を求めやすいタイプ。\n\n行動範囲が変化しやすい傾向があります。'
      }
    ];

    const selectedType =
      dangerTypes[
        Math.floor(
          Math.random() *
          dangerTypes.length
        )
      ];

    delete userData[userId];

    // =========================
    // 結果表示
    // =========================

    return client.replyMessage(event.replyToken, {

      type: 'flex',

      altText: '診断結果',

      contents: {

        type: 'bubble',

        styles: {
          body: {
            backgroundColor: "#0b0b0b"
          }
        },

        body: {

          type: 'box',

          layout: 'vertical',

          spacing: 'md',

          contents: [

            {
              type: "text",
              text: "STEALTH FILE",
              weight: "bold",
              size: "sm",
              color: "#bfbfbf",
              align: "center"
            },

            {
              type: 'text',
              text: '🕵 診断結果',
              weight: 'bold',
              size: 'xxl',
              color: '#ffffff',
              align: 'center'
            },

            {
              type: 'separator',
              color: '#555555',
              margin: 'md'
            },

            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'lg',
              color: '#d9d9d9',
              margin: 'lg'
            },

            {
              type: 'text',
              text: `浮気率 ${score}%`,
              size: 'xxl',
              weight: 'bold',
              color: '#ffffff'
            },

            // スコアバー

            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              contents: [

                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#333333",
                  cornerRadius: "md",
                  height: "18px",
                  contents: [

                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#cfcfcf",
                      width: `${score}%`,
                      height: "18px",
                      cornerRadius: "md",
                      contents: []
                    }
                  ]
                }
              ]
            },

            {
              type: 'text',
              text: comment,
              wrap: true,
              size: 'sm',
              margin: 'lg',
              color: '#cfcfcf'
            },

            // 全国比較

            {
              type: 'box',

              layout: 'vertical',

              margin: 'lg',

              paddingAll: '12px',

              backgroundColor: '#151515',

              cornerRadius: 'md',

              contents: [

                {
                  type: 'text',
                  text: '📊 全国比較',
                  weight: 'bold',
                  size: 'sm',
                  color: '#ffffff'
                },

                {
                  type: 'text',
                  text: compareText,
                  margin: 'sm',
                  wrap: true,
                  size: 'sm',
                  color: '#cfcfcf'
                }
              ]
            },

            {
              type: 'separator',
              color: '#555555',
              margin: 'lg'
            },

            // レーダー

            {
              type: 'text',
              text: 'AI分析レーダー',
              weight: 'bold',
              size: 'md',
              margin: 'lg',
              color: '#ffffff'
            },

            {
              type: 'text',

              text:
`隠し事  ${'■'.repeat(radar['隠し事'])}

連絡      ${'■'.repeat(radar['連絡'])}

行動      ${'■'.repeat(radar['行動'])}

外見      ${'■'.repeat(radar['外見'])}

態度      ${'■'.repeat(radar['態度'])}`,

              wrap: true,
              margin: 'md',
              size: 'sm',
              color: '#cfcfcf'
            },

            {
              type: 'separator',
              color: '#555555',
              margin: 'lg'
            },

            // AIコメント

            {
              type: 'text',
              text: '🤖 AI分析コメント',
              weight: 'bold',
              size: 'md',
              margin: 'lg',
              color: '#ffffff'
            },

            {
              type: 'text',
              text: aiComment,
              wrap: true,
              size: 'sm',
              margin: 'md',
              color: '#cfcfcf'
            },

            {
              type: 'separator',
              color: '#555555',
              margin: 'lg'
            },

            // 危険人物タイプ

            {
              type: 'text',
              text: '⚠ 危険人物タイプ',
              weight: 'bold',
              size: 'md',
              margin: 'lg',
              color: '#ffffff'
            },

            {
              type: 'text',
              text: selectedType.name,
              weight: 'bold',
              size: 'xl',
              color: '#d9d9d9',
              margin: 'md'
            },

            {
              type: 'text',
              text: selectedType.desc,
              wrap: true,
              size: 'sm',
              margin: 'md',
              color: '#cfcfcf'
            }
          ]
        }
      }
    });

  } catch (err) {

    console.error(err);
  }
}

// =========================
// 起動
// =========================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on ${PORT}`
  );
});
