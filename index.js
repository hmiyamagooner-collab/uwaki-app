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
  { text: "最近、スマホを見せなくなった", point: 15, category: "隠し事" },
  { text: "返信が前より遅くなった", point: 5, category: "連絡" },
  { text: "急に予定を教えてくれなくなった", point: 10, category: "行動" },
  { text: "外見や服装へのこだわりが急に増えた", point: 10, category: "外見" },
  { text: "休日の行動が不自然に増えた", point: 10, category: "行動" },
  { text: "LINEや通知を隠すことが増えた", point: 15, category: "隠し事" },
  { text: "一緒にいる時にスマホを裏向きに置く", point: 15, category: "隠し事" },
  { text: "急に優しくなった、または冷たくなった", point: 5, category: "態度" },
  { text: "異性の話題を避けるようになった", point: 10, category: "態度" },
  { text: "急に残業や飲み会が増えた", point: 5, category: "行動" },
  { text: "知らない香水の匂いがすることがある", point: 15, category: "外見" },
  { text: "スマホを常に持ち歩くようになった", point: 10, category: "隠し事" },
  { text: "以前よりスキンシップが減った", point: 10, category: "態度" },
  { text: "急に一人の時間を欲しがるようになった", point: 5, category: "行動" },
  { text: "特定の曜日だけ予定が増えている", point: 10, category: "行動" }
];

const categoryMax = {
  隠し事: 55,
  連絡: 5,
  行動: 40,
  外見: 25,
  態度: 25
};

const userData = {};

function createQuestionMessage(questionNumber, questionData) {
  return {
    type: "flex",
    altText: `浮気診断 Q${questionNumber}`,
    contents: {
      type: "bubble",
      styles: {
        body: { backgroundColor: "#0b0b0b" },
        footer: { backgroundColor: "#0b0b0b" }
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "lg",
        contents: [
          {
            type: "text",
            text: "STEALTH FILE",
            weight: "bold",
            size: "sm",
            color: "#cfcfcf",
            align: "center"
          },
          {
            type: "text",
            text: "浮気診断 🕵",
            weight: "bold",
            size: "xl",
            color: "#ffffff",
            align: "center"
          },
          {
            type: "separator",
            color: "#666666"
          },
          {
            type: "text",
            text: `Q${questionNumber}`,
            weight: "bold",
            size: "xxl",
            color: "#d9d9d9",
            align: "center"
          },
          {
            type: "text",
            text: questionData.text,
            wrap: true,
            size: "md",
            color: "#eeeeee",
            align: "center",
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
            color: "#222222",
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

app.post('/webhook', line.middleware(config), async (req, res) => {
  res.status(200).end();

  try {
    await Promise.all(req.body.events.map(handleEvent));
  } catch (err) {
    console.error('Webhook Error:', err);
  }
});

async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

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
        createQuestionMessage(1, questions[0])
      );
    }

    if (!userData[userId]) {
      return null;
    }

    const current = userData[userId];

    if (text !== 'はい' && text !== 'いいえ') {
      return null;
    }

    if (text === 'はい') {
      const q = questions[current.step];
      current.score += q.point;
      current.analysis[q.category] += q.point;
    }

    current.step++;

    if (current.step < questions.length) {
      return client.replyMessage(
        event.replyToken,
        createQuestionMessage(current.step + 1, questions[current.step])
      );
    }

    const maxScore = questions.reduce((total, q) => total + q.point, 0);
    const score = Math.min(100, Math.round((current.score / maxScore) * 100));
    const analysis = current.analysis;

    const radar = {
      隠し事: Math.min(5, Math.round((analysis['隠し事'] / categoryMax['隠し事']) * 5)),
      連絡: Math.min(5, Math.round((analysis['連絡'] / categoryMax['連絡']) * 5)),
      行動: Math.min(5, Math.round((analysis['行動'] / categoryMax['行動']) * 5)),
      外見: Math.min(5, Math.round((analysis['外見'] / categoryMax['外見']) * 5)),
      態度: Math.min(5, Math.round((analysis['態度'] / categoryMax['態度']) * 5))
    };

    const maxCategory = Object.keys(analysis).reduce((a, b) =>
      analysis[a] > analysis[b] ? a : b
    );

    const nationalAverage = 42;
    const compareScore = score - nationalAverage;

    let compareText = "";
    if (compareScore >= 30) {
      compareText = `全国平均より ${compareScore}% 高い危険傾向です。`;
    } else if (compareScore >= 10) {
      compareText = `全国平均より ${compareScore}% やや高めです。`;
    } else if (compareScore >= -10) {
      compareText = "全国平均と近い傾向です。";
    } else {
      compareText = `全国平均より ${Math.abs(compareScore)}% 低い傾向です。`;
    }

    let title = "";
    let comment = "";

    if (score >= 80) {
      title = "危険レベル：極秘警戒";
      comment =
        "浮気の可能性がかなり高い傾向があります。\n\n" +
        "違和感を放置すると、後から確認が難しくなるケースもあります。早めの確認や相談をおすすめします。";
    } else if (score >= 60) {
      title = "危険レベル：高";
      comment =
        "気になる行動が複数見られます。\n\n" +
        "まだ決定的とは言えませんが、今後の変化には注意が必要です。";
    } else if (score >= 40) {
      title = "危険レベル：中";
      comment =
        "一部に気になる傾向があります。\n\n" +
        "小さな違和感を見逃さず、様子を見ていきましょう。";
    } else {
      title = "危険レベル：低";
      comment =
        "現時点では大きな問題は見られませんでした。\n\n" +
        "ただし、普段のコミュニケーションは大切にしましょう。";
    }

    const aiPatterns = {
      隠し事: {
        high: [
          "スマホ管理や通知の扱いに、強い警戒サインが見られます。",
          "秘密行動の割合が高く、行動パターンに不自然さがあります。",
          "隠す・見せない・確認させない行動が目立つ傾向です。"
        ],
        middle: [
          "隠し事の傾向がやや見られます。",
          "スマホや通知への警戒行動が少し見受けられます。"
        ],
        low: [
          "隠し事傾向は現在そこまで強くありません。",
          "現時点では大きな秘密行動は検出されませんでした。"
        ]
      },
      行動: {
        high: [
          "予定変更や不自然な外出傾向が強く出ています。",
          "生活リズムや行動範囲に違和感があります。"
        ],
        middle: [
          "行動変化が少し増えているようです。",
          "外出・予定の変化がやや見受けられます。"
        ],
        low: [
          "行動面で大きな異常は見られませんでした。"
        ]
      },
      外見: {
        high: [
          "急な美容・服装変化は心理変化のサインの場合があります。",
          "見た目への意識変化がかなり強く出ています。"
        ],
        middle: [
          "外見への意識変化が少し見受けられます。",
          "以前より美容や服装意識が高まっている可能性があります。"
        ],
        low: [
          "外見面で大きな変化は見られませんでした。"
        ]
      },
      態度: {
        high: [
          "感情距離の変化が強く検出されています。",
          "態度変化の割合が高くなっています。"
        ],
        middle: [
          "態度面で少し変化が見られます。",
          "感情表現に違和感が出始めている可能性があります。"
        ],
        low: [
          "態度面では大きな変化は見られません。"
        ]
      },
      連絡: {
        high: [
          "返信タイミングや連絡頻度に強い変化が見られます。",
          "連絡習慣に不自然な変化が検出されています。"
        ],
        middle: [
          "連絡頻度に少し変化が見られます。",
          "返信速度ややり取りの変化に注意してください。"
        ],
        low: [
          "連絡面では大きな異常は見られません。"
        ]
      }
    };

    let dangerLevel = "low";
    if (score >= 80) dangerLevel = "high";
    else if (score >= 50) dangerLevel = "middle";

    const comments = aiPatterns[maxCategory][dangerLevel];
    const aiComment = comments[Math.floor(Math.random() * comments.length)];

    let dangerType = "";
    let dangerDesc = "";

    if (maxCategory === "隠し事") {
      dangerType = "隠密行動型";
      dangerDesc =
        "スマホ管理や秘密行動が増えやすいタイプ。\n\n" +
        "周囲に気づかれないよう慎重に行動する傾向があります。";
    } else if (maxCategory === "行動") {
      dangerType = "夜行動型";
      dangerDesc =
        "予定変更や外出行動に変化が出やすいタイプ。\n\n" +
        "生活パターンの乱れに注意が必要です。";
    } else if (maxCategory === "外見") {
      dangerType = "承認欲求型";
      dangerDesc =
        "外見や魅力意識が高まりやすいタイプ。\n\n" +
        "急なイメチェンや美容意識変化が特徴です。";
    } else if (maxCategory === "態度") {
      dangerType = "感情変化型";
      dangerDesc =
        "感情距離に変化が出やすいタイプ。\n\n" +
        "優しさや冷たさに波が出る傾向があります。";
    } else {
      dangerType = "連絡回避型";
      dangerDesc =
        "返信頻度や連絡タイミングに変化が出やすいタイプ。\n\n" +
        "連絡習慣の乱れに注意が必要です。";
    }

    delete userData[userId];

    return client.replyMessage(event.replyToken, {
      type: "flex",
      altText: "診断結果",
      contents: {
        type: "bubble",
        styles: {
          body: { backgroundColor: "#0b0b0b" }
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: "STEALTH FILE",
              weight: "bold",
              size: "sm",
              color: "#bfbfbf",
              align: "center"
            },
            {
              type: "text",
              text: "🕵 診断結果",
              weight: "bold",
              size: "xxl",
              color: "#ffffff",
              align: "center"
            },
            {
              type: "separator",
              color: "#777777",
              margin: "md"
            },
            {
              type: "text",
              text: title,
              weight: "bold",
              size: "lg",
              color: "#d9d9d9",
              margin: "lg"
            },
            {
              type: "text",
              text: `浮気率 ${score}%`,
              size: "xxl",
              weight: "bold",
              color: "#ffffff"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#333333",
                  cornerRadius: "md",
                  height: "18px",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#cfcfcf",
                      width: `${score}%`,
                      height: "18px",
                      cornerRadius: "md",
                      contents: []
                    }
                  ]
                }
              ]
            },
            {
              type: "text",
              text: comment,
              wrap: true,
              size: "sm",
              color: "#d0d0d0",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              paddingAll: "12px",
              backgroundColor: "#151515",
              cornerRadius: "md",
              contents: [
                {
                  type: "text",
                  text: "📊 全国比較",
                  weight: "bold",
                  size: "sm",
                  color: "#ffffff"
                },
                {
                  type: "text",
                  text: compareText,
                  margin: "sm",
                  wrap: true,
                  size: "sm",
                  color: "#cfcfcf"
                }
              ]
            },
            {
              type: "separator",
              color: "#555555",
              margin: "lg"
            },
            {
              type: "text",
              text: "AI分析レーダー",
              weight: "bold",
              size: "md",
              margin: "lg",
              color: "#ffffff"
            },
            {
              type: "text",
              text:
`隠し事  ${"■".repeat(radar["隠し事"])}
連絡      ${"■".repeat(radar["連絡"])}
行動      ${"■".repeat(radar["行動"])}
外見      ${"■".repeat(radar["外見"])}
態度      ${"■".repeat(radar["態度"])}`,
              wrap: true,
              margin: "md",
              size: "sm",
              color: "#cfcfcf"
            },
            {
              type: "separator",
              color: "#555555",
              margin: "lg"
            },
            {
              type: "text",
              text: "🤖 AI分析コメント",
              weight: "bold",
              size: "md",
              margin: "lg",
              color: "#ffffff"
            },
            {
              type: "text",
              text: aiComment,
              wrap: true,
              size: "sm",
              margin: "md",
              color: "#cfcfcf"
            },
            {
              type: "separator",
              color: "#555555",
              margin: "lg"
            },
            {
              type: "text",
              text: "⚠ 危険人物タイプ",
              weight: "bold",
              size: "md",
              margin: "lg",
              color: "#ffffff"
            },
            {
              type: "text",
              text: dangerType,
              weight: "bold",
              size: "xl",
              color: "#d9d9d9",
              margin: "md"
            },
            {
              type: "text",
              text: dangerDesc,
              wrap: true,
              size: "sm",
              margin: "md",
              color: "#cfcfcf"
            }
          ]
        }
      }
    });

  } catch (err) {
    console.error("handleEvent Error:", err);
  }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
