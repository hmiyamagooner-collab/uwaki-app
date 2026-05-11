require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

// =========================
// LINE設定
// =========================
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
// ユーザーデータ保存
// =========================
const userData = {};

// =========================
// 質問メッセージ
// =========================
function createQuestionMessage(questionNumber, questionText) {

  return {
    type: 'template',
    altText: `Q${questionNumber}`,
    template: {
      type: 'buttons',
      title: '🕵浮気診断',
      text: `Q${questionNumber}\n${questionText}`,
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

// =========================
// 結果判定
// =========================
function getResult(score) {

  if (score <= 20) {
    return {
      title: '浮気可能性：低め',
      message: '今のところ浮気の可能性は低そうです！'
    };
  }

  if (score <= 50) {
    return {
      title: '少し注意',
      message: '少し気になる行動があるかも…。'
    };
  }

  if (score <= 80) {
    return {
      title: '怪しいサインあり',
      message: '怪しいサインが複数あります。'
    };
  }

  return {
    title: '浮気リスク高め',
    message: '浮気リスク高め…！'
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
// メイン処理
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
  // 未開始ユーザーは無視
  // =========================
  if (!userData[userId]) {
    return null;
  }

  const current = userData[userId];

  // =========================
  // はい・いいえ以外無視
  // =========================
  if (text !== 'はい' && text !== 'いいえ') {
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

  // =========================
  // 結果表示
  // =========================
  const result = getResult(current.score);

  const finalScore = current.score;

  // データ削除
  delete userData[userId];

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text:
`🔮 診断結果

${result.title}

スコア：${finalScore}点

${result.message}`
  });
}

// =========================
// サーバー起動
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
