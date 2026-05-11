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

  {
    text: "最近、スマホを見せなくなった",
    point: 15,
    category: "隠し事"
  },

  {
    text: "返信が前より遅くなった",
    point: 5,
    category: "連絡"
  },

  {
    text: "急に予定を教えてくれなくなった",
    point: 10,
    category: "行動"
  },

  {
    text: "外見や服装へのこだわりが急に増えた",
    point: 10,
    category: "外見"
  },

  {
    text: "休日の行動が不自然に増えた",
    point: 10,
    category: "行動"
  },

  {
    text: "LINEや通知を隠すことが増えた",
    point: 15,
    category: "隠し事"
  },

  {
    text: "一緒にいる時にスマホを裏向きに置く",
    point: 15,
    category: "隠し事"
  },

  {
    text: "急に優しくなった、または冷たくなった",
    point: 5,
    category: "態度"
  },

  {
    text: "異性の話題を避けるようになった",
    point: 10,
    category: "態度"
  },

  {
    text: "急に残業や飲み会が増えた",
    point: 5,
    category: "行動"
  },

  {
    text: "知らない香水の匂いがすることがある",
    point: 15,
    category: "外見"
  },

  {
    text: "スマホを常に持ち歩くようになった",
    point: 10,
    category: "隠し事"
  },

  {
    text: "以前よりスキンシップが減った",
    point: 10,
    category: "態度"
  },

  {
    text: "急に一人の時間を欲しがるようになった",
    point: 5,
    category: "行動"
  },

  {
    text: "特定の曜日だけ予定が増えている",
    point: 10,
    category: "行動"
  }
];

// =========================
// ユーザー状態
// =========================

const userData = {};

// =========================
// 質問メッセージ
// =========================

function createQuestionMessage(questionNumber, questionData) {

  return {
    type: "flex",

    altText: `Q${questionNumber}`,

    contents: {

      type: "bubble",

      body: {

        type: "box",

        layout: "vertical",

        spacing: "lg",

        contents: [

          {
            type: "text",
            text: "浮気診断🕵",
            weight: "bold",
            size: "xl",
            color: "#ff3366"
          },

          {
            type: "text",
            text: `Q${questionNumber}`,
            weight: "bold",
            size: "lg"
          },

          {
            type: "text",
            text: questionData.text,
            wrap: true,
            size: "md",
            margin: "md"
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

            color: "#ff3366",

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

      current.score += questions[current.step].point;

      const category =
        questions[current.step].category;

      current.analysis[category] +=
        questions[current.step].point;
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
    // 最大スコア
    // =========================

    const maxScore = questions.reduce(
      (total, q) => total + q.point,
      0
    );

    // =========================
    // 100%換算
    // =========================

    const score = Math.round(
      (current.score / maxScore) * 100
    );

    // =========================
    // AI分析
    // =========================

    const analysis = current.analysis;

    let aiComment = '';

    const maxCategory = Object.keys(analysis).reduce(
      (a, b) =>
        analysis[a] > analysis[b]
          ? a
          : b
    );

    if (maxCategory === '隠し事') {

      aiComment =
        'AI分析では「隠し事」の傾向が特に強く検出されました。\n\n' +
        'スマホ管理や通知の扱いに注意が必要かもしれません。';

    } else if (maxCategory === '行動') {

      aiComment =
        'AI分析では「行動パターン」の変化が目立っています。\n\n' +
        '急な予定変更や行動の不自然さに注意が必要です。';

    } else if (maxCategory === '外見') {

      aiComment =
        'AI分析では「外見変化」の傾向が強く見られました。\n\n' +
        '急な美容・服装変化は心理変化のサインの場合があります。';

    } else if (maxCategory === '態度') {

      aiComment =
        'AI分析では「態度変化」が強く出ています。\n\n' +
        '感情の距離感に変化が起きている可能性があります。';

    } else {

      aiComment =
        'AI分析では「連絡頻度」の変化が検出されました。\n\n' +
        '返信タイミングや連絡習慣の変化に注意してください。';
    }

    // =========================
    // コメント
    // =========================

    let title = '';
    let comment = '';

    if (score >= 80) {

      title = '危険レベル：非常に高い';

      comment =
        '浮気の可能性がかなり高い傾向があります。\n\n' +
        '状況が悪化する前に、早めの確認や相談をおすすめします。';

    } else if (score >= 60) {

      title = '危険レベル：高';

      comment =
        '気になる行動がかなり増えているようです。\n\n' +
        '今後さらに注意深く様子を見る必要があるかもしれません。';

    } else if (score >= 40) {

      title = '危険レベル：中';

      comment =
        '一部気になる傾向があります。\n\n' +
        '現時点では決定的ではありませんが注意は必要です。';

    } else {

      title = '危険レベル：低';

      comment =
        '現時点では大きな問題は見られませんでした。';
    }

    delete userData[userId];

    // =========================
    // 診断結果
    // =========================

    return client.replyMessage(event.replyToken, {

      type: 'flex',

      altText: '診断結果',

      contents: {

        type: 'bubble',

        body: {

          type: 'box',

          layout: 'vertical',

          spacing: 'md',

          contents: [

            {
              type: 'text',
              text: '🕵 診断結果',
              weight: 'bold',
              size: 'xl'
            },

            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'lg',
              color: '#ff3366'
            },

            {
              type: 'text',
              text: `浮気率 ${score}%`,
              size: 'xxl',
              weight: 'bold',
              color: '#ff3366'
            },

            // グラフバー

            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              contents: [

                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#eeeeee",
                  cornerRadius: "md",
                  height: "20px",
                  contents: [

                    {
                      type: "box",
                      layout: "vertical",

                      backgroundColor:
                        score >= 80
                          ? "#ff3366"
                          : score >= 60
                          ? "#ff8800"
                          : "#33cc66",

                      width: `${score}%`,
                      height: "20px",
                      cornerRadius: "md",
                      contents: []
                    }
                  ]
                }
              ]
            },

            {
              type: 'separator',
              margin: 'lg'
            },

            {
              type: 'text',
              text: comment,
              wrap: true,
              size: 'sm',
              margin: 'lg',
              color: '#555555'
            },

            // レーダー

            {
              type: 'text',
              text: 'AI分析レーダー',
              weight: 'bold',
              size: 'md',
              margin: 'xl'
            },

            {
              type: 'text',

              text:
`隠し事  ${'■'.repeat(Math.floor(analysis['隠し事'] / 5))}

連絡      ${'■'.repeat(Math.floor(analysis['連絡'] / 5))}

行動      ${'■'.repeat(Math.floor(analysis['行動'] / 5))}

外見      ${'■'.repeat(Math.floor(analysis['外見'] / 5))}

態度      ${'■'.repeat(Math.floor(analysis['態度'] / 5))}`,

              wrap: true,
              margin: 'md',
              size: 'sm',
              color: '#555555'
            },

            {
              type: 'separator',
              margin: 'lg'
            },

            {
              type: 'text',
              text: '🤖 AI分析コメント',
              weight: 'bold',
              size: 'md',
              margin: 'lg'
            },

            {
              type: 'text',
              text: aiComment,
              wrap: true,
              size: 'sm',
              margin: 'md',
              color: '#555555'
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
// サーバー起動
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);
});
