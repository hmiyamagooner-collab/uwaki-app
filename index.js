require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

const questions = [
  "最近スマホを見せなくなった",
  "返信が遅くなった",
  "予定を教えなくなった",
  "急に外見を気にし始めた",
  "LINE通知を隠すようになった"
];

const userData = {};

function createQuestion(step) {

  return {
    type: 'template',

    altText: '浮気占い',

    template: {
      type: 'buttons',

      title: `浮気占い Q${step + 1}`,

      text: questions[step],

      actions: [
        {
          type: 'message',
          label: 'はい',
          text: 'はい'
        },
        {
          type: 'message',
          label: 'いいえ',
          text: 'いいえ'
        }
      ]
    }
  };
}

app.post('/webhook', line.middleware(config), async (req, res) => {

  console.log('Webhook受信');

  res.status(200).end();

  await Promise.all(
    req.body.events.map(handleEvent)
  );
});

async function handleEvent(event) {

  try {

    if (
      event.type !== 'message' ||
      event.message.type !== 'text'
    ) {
      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text;

    console.log('受信:', text);

    // 開始
    if (text === '診断開始') {

      userData[userId] = {
        step: 0,
        score: 0
      };

      return client.replyMessage(
        event.replyToken,
        createQuestion(0)
      );
    }

    // 未開始無視
    if (!userData[userId]) {
      return null;
    }

    // はい・いいえ以外無視
    if (
      text !== 'はい' &&
      text !== 'いいえ'
    ) {
      return null;
    }

    const current = userData[userId];

    // はい加点
    if (text === 'はい') {
      current.score += 20;
    }

    current.step++;

    // 次質問
    if (current.step < questions.length) {

      return client.replyMessage(
        event.replyToken,
        createQuestion(current.step)
      );
    }

    // 結果
    let result = '';

    if (current.score >= 80) {

      result =
        '危険度：非常に高い\n浮気の可能性があります。';

    } else if (current.score >= 60) {

      result =
        '危険度：高\n注意が必要です。';

    } else if (current.score >= 40) {

      result =
        '危険度：中\n少し気になる傾向があります。';

    } else {

      result =
        '危険度：低\n現時点では大丈夫そうです。';
    }

    delete userData[userId];

    return client.replyMessage(
      event.replyToken,
      {
        type: 'text',
        text:
`🕵診断結果

浮気率：${current.score}%

${result}`
      }
    );

  } catch (err) {

    console.error(err);
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);
});
