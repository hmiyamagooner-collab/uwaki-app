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
  { text: '最近、スマホを見せなくなった', point: 15 },
  { text: '返信が前より遅くなった', point: 5 },
  { text: '急に予定を教えてくれなくなった', point: 10 },
  { text: '外見や服装へのこだわりが急に増えた', point: 10 },
  { text: '休日の行動が不自然に増えた', point: 10 },
  { text: 'LINEや通知を隠すことが増えた', point: 15 },
  { text: '一緒にいる時にスマホを裏向きに置く', point: 15 },
  { text: '急に優しくなった、または冷たくなった', point: 5 },
  { text: '異性の話題を避けるようになった', point: 10 },
  { text: '急に残業や飲み会が増えた', point: 5 },
  { text: '知らない香水の匂いがすることがある', point: 15 },
  { text: 'スマホを常に持ち歩くようになった', point: 10 },
  { text: '以前よりスキンシップが減った', point: 10 },
  { text: '急に一人の時間を欲しがるようになった', point: 5 },
  { text: '特定の曜日だけ予定が増えている', point: 10 }
];

// =========================
// ユーザー状態
// =========================

const userData = {};

// =========================
// 質問Flex
// =========================

function createQuestionMessage(questionNumber, questionData) {

  return {
    type: 'flex',
    altText: '浮気占い',

    contents: {
      type: 'bubble',

      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',

        contents: [

          {
            type: 'text',
            text: '浮気占い🕵',
            weight: 'bold',
            size: 'xl',
            color: '#ff3366'
          },

          {
            type: 'text',
            text: `Q${questionNumber}`,
            size: 'lg',
            weight: 'bold'
          },

          {
            type: 'text',
            text: questionData.text,
            wrap: true,
            size: 'md',
            margin: 'md'
          }
        ]
      },

      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',

        contents: [

          {
            type: 'button',
            style: 'primary',
            height: 'lg',
            color: '#ff3366',

            action: {
              type: 'message',
              label: 'はい',
              text: 'はい'
            }
          },

          {
            type: 'button',
            style: 'secondary',
            height: 'lg',

            action: {
              type: 'message',
              label: 'いいえ',
              text: 'いいえ'
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

    console.log('受信:', text);

    // =========================
    // 診断開始
    // =========================

    if (text === '診断開始') {

      userData[userId] = {
        step: 0,
        score: 0
      };

      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(
          1,
          questions[0]
        )
      );
    }

    // =========================
    // 未開始なら無視
    // =========================

    if (!userData[userId]) {
      return null;
    }

    // =========================
    // はい・いいえ以外無視
    // =========================

    if (
      text !== 'はい' &&
      text !== 'いいえ'
    ) {
      return null;
    }

    const current = userData[userId];

    // =========================
    // 点数加算
    // =========================

    if (text === 'はい') {

      current.score += questions[current.step].point;
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
    // 結果計算
    // =========================

    const maxScore = questions.reduce(
      (sum, q) => sum + q.point,
      0
    );

    const score = Math.round(
      (current.score / maxScore) * 100
    );

    let title = '';
    let comment = '';
    let color = '';

    if (score >= 80) {

      title = '危険度：非常に高い';
      color = '#ff0033';

      comment =
        '浮気の可能性がかなり高い傾向があります。';

    } else if (score >= 60) {

      title = '危険度：高';
      color = '#ff6600';

      comment =
        '気になる行動がかなり増えています。';

    } else if (score >= 40) {

      title = '危険度：中';
      color = '#ffcc00';

      comment =
        '注意が必要な傾向があります。';

    } else {

      title = '危険度：低';
      color = '#00cc66';

      comment =
        '現時点では大きな問題は見られません。';
    }

    delete userData[userId];

    // =========================
    // ゲージ幅
    // =========================

    const gaugeWidth = `${score}%`;

    // =========================
    // 結果Flex
    // =========================

    return client.replyMessage(event.replyToken, {

      type: 'flex',

      altText: '診断結果',

      contents: {

        type: 'bubble',

        size: 'mega',

        body: {

          type: 'box',

          layout: 'vertical',

          spacing: 'lg',

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
              color: color
            },

            {
              type: 'text',
              text: `浮気率 ${score}%`,
              weight: 'bold',
              size: 'xxl',
              color: color
            },

            // ゲージ背景
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              backgroundColor: '#eeeeee',
              cornerRadius: 'md',
              height: '20px',

              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: color,
                  width: gaugeWidth,
                  height: '20px',
                  cornerRadius: 'md',
                  contents: []
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
              size: 'md',
              margin: 'lg'
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);
});
