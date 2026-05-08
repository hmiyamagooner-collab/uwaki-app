await client.replyMessage(event.replyToken, {
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
