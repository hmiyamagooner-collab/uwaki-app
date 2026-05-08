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
// 質問一覧（点数付き）
// =========================

const questions = [

  {
    text: "最近、スマホを見せなくなった",
    point: 15
  },

  {
    text: "返信が前より遅くなった",
    point: 5
  },

  {
    text: "急に予定を教えてくれなくなった",
    point: 10
  },

  {
    text: "外見や服装へのこだわりが急に増えた",
    point: 10
  },

  {
    text: "休日の行動が不自然に増えた",
    point: 10
  },

  {
    text: "LINEや通知を隠すことが増えた",
    point: 15
  },

  {
    text: "一緒にいる時にスマホを裏向きに置く",
    point: 15
  },

  {
    text: "急に優しくなった、または冷たくなった",
    point: 5
  },

  {
    text: "異性の話題を避けるようになった",
    point: 10
  },

  {
    text: "急に残業や飲み会が増えた",
    point: 5
  },

  {
    text: "知らない香水の匂いがすることがある",
    point: 15
  },

  {
    text: "スマホを常に持ち歩くようになった",
    point: 10
  },

  {
    text: "以前よりスキンシップが減った",
    point: 10
  },

  {
    text: "急に一人の時間を欲しがるようになった",
    point: 5
  },

  {
    text: "特定の曜日だけ予定が増えている",
    point: 10
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
    type: 'text',

    text:
`浮気診断🕵

Q${questionNumber}
${questionData.text}`,

    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'はい',
            text: 'はい'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'いいえ',
            text: 'いいえ'
          }
        }
      ]
    }
  };
}

// =========================
// Webhook
// =========================

app.post('/webhook', line.middleware(config), async (req, res) => {

  console.log('========================');
  console.log('Webhook受信');
  console.log('========================');

  res.status(200).end();

  try {

    await Promise.all(req.body.events.map(handleEvent));

  } catch (err) {

    console.error('Webhook Error:', err);
  }
});

// =========================
// イベント処理
// =========================

async function handleEvent(event) {

  try {

    console.log('イベント受信');

    // =========================
    // テキスト以外無視
    // =========================

    if (
      event.type !== 'message' ||
      event.message.type !== 'text'
    ) {

      console.log('テキスト以外');

      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

    console.log('受信テキスト:', text);

    // =========================
    // 診断開始
    // =========================

    if (text === '診断開始') {

      console.log('診断開始');

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
    // 未開始ユーザー
    // =========================

    if (!userData[userId]) {

      console.log('未開始ユーザー');

      return null;
    }

    const current = userData[userId];

    // =========================
    // はい・いいえ以外無視
    // =========================

    if (
      text !== 'はい' &&
      text !== 'いいえ'
    ) {

      console.log('無効入力');

      return null;
    }

    // =========================
    // 点数加算
    // =========================

    if (text === 'はい') {

      current.score += questions[current.step].point;

      console.log(
        `加算点数: ${questions[current.step].point}`
      );
    }

    current.step++;

    console.log(`現在STEP: ${current.step}`);
    console.log(`現在スコア: ${current.score}`);

    // =========================
    // 次の質問
    // =========================

    if (current.step < questions.length) {

      console.log('次の質問へ');

      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(
          current.step + 1,
          questions[current.step]
        )
      );
    }

    // =========================
    // 最大スコア計算
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

    console.log(`最大スコア: ${maxScore}`);
    console.log(`最終スコア: ${score}%`);

    // =========================
    // コメント生成
    // =========================

    let title = '';
    let comment = '';

    if (score >= 80) {

      title = '危険レベル：非常に高い';

      comment =
        '浮気の可能性がかなり高い傾向があります。\n\n' +
        '実際の相談ケースでも近い行動パターンが多く確認されています。\n\n' +
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

    console.log('診断結果生成完了');

    // =========================
    // ユーザーデータ削除
    // =========================

    delete userData[userId];

    console.log('ユーザーデータ削除完了');

    // =========================
    // Flex Message送信
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
            }
          ]
        }
      }
    });

  } catch (err) {

    console.error('handleEvent Error:', err);
  }
}

// =========================
// サーバー起動
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);
});
