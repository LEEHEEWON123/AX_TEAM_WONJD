# Supabase Server Secrets Function

이 함수는 Vercel/Next 서버가 Supabase Edge Function을 통해 서버 시크릿을 조회할 때 사용한다.

## 동작 방식

1. Vercel 서버가 `SUPABASE_SECRET_FETCH_TOKEN`으로 함수 호출
2. 함수가 `SERVER_SECRET_ALLOWED_NAMES` allowlist를 확인
3. 허용된 이름만 `Deno.env.get(name)`으로 읽어 반환

## 로컬 실행

```bash
cp supabase/functions/.env.example supabase/functions/.env.local
npm run supabase:functions:serve
```

## 원격 배포

먼저 Supabase 프로젝트를 링크한다.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

함수용 시크릿을 등록한다.

```bash
npx supabase secrets set \
  SUPABASE_SECRET_FETCH_TOKEN=<long-random-token> \
  SERVER_SECRET_ALLOWED_NAMES=DATABASE_URL,STRIPE_SECRET_KEY \
  DATABASE_URL=<database-url> \
  STRIPE_SECRET_KEY=<secret>
```

함수를 배포한다.

```bash
npm run supabase:functions:deploy
```

## Vercel 서버 env

Vercel에는 최소한 아래만 둔다.

```bash
SUPABASE_SECRET_FETCH_TOKEN=<same-token>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
```

필요하면 명시적으로 함수 URL을 고정한다.

```bash
SUPABASE_SECRET_FUNCTION_URL=https://<project-ref>.functions.supabase.co/server-secrets
```

## 주의

- `AUTH_SECRET`처럼 JWT 서명에 동기적으로 필요한 값은 이 함수가 아니라 Vercel 서버 env에 유지한다.
- 민감한 값은 `NEXT_PUBLIC_` prefix로 두지 않는다.
