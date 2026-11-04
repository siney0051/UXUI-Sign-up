/* 동작(액션): 화면 전환, 단계 이동, 약관 선택, 입력 검증 (공통 도우미는 common.js) — 로그인 코드와 이름이 겹치지 않게 감쌌어요 */
(() => {

  /* 단계 이동 */
  let step = 1; // 1 약관 · 2 정보 입력 · 3 완료
  function go(n) {
    step = n;
    [1, 2, 3].forEach(i => $('#s' + i).hidden = i !== n);
    $('#s3r').hidden = $('#s3o').hidden = true;
    [...$('#steps').children].forEach((li, i) => { li.className = i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''; });
    $('#back').hidden = n !== 2;                        // 정보 입력에서만 이전 버튼
    window.scrollTo(0, 0);
  }
  $('#back').addEventListener('click', () => go(step - 1));

  /* 1단계: 약관 (항목끼리 서로 영향 없음) */
  const terms = [...document.querySelectorAll('.term')];
  const reqTerms = terms.filter(t => t.dataset.req);
  function syncTerms() {
    $('#all').checked = terms.every(t => t.checked);
    $('#reqOnly').checked = terms.every(t => t.checked === !!t.dataset.req);
    const ok = reqTerms.every(t => t.checked);
    $('#next1').disabled = !ok;
    $('#hint1').textContent = ok ? '' : '필수 약관에 동의하면 다음으로 넘어갈 수 있어요.';
  }
  $('#all').addEventListener('change', e => { terms.forEach(t => t.checked = e.target.checked); syncTerms(); });
  terms.forEach(t => t.addEventListener('change', syncTerms));
  $('#reqOnly').addEventListener('change', e => { terms.forEach(t => t.checked = e.target.checked && !!t.dataset.req); syncTerms(); });
  $('#reset').addEventListener('click', () => { terms.forEach(t => t.checked = false); syncTerms(); });
  document.querySelectorAll('.view').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  $('#next1').addEventListener('click', () => go(2));

  /* 2단계: 입력 검증 */
  let nickOk = false;
  let emailOk = false, returning = false, returnPending = false;   // 이메일 인증 · 돌아온 고객 상태
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const touched = {};
  const rules = {
    email: force => !EMAIL_RE.test(val('email')) ? '올바른 이메일 형식이 아니에요.'
      : force && !emailOk ? '이메일 인증을 해 주세요.'
      : force && returnPending ? '돌아오신 게 맞는지 선택해 주세요.' : '',
    pw: () => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(val('pw')) ? '' : '8자 이상, 영문과 숫자를 함께 사용해 주세요.',
    pw2: () => val('pw2') === val('pw') ? '' : '비밀번호가 일치하지 않아요.',
    nick: () => val('nick').trim().length < 2 ? '닉네임은 2자 이상이에요.' : nickOk ? '' : '닉네임 중복확인을 해 주세요.'
  };
  const okText = { email: '', pw: '사용 가능한 비밀번호예요.', pw2: '비밀번호가 일치해요.', nick: '사용 가능한 닉네임이에요.' };
  const hint = { pw: '8자 이상, 영문과 숫자를 함께 사용해 주세요.' };

  function show(name, force) {
    const el = f(name), msg = el.querySelector('.msg'), empty = val(name) === '';
    if (!force && (!touched[name] || empty)) { el.classList.remove('invalid', 'valid'); msg.textContent = hint[name] || ''; return true; }
    const err = empty ? '필수 입력 항목이에요.' : rules[name](force);
    // 비밀번호 확인: 입력하는 동안은 일치할 때만 알려 주고, 다를 때의 오류는 제출할 때만 보여요
    if (name === 'pw2' && err && !force) { el.classList.remove('invalid', 'valid'); msg.textContent = ''; return true; }
    // 이메일: 인증 전이거나 돌아온 고객 확인을 기다리는 중이면 색을 바꾸지 않아요
    if (name === 'email' && !err && (!emailOk || returnPending)) { el.classList.remove('invalid', 'valid'); msg.textContent = ''; return true; }
    el.classList.toggle('invalid', !!err);
    el.classList.toggle('valid', !err);
    msg.textContent = err || (name === 'email' && returning ? WELCOME : okText[name]);
    return !err;
  }
  for (const n of ['email', 'pw', 'pw2', 'nick']) {
    const input = $('#' + n);
    input.addEventListener('input', () => {
      touched[n] = true;
      if (n === 'nick') nickOk = false;
      if (n === 'email') resetEmail();
      show(n);
      if (n === 'pw' && touched.pw2) show('pw2');
    });
    input.addEventListener('blur', () => show(n));
  }
  /* 닉네임 자동으로 정하기: 형용사 + 인테리어 소품 + 숫자 4자리 (최대 12자) */
  const NICK_WORDS = [['포근한', '아늑한', '산뜻한', '느긋한', '따뜻한', '말랑한', '단정한', '반짝이는'], ['소파', '쿠션', '러그', '화분', '조명', '식탁', '커튼', '머그컵']];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  $('#nickAuto').addEventListener('click', () => {
    $('#nick').value = pick(NICK_WORDS[0]) + pick(NICK_WORDS[1]) + (1000 + Math.floor(Math.random() * 9000));
    touched.nick = true; nickOk = true; show('nick', true);
    f('nick').querySelector('.msg').textContent = '자동으로 정했어요. 다시 누르면 바뀌고, 직접 고쳐도 돼요.';
  });
  $('#nickCheck').addEventListener('click', () => {
    touched.nick = true;
    const v = val('nick').trim(), el = f('nick'), msg = el.querySelector('.msg');
    if (v.length < 2) { nickOk = false; show('nick', true); return; }
    if (['admin', '관리자', 'moajip'].includes(v.toLowerCase())) {
      nickOk = false; el.classList.add('invalid'); el.classList.remove('valid'); msg.textContent = '이미 사용 중인 닉네임이에요.'; return;
    }
    nickOk = true; show('nick', true);
  });
  /* 이메일 인증 · 탈퇴한 계정 다시 가입 */
  // 데모: 실제로는 서버가 알려 주는 탈퇴 계정 정보예요. daysAgo = 탈퇴한 지 며칠 지났는지
  const WITHDRAWN = {
    'sophie@moajip.com': { daysAgo: 3, orders: 12, scraps: 48 },
    'oldie@moajip.com': { daysAgo: 45, orders: 5, scraps: 20 }
  };
  const RESTORE_DAYS = 30;
  const WELCOME = '돌아온 걸 환영해요. 비밀번호를 새로 만들어 주세요.';
  function setVerified(on) {
    const b = $('#emailVerify');
    b.textContent = on ? '인증 완료' : '인증하기';
    b.classList.toggle('done', on); b.disabled = on;
  }
  function resetEmail() {
    emailOk = returning = returnPending = false;
    setVerified(false); $('#returning').hidden = true;
  }
  $('#emailVerify').addEventListener('click', () => {
    touched.email = true;
    if (!EMAIL_RE.test(val('email'))) { show('email', true); return; }
    // 데모: 누르면 바로 인증 완료 (실제로는 인증 메일·번호 확인)
    emailOk = true; setVerified(true);
    if (WITHDRAWN[val('email').trim().toLowerCase()]) { returnPending = true; $('#returning').hidden = false; }
    show('email');
  });
  $('#otherEmail').addEventListener('click', () => {
    $('#email').value = ''; resetEmail(); touched.email = false; show('email'); $('#email').focus();
  });
  $('#confirmReturn').addEventListener('click', () => {
    returnPending = false; returning = true; $('#returning').hidden = true; show('email');
  });
  function showRejoinDone(w) {
    $('#s3').hidden = true;
    if (w.daysAgo <= RESTORE_DAYS) {
      const until = new Date(); until.setDate(until.getDate() - w.daysAgo + RESTORE_DAYS);
      $('#rOrders').textContent = w.orders + '건';
      $('#rScraps').textContent = w.scraps + '개';
      $('#rDeadline').textContent = `${until.getMonth() + 1}월 ${until.getDate()}일까지만 다시 불러올 수 있어요.`;
      $('#s3r').hidden = false;
    } else {
      $('#s3o').hidden = false;
    }
  }

  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;
    for (const n of ['email', 'pw', 'pw2', 'nick']) { touched[n] = true; if (!show(n, true) && !firstBad) firstBad = n; }
    if (firstBad) return (firstBad === 'email' && returnPending ? $('#confirmReturn') : $('#' + firstBad)).focus();
    $('#who').textContent = val('nick').trim();
    document.querySelectorAll('.who').forEach(w => w.textContent = val('nick').trim());
    go(3);
    if (returning) showRejoinDone(WITHDRAWN[val('email').trim().toLowerCase()]);
  });

  /* 화면 전환: 주소 끝이 #signup이면 회원가입, 아니면 로그인 (뒤로 가기로 로그인에 돌아올 수 있어요) */
  function route() {
    const signup = location.hash === '#signup';
    $('#login').hidden = signup; $('#ok').hidden = true;
    $('#steps').hidden = !signup;
    if (signup) go(1);
    else { ['#s1', '#s2', '#s3', '#s3r', '#s3o'].forEach(s => $(s).hidden = true); $('#back').hidden = true; }
  }
  window.addEventListener('hashchange', route);
  route();
  window.go = go;
})();
