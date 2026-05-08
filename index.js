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

// =========================
// ユーザー状態保存
// =========================
const userData = {};

// =========================
// 質問メッセージ
// =========================
function createQuestionMessage(questionNumber, questionText) {

  return {
    type: 'text',
    text:
`🔮 浮気占い

Q${questionNumber}
${questionText}`,
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

  await Promise.all(req.body.events.map(handleEvent));

  res.status(200).end();
});

// =========================
// イベント処理
// =========================
async function handleEvent(event) {

  // テキスト以外無視
  if (event.type !== 'message' || event.message.type !== 'text') {
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
      score: 0
    };

    return client.replyMessage(
      event.replyToken,
      createQuestionMessage(1, questions[0])
    );
  }

  // =========================
  // 未開始ユーザー
  // =========================
  if (!userData[userId]) {

    // 完全無視
    return null;
  }

  const current = userData[userId];

  // =========================
  // 「はい」「いいえ」以外は無視
  // =========================
  if (text !== 'はい' && text !== 'いいえ') {

    // 完全無視
    return null;
  }

  // =========================
  // 点数加算
  // =========================
  if (text === 'はい') {
    current.score += 10;
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
