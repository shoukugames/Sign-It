// Sign It — "How signing works" tutorial, including moving hands and lips together.
import { h, btn } from '../ui.js';
import { t } from '../i18n.js';
import { store, timer } from '../storage.js';
import { go } from '../nav.js';
import { sfx, say } from '../audio.js';
import { Avatar } from '../avatar.js';

export const SLIDES = {
  en: [
    { title: 'Sign language is a real language', demo: ['HELLO'], body: `<p>People who are <b>Deaf</b> or hard of hearing, and their families and friends, talk with their <b>hands, face and body</b>.</p><p>Every country has its own sign language. In this game you learn <b>American Sign Language (ASL)</b>. In Japanese mode you learn <b>Japanese Sign Language (JSL / 日本手話)</b>. They are different languages!</p>`, say: 'Sign language is a real language. People talk with their hands, face and body.' },
    { title: 'The five parts of every sign', demo: ['THANK_YOU'], body: `<p>Each sign is built from five parts. Change one part and you can change the meaning!</p><div class="param-grid"><div class="param"><div class="e">✋</div><div class="n">Handshape</div><div class="d">How your fingers are shaped</div></div><div class="param"><div class="e">📍</div><div class="n">Location</div><div class="d">Where the hand is: chin, chest…</div></div><div class="param"><div class="e">↗️</div><div class="n">Movement</div><div class="d">How the hand moves</div></div><div class="param"><div class="e">🔄</div><div class="n">Palm direction</div><div class="d">Which way your palm faces</div></div><div class="param"><div class="e">😊</div><div class="n">Face &amp; mouth</div><div class="d">Eyebrows, eyes and lips</div></div></div>`, say: 'Every sign has five parts: handshape, location, movement, palm direction, and face and mouth.' },
    { title: 'Your strong hand and the mirror', demo: ['MOTHER', 'FATHER'], body: `<p>Use your <b>strong hand</b> (the one you draw with) for one-hand signs. Your other hand helps.</p><p>Miko, your teacher, is shown like a <b>mirror</b>. Just copy her like you are looking in a mirror.</p><p>Sign in your <b>signing space</b>: in front of you, from the top of your head to your waist.</p>`, say: 'Use your strong hand. Copy your teacher like a mirror, in the space in front of your body.' },
    { title: 'Fingerspelling', demo: ['#HI'], body: `<p>Fingerspelling uses a handshape for each letter. We use it for <b>names</b> and words that have no sign.</p><ul><li>Hold your hand near your shoulder, palm forward.</li><li>Keep your hand steady — don't bounce!</li><li>Move smoothly from letter to letter.</li><li>For a double letter, slide or bounce the hand a little.</li></ul>`, say: 'Fingerspelling uses one handshape for each letter. Keep your hand steady and move smoothly.' },
    { title: 'Hands and lips together', demo: ['ME', 'LOVE', 'MY', 'MOTHER'], zoom: 1.35, body: `<p>Many signers <b>move their lips</b> while they sign. This is called <b>mouthing</b>. It helps people who lip-read understand you.</p><ol><li>Make the sign with your hands.</li><li>At the same time, shape the word with your lips — you don't need to use your voice.</li><li>Keep your face where people can see it.</li></ol><p>Watch Miko's mouth: <b>“I love my mom.”</b> Her lips make the words while her hands sign.</p>`, say: 'Move your lips while you sign. Shape the word with your mouth at the same time as your hands.' },
    { title: 'Your face matters', demo: ['YOUR', 'NAME', 'WHAT'], body: `<p>Your face is part of the grammar!</p><ul><li><b>Yes/no questions:</b> raise your eyebrows.</li><li><b>What, where, who questions:</b> squeeze your eyebrows together.</li><li><b>Feelings:</b> show them on your face — happy, sorry, surprised.</li></ul>`, say: 'Your face is part of sign language. Raise or squeeze your eyebrows for questions.' },
    { title: 'Playing with the camera', demo: ['ILY'], body: `<p>When a parent turns the camera on, the game watches <b>only your hands</b>. Everything else is hidden and nothing is saved.</p><ul><li>Do the <b>Hand Calibration</b> first.</li><li>Sit in a bright place and keep your hand in view.</li><li>Hold each sign still to score <b>1 to 3 stars</b>. ★★★ is the best!</li></ul>`, say: 'When the camera is on, the game sees only your hands. Hold each sign still to earn up to three stars.', calib: true }
  ],
  ja: [
    { title: '手話はほんとうの言葉', demo: ['こんにちは'], body: `<p><b>ろう者</b>や耳が聞こえにくい人、その家族や友だちは、<b>手・顔・体</b>で話します。</p><p>国ごとにちがう手話があります。日本語モードでは<b>日本手話（JSL）</b>、英語モードでは<b>アメリカ手話（ASL）</b>を学びます。べつの言葉なんです！</p>`, say: '手話はほんとうの言葉です。手と顔と体で話します。' },
    { title: '手話の5つの要素', demo: ['ありがとう'], body: `<p>手話は5つの要素でできています。ひとつ変わると意味が変わることも！</p><div class="param-grid"><div class="param"><div class="e">✋</div><div class="n">手の形</div><div class="d">指の形</div></div><div class="param"><div class="e">📍</div><div class="n">位置</div><div class="d">あご、むね など</div></div><div class="param"><div class="e">↗️</div><div class="n">動き</div><div class="d">手の動かし方</div></div><div class="param"><div class="e">🔄</div><div class="n">手のひらの向き</div><div class="d">どちらを向くか</div></div><div class="param"><div class="e">😊</div><div class="n">表情・口</div><div class="d">まゆ・目・くちびる</div></div></div>`, say: '手話には、手の形、位置、動き、手のひらの向き、表情と口の、5つの要素があります。' },
    { title: 'きき手と鏡', demo: ['おかあさん', 'おとうさん'], body: `<p>片手の手話は<b>きき手</b>（字を書く手）でします。もう片方の手はお手伝いです。</p><p>先生のミコは<b>鏡</b>のように表示されます。鏡を見ているつもりでまねしよう。</p><p>手話は<b>体の前</b>、頭の上から腰までの空間でします。</p>`, say: 'きき手を使って、鏡のように先生をまねしよう。' },
    { title: '指文字', demo: ['#あい'], body: `<p>指文字は、ひとつの文字にひとつの手の形を使います。<b>名前</b>や手話のない言葉に使います。</p><ul><li>手を肩の近くに、手のひらを前に。</li><li>手をはずませず、しっかり止めます。</li><li>文字から文字へなめらかに。</li></ul>`, say: '指文字は、文字ごとに手の形があります。手を止めて、なめらかに動かそう。' },
    { title: '手とくちびるをいっしょに', demo: ['わたし', 'ともだち', 'すき'], zoom: 1.35, body: `<p>手話をしながら<b>くちびるを動かす</b>ことを<b>口型（マウジング）</b>といいます。日本の手話ではとてもよく使われ、相手が読み取りやすくなります。</p><ol><li>手で手話をします。</li><li>同時に、口で言葉の形を作ります（声は出さなくてOK）。</li><li>顔が見えるようにしよう。</li></ol><p>ミコの口を見てね：<b>「わたし ともだち すき」</b></p>`, say: '手話をしながら、くちびるも動かそう。手と口をいっしょに。' },
    { title: '表情も大切', demo: ['あなた', 'なまえ', 'なに'], body: `<p>表情は文法の一部です！</p><ul><li><b>はい/いいえの質問：</b>まゆを上げる。</li><li><b>なに・どこ・だれ：</b>まゆを寄せる。</li><li><b>気持ち：</b>うれしい、ごめんね、を顔で表そう。</li></ul>`, say: '表情も手話の一部です。質問のときは、まゆを動かそう。' },
    { title: 'カメラであそぼう', demo: ['こんにちは'], body: `<p>おうちの人がカメラをオンにすると、ゲームは<b>手だけ</b>を見ます。ほかは映らず、何も保存されません。</p><ul><li>まず<b>手のキャリブレーション</b>をしよう。</li><li>明るい場所で、手をカメラに入れよう。</li><li>手を止めると<b>星1〜3つ</b>。★★★がいちばん！</li></ul>`, say: 'カメラがオンのとき、ゲームは手だけを見ます。手を止めると、星がもらえます。', calib: true }
  ]
};

export function tutorialScreen() {
  const lang = store.settings.lang;
  const slides = SLIDES[lang];
  const tm = timer('tutorial');
  let i = 0;
  const text = h('div', { class: 'tut-text' });
  const dots = h('div', { class: 'steps' }, ...slides.map(() => h('i')));
  const prevB = btn('◀ ' + t('prev'), () => show(i - 1), 'ghost small');
  const nextB = btn(t('next') + ' ▶', () => (i < slides.length - 1 ? show(i + 1) : finish()), 'green');
  const calibB = btn('✋ ' + t('calibrate'), () => go('calibrate'), 'cyan small');
  const left = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '🧭 ', t('tutorial')), h('div', { class: 'panel-body', style: { overflowY: 'auto' } }, text),
    h('div', { class: 'panel-foot' }, prevB, calibB, h('div', { style: { flex: 1 } }), nextB));
  const cv = h('canvas', { class: 'fill' });
  const replay = btn('↻ ' + t('watchAgain'), () => avatar.play(slides[i].demo), 'ghost small');
  const right = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '👩‍🏫 Miko', h('span', { class: 'tag' }, t('mirrorNote'))), h('div', { class: 'panel-body' }, cv), h('div', { class: 'panel-foot' }, replay));
  const avatar = new Avatar(cv, { lang, skin: store.settings.skin });
  const el = h('div', { class: 'screen' }, h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'), h('h2', {}, t('tutorial')), dots), h('div', { class: 'split' }, left, right));

  let loopTok = 0;
  async function loopDemo(demo) {
    const my = ++loopTok;
    while (my === loopTok) {
      const ok = await avatar.play(demo);
      if (!ok || my !== loopTok) return;
      await new Promise((r) => setTimeout(r, 900));
    }
  }
  function show(k) {
    if (k < 0 || k >= slides.length) return;
    i = k;
    const s = slides[i];
    text.innerHTML = `<h3>${s.title}</h3>${s.body}`;
    [...dots.children].forEach((d, j) => (d.className = j < i ? 'done' : j === i ? 'on' : ''));
    prevB.disabled = i === 0;
    calibB.classList.toggle('hidden', !s.calib);
    nextB.textContent = i === slides.length - 1 ? '✓ ' + t('done') : t('next') + ' ▶';
    avatar.zoom = s.zoom || 1;
    loopDemo(s.demo);
    say(`tut_${lang}_${i + 1}`, s.say);
  }
  function finish() {
    store.markTutorial();
    sfx.fanfare(3);
    say('tut_done', t('tutDone'));
    go('title');
  }
  setTimeout(() => show(0), 60);
  return { el, destroy() { loopTok++; tm.stop(); avatar.destroy(); } };
}
