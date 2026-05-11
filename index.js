require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// ===================================
// 15問 / 100点満点
// ===================================

const questions = [

  { text: '最近スマホを見せなくなった', point: 10 },
  { text: '返信速度が急に遅くなった', point: 5 },
  { text: '急に予定を隠すようになった', point: 8 },
  { text: '服装や外見を急に気にし始めた', point: 7 },
  { text: '休日の外出が増えた', point: 5 },
  { text: 'LINE通知を隠すようになった', point: 10 },
  { text: 'スマホを裏返して置く', point: 8 },
  { text: '急に優しくなった', point: 5 },
  { text: '急に冷たくなった', point: 5 },
  { text: '残業や飲み会が増えた', point: 7 },
  { text: '異性の話題を避ける', point: 5 },
  { text: '知らない香水の匂いがする', point: 10 },
  { text: '一緒にいる時間が減った', point: 5 },
  { text: '特定曜日だけ予定が増えた', point: 5 },
  { text: 'スマホを常に持ち歩く', point: 5 }

];

// 合計100点

const userData = {};

// ===================================
// 質問メッセージ
// ===================================

function createQuestionMessage(number, question) {

  return {

    type: 'flex',

    altText: `Q${number}`,

    contents: {

      type: 'bubble',

      hero: {

        type: 'box',

        layout: 'vertical',

        backgroundColor: '#111111',

        paddingAll: '20px',

        contents: [

          {
            type: 'text',
            text: '浮気診断🕵',
            color: '#ffffff',
            weight: 'bold',
            size: 'xl',
            align: 'center'
          },

          {
            type: 'text',
            text: `Q${number}/15`,
            color: '#ffcc00',
            size: 'lg',
            align: 'center',
            margin: 'md',
            weight: 'bold'
          }

        ]
      },

      body: {

        type: 'box',

        layout: 'vertical',

        spacing: 'lg',

        contents: [

          {
            type: 'text',
            text: question.text,
            wrap: true,
            size: 'xl',
            weight: 'bold',
            align: 'center'
          }

        ]
      },

      footer: {

        type: 'box',

        layout: 'vertical',

        spacing: 'md',

        contents: [

          // はいボタン

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

          // いいえボタン

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

// ===================================
// Webhook
// ===================================

app.post('/webhook', line.middleware(config), async (req, res) => {

  res.status(200).end();

  try {

    await Promise.all(req.body.events.map(handleEvent));

  } catch (err) {

    console.log(err);

  }

});

// ===================================
// イベント処理
// ===================================

async function handleEvent(event) {

  if (
    event.type !== 'message' ||
    event.message.type !== 'text'
  ) {
    return null;
  }

  const userId = event.source.userId;
  const text = event.message.text.trim();

  console.log(text);

  // ==========================
  // 診断開始
  // ==========================

  if (text === '診断開始') {

    userData[userId] = {
      step: 0,
      score: 0
    };

    return client.replyMessage(
      event.replyToken,
      createQuestionMessage(1, questions[0])
    );
  }

  // 未開始なら無視

  if (!userData[userId]) {
    return null;
  }

  // ボタン以外無視

  if (
    text !== 'はい' &&
    text !== 'いいえ'
  ) {
    return null;
  }

  const current = userData[userId];

  // 点数加算

  if (text === 'はい') {

    current.score += questions[current.step].point;

  }

  current.step++;

  // ==========================
  // 次の質問
  // ==========================

  if (current.step < questions.length) {

    return client.replyMessage(
      event.replyToken,
      createQuestionMessage(
        current.step + 1,
        questions[current.step]
      )
    );

  }

  // ==========================
  // 結果生成
  // ==========================

  const score = current.score;

  let danger = '';
  let color = '';
  let comment = '';
  let graphWidth = '';

  if (score >= 80) {

    danger = '危険度 MAX';
    color = '#ff0033';
    graphWidth = '100%';

    comment =
      'かなり危険な状態です。\n\n浮気傾向が非常に高く、要注意です。';

  } else if (score >= 60) {

    danger = '危険度 高';
    color = '#ff6600';
    graphWidth = '75%';

    comment =
      '怪しい行動がかなり増えています。';

  } else if (score >= 40) {

    danger = '危険度 中';
    color = '#ffcc00';
    graphWidth = '50%';

    comment =
      '少し注意が必要かもしれません。';

  } else {

    danger = '危険度 低';
    color = '#00cc66';
    graphWidth = '25%';

    comment =
      '現時点では大きな問題はありません。';

  }

  delete userData[userId];

  // ===================================
  // 派手Flex結果
  // ===================================

  return client.replyMessage(event.replyToken, {

    type: 'flex',

    altText: '診断結果',

    contents: {

      type: 'bubble',

      size: 'giga',

      hero: {

        type: 'box',

        layout: 'vertical',

        backgroundColor: color,

        paddingAll: '25px',

        contents: [

          {
            type: 'text',
            text: '🕵 浮気診断結果',
            color: '#ffffff',
            size: 'xl',
            weight: 'bold',
            align: 'center'
          },

          {
            type: 'text',
            text: `${score}点 / 100点`,
            color: '#ffffff',
            size: '5xl',
            weight: 'bold',
            align: 'center',
            margin: 'lg'
          },

          {
            type: 'text',
            text: danger,
            color: '#ffffff',
            size: 'xxl',
            weight: 'bold',
            align: 'center',
            margin: 'md'
          }

        ]

      },

      body: {

        type: 'box',

        layout: 'vertical',

        spacing: 'lg',

        contents: [

          // グラフタイトル

          {
            type: 'text',
            text: '危険度グラフ',
            weight: 'bold',
            size: 'lg'
          },

          // グラフ背景

          {
            type: 'box',

            layout: 'vertical',

            backgroundColor: '#eeeeee',

            cornerRadius: '30px',

            height: '25px',

            contents: [

              {
                type: 'box',

                layout: 'vertical',

                backgroundColor: color,

                width: graphWidth,

                height: '25px',

                cornerRadius: '30px',

                contents: []

              }

            ]

          },

          {
            type: 'text',
            text: `${score}%`,
            size: 'xl',
            weight: 'bold',
            color: color,
            align: 'center'
          },

          {
            type: 'separator',
            margin: 'lg'
          },

          {
            type: 'text',
            text: comment,
            wrap: true,
            size: 'lg',
            margin: 'lg'
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

            color: '#111111',

            height: 'lg',

            action: {
              type: 'message',
              label: 'もう一度診断する',
              text: '診断開始'
            }

          }

        ]

      }

    }

  });

}

// ===================================
// 起動
// ===================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);

});
