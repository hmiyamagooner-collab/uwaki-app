require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname)));
const config = { channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN, channelSecret: process.env.CHANNEL_SECRET };
const client = new line.Client(config);

const TOP_IMAGE_URL = 'https://uwaki-app.onrender.com/top.jpg';
const TOP_PREVIEW_URL = 'https://uwaki-app.onrender.com/top_preview.jpg';

const COLOR = { greige:'#E8DFD8', paper:'#F4EFEA', brown:'#3B2F2F', black:'#1E1E1E', gold:'#C6A969', textOnDark:'#CFC6BC', subOnDark:'#B8AFA6', textOnLight:'#3B2F2F', subOnLight:'#7A6F66', hintOnLight:'#9A8E84', cardOnDark:'#262220', trackLight:'#E2D8CF', trackDark:'#333333' };
const ANSWERS = { 'あてはまる':10, '少し気になる':5, '気にならない':0 };
const GENDERS = ['男性','女性'];
const AGES = ['20代以下','30代','40代','50代以上'];
const averageData = { 男性:{'20代以下':{average:38,topPercent:22},'30代':{average:44,topPercent:18},'40代':{average:47,topPercent:15},'50代以上':{average:42,topPercent:20}}, 女性:{'20代以下':{average:31,topPercent:28},'30代':{average:36,topPercent:24},'40代':{average:39,topPercent:19},'50代以上':{average:34,topPercent:26}} };
const questions = [
{text:'最近、連絡の返信が前よりそっけなく感じる',category:'連絡の変化'},
{text:'一緒にいる時、スマホを裏返して置くようになった',category:'連絡の変化'},
{text:'通知や画面を、さりげなく隠すことがある',category:'連絡の変化'},
{text:'予定を前ほど教えてくれなくなった',category:'生活リズム'},
{text:'急な外出や残業・飲み会が増えた',category:'生活リズム'},
{text:'特定の曜日だけ、予定が入りやすい気がする',category:'生活リズム'},
{text:'身だしなみや見た目を、急に気にし始めた',category:'印象の変化'},
{text:'知らない香りがすることがある',category:'印象の変化'},
{text:'持ち物や雰囲気に、小さな変化を感じる',category:'印象の変化'},
{text:'急に優しくなったり、冷たくなったりする',category:'気持ちの揺れ'},
{text:'以前よりスキンシップや会話が減った',category:'気持ちの揺れ'},
{text:'一緒に過ごす時間を、面倒がるようになった',category:'気持ちの揺れ'},
{text:'異性の話題を、なんとなく避ける',category:'距離感'},
{text:'気持ちが少し遠くなった気がする',category:'距離感'},
{text:'「前と違う」と感じる瞬間が増えた',category:'距離感'}
];
const RADAR_KEYS = ['距離感','連絡の変化','生活リズム','印象の変化','気持ちの揺れ'];
const categoryMax = questions.reduce((a,q)=>{a[q.category]=(a[q.category]||0)+10;return a;},{});
const userData = {};

function brandHeader(r){const c=[{type:'text',text:'STEALTH FILE',size:'xs',weight:'bold',color:COLOR.gold,flex:0}];if(r){c.push({type:'text',text:r,size:'xs',color:COLOR.hintOnLight,align:'end'});}return {type:'box',layout:'horizontal',contents:c};}

function createTopImage(){return {type:'image',originalContentUrl:TOP_IMAGE_URL,previewImageUrl:TOP_PREVIEW_URL};}

function createStartButton(){return {type:'flex',altText:'分析をはじめる',contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.greige}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'20px',contents:[{type:'text',text:'パートナー心理分析',size:'lg',weight:'bold',color:COLOR.textOnLight,align:'center'},{type:'text',text:'その違和感、気のせいですか？\n15の質問で関係性をそっとチェック。',wrap:true,size:'sm',color:COLOR.subOnLight,align:'center',margin:'sm'},{type:'box',layout:'vertical',margin:'lg',contents:[{type:'button',style:'primary',color:COLOR.brown,height:'md',action:{type:'message',label:'診断をはじめる',text:'分析スタート'}}]},{type:'text',text:'↑ 画像をタップしても始められます',size:'xs',color:COLOR.hintOnLight,align:'center',margin:'md'}]}}};}

function createGenderMessage(){return {type:'flex',altText:'性別を教えてください',contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.paper}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'22px',contents:[brandHeader(''),{type:'text',text:'性別を教えてください',size:'md',weight:'bold',color:COLOR.textOnLight,align:'center',margin:'md'},{type:'text',text:'より正確に分析するため、\n選択してください。',wrap:true,size:'sm',color:COLOR.subOnLight,align:'center',margin:'sm'},{type:'box',layout:'vertical',spacing:'sm',margin:'lg',contents:GENDERS.map(g=>({type:'button',style:'secondary',height:'md',action:{type:'message',label:g,text:g}}))}]}}};}

function createAgeMessage(){return {type:'flex',altText:'年代を教えてください',contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.paper}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'22px',contents:[brandHeader(''),{type:'text',text:'年代を教えてください',size:'md',weight:'bold',color:COLOR.textOnLight,align:'center',margin:'md'},{type:'text',text:'現在の年代を選択してください。',wrap:true,size:'sm',color:COLOR.subOnLight,align:'center',margin:'sm'},{type:'box',layout:'vertical',spacing:'sm',margin:'lg',contents:AGES.map(a=>({type:'button',style:'secondary',height:'md',action:{type:'message',label:a,text:a}}))}]}}};}

function createQuestionMessage(n,q){const total=questions.length;const ratio=Math.round((n-1)/total*100);return {type:'flex',altText:`恋愛心理チェック Q${n}`,contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.paper}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'22px',contents:[brandHeader(`Q${n} / ${total}`),{type:'box',layout:'vertical',height:'5px',backgroundColor:COLOR.trackLight,cornerRadius:'99px',margin:'md',contents:[{type:'box',layout:'vertical',width:`${Math.max(ratio,3)}%`,height:'5px',backgroundColor:COLOR.gold,cornerRadius:'99px',contents:[]}]},{type:'text',text:q.text,wrap:true,size:'md',weight:'bold',color:COLOR.textOnLight,align:'center',margin:'xl'},{type:'box',layout:'vertical',spacing:'sm',margin:'xl',contents:[{type:'button',style:'primary',color:COLOR.brown,height:'md',action:{type:'message',label:'あてはまる',text:'あてはまる'}},{type:'button',style:'secondary',height:'md',action:{type:'message',label:'少し気になる',text:'少し気になる'}},{type:'button',style:'secondary',height:'md',action:{type:'message',label:'気にならない',text:'気にならない'}}]}]}}};}

function createCtaMessage(){return {type:'flex',altText:'次の一歩をご案内します',contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.greige}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'22px',contents:[{type:'text',text:'気持ちを、そのままにしないで。',wrap:true,size:'md',weight:'bold',color:COLOR.textOnLight,align:'center'},{type:'text',text:'あなたの状況に合わせて、\n次の一歩をそっとご案内します。',wrap:true,size:'sm',color:COLOR.subOnLight,align:'center',margin:'md'},{type:'box',layout:'vertical',spacing:'sm',margin:'xl',contents:[{type:'button',style:'primary',color:COLOR.brown,height:'md',action:{type:'message',label:'匿名でカウンセラーに相談',text:'相談したい'}},{type:'button',style:'secondary',height:'md',action:{type:'message',label:'もう一度分析する',text:'分析スタート'}}]},{type:'text',text:'無理な勧誘は一切ありません。\nまずは話すだけでも大丈夫です。',wrap:true,size:'xs',color:COLOR.hintOnLight,align:'center',margin:'lg'}]}}};}

function buildResult(current){const maxScore=questions.length*10;const score=Math.min(100,Math.round(current.score/maxScore*100));const analysis=current.analysis;const radar={};for(const k of RADAR_KEYS){radar[k]=Math.min(5,Math.round(analysis[k]/categoryMax[k]*5));}const bar=(n)=>'●'.repeat(n)+'○'.repeat(5-n);const std=(averageData[current.gender]&&averageData[current.gender][current.age])?averageData[current.gender][current.age]:{average:40,topPercent:20};const diff=score-std.average;let compareText;if(diff>=20)compareText=`同じ${current.age}の標準値より ${diff}pt 高めの傾向です。`;else if(diff>=5)compareText=`標準値より ${diff}pt やや高めです。`;else if(diff>=-5)compareText='標準値に近い傾向です。';else compareText=`標準値より ${Math.abs(diff)}pt 低めの傾向です。`;let rankText;if(diff>=5)rankText=`注意シグナルが高めの方の傾向です（上位${std.topPercent}%目安）。`;else rankText='気になる点はありつつ、落ち着いた傾向です。';let title,comment;if(score>=80){title='関係性の状態：要セルフケア';comment='気になるシグナルが多く出ています。違和感は早めに整理しておくと、心の負担が軽くなります。';}else if(score>=60){title='関係性の状態：少し注意';comment='気になる変化がいくつか見られます。今の気持ちを、そのままにしすぎないことが大切です。';}else if(score>=40){title='関係性の状態：ゆらぎあり';comment='小さな違和感が見られます。焦らず、自分の感じ方を大切にしていきましょう。';}else{title='関係性の状態：おだやか';comment='今のところ、大きな揺らぎは見られませんでした。';}const ageNote={'20代以下':'20代は関係が動きやすい時期。気持ちの変化に敏感になりやすい年代です。','30代':'30代は仕事や環境の変化が多く、すれ違いが起きやすい時期です。','40代':'40代は生活リズムが安定する一方、小さな変化が見えにくくなることもあります。','50代以上':'長く連れ添うほど、変化のサインは穏やかに表れることがあります。'}[current.age]||'';const cp={距離感:['距離を感じる時間が増えたなら、関係の温度差を見つめ直すタイミングかもしれません。','言葉よりも、態度の変化のほうが本音に近いことがあります。'],連絡の変化:['「前と違う」という感覚は、あなたの心がすでに小さな変化を拾っているサインかもしれません。','連絡の取り方の変化には、気持ちの優先順位が表れることがあります。'],生活リズム:['生活リズムのズレが続くなら、理由の一貫性をそっと見てみてください。','予定が読めなくなってきた時は、関係の透明度が少し下がっているのかもしれません。'],印象の変化:['見た目や雰囲気の変化が重なる時は、慌てず様子を見るのが安心です。','印象の変化そのものより、その理由が見えるかどうかが大切なポイントです。'],気持ちの揺れ:['急な優しさや冷たさの落差には、心の揺れが表れていることがあります。','あなたが「前と違う」と感じているなら、その感覚は大切にしてあげてください。']};let topCat=RADAR_KEYS[0];for(const k of RADAR_KEYS){if(analysis[k]>analysis[topCat])topCat=k;}const pool=cp[topCat];const counselorComment=pool[Math.floor(Math.random()*pool.length)];const types=[{name:'慎重サイン型',desc:'小さな変化をていねいに感じ取れるタイプ。直感を大切にしてあげてください。'},{name:'リズム変化型',desc:'生活パターンの揺れに気づきやすいタイプ。一貫性をそっと見ていきましょう。'},{name:'心の機微型',desc:'相手の感情の波を敏感に感じ取れるタイプ。無理に飲み込みすぎないことも大切です。'},{name:'安心重視型',desc:'安心できる関係を大切にしたいタイプ。気持ちを言葉にすることが助けになります。'}];const selectedType=types[Math.floor(Math.random()*types.length)];return {type:'flex',altText:'心理分析レポート',contents:{type:'bubble',styles:{body:{backgroundColor:COLOR.black}},body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'22px',contents:[{type:'text',text:'PSYCHOLOGY REPORT',size:'xs',weight:'bold',color:COLOR.gold,align:'center'},{type:'text',text:`${current.gender}・${current.age}`,size:'xs',color:COLOR.subOnDark,align:'center',margin:'sm'},{type:'text',text:'あなたの関係性スコア',size:'sm',color:COLOR.subOnDark,align:'center',margin:'md'},{type:'text',text:'注意シグナル',size:'xs',color:COLOR.gold,align:'center',margin:'md'},{type:'text',text:`${score}%`,size:'3xl',weight:'bold',color:COLOR.greige,align:'center'},{type:'box',layout:'vertical',height:'8px',backgroundColor:COLOR.trackDark,cornerRadius:'99px',margin:'lg',contents:[{type:'box',layout:'vertical',width:`${Math.max(score,2)}%`,height:'8px',backgroundColor:COLOR.gold,cornerRadius:'99px',contents:[]}]},{type:'text',text:title,weight:'bold',size:'md',color:COLOR.textOnDark,align:'center',margin:'lg'},{type:'text',text:comment,wrap:true,size:'sm',color:COLOR.subOnDark,align:'center',margin:'sm'},{type:'box',layout:'vertical',backgroundColor:COLOR.cardOnDark,cornerRadius:'md',paddingAll:'12px',margin:'lg',contents:[{type:'text',text:'📊 診断の標準値との比較',size:'xs',weight:'bold',color:COLOR.gold},{type:'text',text:compareText,wrap:true,size:'sm',color:COLOR.textOnDark,margin:'sm'},{type:'text',text:rankText,wrap:true,size:'sm',color:COLOR.subOnDark,margin:'sm'},{type:'text',text:ageNote,wrap:true,size:'xs',color:COLOR.subOnDark,margin:'sm'}]},{type:'box',layout:'vertical',backgroundColor:COLOR.cardOnDark,cornerRadius:'md',paddingAll:'12px',margin:'md',contents:[{type:'text',text:'心理分析レーダー',size:'xs',weight:'bold',color:COLOR.gold},...RADAR_KEYS.map(k=>({type:'box',layout:'horizontal',margin:'sm',contents:[{type:'text',text:k,size:'sm',color:COLOR.textOnDark,flex:4},{type:'text',text:bar(radar[k]),size:'sm',color:COLOR.gold,align:'end',flex:5}]}))]},{type:'box',layout:'vertical',backgroundColor:COLOR.cardOnDark,cornerRadius:'md',paddingAll:'12px',margin:'md',contents:[{type:'text',text:'💬 心理カウンセラーより',size:'xs',weight:'bold',color:COLOR.gold},{type:'text',text:counselorComment,wrap:true,size:'sm',color:COLOR.textOnDark,margin:'sm'}]},{type:'box',layout:'vertical',backgroundColor:COLOR.cardOnDark,cornerRadius:'md',paddingAll:'12px',margin:'md',contents:[{type:'text',text:'あなたの心理タイプ',size:'xs',weight:'bold',color:COLOR.gold},{type:'text',text:selectedType.name,size:'lg',weight:'bold',color:COLOR.textOnDark,margin:'sm'},{type:'text',text:selectedType.desc,wrap:true,size:'sm',color:COLOR.subOnDark,margin:'sm'}]}]}}};}

app.post('/webhook',line.middleware(config),async(req,res)=>{res.status(200).end();try{await Promise.all(req.body.events.map(handleEvent));}catch(err){console.error(err);}});

async function handleEvent(event){try{if(event.type!=='message'||event.message.type!=='text')return null;const userId=event.source.userId;const text=event.message.text.trim();

if(text==='分析開始'||text==='心理分析'||text==='診断開始'||text==='診断'){return client.replyMessage(event.replyToken,[createTopImage(),createStartButton()]);}

if(text==='分析スタート'||text==='診断スタート'){userData[userId]={phase:'gender',step:0,score:0,gender:null,age:null,analysis:{距離感:0,連絡の変化:0,生活リズム:0,印象の変化:0,気持ちの揺れ:0}};return client.replyMessage(event.replyToken,createGenderMessage());}

if(text==='相談したい'){return client.replyMessage(event.replyToken,{type:'text',text:'メッセージありがとうございます。\nどんな小さなことでも大丈夫です。気になっていることを、よかったらこのまま送ってくださいね。担当者がやさしくお返事します。'});}

const current=userData[userId];
if(!current){return client.replyMessage(event.replyToken,[createTopImage(),createStartButton()]);}

if(current.phase==='gender'){if(!GENDERS.includes(text)){return client.replyMessage(event.replyToken,{type:'text',text:'下のボタンから「男性」「女性」のいずれかを選んでくださいね。'});}current.gender=text;current.phase='age';return client.replyMessage(event.replyToken,createAgeMessage());}

if(current.phase==='age'){if(!AGES.includes(text)){return client.replyMessage(event.replyToken,{type:'text',text:'下のボタンから年代を選んでくださいね。'});}current.age=text;current.phase='quiz';return client.replyMessage(event.replyToken,createQuestionMessage(1,questions[0]));}

if(current.phase==='quiz'){if(!(text in ANSWERS)){return client.replyMessage(event.replyToken,{type:'text',text:'下のボタンから「あてはまる」「少し気になる」「気にならない」のいずれかを選んでくださいね。'});}const q=questions[current.step];current.score+=ANSWERS[text];current.analysis[q.category]+=ANSWERS[text];current.step++;if(current.step<questions.length){return client.replyMessage(event.replyToken,createQuestionMessage(current.step+1,questions[current.step]));}const resultMessage=buildResult(current);delete userData[userId];return client.replyMessage(event.replyToken,[resultMessage,createCtaMessage()]);}

return null;}catch(err){console.error(err);}}

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{console.log(`Server running on ${PORT}`);});
