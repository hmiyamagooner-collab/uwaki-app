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
