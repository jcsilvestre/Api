# Endpoints (lista simples)

- GET localhost:3000/v1/

## Auth
- POST localhost:3000/v1/auth/signup
- POST localhost:3000/v1/auth/signin
- POST localhost:3000/v1/auth/refresh
- POST localhost:3000/v1/auth/verify-email
- POST localhost:3000/v1/auth/verify-email/resend
- POST localhost:3000/v1/auth/forgot-password
- POST localhost:3000/v1/auth/reset-password
- GET  localhost:3000/v1/auth/check-availability
- POST localhost:3000/v1/auth/magic-link
- POST localhost:3000/v1/auth/magic-link/verify
- POST localhost:3000/v1/auth/token/introspect
- POST localhost:3000/v1/auth/token/revoke

## Users (me)
- GET    localhost:3000/v1/users/me
- PATCH  localhost:3000/v1/users/me
- POST   localhost:3000/v1/users/me/email
- DELETE localhost:3000/v1/users/me
- POST   localhost:3000/v1/users/me/consent
- GET    localhost:3000/v1/users/me/security-logs
- GET    localhost:3000/v1/users/me/login-history
- GET    localhost:3000/v1/users/me/sessions
- POST   localhost:3000/v1/users/me/signout

## Sessions
- GET    localhost:3000/v1/sessions
- GET    localhost:3000/v1/sessions/:id
- POST   localhost:3000/v1/sessions/:id/refresh
- DELETE localhost:3000/v1/sessions/:id
- DELETE localhost:3000/v1/sessions

## MFA
- POST   localhost:3000/v1/auth/mfa/setup
- POST   localhost:3000/v1/auth/mfa/enable
- DELETE localhost:3000/v1/auth/mfa/disable
- POST   localhost:3000/v1/auth/mfa/verify
- GET    localhost:3000/v1/auth/mfa/backup-codes
- POST   localhost:3000/v1/auth/mfa/backup-codes

## OAuth
- GET    localhost:3000/v1/auth/oauth/google
- GET    localhost:3000/v1/auth/oauth/google/callback
- GET    localhost:3000/v1/auth/oauth/github
- GET    localhost:3000/v1/auth/oauth/github/callback
- GET    localhost:3000/v1/auth/oauth/connections
- DELETE localhost:3000/v1/auth/oauth/connections/:provider

## Admin • Users
- GET    localhost:3000/v1/admin/users
- POST   localhost:3000/v1/admin/users
- GET    localhost:3000/v1/admin/users/:id
- PATCH  localhost:3000/v1/admin/users/:id
- DELETE localhost:3000/v1/admin/users/:id
- POST   localhost:3000/v1/admin/users/:id/lock
- POST   localhost:3000/v1/admin/users/:id/unlock
- POST   localhost:3000/v1/admin/users/:id/resend-verify
- POST   localhost:3000/v1/admin/users/:id/reset-password

## Admin • Roles
- GET    localhost:3000/v1/admin/roles
- POST   localhost:3000/v1/admin/roles
- GET    localhost:3000/v1/admin/roles/:id
- PUT    localhost:3000/v1/admin/roles/:id
- DELETE localhost:3000/v1/admin/roles/:id
- POST   localhost:3000/v1/admin/users/:id/roles
- DELETE localhost:3000/v1/admin/users/:id/roles/:roleId

## Admin • System
- GET    localhost:3000/v1/admin/stats
- GET    localhost:3000/v1/admin/logs/login
- GET    localhost:3000/v1/admin/maintenance/status
- POST   localhost:3000/v1/admin/maintenance/cleanup
- POST   localhost:3000/v1/admin/sessions/revoke-all

---

# Formatos para o Front-End (JSON) e SQL de Referência

## Auth

POST /auth/signup

Request JSON
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "full_name": "Nome Opcional"
}
```
Response JSON
```json
{ "success": true, "data": { "user_id": "uuid" } }
```
SQL (referência)
```sql
-- verifica existência
SELECT id FROM auth.users WHERE email = $1;
-- cria usuário
INSERT INTO auth.users (email, full_name, password_hash, status)
VALUES ($1, $2, $3, 'pending_verification') RETURNING id;
-- cria token de verificação
INSERT INTO auth.verification_tokens (user_id, token, token_hash, token_type, expires_at, ip_address, user_agent)
VALUES ($user_id, $code, $hash, 'email_verification', NOW() + INTERVAL '24 hours', $ip, $ua);
```

POST /auth/verify-email

Request JSON
```json
{ "email": "user@example.com", "code": "123456" }
```
Response JSON
```json
{ "success": true }
```
SQL
```sql
SELECT id FROM auth.users WHERE email = $1;
SELECT id, expires_at FROM auth.verification_tokens
 WHERE user_id = $user_id AND token_hash = $hash AND token_type = 'email_verification' AND is_used = false;
UPDATE auth.verification_tokens SET is_used = true, used_at = NOW() WHERE id = $token_id;
UPDATE auth.users SET is_email_verified = true, email_verified_at = NOW() WHERE id = $user_id;
```

POST /auth/signin

Request JSON
```json
{ "email": "user@example.com", "password": "Password123" }
```
Response JSON
```json
{ "success": true, "data": { "accessToken": "jwt", "refreshToken": "uuid" } }
```
SQL
```sql
SELECT * FROM auth.users WHERE email = $1;
INSERT INTO auth.sessions (user_id, refresh_token, refresh_token_hash, ip_address, user_agent, expires_at, is_active)
VALUES ($user_id, $refresh, $hash, $ip, $ua, NOW() + INTERVAL '7 days', true);
```

POST /auth/refresh

Request JSON
```json
{ "refreshToken": "uuid" }
```
Response JSON
```json
{ "success": true, "data": { "accessToken": "jwt" } }
```
SQL
```sql
SELECT * FROM auth.sessions WHERE refresh_token_hash = $hash AND is_active = true;
UPDATE auth.sessions SET last_activity_at = NOW() WHERE id = $session_id;
```

POST /auth/forgot-password

Request JSON
```json
{ "email": "user@example.com" }
```
SQL
```sql
INSERT INTO auth.verification_tokens (user_id, token, token_hash, token_type, expires_at, ip_address, user_agent)
VALUES ($user_id, $token, $hash, 'password_reset', NOW() + INTERVAL '1 hour', $ip, $ua);
```

POST /auth/reset-password

Request JSON
```json
{ "token": "uuid", "new_password": "NovaSenha123" }
```
SQL
```sql
SELECT * FROM auth.verification_tokens WHERE token_hash = $hash AND token_type = 'password_reset' AND is_used = false;
UPDATE auth.users SET password_hash = $hashpwd, last_password_change = NOW() WHERE id = $user_id;
UPDATE auth.verification_tokens SET is_used = true, used_at = NOW() WHERE id = $token_id;
```

GET /auth/check-availability

Query
```text
?email=user@example.com  |  ?username=apelido
```
Response JSON
```json
{ "success": true, "data": { "emailAvailable": true } }
```

POST /auth/magic-link

Request JSON
```json
{ "email": "user@example.com" }
```
SQL
```sql
INSERT INTO auth.verification_tokens (user_id, token, token_hash, token_type, expires_at, ip_address, user_agent)
VALUES ($user_id, $token, $hash, 'magic_link', NOW() + INTERVAL '15 minutes', $ip, $ua);
```

POST /auth/magic-link/verify

Request JSON
```json
{ "token": "uuid" }
```
Response JSON
```json
{ "success": true, "data": { "accessToken": "jwt", "refreshToken": "uuid" } }
```

## Users (me)

GET /users/me

Headers
```text
Authorization: Bearer <accessToken>
```
Response JSON
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": null,
      "username": null,
      "full_name": null,
      "avatar_url": null,
      "date_of_birth": null,
      "status": "pending_verification",
      "is_email_verified": false,
      "is_phone_verified": false,
      "email_verified_at": null,
      "phone_verified_at": null,
      "failed_login_attempts": 0,
      "locked_until": null,
      "last_password_change": null,
      "mfa_enabled": false,
      "mfa_secret": null,
      "mfa_backup_codes": null,
      "language": "pt-BR",
      "timezone": "America/Sao_Paulo",
      "metadata": {},
      "last_login_at": null,
      "last_seen_at": null,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "deleted_at": null
    },
    "roles": []
  }
}
```

PATCH /users/me

Request JSON
```json
{
  "full_name": "Nome",
  "avatar_url": "https://...",
  "phone": "+5511999999999",
  "language": "pt-BR",
  "timezone": "America/Sao_Paulo"
}
```
SQL
```sql
UPDATE auth.users
SET full_name = $1, avatar_url = $2, phone = $3, language = $4, timezone = $5
WHERE id = $user_id;
```

POST /users/me/signout

Request JSON
```json
{ "refreshToken": "uuid" }
```
SQL
```sql
UPDATE auth.sessions SET is_active = false, revoked_at = NOW()
WHERE user_id = $user_id AND refresh_token_hash = $hash;
```

GET /users/me/sessions

Response JSON
```json
{ "success": true, "data": [ { "id": "uuid", "ip_address": "x.x.x.x", "is_active": true } ] }
```

## Sessions

DELETE /sessions/:id

SQL
```sql
UPDATE auth.sessions SET is_active = false, revoked_at = NOW() WHERE id = $id;
```

## Admin • Users

POST /admin/users

Request JSON
```json
{
  "email": "novo@example.com",
  "full_name": "Novo Usuário",
  "phone": "+5511999999999",
  "username": "apelido",
  "avatar_url": "https://...",
  "date_of_birth": "1990-01-01",
  "status": "active",
  "language": "pt-BR",
  "timezone": "America/Sao_Paulo",
  "metadata": { "source": "admin" }
}
```
SQL
```sql
INSERT INTO auth.users (email, full_name, phone, username, avatar_url, date_of_birth, status, language, timezone, metadata)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);
```

PATCH /admin/users/:id

Request JSON
```json
{ "full_name": "Atualizado", "avatar_url": "https://...", "phone": "+55118888", "status": "locked" }
```
SQL
```sql
UPDATE auth.users SET full_name = $1, avatar_url = $2, phone = $3, status = $4 WHERE id = $id;
```

## Admin • Roles

POST /admin/roles

Request JSON
```json
{ "name": "admin", "description": "Acesso total", "is_system_role": true }
```
SQL
```sql
INSERT INTO auth.roles (name, description, permissions, is_system_role)
VALUES ($1, $2, '[]', $3);
```

POST /admin/users/:id/roles

Request JSON
```json
{ "roleId": "1" }
```
SQL
```sql
INSERT INTO auth.user_roles (user_id, role_id, assigned_at)
VALUES ($user_id, $role_id, NOW());
```

## Tabelas e Campos (Referência)

auth.users
```text
id (uuid), email (citext), phone (varchar, unique, nullable), username (varchar, unique, nullable),
full_name (varchar, nullable), avatar_url (text, nullable), date_of_birth (date, nullable),
password_hash (varchar, nullable), status (varchar), is_email_verified (bool), is_phone_verified (bool),
email_verified_at (timestamptz, nullable), phone_verified_at (timestamptz, nullable),
failed_login_attempts (int), locked_until (timestamptz, nullable), last_password_change (timestamptz, nullable),
mfa_enabled (bool), mfa_secret (varchar, nullable), mfa_backup_codes (text[] nullable),
language (varchar), timezone (varchar), metadata (jsonb), last_login_at (timestamptz, nullable),
last_seen_at (timestamptz, nullable), created_at (timestamptz), updated_at (timestamptz), deleted_at (timestamptz, nullable)
```

auth.sessions
```text
id (uuid), user_id (uuid), refresh_token (varchar unique), refresh_token_hash (varchar unique),
device_id (varchar, nullable), device_type (varchar, nullable), device_name (varchar, nullable),
ip_address (inet), user_agent (text, nullable), location_country (varchar, nullable), location_city (varchar, nullable),
expires_at (timestamptz), is_active (bool), last_activity_at (timestamptz, nullable), created_at (timestamptz), revoked_at (timestamptz, nullable)
```

auth.verification_tokens
```text
id (uuid), user_id (uuid), token (varchar unique), token_hash (varchar unique), token_type (varchar),
expires_at (timestamptz), is_used (bool), used_at (timestamptz, nullable), metadata (jsonb), ip_address (inet, nullable),
user_agent (text, nullable), created_at (timestamptz)
```

auth.login_history
```text
id (serial), user_id (uuid nullable), action (varchar), status (varchar), auth_method (varchar nullable),
failure_reason (varchar nullable), ip_address (inet), user_agent (text nullable), device_type (varchar nullable),
location_country (varchar nullable), location_city (varchar nullable), attempted_email (varchar nullable),
metadata (jsonb), created_at (timestamptz)
```

auth.roles
```text
id (int), name (varchar unique), description (text nullable), permissions (jsonb), is_system_role (bool), created_at, updated_at
```

auth.user_roles
```text
id (int), user_id (uuid), role_id (int), assigned_at (timestamptz), assigned_by (uuid nullable), expires_at (timestamptz nullable)
```
