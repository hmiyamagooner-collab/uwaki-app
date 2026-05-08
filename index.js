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

// =========================
// スコア別コメント
// =========================

let title = "";
let comment = "";
let button = null;

if (score >= 80) {

  title = "危険レベル：高";

  comment =
    "浮気の可能性がかなり高い傾向があります。\n\n" +
    "実際に相談される方の多くも、『違和感はあったけど確信が持てなかった』というケースがほとんどです。\n\n" +
    "今後さらに状況が悪化する前に、一度専門スタッフへ相談してみませんか？";

  button = {
    type: "button",
    style: "primary",
    color: "#ff3366",
    action: {
      type: "uri",
      label: "無料で相談する",
      uri: "https://あなたの相談URL"
    }
  };

} else if (score >= 60) {

  title = "危険レベル：中";

  comment =
    "少し気になる行動が増えているようです。\n\n" +
    "現時点では決定的ではありませんが、違和感を放置すると後から後悔するケースも少なくありません。\n\n" +
    "今後の変化には注意した方が良いかもしれません。";

} else if (score >= 30) {

  title = "危険レベル：低";

  comment =
    "大きな異変は見られませんでした。\n\n" +
    "ただし、浮気傾向は突然変化する場合もあります。\n\n" +
    "小さな違和感を見逃さないことが大切です。";

} else {

  title = "危険レベル：かなり低";

  comment =
    "現時点では浮気の可能性は低そうです。\n\n" +
    "ただ、油断しすぎず普段のコミュニケーションを大切にしていきましょう。";
}

// =========================
// Flex Message送信
// =========================

await client.replyMessage(event.replyToken, {
  type: "flex",
  altText: "診断結果",

  contents: {
    type: "bubble",

    hero: {
      type: "image",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover"
    },

    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",

      contents: [

        // =========================
        // タイトル
        // =========================

        {
          type: "text",
          text: "🕵 診断結果",
          weight: "bold",
          size: "xl"
        },

        // =========================
        // 危険レベル
        // =========================

        {
          type: "text",
          text: title,
          weight: "bold",
          size: "lg",
          color: "#ff3366",
          margin: "md"
        },

        // =========================
        // 浮気率
        // =========================

        {
          type: "text",
          text: `浮気率 ${score}%`,
          size: "xxl",
          weight: "bold",
          color: "#ff3366"
        },

        {
          type: "separator",
          margin: "lg"
        },

        // =========================
        // コメント
        // =========================

        {
          type: "text",
          text: comment,
          wrap: true,
          size: "sm",
          margin: "lg",
          color: "#555555"
        }
      ]
    },

    // =========================
    // 相談ボタン
    // =========================

    footer: button
      ? {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [button]
        }
      : undefined
  }
});
