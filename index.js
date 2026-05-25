const userId = event.source.userId;
const text = event.message.text.trim();

// 心理分析ボタン / 診断開始 → トップ画像を表示
if (text === '診断開始' || text === '心理分析' || text === '診断') {
  return client.replyMessage(event.replyToken, createTopMessage());
}

// トップ画像の「診断をはじめる」→ 性別質問へ
if (text === '診断スタート') {
  userData[userId] = { phase: 'gender', step: 0, score: 0, gender: null, age: null,
    analysis: { 距離感: 0, 連絡の変化: 0, 生活リズム: 0, 印象の変化: 0, 気持ちの揺れ: 0 } };
  return client.replyMessage(event.replyToken, createGenderMessage());
}

// 相談導線
if (text === '相談したい') {
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'メッセージありがとうございます。\nどんな小さなことでも大丈夫です。気になっていることを、よかったらこのまま送ってくださいね。担当者がやさしくお返事します。'
  });
}

const current = userData[userId];

// 未開始 → トップ画像を案内
if (!current) {
  return client.replyMessage(event.replyToken, createTopMessage());
}

// 性別待ち
if (current.phase === 'gender') {
  if (!GENDERS.includes(text)) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '下のボタンから「男性」「女性」のいずれかを選んでくださいね。' });
  }
  current.gender = text;
  current.phase = 'age';
  return client.replyMessage(event.replyToken, createAgeMessage());
}

// 年代待ち
if (current.phase === 'age') {
  if (!AGES.includes(text)) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '下のボタンから年代を選んでくださいね。' });
  }
  current.age = text;
  current.phase = 'quiz';
  return client.replyMessage(event.replyToken, createQuestionMessage(1, questions[0]));
}

// 質問待ち
if (current.phase === 'quiz') {
  if (!(text in ANSWERS)) {
    return client.replyMessage(event.replyToken, { type: 'text', text: '下のボタンから「あてはまる」「少し気になる」「気にならない」のいずれかを選んでくださいね。' });
  }
  const q = questions[current.step];
  current.score += ANSWERS[text];
  current.analysis[q.category] += ANSWERS[text];
  current.step++;

  if (current.step < questions.length) {
    return client.replyMessage(event.replyToken, createQuestionMessage(current.step + 1, questions[current.step]));
  }

  const resultMessage = buildResult(current);
  delete userData[userId];
  return client.replyMessage(event.replyToken, [resultMessage, createCtaMessage()]);
}

return null;
