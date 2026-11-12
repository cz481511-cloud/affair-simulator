'use strict';

/* ========== 工具 ========== */
const $app = document.getElementById('app');
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = n => Math.floor(Math.random() * n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = v => Math.max(0, Math.min(100, v));

/* ========== 音效（用 WebAudio 即時合成，不需要音檔） ========== */
const SFX = (() => {
  let ctx = null, muted = false;
  const ac = () => {
    if (muted) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  // 單一音：f 起始頻率, f2 結束頻率, at 延遲秒, dur 長度, type 波形, vol 音量
  const tone = (f, at, dur, type, vol, f2) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  };
  const noise = (at, dur, vol, cutoff) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff || 600; g.gain.value = vol || 0.4;
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  };
  return {
    click() { tone(660, 0, 0.07, 'triangle', 0.12, 880); },
    page() { noise(0, 0.18, 0.12, 3000); },
    // 懷疑值上升：低沉的「登登」，升越多越重
    sus(n) { tone(180, 0, 0.35, 'sawtooth', 0.16, 110); tone(120, 0.18, 0.5, 'sawtooth', n >= 15 ? 0.22 : 0.14, 70); if (n >= 20) noise(0.15, 0.6, 0.3, 300); },
    calm() { tone(523, 0, 0.18, 'sine', 0.14); tone(392, 0.12, 0.3, 'sine', 0.14); },
    love() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.45 + i * 0.07, 0.25, 'sine', 0.13)); },
    hurt() { tone(440, 0.45, 0.25, 'triangle', 0.14, 330); tone(311, 0.7, 0.5, 'triangle', 0.14, 233); },
    heart() { [0, 0.28, 0.9, 1.18].forEach((t, i) => tone(i % 2 ? 55 : 65, t, 0.16, 'sine', 0.5, 40)); },
    // 被抓：打雷 + 八點檔式「登登登——」
    caught() {
      noise(0, 1.6, 0.9, 400); noise(0.05, 0.3, 0.5, 4000);
      [[311, 0.25], [311, 0.5], [311, 0.75], [247, 1.0]].forEach(([f, t], i) => {
        const d = i === 3 ? 1.6 : 0.2;
        tone(f, t, d, 'sawtooth', 0.2); tone(f / 2, t, d, 'square', 0.12);
      });
    },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 5 ? 0.8 : 0.16, 'triangle', 0.18)); },
    sad() { [659, 587, 523, 440].forEach((f, i) => tone(f, i * 0.32, i === 3 ? 1.2 : 0.4, 'sine', 0.17)); },
    twist() { tone(880, 0, 0.5, 'sawtooth', 0.12, 110); noise(0.45, 0.5, 0.4, 500); tone(98, 0.5, 1.2, 'sawtooth', 0.2); },
    buzz() { tone(150, 0, 0.18, 'square', 0.08); tone(150, 0.3, 0.18, 'square', 0.08); },
    thunder() { noise(0, 1.5, 0.8, 350); noise(0.03, 0.25, 0.4, 4000); },
    camera() { noise(0, 0.06, 0.35, 7000); noise(0.5, 0.06, 0.35, 7000); noise(0.8, 0.06, 0.35, 7000); },
    toggle() { muted = !muted; if (!muted) this.click(); return muted; },
  };
})();
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'mute') { b.textContent = SFX.toggle() ? '🔇' : '🔊'; return; }
  SFX.click();
});

/* ========== 捏臉 ========== */
const ATTRS = [
  { k: 'face', n: '臉型', o: ['圓臉', '鵝蛋臉', '國字臉', '瓜子臉'] },
  { k: 'skin', n: '膚色', o: ['白皙', '自然', '小麥', '黝黑'] },
  { k: 'hair', n: '髮型', o: ['短髮', '油頭', '光頭', '捲髮', '中分', '長直髮', '大波浪', '馬尾', '鮑伯頭', '丸子頭'] },
  { k: 'hairC', n: '髮色', o: ['黑', '深棕', '金', '銀白', '紅', '粉'] },
  { k: 'eyes', n: '眼睛', o: ['圓眼', '瞇瞇眼', '下垂眼', '鳳眼'] },
  { k: 'brow', n: '眉毛', o: ['平眉', '粗眉', '八字眉', '怒眉'] },
  { k: 'mouth', n: '嘴巴', o: ['微笑', '大笑', '抿嘴', '歪嘴笑'] },
  { k: 'glass', n: '眼鏡', o: ['無', '圓框', '方框', '墨鏡'] },
  { k: 'beard', n: '鬍子', o: ['無', '鬍渣', '八字鬍', '落腮鬍'] },
  { k: 'cloth', n: '服裝', o: ['西裝', '帽T', 'T恤', '洋裝'] },
  { k: 'clothC', n: '衣服顏色', o: ['黑', '深藍', '酒紅', '墨綠', '白', '粉'] },
];
const SKIN = ['#ffe3cf', '#f5c9a6', '#d9a070', '#a66a42'];
const HAIRC = ['#1d1a1a', '#5a3a22', '#e3b84f', '#d9dbe0', '#b3352b', '#f48fb1'];
const CLOTHC = ['#22222a', '#243a6b', '#7a1f33', '#1f5a43', '#eeeeee', '#f6a5c0'];

function avatar(c, cls) {
  const skin = SKIN[c.skin], hair = HAIRC[c.hairC], cl = CLOTHC[c.clothC];
  const dark = '#2a1a1a';
  let s = `<svg class="avatar ${cls || ''}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect width="200" height="200" fill="#4a3a63"/>`;
  // 後髮
  const hb = {
    5: `<path d="M42 90 Q40 26 100 26 Q160 26 158 90 L164 190 L36 190 Z" fill="${hair}"/>`,
    6: `<path d="M40 90 Q38 24 100 24 Q162 24 160 90 Q174 118 158 140 Q174 166 156 192 L44 192 Q26 166 42 140 Q26 118 40 90Z" fill="${hair}"/>`,
    7: `<path d="M148 52 Q194 66 180 132 Q174 164 158 150 Q170 108 146 88Z" fill="${hair}"/>`,
    8: `<path d="M38 95 Q36 24 100 24 Q164 24 162 95 L162 134 Q150 148 138 134 L62 134 Q50 148 38 134Z" fill="${hair}"/>`,
    9: `<circle cx="100" cy="20" r="20" fill="${hair}"/>`,
  }[c.hair];
  if (hb) s += hb;
  // 身體
  s += `<path d="M26 200 Q30 152 78 144 L122 144 Q170 152 174 200Z" fill="${cl}"/>`;
  s += `<rect x="85" y="128" width="30" height="24" fill="${skin}"/>`;
  if (c.cloth === 0) s += `<path d="M82 144 L100 176 L118 144Z" fill="#fff"/><path d="M96 150 L104 150 L107 186 L100 194 L93 186Z" fill="#c0392b"/><path d="M82 144 L70 150 L92 180Z M118 144 L130 150 L108 180Z" fill="#00000033"/>`;
  if (c.cloth === 1) s += `<path d="M76 146 Q100 172 124 146 L124 156 Q100 182 76 156Z" fill="#00000033"/><path d="M92 166 L92 190 M108 166 L108 190" stroke="#fff" stroke-width="2"/>`;
  if (c.cloth === 2) s += `<path d="M84 144 Q100 160 116 144Z" fill="${skin}"/>`;
  if (c.cloth === 3) s += `<path d="M78 144 Q100 178 122 144Z" fill="${skin}"/><circle cx="100" cy="168" r="3" fill="#ffd54f"/>`;
  // 耳朵 + 臉
  s += `<circle cx="47" cy="96" r="9" fill="${skin}"/><circle cx="153" cy="96" r="9" fill="${skin}"/>`;
  s += [
    `<ellipse cx="100" cy="92" rx="54" ry="56" fill="${skin}"/>`,
    `<ellipse cx="100" cy="92" rx="48" ry="60" fill="${skin}"/>`,
    `<rect x="48" y="34" width="104" height="116" rx="30" fill="${skin}"/>`,
    `<path d="M48 80 Q48 34 100 34 Q152 34 152 80 Q152 126 100 153 Q48 126 48 80Z" fill="${skin}"/>`,
  ][c.face];
  // 鬍子
  if (c.beard === 1) s += `<path d="M62 112 Q100 160 138 112 Q130 146 100 150 Q70 146 62 112Z" fill="#00000026"/>`;
  if (c.beard === 2) s += `<path d="M82 112 Q100 104 118 112 Q108 116 100 113 Q92 116 82 112Z" fill="${hair}"/>`;
  if (c.beard === 3) s += `<path d="M52 96 Q56 150 100 152 Q144 150 148 96 Q140 128 118 110 Q100 104 82 110 Q60 128 52 96Z" fill="${hair}"/>`;
  // 眼睛
  const eye = x => [
    `<circle cx="${x}" cy="92" r="6.5" fill="${dark}"/><circle cx="${x + 2}" cy="90" r="2" fill="#fff"/>`,
    `<path d="M${x - 8} 94 Q${x} 86 ${x + 8} 94" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<circle cx="${x}" cy="94" r="5.5" fill="${dark}"/><path d="M${x < 100 ? x - 9 : x + 9} 92 L${x < 100 ? x + 8 : x - 8} 86" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`,
    `<ellipse cx="${x}" cy="92" rx="8" ry="4.5" fill="${dark}"/><path d="M${x < 100 ? x - 7 : x + 7} 91 L${x < 100 ? x - 13 : x + 13} 85" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/>`,
  ][c.eyes];
  s += eye(80) + eye(120);
  // 眉毛
  const bw = c.brow === 1 ? 6 : 3.5;
  const by = [[76, 76], [76, 76], [80, 73], [72, 80]][c.brow]; // [外側y, 內側y]
  s += `<path d="M69 ${by[0]} L91 ${by[1]} M131 ${by[0]} L109 ${by[1]}" stroke="${hair === '#d9dbe0' ? '#888' : hair}" stroke-width="${bw}" stroke-linecap="round"/>`;
  // 鼻子
  s += `<path d="M100 98 Q95 108 102 110" stroke="#00000040" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  // 嘴巴
  s += [
    `<path d="M85 120 Q100 133 115 120" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<path d="M82 118 Q100 142 118 118Z" fill="#7a1f2b"/><path d="M86 119 L114 119 L111 124 L89 124Z" fill="#fff"/>`,
    `<path d="M88 123 L112 123" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M86 124 Q104 128 117 115" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ][c.mouth];
  // 眼鏡
  if (c.glass === 1) s += `<g stroke="#222" stroke-width="3" fill="#ffffff22"><circle cx="80" cy="92" r="14"/><circle cx="120" cy="92" r="14"/><path d="M94 92 L106 92" fill="none"/></g>`;
  if (c.glass === 2) s += `<g stroke="#222" stroke-width="3" fill="#ffffff22"><rect x="64" y="81" width="32" height="22" rx="4"/><rect x="104" y="81" width="32" height="22" rx="4"/><path d="M96 90 L104 90" fill="none"/></g>`;
  if (c.glass === 3) s += `<g stroke="#111" stroke-width="3" fill="#111"><rect x="63" y="81" width="34" height="22" rx="8"/><rect x="103" y="81" width="34" height="22" rx="8"/><path d="M97 88 L103 88 M63 88 L48 86 M137 88 L152 86" fill="none"/></g>`;
  // 前髮
  const bangs = `<path d="M44 86 Q42 26 100 26 Q158 26 156 86 Q132 50 100 57 Q68 50 44 86Z" fill="${hair}"/>`;
  const part = `<path d="M44 90 Q40 26 100 26 Q160 26 156 90 Q148 56 100 40 Q52 56 44 90Z" fill="${hair}"/>`;
  const shortTop = `<path d="M45 80 Q43 26 100 26 Q157 26 155 80 Q140 52 100 52 Q60 52 45 80Z" fill="${hair}"/>`;
  s += [
    shortTop,
    `<path d="M45 78 Q45 22 104 22 Q160 26 155 78 Q148 46 96 44 Q64 44 45 78Z" fill="${hair}"/><path d="M70 36 Q100 26 136 38 M64 44 Q100 32 144 46" stroke="#ffffff33" stroke-width="2" fill="none"/>`,
    ``,
    [[52, 62], [62, 44], [80, 32], [100, 28], [120, 32], [138, 44], [148, 62]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="16" fill="${hair}"/>`).join(''),
    part, bangs, part, shortTop, bangs, shortTop,
  ][c.hair];
  return s + '</svg>';
}

function randomFace(female) {
  const c = {};
  ATTRS.forEach(a => { c[a.k] = rnd(a.o.length); });
  if (female) {
    c.hair = 5 + rnd(5); c.beard = 0; c.glass = Math.random() < 0.75 ? 0 : 1 + rnd(2);
    c.brow = pick([0, 2]); c.cloth = pick([1, 2, 3, 3]);
  }
  return c;
}

/* ========== 隨機資料 ========== */
const SUR = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪'];
const GIRL = ['雅婷', '淑芬', '美玲', '怡君', '佩珊', '詩涵', '曉薇', '芷晴', '語彤', '宜蓁', '婉如', '心怡', '子晴', '郁婷', '筱涵', '思妤'];
const BOY = ['志明', '建宏', '俊傑', '冠宇', '家豪', '承恩', '柏翰', '宗翰', '彥廷', '國棟'];
const CO = ['奇點科技', '銀河半導體', '極光運算', '天際線 AI', '量子芒果'];
const GANG = ['竹聯建設', '天道實業', '四海水產', '北聯砂石', '松山金紙行'];
const WIFE_JOB = ['鋼琴老師', '牙醫', '瑜珈教練', '檢察官', '連鎖滷味店老闆娘', '房仲女王', '百萬訂閱直播主', '花藝師', '會計師', '兒童美語老師'];
const MIS_JOB = ['新來的秘書', '咖啡店店長', '健身教練', '插畫家', '駐唱歌手', '空服員', '獸醫', '調酒師', '實習工程師', '花店店員', '塔羅占卜師'];
const WIFE_MET = [
  '大學迎新那天，你把整杯珍奶灑在她身上，她爸的小弟差點把你埋了',
  '相親當天，隔壁桌坐了八個穿黑西裝的男人全程盯著你',
  '你創業快倒閉時，她眼睛都沒眨就匯了三千萬給你',
  '颱風夜你們共撐一把傘，後來才知道那條街都是她家的',
  '你出車禍時，是她徒手把你從車裡拖出來的',
];
const MIS_MET = [
  '下大雨那天，她把傘塞給你，自己淋著雨跑走了',
  '公司電梯故障，你們兩個被關在裡面整整兩小時',
  '她把一整杯拿鐵潑在你發表會要穿的白襯衫上',
  '便利商店裡，你們同時伸手拿最後一個鮪魚御飯糰',
  '她蹲在路邊救一隻受傷的小貓，你剛好路過幫她撐傘',
  '飛機遇到亂流，鄰座的她下意識抓住了你的手',
];
const CAUGHT = [
  '{wife}沒有哭，也沒有鬧。\n她只是拿起手機，輕輕說了一句：「爸，是我。」\n\n十分鐘後，八台黑色賓士整齊地停在{co}樓下。',
  '{wife}笑著把一疊照片攤在桌上，每一張都拍得比徵信社還清楚。\n「老公，你知道我爸的小弟，有一半在當外送員嗎？」\n\n你的膝蓋自己彎了下去。',
  '「{me}，你記得結婚那天我爸跟你說過什麼嗎？」\n你當然記得——「對我女兒不好，消波塊有你的名字。」\n\n窗外，一台水泥車正在倒車。',
  '{wife}把離婚協議書推到你面前，上面的財產分配只有一行字：\n「全部歸女方。男方可保留一條內褲。」\n\n她身後站著十二位律師，和十二位不像律師的人。',
];

/* ========== 狀態 ========== */
let G = {
  me: { name: '', face: null },
  wife: null, mis: null, co: '', gang: '',
  s: 10, a: 40, idx: 0, flags: {}, deaths: 0,
};

function rollCast() {
  const wn = pick(SUR) + pick(GIRL);
  let mn; do { mn = pick(SUR) + pick(GIRL); } while (mn === wn);
  G.wife = { name: wn, face: randomFace(true), job: pick(WIFE_JOB), met: pick(WIFE_MET) };
  G.mis = { name: mn, face: randomFace(true), job: pick(MIS_JOB), met: pick(MIS_MET) };
  G.co = pick(CO); G.gang = pick(GANG);
  // 配角：岳父與副總（只在動畫裡出現）
  const dad = randomFace(false);
  Object.assign(dad, { hair: pick([0, 1, 2]), hairC: 3, glass: 3, beard: pick([2, 3]), cloth: 0, clothC: 0, brow: 3, mouth: 2 });
  const vp = randomFace(false);
  Object.assign(vp, { hair: pick([0, 1, 4]), cloth: 0, glass: pick([0, 1, 2]) });
  G.dad = { name: '岳父', face: dad }; G.vp = { name: '副總', face: vp };
}
const fmt = t => t
  .replace(/\{me\}/g, esc(G.me.name)).replace(/\{wife\}/g, G.wife.name).replace(/\{mis\}/g, G.mis.name)
  .replace(/\{wjob\}/g, G.wife.job).replace(/\{mjob\}/g, G.mis.job)
  .replace(/\{co\}/g, G.co).replace(/\{gang\}/g, G.gang);

/* ========== 劇情 ==========
   選項欄位：t 選項文字, r 結果文字, s 懷疑值變化, a 好感度變化,
   risk {p 機率, r, s, a} 額外倒楣事件, flag 設定旗標, caught 直接被抓, end 直接進結局,
   fn(G) 動態回傳上述欄位 */
const SCENES = [
  {
    title: '深夜的訊息',
    text: '晚上十一點，你和{wife}並肩躺在床上。她正在敷面膜。\n\n床頭的手機突然亮了——是{mis}：\n「今天謝謝你陪我。傘我洗好了，下次還你♡」\n\n{wife}的視線，緩緩移了過來。',
    choices: [
      { t: '淡定地把手機螢幕朝下蓋住', r: '「誰啊？」\n「……電信推銷。」\n「晚上十一點？」\n\n{wife}的面膜皺了一下。你聽見自己吞口水的聲音。', s: 12, a: 0 },
      { t: '大方唸出來：「廠商說傘洗好了要還我」', r: '「廠商幫你洗傘？」{wife}挑眉。\n「……現在服務業很競爭。」\n\n她沒再追問。但你沒回訊息，{mis}等到凌晨兩點才睡。', s: 5, a: -6 },
      { t: '「我肚子痛！」抓起手機衝進廁所', r: '你坐在馬桶上，回了一句：「晚安，今天我也很開心。」\n{mis}秒回了一個害羞的貼圖。\n\n你在廁所傻笑了二十分鐘。{wife}在門外問你要不要吃益生菌。', s: 8, a: 10 },
    ],
  },
  {
    title: '通訊錄的藝術',
    text: '你意識到一件事：{mis}的名字不能就這樣躺在通訊錄裡。\n\n畢竟你老婆表面上是{wjob}，實際上是「{gang}」老大的獨生女。\n\n該把她存成什麼名字？',
    choices: [
      { t: '「供應商 王經理」', r: '完美。沒有人會對王經理產生興趣。\n\n你甚至幫王經理換了一張中年男子打高爾夫的大頭貼。', s: -4, a: 0, flag: { contact: 'wang' } },
      { t: '「寶貝♡」', r: '你覺得這樣比較有戀愛的感覺。\n\n存檔的那一刻，遠方傳來一聲烏鴉叫。', s: 6, a: 6, flag: { contact: 'baby' } },
      { t: '「詐騙電話 勿接」', r: '滴水不漏。\n\n只是三天後，{mis}瞄到你的手機畫面，沉默了很久。\n「原來我在你心裡……是詐騙？」', s: -6, a: -10, flag: { contact: 'scam' } },
    ],
  },
  {
    title: '第一次約會',
    text: '{mis}傳訊息來：「這週六……可以見面嗎？」\n\n你想起你們是怎麼認識的：{mismet}。\n\n心跳漏了一拍。要約在哪裡？',
    choices: [
      { t: '信義區景觀餐廳，要給就給最好的', r: '燭光、紅酒、夜景。{mis}笑起來眼睛彎彎的。\n\n直到你聽見隔壁桌傳來熟悉的聲音——\n「欸？那不是{wife}她老公嗎？」\n\n是你老婆的三個姊妹淘。其中一個已經舉起了手機。', s: 22, a: 12 },
      { t: '基隆廟口，離家越遠越安全', r: '你們擠在人群裡分食一份營養三明治，她嘴角沾了美乃滋，你伸手幫她擦掉。\n\n兩個人都臉紅了。', s: 3, a: 10,
        risk: { p: 0.35, r: '\n\n結帳時，蚵仔煎老闆盯著你看了三秒。\n「你不是大小姐的……」\n\n你丟下一千塊拉著{mis}就跑。', s: 15, a: 0 } },
      { t: '公司頂樓，一人一個便當', r: '「大老闆約會就請我吃排骨便當？」{mis}笑著說。\n\n但夕陽很美，她把滷蛋分了一半給你。\n\n安全，只是好像少了點什麼。', s: 0, a: 4 },
    ],
  },
  {
    title: '小蒼蘭',
    text: '你一進家門，{wife}就走過來幫你脫外套。\n\n她的動作停住了。\n\n鼻子湊近你的領口，輕輕吸了一口氣。\n\n「老公，你身上怎麼有小蒼蘭的味道？」',
    choices: [
      { t: '「喔，車上新換的香氛啦」', r: '「是嗎？」\n\n{wife}拿起車鑰匙走出門。三分鐘後她回來，臉上帶著微笑。\n「車上是檜木味的呢。」\n\n你說可能是你記錯了。她說嗯，可能吧。', s: 14, a: 0 },
      { t: '反客為主：「妳是不是不相信我？」', r: '你紅著眼眶，聲音顫抖，演技直逼金鐘獎。\n\n{wife}靜靜看完你的表演。\n「我只是問一句，你為什麼這麼激動？」\n\n……好問題。', s: 20, a: 0 },
      { t: '「客戶大廳在噴香氛，燻了我一下午」然後抱住她', r: '你把臉埋在她肩膀：「還是老婆的味道最好聞。」\n\n{wife}愣了一下，拍拍你的背。\n\n過關。但你答應今晚陪她看完整季韓劇，沒辦法回{mis}的訊息了。', s: 4, a: -5 },
    ],
  },
  {
    title: '雨中的她',
    text: '傾盆大雨。\n\n{mis}站在{co}大樓對面，渾身濕透，眼淚和雨水混在一起。\n\n「{me}！我到底算什麼？！」\n\n你正要邁步，卻瞥見路口停著一台黑色賓士——車牌是 8888，那是岳父的車。',
    choices: [
      { t: '管他的！衝進雨裡緊緊抱住她', r: '你把她擁進懷裡。雨聲很大，但你聽得見她的心跳。\n「笨蛋……你會感冒的。」\n\n背景音樂在你腦中響起。\n\n黑色賓士的車窗，緩緩降下了五公分，又緩緩升起。', s: 26, a: 22 },
      { t: '撐傘走過去，把傘塞給她就走，再傳訊息約別處', r: '你面無表情地走過她身邊，把傘塞進她手裡，低聲說：「老地方，一小時後。」\n\n就像你們初遇時的那把傘。\n\n{mis}握著傘柄，又氣又想笑。', s: 5, a: 6 },
      { t: '壓低帽子，假裝沒看到，上車離開', r: '後照鏡裡，她的身影越來越小。\n\n那天晚上，{mis}的限時動態只有一張全黑的圖，配字：\n「原來心真的會冷。」', s: -5, a: -24 },
    ],
  },
  {
    title: '撞期',
    text: '命運跟你開了個玩笑。\n\n這個星期五，是你和{wife}的結婚紀念日。\n同時，也是{mis}的生日。\n\n兩個女人都說了同一句話：「那天你會陪我吧？」',
    choices: [
      { t: '陪老婆。匿名訂一束花送去給{mis}', r: '{wife}收到你準備的項鍊，難得露出少女般的笑容。\n\n而{mis}抱著那束沒有署名的花，一個人吹了蠟燭。\n她傳來：「花很漂亮。但我想要的不是花。」', s: -10, a: -12 },
      { t: '「今晚董事會臨時加開」然後去陪{mis}', r: '{mis}許願的時候偷看了你一眼。你問她許了什麼，她說講出來就不靈了。\n\n回到家已經半夜。餐桌上是冷掉的牛排，和一張紙條：\n「董事會辛苦了。——{wife}」\n\n句號畫得特別用力。', s: 20, a: 16 },
      { t: '時間管理大師：兩邊都去，晚餐吃兩次', r: '六點到八點陪{wife}吃法式料理，八點半到十點陪{mis}吃燒肉。\n\n你的胃在哭泣，但你的行程表在微笑。', s: 8, a: 9,
        risk: { p: 0.4, r: '\n\n回家後{wife}靠在你肩上，突然皺眉。\n「我們今天吃的是法國菜……你身上為什麼有炭火味？」', s: 16, a: 0 } },
    ],
  },
  {
    title: '手機借我一下',
    text: '週日早晨，你在沙發上滑手機。\n\n{wife}走過來，伸出手，笑容無懈可擊：\n「老公，我手機沒電了，你的借我查個東西。」\n\n就在這時，手機震了一下。有新訊息。',
    choices: [
      { t: '坦蕩蕩地把手機遞給她', fn: g => {
          if (g.flags.contact === 'baby') return { caught: true, r: '螢幕上跳出通知：\n\n【寶貝♡】：昨天抱著我的時候，你心跳好快喔\n\n空氣凝結了。\n\n{wife}把手機輕輕放回你手上。\n「寶貝？」' };
          if (g.flags.contact === 'wang') return { s: 12, a: 0, r: '螢幕上跳出通知：\n\n【供應商 王經理】：想你了♡\n\n{wife}看看手機，再看看你。\n「……王經理人滿熱情的。」\n「他、他是日本人，比較有禮貌。」' };
          return { s: -6, a: 0, r: '螢幕上跳出通知：\n\n【詐騙電話 勿接】傳送了一則訊息\n\n{wife}看都沒看就滑掉了。\n「現在詐騙真的很多，你自己小心。」\n\n你在心裡向過去的自己鞠躬。' };
        } },
      { t: '「啊我的也快沒電了，我去充一下」', r: '{wife}看了一眼你的螢幕右上角。\n\n「87%。」\n\n「……它掉電很快。」\n\n她點點頭，轉身走了。你注意到她走去的方向，是她放筆記本的抽屜。', s: 16, a: 0 },
      { t: '手一滑，讓手機「不小心」掉進魚缸', r: '撲通。\n\n金魚小橘嚇了一大跳。\n\n「啊！我的手機！」你的悲痛有七分是真的——裡面還有三百張沒備份的照片。\n\n而且接下來三天，{mis}完全聯絡不上你。', s: 8, a: -8 },
    ],
  },
  {
    title: '岳父請喝茶',
    text: '一台黑色賓士把你「接」到了{gang}的總部。\n\n岳父坐在紅木茶桌後面，慢條斯理地沖著茶。牆上掛著四個大字：「以和為貴」。\n\n「阿{me}啊。最近有小弟跟我說，看到你跟一個女孩子走得很近。」\n\n茶杯推到你面前。',
    choices: [
      { t: '「爸，那是公司的合作對象，談正事而已」', r: '「喔？談正事。」\n\n岳父笑了笑，從抽屜拿出一張照片——是你幫{mis}撥頭髮的畫面。\n\n「你們公司談正事，都這麼溫柔？」\n\n你說那是她頭上有蟲。岳父說，嗯，蟲要抓乾淨。', s: 12, a: 0 },
      { t: '二話不說，直接跪下表忠心', r: '「爸！我對{wife}的心，天地可鑑！」\n\n你跪得又快又響，連旁邊的小弟都倒抽一口氣。\n\n岳父沉默許久，把你扶起來：「好啦好啦，男人膝下有黃金。」\n\n你的尊嚴歸零，但命保住了。', s: -12, a: 0 },
      { t: '「爸，您派人跟蹤我？」', r: '茶室裡的溫度瞬間降了十度。\n\n站在門口的四個小弟，同時把手伸進了西裝外套。\n\n「我是關心。」岳父喝了一口茶，「你有意見？」\n\n「沒有。爸，茶很香。」', s: 20, a: 0 },
    ],
  },
  {
    title: '攤牌',
    text: '河堤邊，晚風吹起{mis}的頭髮。\n\n她是個{mjob}，本來可以過著簡單的日子，直到遇見你。\n\n「{me}，我不想再躲躲藏藏了。」她深吸一口氣，眼眶泛紅。\n\n「她，還是我。你今天給我一個答案。」',
    choices: [
      { t: '「再給我一點時間，好嗎？」', r: '「時間……」{mis}苦笑。\n「你知道這句話，我聽了幾次嗎？」\n\n她沒有甩開你的手，但也沒有回握。', s: 0, a: -12 },
      { t: '「我會離婚的。等我。」（你根本不敢）', r: '{mis}撲進你懷裡，哭得像個孩子。\n「我等你。多久我都等。」\n\n你抱著她，腦中浮現的卻是岳父茶室牆上那四個字，還有窗外的水泥車。\n\n當晚她發了一則限動：「終於等到了♡」', s: 12, a: 22 },
      { t: '「對不起。我們……到此為止吧。」', r: '', end: 'home' },
    ],
  },
  {
    title: '修羅場',
    text: '{co}年度發表會。全場三千人，鎂光燈全打在你身上。\n\n你在台上一眼就看見了第一排的{wife}，一身紅色禮服，氣場全開。\n\n然後你看見了——第三排的{mis}。她說想給你一個驚喜。\n\n中場休息，兩個女人同時朝你走了過來。',
    choices: [
      { t: '硬著頭皮介紹：「老婆，這位是我們的合作夥伴」', r: '「妳好，我是{me}的太太。」\n「……妳好。久仰。」\n\n兩人握手，握了整整五秒。你看見她們的指節都發白了。\n\n「老公，」{wife}微笑，「你的合作夥伴，手很冰呢。」', s: 16, a: -4 },
      { t: '使眼色讓特助把{mis}「請」到後台', r: '特助不愧年薪三百萬，一個箭步擋在{mis}面前：「小姐，這邊有您的包裹。」\n\n{mis}被半推半請地帶走，回頭看你的眼神寫滿了受傷。\n\n{wife}挽住你的手：「剛剛那位小姐是？」\n「粉絲。」', s: 5, a: -12 },
      { t: '拉下牆上的火災警報器', r: '鈴聲大作，灑水系統啟動，三千人尖叫逃竄。\n\n你在水霧中一手護著一個往外跑——然後意識到，你兩隻手各牽著一個。\n\n她們隔著你，對看了一眼。\n\n隔天頭條：「{co}發表會烏龍警報　股價開盤跌 4%」', s: 12, a: 4 },
    ],
  },
];

/* ========== 過場動畫 ==========
   A(誰, x%, y%, 選項) 角色；P(emoji, x%, y%, 選項) 道具；T(文字, x%, y%, 選項) 對話泡泡
   選項：enter 進場動畫, d 進場延遲秒, loop 循環動畫, ld 循環延遲, emo 表情符號, ed 表情延遲, w 寬度%, s 字級 */
const A = (who, x, y, o) => Object.assign({ t: 'a', who, x, y }, o);
const P = (e, x, y, o) => Object.assign({ t: 'p', e, x, y }, o);
const T = (e, x, y, o) => Object.assign({ t: 't', e, x, y, enter: 'pop' }, o);

const STAGES = [
  { bg: 'bg-bed', sfx: ['buzz', 2.3], els: [P('🌙', 86, 24, { s: 9 }), P('🛏️', 50, 80, { s: 16 }),
    A('me', 28, 52, { enter: 'enterL', d: 1.3, emo: '💦', ed: 3.4 }), A('wife', 72, 52, { enter: 'enterR', d: 1.5, emo: '👀', ed: 3.0 }),
    P('📱', 50, 50, { s: 8, enter: 'pop', d: 2.3, loop: 'shake' }), T('傘我洗好了♡', 50, 26, { d: 2.7 })] },
  { bg: 'bg-office', els: [P('🏙️', 16, 30, { s: 12 }), A('me', 30, 56, { enter: 'enterL', d: 1.3, emo: '🤔', ed: 2.2 }),
    P('📱', 56, 60, { s: 12, enter: 'pop', d: 1.8 }), T('王經理？', 76, 24, { d: 2.4 }), T('寶貝♡？', 82, 48, { d: 3.0 }), T('詐騙電話？', 76, 74, { d: 3.6 })] },
  { bg: 'bg-date', els: [P('🌇', 50, 24, { s: 12 }), P('🍽️', 50, 82, { s: 8 }),
    A('me', 30, 54, { enter: 'enterL', d: 1.3 }), A('mis', 70, 54, { enter: 'enterR', d: 1.6, emo: '😊', ed: 2.8 }),
    P('💗', 45, 52, { s: 5, enter: 'fadein', d: 2.6, loop: 'floatUp' }), P('💗', 56, 60, { s: 4, enter: 'fadein', d: 3.2, loop: 'floatUp', ld: .8 })] },
  { bg: 'bg-home', els: [A('me', 32, 54, { enter: 'fadein', d: 1.3, emo: '💦', ed: 3.8 }),
    A('wife', 74, 54, { enter: 'enterR', d: 1.5, loop: 'nearL', ld: 2.6, emo: '👃', ed: 3.2 }),
    P('🌸', 44, 40, { s: 5, enter: 'fadein', d: 2.2, loop: 'floatUp' }), T('小蒼蘭……？', 72, 20, { d: 3.5 })] },
  { bg: 'bg-rain', fx: 'rain flash', sfx: ['thunder', 1.4], els: [A('mis', 55, 52, { enter: 'fadein', d: 1.3, loop: 'shake', emo: '😭', ed: 1.8 }),
    A('me', 20, 54, { enter: 'enterL', d: 1.8, emo: '❗', ed: 3.8 }), P('🚘', 86, 80, { s: 12, enter: 'carIn', d: 3 }), T('8888', 86, 60, { d: 3.9 })] },
  { bg: 'bg-split', els: [P('📅', 50, 18, { s: 9, enter: 'pop', d: 1.5 }), A('wife', 16, 54, { enter: 'fadein', d: 1.3, emo: '💍', ed: 2.2 }),
    A('mis', 84, 54, { enter: 'fadein', d: 1.3, emo: '🎂', ed: 2.6 }), A('me', 50, 60, { w: 18, enter: 'fadein', d: 1.8, loop: 'wobble', emo: '😵', ed: 3 })] },
  { bg: 'bg-morning', sfx: ['buzz', 3], els: [P('🛋️', 28, 82, { s: 16 }), A('me', 28, 52, { enter: 'fadein', d: 1.3, emo: '😨', ed: 3.4 }),
    A('wife', 78, 52, { enter: 'enterR', d: 1.5, loop: 'nearL', ld: 2.4, emo: '✋', ed: 2.9 }),
    P('📱', 47, 64, { s: 7, enter: 'pop', d: 3, loop: 'shake' }), P('❗', 47, 40, { s: 7, enter: 'pop', d: 3.3 })] },
  { bg: 'bg-tea', els: [P('以和為貴', 50, 18, { cls: 'wall' }), P('🫖', 48, 82, { s: 9 }),
    A('dad', 70, 54, { w: 26, enter: 'fadein', d: 1.4, emo: '🍵', ed: 2.4 }), A('me', 24, 60, { w: 17, enter: 'enterL', d: 1.9, loop: 'shake', emo: '💦', ed: 3 })] },
  { bg: 'bg-river', els: [P('🌉', 50, 24, { s: 14 }), P('🍃', -4, 34, { s: 5, loop: 'drift' }), P('🍃', -4, 62, { s: 4, loop: 'drift', ld: 2 }),
    A('mis', 64, 56, { enter: 'fadein', d: 1.3, emo: '🥺', ed: 2.6 }), A('me', 32, 56, { enter: 'enterL', d: 1.6 }), T('她，還是我？', 72, 22, { d: 3.2 })] },
  { bg: 'bg-hall', fx: 'flash', sfx: ['camera', 2], els: [P('🎤', 50, 86, { s: 7 }), A('me', 50, 50, { w: 20, enter: 'fadein', d: 1.3, emo: '😱', ed: 3.8 }),
    A('wife', 12, 56, { enter: 'enterL', d: 2, loop: 'nearR', ld: 2.9, emo: '🔥', ed: 3.4 }),
    A('mis', 88, 56, { enter: 'enterR', d: 2.2, loop: 'nearL', ld: 3.1, emo: '🎁', ed: 3.4 }), P('⚡', 50, 20, { s: 9, enter: 'pop', d: 4, loop: 'pulse' })] },
];
const END_STAGES = {
  caught: { bg: 'bg-red', fx: 'flash', els: [A('wife', 50, 46, { w: 30, enter: 'zoom', d: .2, emo: '💢', ed: 1 }),
    ...[14, 34, 66, 86].map((x, i) => P('🚘', x, 84, { s: 8, enter: 'carIn', d: 1.4 + i * .25 }))] },
  home: { bg: 'bg-warm', els: [P('🏠', 50, 20, { s: 10 }), A('me', 36, 56, { enter: 'enterL', d: .3 }), A('wife', 62, 56, { enter: 'fadein', d: .2, emo: '🍲', ed: 1.2 }),
    P('💗', 49, 50, { s: 5, enter: 'fadein', d: 1.8, loop: 'floatUp' })] },
  twist: { bg: 'bg-home', els: [P('👞', 40, 86, { s: 7 }), A('wife', 62, 54, { enter: 'fadein', d: .2 }), A('vp', 84, 54, { enter: 'fadein', d: .2, emo: '😳', ed: 1.8 }),
    A('me', 18, 56, { enter: 'enterL', d: .9, emo: '❗', ed: 1.7 })] },
  success: { bg: 'bg-split', els: [A('wife', 16, 54, { enter: 'fadein', d: .2, emo: '🤨', ed: 1 }), A('mis', 84, 54, { enter: 'fadein', d: .2, emo: '💗', ed: 1.3 }),
    A('me', 50, 60, { w: 18, enter: 'fadein', d: .5, loop: 'wobble', emo: '😵‍💫', ed: 1.6 })] },
  exit: { bg: 'bg-rain', fx: 'rain', els: [A('me', 50, 54, { enter: 'fadein', d: .3, emo: '☔', ed: 1.2 })] },
};

function stageHTML(cfg, title, small) {
  const el = e => {
    const mv = `class="mv ${e.enter || ''}" style="animation-delay:${e.d || 0}s"`;
    const lp = `class="lp ${e.loop || ''}" style="animation-delay:${e.ld != null ? e.ld : (e.d || 0)}s"`;
    let inner, w = '';
    if (e.t === 'a') {
      const p = G[e.who];
      w = `width:${e.w || 22}%;`;
      inner = `<div ${lp}>${avatar(p.face, 'actor')}${e.emo ? `<span class="emo" style="animation-delay:${e.ed || 0}s">${e.emo}</span>` : ''}<div class="tag">${esc(p.name)}</div></div>`;
    } else if (e.t === 't') {
      inner = `<div ${lp}><div class="bubble">${e.e}</div></div>`;
    } else {
      inner = `<div ${lp}><span class="${e.cls || ''}" style="${e.cls ? '' : `font-size:${e.s || 6}cqw`}">${e.e}</span></div>`;
    }
    return `<div class="el" style="left:${e.x}%;top:${e.y}%;${w}"><div ${mv}>${inner}</div></div>`;
  };
  const fx = cfg.fx || '';
  return `<div class="stage ${cfg.bg} ${small ? 'small' : ''}"><div class="floor"></div>
    ${cfg.els.map(el).join('')}
    ${fx.includes('rain') ? '<div class="rain"></div>' : ''}${fx.includes('flash') ? '<div class="fl"></div>' : ''}
    <div class="lb t"></div><div class="lb b"></div>
    ${title ? `<div class="tcard"><small>${title[0]}</small><b>${title[1]}</b></div>` : ''}</div>`;
}

/* ========== 畫面 ========== */
let TIMERS = [];
const later = (fn, sec) => TIMERS.push(setTimeout(fn, sec * 1000));
function render(html) { TIMERS.forEach(clearTimeout); TIMERS = []; $app.innerHTML = html; window.scrollTo(0, 0); }

function screenTitle() {
  if (!G.me.face) G.me.face = randomFace(false);
  if (!G.me.name) G.me.name = pick(SUR) + pick(BOY);
  render(`
    <h1>外遇模擬器</h1>
    <div class="sub">紙包不住火，但你可以試試看。</div>
    <div class="panel">
      <h2>第一步：捏出你自己</h2>
      <div class="creator">
        <div>
          <div id="pv">${avatar(G.me.face, 'big')}</div>
          <input type="text" id="nm" maxlength="8" value="${esc(G.me.name)}" placeholder="你的名字">
          <div class="row" style="margin-top:10px">
            <button id="rn">隨機名字</button>
            <button id="rf">隨機長相</button>
          </div>
        </div>
        <div id="attrs"></div>
      </div>
    </div>
    <div class="row"><button class="primary" id="go">決定了，開始我的人生</button></div>
    <div class="note">本遊戲純屬虛構，角色皆為隨機生成，如有雷同純屬巧合。外遇不好，請勿模仿。</div>
  `);
  const drawAttrs = () => {
    document.getElementById('attrs').innerHTML = ATTRS.map((a, i) =>
      `<div class="attr"><span class="n">${a.n}</span><button data-i="${i}" data-d="-1">◀</button><span class="v">${a.o[G.me.face[a.k]]}</span><button data-i="${i}" data-d="1">▶</button></div>`).join('');
    document.getElementById('pv').innerHTML = avatar(G.me.face, 'big');
  };
  drawAttrs();
  document.getElementById('attrs').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = ATTRS[+b.dataset.i], n = a.o.length;
    G.me.face[a.k] = (G.me.face[a.k] + +b.dataset.d + n) % n;
    drawAttrs();
  };
  document.getElementById('rn').onclick = () => { document.getElementById('nm').value = pick(SUR) + pick(BOY); };
  document.getElementById('rf').onclick = () => { G.me.face = randomFace(false); drawAttrs(); };
  document.getElementById('go').onclick = () => {
    G.me.name = document.getElementById('nm').value.trim() || pick(SUR) + pick(BOY);
    rollCast(); screenCast();
  };
}

function card(role, p, info) {
  return `<div class="card">${avatar(p.face, 'mid')}<div><div class="role">${role}</div><div class="name">${esc(p.name)}</div><div class="info">${info}</div></div></div>`;
}

function screenCast() {
  render(`
    <h1>外遇模擬器</h1>
    <div class="sub">命運為你安排了這些人</div>
    <div class="panel">
      ${card('你', G.me, `${G.co} 創辦人兼執行長。身價百億，膽子很小。`)}
      ${card('老婆', G.wife, `表面上是${G.wife.job}，實際上是「${G.gang}」老大的獨生女，眼線遍布全台。<br>相遇：${G.wife.met}。`)}
      ${card('她', G.mis, `${G.mis.job}。<br>相遇：${G.mis.met}。`)}
    </div>
    <div class="panel story">規則很簡單：

・每個選擇都會影響老婆的「懷疑值」和她的「好感度」
・懷疑值到 100 —— 被抓，重來
・好感度歸零 —— 她心碎之下會做出什麼事，沒人知道
・撐過十個章節，看看你會走到哪個結局</div>
    <div class="row">
      <button id="re">換一組人</button>
      <button class="primary" id="go">開始</button>
    </div>
  `);
  document.getElementById('re').onclick = () => { rollCast(); screenCast(); };
  document.getElementById('go').onclick = startRun;
}

function startRun() { G.s = 10; G.a = 40; G.idx = 0; G.flags = {}; screenScene(); }

function hud() {
  return `<div class="chapter">第 ${G.idx + 1} / ${SCENES.length} 章${G.deaths ? `　·　已被抓 ${G.deaths} 次` : ''}</div>
  <div class="panel hud">
    <div><div class="bar-label"><span>老婆懷疑值</span><span>${G.s}</span></div><div class="bar sus"><i style="width:${G.s}%"></i></div></div>
    <div><div class="bar-label"><span>${G.mis.name}好感度</span><span>${G.a}</span></div><div class="bar aff"><i style="width:${G.a}%"></i></div></div>
  </div>`;
}

function screenScene() {
  const sc = SCENES[G.idx];
  const text = fmt(sc.text.replace(/\{mismet\}/g, G.mis.met));
  const st = STAGES[G.idx];
  render(`${hud()}
    ${stageHTML(st, [`第 ${G.idx + 1} 章`, sc.title])}
    <div class="panel"><h2>${sc.title}</h2><div class="story">${text}</div></div>
    <div>${sc.choices.map((c, i) => `<button class="choice" data-i="${i}">${fmt(c.t)}</button>`).join('')}</div>`);
  $app.querySelectorAll('.choice').forEach(b => { b.onclick = () => choose(sc, sc.choices[+b.dataset.i]); });
  SFX.page();
  if (st.sfx) later(() => SFX[st.sfx[0]](), st.sfx[1]);
  if (G.s >= 70) later(() => SFX.heart(), 1.2); // 快被抓了，心跳聲
}

function choose(sc, ch) {
  let o = ch.fn ? ch.fn(G) : ch;
  if (o.end) return screenEnding(o.end);
  let r = o.r, ds = o.s || 0, da = o.a || 0;
  if (ch.flag) Object.assign(G.flags, ch.flag);
  if (ch.risk && Math.random() < ch.risk.p) { r += ch.risk.r; ds += ch.risk.s; da += ch.risk.a; }
  G.s = clamp(G.s + ds); G.a = clamp(G.a + da);
  if (ds > 0) SFX.sus(ds); else if (ds < 0) SFX.calm();
  if (da > 0) SFX.love(); else if (da < 0) SFX.hurt();
  const delta = [
    ds ? `<span class="${ds > 0 ? 'up' : 'down'}">懷疑值 ${ds > 0 ? '+' : ''}${ds}</span>` : '',
    da ? `<span class="love">好感度 ${da > 0 ? '+' : ''}${da}</span>` : '',
  ].filter(Boolean).join('　');
  // 反應鏡頭：老婆和她各自的表情
  const react = { bg: STAGES[G.idx].bg, fx: (STAGES[G.idx].fx || '').replace('flash', ''), els: [
    A('wife', 18, 50, { w: 15, enter: 'enterL', d: .1, emo: o.caught ? '💢' : ds >= 15 ? '💢' : ds > 0 ? '🤨' : ds < 0 ? '😊' : '', ed: .7, loop: ds >= 15 ? 'shake' : '' }),
    A('me', 50, 50, { w: 15, enter: 'fadein', d: .1, emo: ds >= 15 ? '😱' : ds > 0 ? '😅' : da > 0 ? '🥰' : da < 0 ? '😔' : '😮‍💨', ed: 1 }),
    A('mis', 82, 50, { w: 15, enter: 'enterR', d: .1, emo: da > 0 ? '💗' : da < 0 ? '💔' : '', ed: 1.1, loop: da > 0 ? 'bob' : '' }),
  ] };
  render(`${hud()}
    ${stageHTML(react, null, true)}
    <div class="panel"><h2>${sc.title}</h2><div class="story">${fmt(r)}</div><div class="delta">${delta}</div></div>
    <div class="row"><button class="primary" id="nx">繼續</button></div>`);
  document.getElementById('nx').onclick = () => {
    if (o.caught || G.s >= 100) return screenCaught(o.caught ? null : pick(CAUGHT));
    if (G.a <= 0) return screenCaught('{mis}哭了一整夜。\n\n天亮的時候，她做了一個決定。\n\n{wife}的信箱裡，多了一封很長的信，附了四十七張照片。\n標題是：「妳應該知道的事」。');
    G.idx++;
    if (G.idx >= SCENES.length) return screenEnding('final');
    screenScene();
  };
}

function screenCaught(text) {
  G.deaths++;
  SFX.caught();
  const body = text ? fmt(text) : fmt('「我只問一次。」{wife}的聲音很輕。\n「寶貝，是誰？」\n\n你張開嘴，卻發不出任何聲音。\n\n她已經按下了快速撥號鍵 1。那是她爸。');
  render(`
    ${stageHTML(END_STAGES.caught)}
    <div class="panel shake">
      <div class="end-title bad">被抓到了</div>
      <div class="story">${body}</div>
      <div class="delta" style="text-align:center;color:var(--dim)">這是你第 ${G.deaths} 次被抓。</div>
    </div>
    <div class="row">
      <button class="primary" id="again">重來</button>
      <button id="recast">換一組人重來</button>
      <button id="reface">重新捏臉</button>
    </div>`);
  bindRestart();
}

function bindRestart() {
  document.getElementById('again').onclick = startRun;
  document.getElementById('recast').onclick = () => { rollCast(); screenCast(); };
  document.getElementById('reface').onclick = screenTitle;
}

function screenEnding(kind) {
  let title, text;
  if (kind === 'home') {
    title = '結局：回家';
    text = '{mis}看了你很久，最後笑了，眼淚卻掉下來。\n「至少這次，你說了實話。」\n\n她把那把傘還給你，轉身走進人群，沒有回頭。\n\n那天晚上你回到家，{wife}正在廚房煮湯。\n「回來啦？洗手吃飯。」\n\n你從背後抱住她。她愣了一下。\n「……怎麼了？」\n「沒事。只是覺得，回家真好。」\n\n' +
      (G.s >= 50 ? '她沒有說話，只是關了火，輕輕拍了拍你的手。\n\n很多年後你才知道，她其實什麼都知道。\n她只是在等你自己回來。' : '{wife}笑著罵你肉麻。\n\n有些秘密，就讓它永遠留在那個雨天吧。');
  } else if (G.s <= 35) {
    title = '結局：反轉';
    text = '你成功了。滴水不漏，天衣無縫。\n\n發表會結束後，你提早回家想給{wife}一個驚喜。\n\n玄關多了一雙男人的皮鞋。\n\n客廳裡，{wife}和你最信任的副總正十指緊扣，看到你時兩個人都愣住了。\n\n「……老公，你聽我解釋。」\n\n你這才想通——難怪她從來不懷疑你。\n\n因為她根本沒空。';
  } else if (G.a >= 60) {
    title = '結局：外遇成功';
    text = '你撐過來了。\n\n{wife}始終沒有抓到確切的證據，{mis}也還在你身邊。\n\n你有兩支手機、三個行事曆、四套說詞，每天睡前都要複習今天對誰說了什麼謊。\n\n某天深夜，你看著鏡子裡的自己——黑眼圈、白頭髮、胃潰瘍。\n\n{mis}傳來訊息：「你什麼時候離婚？」\n{wife}在房間喊：「老公，我爸叫你明天去喝茶。」\n\n恭喜，你贏了。\n\n……這真的算贏嗎？';
  } else {
    title = '結局：全身而退';
    text = '你沒有被抓到。\n\n但{mis}也累了。某天她留下一張紙條就消失了：\n「我想被人光明正大地牽著手。祝你幸福。」\n\n她換了號碼，搬了家。聽說後來嫁給了一個會陪她逛夜市的普通人。\n\n你的生活恢復平靜。只是每到下雨天，你總會多看路邊一眼。\n\n{wife}問你在看什麼。\n\n「沒什麼。」';
  }
  if (title.includes('反轉')) SFX.twist(); else if (title.includes('外遇成功')) SFX.win(); else SFX.sad();
  const ek = title.includes('回家') ? 'home' : title.includes('反轉') ? 'twist' : title.includes('外遇成功') ? 'success' : 'exit';
  render(`
    ${stageHTML(END_STAGES[ek], ['結局', title.replace('結局：', '')])}
    <div class="panel">
      <div class="end-title good">${title}</div>
      <div class="story">${fmt(text)}</div>
      <div class="delta" style="text-align:center;color:var(--dim)">最終懷疑值 ${G.s}　·　好感度 ${G.a}　·　被抓 ${G.deaths} 次</div>
    </div>
    <div class="row">
      <button class="primary" id="again">再玩一次</button>
      <button id="recast">換一組人</button>
      <button id="reface">重新捏臉</button>
    </div>`);
  bindRestart();
}

screenTitle();
