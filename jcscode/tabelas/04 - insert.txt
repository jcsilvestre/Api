-- ============================================================
-- SCRIPT DE POPULAÇÃO (SEED) - CORRIGIDO
-- ============================================================

SET search_path TO auth, extensions;

-- 1. LIMPEZA TOTAL (Para garantir que não sobrem IDs perdidos)
-- O RESTART IDENTITY reinicia os contadores (IDs voltam a ser 1, 2, 3...)
TRUNCATE auth.users RESTART IDENTITY CASCADE;
TRUNCATE auth.roles RESTART IDENTITY CASCADE;

-- ============================================================
-- 2. INSERÇÃO DE ROLES
-- ============================================================
INSERT INTO auth.roles (name, description, is_system_role, permissions) VALUES
('admin', 'Acesso total ao sistema', TRUE, '["*"]'::jsonb),
('user', 'Usuário padrão', TRUE, '["read:own", "write:own"]'::jsonb),
('moderator', 'Pode gerenciar conteúdo', TRUE, '["read:all", "write:content", "ban:user"]'::jsonb),
('auditor', 'Apenas leitura de logs', FALSE, '["read:logs"]'::jsonb);

-- ============================================================
-- 3. INSERÇÃO DE USUÁRIOS (Personas)
-- ============================================================
INSERT INTO auth.users (email, username, full_name, password_hash, status, is_email_verified, phone, failed_login_attempts, locked_until, created_at) VALUES
-- ALICE
('alice@example.com', 'alice', 'Alice Admin', 
 encode(digest('Password123', 'sha256'), 'hex'), 
 'active', TRUE, '+5511999999999', 0, NULL, NOW() - INTERVAL '1 month'),

-- BOB (O nome dele aqui é bob_builder)
('bob@example.com', 'bob_builder', 'Bob Santos', 
 encode(digest('Password123', 'sha256'), 'hex'), 
 'pending_verification', FALSE, NULL, 0, NULL, NOW() - INTERVAL '1 hour'),

-- CAROL (O nome dela aqui é carol_mobile)
('carol@example.com', 'carol_mobile', 'Carol Lima', 
 encode(digest('Password123', 'sha256'), 'hex'), 
 'active', TRUE, '+5521988888888', 0, NULL, NOW() - INTERVAL '2 weeks'),

-- DAVE
('dave@badguy.com', 'dave_hacker', 'Dave Bloqueado', 
 encode(digest('Password123', 'sha256'), 'hex'), 
 'blocked', TRUE, NULL, 5, NOW() + INTERVAL '30 minutes', NOW() - INTERVAL '3 days');

-- ============================================================
-- 4. VINCULAR USUÁRIOS A ROLES (CORRIGIDO AQUI)
-- ============================================================
-- Agora estamos buscando pelos nomes corretos: bob_builder e carol_mobile

INSERT INTO auth.user_roles (user_id, role_id, assigned_at) VALUES
-- Alice (Admin e User)
((SELECT id FROM auth.users WHERE username='alice'), (SELECT id FROM auth.roles WHERE name='admin'), NOW()),
((SELECT id FROM auth.users WHERE username='alice'), (SELECT id FROM auth.roles WHERE name='user'), NOW()),

-- Bob (User) - Corrigido para buscar 'bob_builder'
((SELECT id FROM auth.users WHERE username='bob_builder'), (SELECT id FROM auth.roles WHERE name='user'), NOW()),

-- Carol (User e Moderator) - Corrigido para buscar 'carol_mobile'
((SELECT id FROM auth.users WHERE username='carol_mobile'), (SELECT id FROM auth.roles WHERE name='user'), NOW()),
((SELECT id FROM auth.users WHERE username='carol_mobile'), (SELECT id FROM auth.roles WHERE name='moderator'), NOW());

-- ============================================================
-- 5. OAUTH PROVIDERS
-- ============================================================
INSERT INTO auth.oauth_providers (user_id, provider, provider_user_id, provider_email, provider_name, access_token, scopes) VALUES
((SELECT id FROM auth.users WHERE username='alice'), 'google', '100200300', 'alice@gmail.com', 'Alice G.', 'ya29.token...', ARRAY['email', 'profile']);

-- ============================================================
-- 6. TOKENS DE VERIFICAÇÃO
-- ============================================================
INSERT INTO auth.verification_tokens (user_id, token, token_hash, token_type, expires_at, is_used) VALUES
-- Bob (bob_builder)
((SELECT id FROM auth.users WHERE username='bob_builder'), 
 'tok_email_bob_123', 
 encode(digest('tok_email_bob_123', 'sha256'), 'hex'), 
 'email_verification', 
 NOW() + INTERVAL '24 hours', 
 FALSE),

-- Carol (carol_mobile)
((SELECT id FROM auth.users WHERE username='carol_mobile'), 
 'tok_reset_carol_456', 
 encode(digest('tok_reset_carol_456', 'sha256'), 'hex'), 
 'password_reset', 
 NOW() + INTERVAL '1 hour', 
 FALSE),

-- Alice
((SELECT id FROM auth.users WHERE username='alice'), 
 'tok_old_alice_789', 
 encode(digest('tok_old_alice_789', 'sha256'), 'hex'), 
 'email_verification', 
 NOW() - INTERVAL '1 month', 
 TRUE);

-- ============================================================
-- 7. SESSÕES
-- ============================================================
INSERT INTO auth.sessions (user_id, refresh_token, refresh_token_hash, device_type, user_agent, ip_address, expires_at, is_active) VALUES
-- Alice
((SELECT id FROM auth.users WHERE username='alice'), 
 'ref_alice_web', 
 encode(digest('ref_alice_web', 'sha256'), 'hex'), 
 'web', 'Chrome on Windows', '192.168.1.10', NOW() + INTERVAL '5 days', TRUE),

-- Carol (carol_mobile)
((SELECT id FROM auth.users WHERE username='carol_mobile'), 
 'ref_carol_android', 
 encode(digest('ref_carol_android', 'sha256'), 'hex'), 
 'mobile_android', 'App v1.0 (Pixel 6)', '10.0.0.5', NOW() + INTERVAL '20 days', TRUE);

-- ============================================================
-- 8. HISTÓRICO E LOGS (Finais)
-- ============================================================
INSERT INTO auth.login_history (user_id, action, status, ip_address, device_type) VALUES
((SELECT id FROM auth.users WHERE username='alice'), 'login_success', 'success', '192.168.1.10', 'web');

INSERT INTO auth.login_history (user_id, action, status, failure_reason, ip_address) VALUES
((SELECT id FROM auth.users WHERE username='dave_hacker'), 'login_failed', 'failed', 'invalid_password', '200.200.200.1'),
((SELECT id FROM auth.users WHERE username='dave_hacker'), 'login_failed', 'blocked', 'max_attempts_exceeded', '200.200.200.1');

INSERT INTO auth.user_security_logs (user_id, event_type, description, ip_address) VALUES
((SELECT id FROM auth.users WHERE username='dave_hacker'), 'account_locked', 'Conta bloqueada automaticamente', '200.200.200.1');

INSERT INTO auth.consent_logs (user_id, consent_type, granted, version) VALUES
((SELECT id FROM auth.users WHERE username='alice'), 'terms_v1', TRUE, '1.0'),
((SELECT id FROM auth.users WHERE username='bob_builder'), 'terms_v1', TRUE, '1.0'),
((SELECT id FROM auth.users WHERE username='carol_mobile'), 'marketing_push', TRUE, '1.0');







--Essa query valida: Tabela users + Tabela roles + Tabela user_roles.

SET search_path TO auth, extensions;

-- SIMULAÇÃO: Front enviou email 'alice@example.com'
SELECT 
    u.id,
    u.username,
    u.email,
    u.status,
    -- Verifica a senha (simulado)
    (u.password_hash = encode(digest('Password123', 'sha256'), 'hex')) as password_valid,
    -- Traz todas as roles num array JSON para colocar no JWT
    json_agg(DISTINCT r.name) as roles,
    -- Traz todas as permissões somadas
    json_agg(DISTINCT r.permissions) as permissions
FROM auth.users u
JOIN auth.user_roles ur ON u.id = ur.user_id
JOIN auth.roles r ON ur.role_id = r.id
WHERE u.email = 'alice@example.com'  -- <--- INPUT DO FRONT
  AND u.deleted_at IS NULL
GROUP BY u.id;



--Essa query valida: Tabela users + Tabela oauth_providers.
SET search_path TO auth, extensions;

-- SIMULAÇÃO: Buscando perfil da Alice
SELECT 
    u.full_name,
    u.avatar_url,
    u.is_email_verified,
    -- Verifica se tem login social vinculado
    op.provider as social_login,
    op.provider_email as social_email,
    -- Formata data bonita para o front
    TO_CHAR(u.created_at, 'DD/MM/YYYY') as membro_desde
FROM auth.users u
LEFT JOIN auth.oauth_providers op ON u.id = op.user_id
WHERE u.username = 'alice'; -- <--- INPUT DO TOKEN


--Essa query valida: Tabela users + Tabela login_history.
SET search_path TO auth, extensions;

-- SIMULAÇÃO: Checando status do Dave
SELECT 
    u.username,
    u.status,
    u.failed_login_attempts,
    u.locked_until,
    -- Subquery para pegar a última tentativa de falha
    (SELECT created_at 
     FROM auth.login_history lh 
     WHERE lh.user_id = u.id AND lh.status = 'blocked' 
     ORDER BY created_at DESC LIMIT 1) as last_block_event
FROM auth.users u
WHERE u.email = 'dave@badguy.com';