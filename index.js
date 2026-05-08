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
  "最近、スマホを見せなくなった",
  "返信が前より遅くなった",
  "急に予定を教えてくれなくなった",
  "外見や服装へのこだわりが急に増えた",
  "休日の行動が不自然に増えた",
  "LINEや通知を隠すことが増えた",
  "一緒にいる時にスマホを裏向きに置く",
  "急に優しくなった、または冷たくなった",
  "異性の話題を避けるようになった"
];

const userData = {};

app.post('/webhook', line.middleware(config), async (req, res) => {
  await Promise.all(req.body.events.map(handleEvent));
  res.status(200).end();
});

async function handleEvent(event) {

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userId = event.source.userId;
  const text = event.message.text;

  // 診断開始
  if (text === '診断開始') {

    userData[userId] = {
      step: 0,
      score: 0
    };

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `浮気占いスタート！\n\nQ1. ${questions[0]}\n\nはい / いいえ`
    });
  }

  // ユーザー未開始
  if (!userData[userId]) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'リッチメニューから「診断開始」を押してください。'
    });
  }

  const current = userData[userId];

  if (text === 'はい') {
    current.score += 10;
  }

  current.step++;

  // 次の質問
  if (current.step < questions.length) {

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `Q${current.step + 1}. ${questions[current.step]}\n\nはい / いいえ`
    });

  } else {

    // 結果表示
    let result = '';

    if (current.score <= 20) {
      result = '今のところ浮気の可能性は低そうです！';
    } else if (current.score <= 50) {
      result = '少し気になる行動があるかも…。';
    } else if (current.score <= 80) {
      result = '怪しいサインが複数あります。';
    } else {
      result = '浮気リスク高め…！';
    }

    const finalScore = current.score;

    delete userData[userId];

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `診断結果\n\nスコア：${finalScore}点\n\n${result}`
    });
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
