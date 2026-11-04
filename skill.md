---
name: signup-flow-supabase
description: 로그인·회원가입(약관 동의 → 이메일 인증 포함 정보 입력 → 가입 완료)과 탈퇴 후 재가입 흐름을 순수 HTML/CSS/JS + Supabase(Auth·Postgres·Edge Function)로 만들거나 고칠 때 쓰는 재사용 가이드. 입력 검증 규칙, 약관·닉네임·이메일 인증 동작, 디자인 토큰 구조, DB 스키마와 RLS, 문구 규칙을 담고 있어요. 브랜드·색상 값은 담지 않아요. "회원가입 화면", "로그인", "탈퇴 후 재가입", "Supabase 인증", "약관 동의" 같은 말이 나오면 사용해요.
---

# 회원가입 · 로그인 (Supabase 백엔드 포함)

> 이 문서는 "가상 쇼핑몰 회원가입" 프로젝트의 화면 흐름과 동작 규칙을 일반화한 것이에요.
> 브랜드 이름, 로고, 색상·글꼴 값은 일부러 뺐어요. 새 프로젝트에서는 아래 **0. 시작 전에 정할 것**을 먼저 채워요.
> 이 문서의 코드와 SQL은 예시이고, 실제 Supabase 프로젝트에서 실행해 검증한 것은 아니에요. 적용할 때 꼭 한 번 돌려 봐요.

## 0. 시작 전에 정할 것

| 항목 | 예 | 어디에 쓰나 |
|---|---|---|
| 서비스 이름 · 로고 | `{{SERVICE_NAME}}` | 화면 상단, 문구 |
| 색상 팔레트 · 글꼴 | 디자이너가 정함 | `css/tokens/` 값만 채워요 |
| 필수 약관 목록 | 이용약관, 개인정보 수집·이용, 만 14세 이상 | `terms` 테이블 |
| 선택 약관 목록 | 마케팅 수신 등 | `terms` 테이블 |
| 재가입 내역 복구 기간 | 30일 | `restore_days` 설정, 문구 |
| 간편 로그인 제공자 | 서비스가 쓰는 것만 | Supabase Auth Providers |
| 비밀번호 규칙 | 8자 이상, 영문+숫자 | 입력 검증 + Supabase Auth 설정 |

## 1. 해결하려는 UX 문제와 원칙

| 문제 | 원칙 |
|---|---|
| 입력창을 눌렀다 나오기만 해도 빨개져요 | **직접 입력을 시작한 칸이 틀렸을 때만** 오류를 보여요. 빈 칸은 제출할 때만 오류예요 |
| 비밀번호 확인창이 입력 도중에 빨개져요 | 확인창은 **일치할 때만** "일치해요"를 보여요. 다를 때의 오류는 제출할 때만 보여요 |
| 필수 칸 표시가 없어요 | 필수 칸에 `*`와 안내 문구를 둬요 |
| 비밀번호 보기 아이콘이 없어요 | 모든 비밀번호 칸에 보기/숨기기 버튼을 둬요 |
| 한 칸의 확인 결과가 다른 칸을 물들여요 | 중복확인 같은 결과는 **그 칸에만** 보여요 |
| 선택 약관을 하나만 고를 수 없어요 | 약관마다 독립적으로 선택해요. "필수 항목만 동의"를 둬요 |
| 말투가 섞여 있어요 | 모든 문구를 **~해요 체**로 통일해요 |
| 절차가 한 화면에 몰려 있어요 | 약관 → 정보 입력 → 가입 완료 3단계 + 단계 표시줄 |
| 간편 가입이 맨 위에 있어요 | 이메일 가입을 먼저 두고 간편 로그인은 로그인 화면 아래에 둬요 |

## 2. 화면 흐름

`index.html` 한 파일에서 화면만 바뀌어요. 주소 끝이 `#signup`이면 회원가입, 아니면 로그인이에요. 화면 전환은 `location.hash`로 해서 뒤로 가기가 자연스럽게 돼요.

```
로그인 (#login)
 ├─ 성공 → 로그인 완료
 └─ "회원가입" → #signup
      1 약관 동의
      2 정보 입력  ← 이메일 인증 · 탈퇴 이력 확인
      3 가입 완료
          ├─ 처음 가입
          ├─ 재가입 · 복구 기간 이내   예전 내역 불러오기
          └─ 재가입 · 복구 기간 경과   불러올 수 없다는 안내
```

## 3. 폴더 구조

```
index.html              마크업 (로그인 + 회원가입 + 재가입 완료)
css/tokens/             디자인 토큰 (값만 정의)
  colors.css            팔레트 + 용도별(글자·배경·테두리·상태) 색상
  typography.css        글꼴 · 크기 · 굵기 · 줄 간격 · 자간
  spacing.css           간격 (이름 = px 값)
  radius.css            모서리 둥글기
  effects.css           그림자 · 포커스 링
  sizes.css             컨트롤 높이 · 아이콘 · 레이아웃 폭
css/style.css           컴포넌트 스타일 (토큰 변수만 사용)
js/config.js            Supabase URL · anon key (공개 가능한 값만)
js/supabase.js          클라이언트 생성 + 서버 호출 함수 모음
js/common.js            공통: 선택자 도우미, 비밀번호 보기 토글
js/login.js             로그인 동작 (즉시실행 함수로 감싸 이름 충돌 방지)
js/signup.js            회원가입 동작 (즉시실행 함수로 감쌈)
supabase/
  migrations/           SQL (스키마 · RLS · 함수)
  functions/withdraw-account/   탈퇴 처리 Edge Function
```

- 폴더째로 열거나 배포해야 CSS·JS를 찾아요. ES 모듈(`import`)을 쓰면 `file://`로는 안 열리니 정적 서버(`npx serve` 등)로 열어요.

## 4. 디자인 토큰 규칙 (값은 프로젝트마다 채워요)

- `style.css`에는 색·글꼴·간격 값을 **직접 쓰지 않고** `var(--...)`만 써요. 새 값이 필요하면 토큰 파일에 먼저 추가해요.
- 색은 2단계예요. 팔레트(`--palette-*`)에 원색을 두고, 용도별 토큰(`--color-text-*`, `--color-bg-*`, `--color-border-*`, `--color-error`, `--color-success`)이 팔레트를 가리켜요. 색을 바꿀 때는 팔레트 값만 고쳐요.
- 팔레트 이름에 색 이름을 넣지 말고 `--palette-primary-500`, `--palette-gray-100`처럼 **역할과 단계**로 지어요. 이름과 값이 달라지는 혼란을 막아요.
- 오류·성공·비활성 색은 용도별 토큰으로 따로 둬요.
- 접근성: 주 색 버튼 위 글자는 대비(4.5:1)를 확인해요. 모자라면 버튼 색을 더 진하게 해요.

## 5. Supabase 설정

### 5-1. 프로젝트 준비

1. Supabase 프로젝트를 만들어요. Project URL과 **anon key**를 `js/config.js`에 넣어요. anon key는 공개돼도 되지만, **service_role key는 절대 프런트에 넣지 않아요.**
2. Auth → Providers에서 Email을 켜요. 비밀번호 최소 길이를 5-2와 같게 맞춰요.
3. Auth → Email Templates의 인증 메일에 **6자리 코드(`{{ .Token }}`)** 가 보이게 바꿔요. (링크 방식이 아니라 코드 입력 방식이에요.)
4. 간편 로그인은 서비스가 쓰는 제공자만 켜요. 제공자마다 별도 앱 등록이 필요해요.
5. 개발 중 이메일 발송 한도가 낮으니, 실서비스 전에 SMTP를 직접 연결해요.

```js
// js/config.js
export const SUPABASE_URL = 'https://<project>.supabase.co';
export const SUPABASE_ANON_KEY = '<anon key>';   // 공개 가능한 키만
export const RESTORE_DAYS = 30;                  // 서버 정책과 같은 값으로 맞춰요
```

```js
// js/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 5-2. 가입 방식: "이메일 코드 인증 → 비밀번호 설정"

화면의 순서(이메일 인증이 비밀번호보다 먼저)에 맞춰 이렇게 해요.

1. **인증하기**: `sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` → 메일로 6자리 코드를 보내요.
2. 코드 입력 → `sb.auth.verifyOtp({ email, token, type: 'email' })` → 성공하면 로그인된 세션이 생겨요. 이때 칸을 "인증 완료"로 바꾸고 인증 버튼을 비활성해요.
3. **탈퇴 이력 확인**은 인증이 **끝난 뒤에** 해요 (6-3, 보안상 이유).
4. **가입하기**: `sb.auth.updateUser({ password })`로 비밀번호를 정하고, `create_profile` RPC로 닉네임·약관 동의를 저장해요.
5. 이메일을 고치면 인증 상태를 풀어요(`resetEmail`). 이미 만든 세션이 있으면 `sb.auth.signOut()` 해요.

```js
export const sendCode  = email => sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
export const verifyCode = (email, token) => sb.auth.verifyOtp({ email, token, type: 'email' });
export const setPassword = password => sb.auth.updateUser({ password });
export const login = (email, password) => sb.auth.signInWithPassword({ email, password });
export const loginWith = provider => sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin } });
```

### 5-3. 스키마와 RLS (예시 SQL)

```sql
-- 프로필: 닉네임은 대소문자 구분 없이 유일해요
create extension if not exists citext;

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    citext not null unique check (char_length(nickname) between 2 and 15),
  created_at  timestamptz not null default now()
);

-- 약관: 버전별로 관리해요
create table public.terms (
  id        bigint generated always as identity primary key,
  code      text not null,            -- 예: 'service', 'privacy', 'marketing'
  version   int  not null default 1,
  required  boolean not null,
  title     text not null,
  url       text,
  unique (code, version)
);

create table public.term_consents (
  user_id    uuid not null references auth.users(id) on delete cascade,
  term_id    bigint not null references public.terms(id),
  agreed     boolean not null,
  agreed_at  timestamptz not null default now(),
  primary key (user_id, term_id)
);

-- 탈퇴 이력: 이메일을 해시로만 보관해요 (원문 보관은 정책에 맞춰 정해요)
create table public.withdrawn_accounts (
  email_hash    text primary key,
  withdrawn_at  timestamptz not null default now(),
  orders_count  int not null default 0,     -- 복구 안내용 요약값
  scraps_count  int not null default 0
);

alter table public.profiles          enable row level security;
alter table public.terms             enable row level security;
alter table public.term_consents     enable row level security;
alter table public.withdrawn_accounts enable row level security;   -- 정책 없음 = 직접 접근 불가

create policy "own profile read"   on public.profiles      for select using (id = auth.uid());
create policy "own profile update" on public.profiles      for update using (id = auth.uid());
create policy "terms are public"   on public.terms         for select using (true);
create policy "own consents read"  on public.term_consents for select using (user_id = auth.uid());
-- insert는 아래 create_profile 함수로만 해요. 클라이언트에 직접 insert 정책을 주지 않아요.
```

```sql
-- 닉네임 중복확인: 로그인 전에도 호출돼야 하므로 anon에 열되, 결과는 true/false만 돌려줘요
create function public.is_nickname_available(p_nick text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where nickname = p_nick);
$$;
revoke all on function public.is_nickname_available(text) from public;
grant execute on function public.is_nickname_available(text) to anon, authenticated;

-- 가입 마무리: 필수 약관 동의를 서버에서 다시 확인하고 프로필 + 동의를 한 번에 저장해요
create function public.create_profile(p_nick text, p_agreed_term_ids bigint[])
returns void language plpgsql security definer set search_path = public as $$
declare missing int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select count(*) into missing from public.terms t
   where t.required and not (t.id = any(p_agreed_term_ids));
  if missing > 0 then raise exception 'required terms not agreed'; end if;

  insert into public.profiles(id, nickname) values (auth.uid(), p_nick);
  insert into public.term_consents(user_id, term_id, agreed)
    select auth.uid(), t.id, t.id = any(p_agreed_term_ids) from public.terms t;
end $$;
revoke all on function public.create_profile(text, bigint[]) from public;
grant execute on function public.create_profile(text, bigint[]) to authenticated;
```

- 닉네임 **최종 중복 방지는 DB의 unique 제약**이에요. `is_nickname_available`은 화면 안내용일 뿐이라, 동시에 같은 닉네임을 쓰는 경우를 위해 `create_profile`에서 `23505`(unique 위반) 오류가 나면 "이미 사용 중인 닉네임이에요."를 닉네임 칸에만 보여요.
- `is_nickname_available`은 닉네임 존재 여부를 알려 주니, 남용을 막으려면 Edge Function이나 레이트 리밋으로 감싸는 걸 고려해요.

## 6. 동작 규칙

### 6-1. 입력 검증 (`show(name, force)`)

- `touched[name]`이 `false`이거나 값이 비어 있으면 오류를 **보이지 않아요**. `force`(제출)일 때만 빈 칸을 오류로 처리해요.
- 입력할 때마다 그 칸만 다시 검사해요. 비밀번호가 바뀌면 `touched.pw2`일 때만 확인창을 다시 검사해요.
- **비밀번호 확인칸**: 입력 중 다를 때는 아무 문구도 보이지 않고, 일치할 때만 "비밀번호가 일치해요."(성공)를 보여요. 다른 채로 제출하면 그때 "비밀번호가 일치하지 않아요."를 보여요.
- 이메일은 형식 → (제출 시) 인증 여부 → (제출 시) 돌아온 고객 확인 순서로 검사해요.
- **클라이언트 검증은 편의일 뿐이에요.** 약관, 닉네임 규칙, 비밀번호 규칙은 서버(RLS·함수·Auth 설정)에서도 막혀야 해요.

### 6-2. 약관

- `전체 동의`, `필수 항목만 동의`, 각 약관이 서로 독립이에요.
- `필수 항목만 동의`는 **필수는 모두 체크, 선택은 모두 해제**일 때 켜져요. 켜면 필수만 체크하고 선택은 꺼요.
- 필수 약관이 모두 체크돼야 "다음"이 켜져요. `선택 해제`는 전체를 해제해요.
- 약관 목록은 하드코딩하지 말고 `terms` 테이블에서 읽어 와요: `sb.from('terms').select('*').order('id')`.
- 동의한 약관의 id 목록을 `create_profile`에 넘겨요.

### 6-3. 탈퇴한 계정으로 다시 가입하기

1. 이메일 인증(코드 확인)을 **끝낸 뒤에만** 탈퇴 이력을 조회해요. 인증 전에 알려 주면 "이 이메일을 쓴 적이 있다"는 사실이 남에게 드러나요.
2. 조회는 로그인된 사용자 본인의 이메일만 볼 수 있는 함수로 해요.

```sql
create function public.get_rejoin_info()
returns table (days_since int, orders_count int, scraps_count int, can_restore boolean)
language sql security definer set search_path = public as $$
  select
    extract(day from now() - w.withdrawn_at)::int,
    w.orders_count, w.scraps_count,
    now() - w.withdrawn_at <= interval '30 days'          -- 복구 기간은 정책 값으로 바꿔요
  from public.withdrawn_accounts w
  where w.email_hash = encode(digest(lower(auth.jwt() ->> 'email'), 'sha256'), 'hex');
$$;
revoke all on function public.get_rejoin_info() from public;
grant execute on function public.get_rejoin_info() to authenticated;
-- digest()는 pgcrypto가 필요해요: create extension if not exists pgcrypto;
```

3. 결과가 있으면 "혹시 돌아오신 건가요?" 상자를 보여요.
   - `다른 이메일 쓰기` → 이메일 칸을 비우고 처음 상태로 돌아가요 (세션도 로그아웃).
   - `네, 맞아요` → "돌아온 걸 환영해요. 비밀번호를 새로 만들어 주세요."를 보여요.
   - 선택하기 전에는 가입할 수 없어요("돌아오신 게 맞는지 선택해 주세요.").
4. 가입 완료 화면은 `can_restore`로 갈라요.
   - 복구 기간 이내: 주문·스크랩 개수와 "○월 ○일까지만 다시 불러올 수 있어요" 마감일, `예전 내역 불러오기` / `새로 시작할게요`.
   - 복구 기간 경과: 불러올 수 없다는 안내와 `쇼핑 시작하기`.
5. `예전 내역 불러오기`는 서버 함수(`restore_previous_data`)로 구현해요. 예전 데이터를 어디에 어떻게 보관하는지는 서비스 정책이에요. 보관 데이터는 복구 기간이 지나면 정리(pg_cron 등)해요.

### 6-4. 탈퇴 처리 (Edge Function, service role 사용)

탈퇴는 `auth.users` 삭제가 필요해서 **service role 키가 있는 서버에서만** 해요. 프런트에서 직접 하지 않아요.

```ts
// supabase/functions/withdraw-account/index.ts (예시 뼈대)
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async req => {
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
  const { data: { user } } = await authed.auth.getUser();
  if (!user?.email) return new Response('unauthorized', { status: 401 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // 1) 복구용 요약(주문·스크랩 개수 등)과 이메일 해시를 withdrawn_accounts에 저장
  // 2) 복구 기간 동안 보관할 데이터는 보관 테이블로 옮기기 (정책에 따라)
  // 3) 계정 삭제
  await admin.auth.admin.deleteUser(user.id);
  return new Response('ok');
});
```

- `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function의 시크릿으로만 둬요(`supabase secrets set`). 저장소에 커밋하지 않아요.

### 6-5. 닉네임

- "자동으로 정하기": 형용사 + 소품(서비스 분위기에 맞는 단어 목록) + 숫자 4자리로 만들고, 만든 뒤 `is_nickname_available`로 확인해서 **중복확인까지 끝난 것으로** 처리해요. 중복이면 다시 만들어요.
- "중복확인": `sb.rpc('is_nickname_available', { p_nick })`. 결과는 닉네임 칸에만 보여요.
- 닉네임을 고치면 중복확인 상태를 풀어요.

### 6-6. 로그인

- 이메일 형식과 비밀번호 입력 여부만 클라이언트에서 검사해요. 맞아도 초록색은 보이지 않아요.
- 실패 문구는 이메일 존재 여부를 알려 주지 않게 **하나로** 써요: "이메일 또는 비밀번호가 맞지 않아요."
- 간편 로그인 버튼은 `loginWith('<provider>')`로 연결해요.

## 7. 문구 · 말투 규칙

- 안내·오류 문구는 모두 **~해요 체**예요. (`~입니다`, `~하세요`, `~해주세요` 금지. 요청은 `~해 주세요`로 띄어 써요.)
- 오류는 **무엇이 틀렸는지** 알려 줘요. 예: "올바른 이메일 형식이 아니에요.", "닉네임은 2자 이상이에요."
- 탈퇴 이력은 "탈퇴"라는 단어를 앞세우지 않고 "이전에 {{SERVICE_NAME}}을 이용하셨던 이메일"처럼 순하게 써요.
- 서버 오류 메시지를 그대로 보여 주지 말고, 사용자가 할 수 있는 행동으로 바꿔서 알려 줘요. 예: 메일 발송 한도 초과 → "잠시 후에 다시 시도해 주세요."

## 8. 보안 체크리스트

- [ ] service role key가 프런트 코드·저장소에 없어요.
- [ ] 모든 테이블에 RLS를 켰고, 정책이 없는 테이블은 직접 접근이 막혀요.
- [ ] 필수 약관·닉네임·비밀번호 규칙을 서버에서도 검사해요.
- [ ] 탈퇴 이력은 이메일 인증 뒤에만 보여 줘요.
- [ ] 로그인 실패 문구가 계정 존재 여부를 드러내지 않아요.
- [ ] 이메일 인증 코드 재전송 간격(예: 60초)을 화면에서 안내하고, 서버 한도도 설정했어요.
- [ ] 인증·탈퇴 이력 같은 개인정보의 보관 기간을 개인정보처리방침과 맞췄어요.

## 9. 시험하는 법

1. 로그인: 빈 칸에 들어갔다 나와도 빨개지지 않아요 / 제출하면 빈 칸이 오류 / 틀린 비밀번호는 하나의 실패 문구.
2. 약관: "필수 항목만 동의" → 필수만 체크 / 선택 하나만 체크 가능 / 필수가 빠지면 "다음"이 꺼져 있어요.
3. 정보 입력: 비밀번호를 쳐도 확인창은 그대로 / 확인창이 다르면 문구 없음, 같으면 "일치해요" / 닉네임 확인은 닉네임 칸만 바꿈.
4. 이메일 인증: 코드를 보내고 확인하면 "인증 완료", 이메일을 고치면 인증이 풀려요.
5. 서버 쪽: 같은 닉네임으로 두 번 가입 시도 → 두 번째는 닉네임 칸 오류 / 필수 약관을 빼고 `create_profile`을 직접 호출 → 거부.
6. 재가입: 탈퇴 이력이 복구 기간 이내인 이메일과 지난 이메일을 각각 만들어 끝까지 가 봐요.
7. 다른 사용자의 `profiles` 행을 읽으려는 요청이 RLS로 막히는지 확인해요.

## 10. 알려진 한계 · 주의

- 복구할 데이터의 범위(주문·스크랩 등)와 복구 정책은 서비스마다 달라요. 문구와 보관 테이블을 정책에 맞춰 바꿔요.
- 이메일 발송은 Supabase 기본 발송 한도가 낮아요. 실서비스 전에 SMTP 설정이 필요해요.
- 간편 로그인은 제공자마다 앱 등록과 승인 절차가 있어요.
- 이메일 해시(`email_hash`)만으로 탈퇴 이력을 찾는 방식은 이메일을 쓰는 사용자 수가 적을 때 추측 공격에 약할 수 있어요. 필요하면 서버 비밀값을 섞은 해시(HMAC)를 써요.
- 이 문서는 예시를 담은 가이드예요. 실제 프로젝트에서는 마이그레이션을 적용한 뒤 9번 시험을 모두 통과시켜요.
