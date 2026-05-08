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
// ユーザー状態
// =========================

const userData = {};

// =========================
// 質問メッセージ
// =========================

function createQuestionMessage(questionNumber, questionText) {

  return {
    type: 'text',
    text:
`Q${questionNumber}
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

  console.log("Webhook受信");

  res.status(200).end();

  try {

    await Promise.all(req.body.events.map(handleEvent));

  } catch (err) {

    console.error("Webhook Error:", err);
  }
});

// =========================
// イベント処理
// =========================

async function handleEvent(event) {

  try {

    console.log("イベント:", JSON.stringify(event));

    // テキスト以外無視
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

    console.log("受信テキスト:", text);

    // =========================
    // 診断開始
    // =========================

    if (text === '診断開始') {

      console.log("診断開始");

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
    // 未開始
    // =========================

    if (!userData[userId]) {

      console.log("未開始ユーザー");

      return null;
    }

    const current = userData[userId];

    // =========================
    // はい・いいえ以外無視
    // =========================

    if (text !== 'はい' && text !== 'いいえ') {

      console.log("無効入力");

      return null;
    }

    // =========================
    // スコア加算
    // =========================

    if (text === 'はい') {
      current.score += 10;
    }

    current.step++;

    console.log("現在スコア:", current.score);
    console.log("現在STEP:", current.step);

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
    // 最終スコア
    // =========================

    const score = current.score;

    console.log("最終スコア:", score);

    // =========================
    // コメント生成
    // =========================

    let title = "";
    let comment = "";
    let button = null;

    if (score >= 80) {

      title = "危険レベル：高";

      comment =
        "浮気の可能性がかなり高い傾向があります。\n\n" +
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
        "今後の変化には注意した方が良いかもしれません。";

    } else {

      title = "危険レベル：低";

      comment =
        "現時点では大きな問題は見られませんでした。";
    }

    // =========================
    // ユーザーデータ削除
    // =========================

    delete userData[userId];

    console.log("診断結果送信");

    // =========================
    // Flex Message
    // =========================

    return client.replyMessage(event.replyToken, {
      type: "flex",
      altText: "診断結果",

      contents: {
        type: "bubble",

        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",

          contents: [

            {
              type: "text",
              text: "🕵 診断結果",
              weight: "bold",
              size: "xl"
            },

            {
              type: "text",
              text: title,
              weight: "bold",
              size: "lg",
              color: "#ff3366"
            },

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

  } catch (err) {

    console.error("handleEvent Error:", err);
  }
}

// =========================
// 起動
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);
});
