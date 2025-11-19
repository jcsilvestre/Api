-- ============================================================
-- SCRIPT DE CRIAÇÃO: ARQUITETURA MULTI-SCHEMA (CORRIGIDO)
-- Database: jcscode
-- ============================================================

-- 1. CRIAR O SCHEMA COMPARTILHADO PARA EXTENSÕES
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION jcscode;

-- Garantir que o usuário tenha acesso
GRANT ALL ON SCHEMA extensions TO jcscode;

-- 2. INSTALAR EXTENSÕES DENTRO DO SCHEMA 'EXTENSIONS'
-- ------------------------------------------------------------
-- Repare que mudamos SCHEMA de 'public' para 'extensions'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "citext" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- Extensões opcionais
CREATE EXTENSION IF NOT EXISTS "btree_gin" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "btree_gist" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" SCHEMA extensions;

-- 3. CONFIGURAR O SEARCH_PATH GLOBAL
-- ------------------------------------------------------------
-- Isso é OBRIGATÓRIO. Diz ao banco: "Quando procurar uma função, 
-- olhe no schema atual, e se não achar, olhe em 'extensions'".
-- Removemos o 'public' daqui.
ALTER DATABASE jcscode SET search_path TO "$user", extensions;

-- ============================================================
-- 4. CRIAÇÃO DO SCHEMA AUTH
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION jcscode;

-- Permissões do Auth
GRANT ALL PRIVILEGES ON SCHEMA auth TO jcscode;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO jcscode;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO jcscode;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO jcscode;

-- Definir privilégios padrão para futuros objetos
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO jcscode;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO jcscode;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO jcscode;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TYPES TO jcscode;

-- ============================================================
-- 5. TABELAS (Agora referenciando corretamente)
-- ============================================================

-- Como configuramos o search_path acima, não precisamos escrever 
-- extensions.uuid_generate_v4(), o banco já vai achar.

-- ────────────────────────────────────────────────────────────
-- 5.1. TABELA: auth.users
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- O banco busca isso em 'extensions'
    email CITEXT NOT NULL UNIQUE, -- O tipo CITEXT está em 'extensions'
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    date_of_birth DATE,
    password_hash VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_verification',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_password_change TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT[],
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    metadata JSONB DEFAULT '{}'::jsonb,
    last_login_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL),
    CONSTRAINT chk_status CHECK (status IN ('pending_verification','active','suspended','blocked','deleted'))
);

-- Índices
CREATE INDEX idx_users_email ON auth.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON auth.users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON auth.users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON auth.users(created_at);
CREATE INDEX idx_users_metadata ON auth.users USING GIN(metadata);

COMMENT ON TABLE auth.users IS 'Tabela principal de usuários do sistema';

-- ────────────────────────────────────────────────────────────
-- 5.2. TABELA: auth.roles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_roles_name ON auth.roles(name);

-- ────────────────────────────────────────────────────────────
-- 5.3. TABELA: auth.user_roles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    UNIQUE (user_id, role_id)
);
CREATE INDEX idx_user_roles_user_id ON auth.user_roles(user_id);

-- ────────────────────────────────────────────────────────────
-- 5.4. TABELA: auth.oauth_providers
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    provider_email VARCHAR(255),
    provider_name VARCHAR(255),
    provider_avatar TEXT,
    raw_profile_data JSONB,
    scopes TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(provider, provider_user_id),
    CONSTRAINT chk_provider CHECK (provider IN ('google','facebook','github','linkedin','microsoft','apple'))
);
CREATE INDEX idx_oauth_user_id ON auth.oauth_providers(user_id);

-- ────────────────────────────────────────────────────────────
-- 5.5. TABELA: auth.verification_tokens
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_token_type CHECK (token_type IN ('email_verification','phone_verification','password_reset','magic_link','oauth_token','refresh_token'))
);
CREATE INDEX idx_verification_tokens_token_hash ON auth.verification_tokens(token_hash);

-- ────────────────────────────────────────────────────────────
-- 5.6. TABELA: auth.sessions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_id VARCHAR(255),
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT chk_device_type CHECK (device_type IN ('web','mobile_ios','mobile_android','desktop','tablet'))
);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);

-- ────────────────────────────────────────────────────────────
-- 5.7. TABELA: auth.login_history
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    auth_method VARCHAR(50),
    failure_reason VARCHAR(100),
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_type VARCHAR(50),
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    attempted_email VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_action CHECK (action IN ('login_success','login_failed','logout','token_refresh','password_reset')),
    CONSTRAINT chk_status CHECK (status IN ('success','failed','blocked'))
);
CREATE INDEX idx_login_history_user_id ON auth.login_history(user_id);

-- ────────────────────────────────────────────────────────────
-- 5.8. TABELA: auth.user_security_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.user_security_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'password_changed','email_changed','phone_changed',
        'mfa_enabled','mfa_disabled','mfa_verified',
        'account_locked','account_unlocked','account_suspended',
        'suspicious_login','new_device_login','oauth_linked','oauth_unlinked',
        'role_assigned','role_removed','permissions_changed'
    ))
);

-- ────────────────────────────────────────────────────────────
-- 5.9. Demais tabelas de logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth.consent_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    version VARCHAR(20),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS auth.maintenance_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by VARCHAR(100),
    result JSONB,
    duration_ms INTEGER
);

-- ============================================================
-- 6. FUNCTIONS (Atualizadas para usar extensões corretamente)
-- ============================================================

-- Função para gerar token seguro (usa pgcrypto do schema extensions)
CREATE OR REPLACE FUNCTION auth.generate_secure_token(p_length INTEGER DEFAULT 32)
RETURNS VARCHAR AS $$
BEGIN
    -- Nota: gen_random_bytes vem de pgcrypto (schema extensions)
    RETURN encode(gen_random_bytes(p_length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para criar token de verificação
CREATE OR REPLACE FUNCTION auth.create_verification_token(
    p_user_id UUID,
    p_token_type VARCHAR,
    p_expires_in INTERVAL DEFAULT '24 hours',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(token VARCHAR, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_token VARCHAR;
    v_token_hash VARCHAR;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_token := auth.generate_secure_token(32);
    -- digest vem de pgcrypto
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_expires_at := NOW() + p_expires_in;

    UPDATE auth.verification_tokens
    SET is_used = TRUE, used_at = NOW()
    WHERE user_id = p_user_id AND token_type = p_token_type AND is_used = FALSE;

    INSERT INTO auth.verification_tokens (
        user_id, token, token_hash, token_type, expires_at, ip_address, user_agent
    ) VALUES (
        p_user_id, v_token, v_token_hash, p_token_type, v_expires_at, p_ip_address, p_user_agent
    );

    RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Função para validar token
CREATE OR REPLACE FUNCTION auth.validate_token(
    p_token VARCHAR,
    p_token_type VARCHAR
)
RETURNS TABLE(is_valid BOOLEAN, user_id UUID, metadata JSONB) AS $$
DECLARE
    v_token_hash VARCHAR;
    v_record RECORD;
BEGIN
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    SELECT * INTO v_record
    FROM auth.verification_tokens
    WHERE token_hash = v_token_hash
      AND token_type = p_token_type
      AND is_used = FALSE
      AND expires_at > NOW();

    IF v_record IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::JSONB;
        RETURN;
    END IF;

    UPDATE auth.verification_tokens
    SET is_used = TRUE, used_at = NOW()
    WHERE id = v_record.id;

    RETURN QUERY SELECT TRUE, v_record.user_id, v_record.metadata;
END;
$$ LANGUAGE plpgsql;

-- Função para criar sessão
CREATE OR REPLACE FUNCTION auth.create_session(
    p_user_id UUID,
    p_refresh_token VARCHAR,
    p_device_id VARCHAR,
    p_device_type VARCHAR,
    p_device_name VARCHAR,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO auth.sessions (
        user_id, refresh_token, refresh_token_hash,
        device_id, device_type, device_name,
        ip_address, user_agent, expires_at
    )
    VALUES (
        p_user_id,
        p_refresh_token,
        encode(digest(p_refresh_token, 'sha256'), 'hex'),
        p_device_id, p_device_type, p_device_name,
        p_ip_address, p_user_agent,
        NOW() + INTERVAL '7 days'
    )
    RETURNING id INTO v_session_id;

    INSERT INTO auth.login_history(user_id, action, status, auth_method, ip_address, user_agent, device_type)
    VALUES (p_user_id, 'login_success', 'success', 'password', p_ip_address, p_user_agent, p_device_type);

    UPDATE auth.users SET last_login_at = NOW() WHERE id = p_user_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Função para update de datas
CREATE OR REPLACE FUNCTION auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.update_updated_at_column();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON auth.roles FOR EACH ROW EXECUTE FUNCTION auth.update_updated_at_column();
CREATE TRIGGER trg_oauth_providers_updated_at BEFORE UPDATE ON auth.oauth_providers FOR EACH ROW EXECUTE FUNCTION auth.update_updated_at_column();

-- Função de auditoria
CREATE OR REPLACE FUNCTION auth.audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        INSERT INTO auth.user_security_logs(user_id, event_type, description)
        VALUES (NEW.id, 'password_changed', 'Senha alterada');
    END IF;
    
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        INSERT INTO auth.user_security_logs(user_id, event_type, description, changes)
        VALUES (NEW.id, 'email_changed', 'Email alterado', 
                jsonb_build_object('old_email', OLD.email, 'new_email', NEW.email));
    END IF;

    -- (Pode adicionar o resto da lógica de auditoria aqui, igual ao original)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.audit_user_changes();

-- ============================================================
-- 7. DADOS INICIAIS (SEED)
-- ============================================================

INSERT INTO auth.roles (name, description, is_system_role, permissions) VALUES
('admin', 'Administrador do sistema com acesso total', TRUE, '["users:read","users:write","users:delete","roles:manage","system:admin"]'::jsonb),
('user', 'Usuário padrão do sistema', TRUE, '["profile:read","profile:write"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 8. VERIFICAÇÃO (Para garantir que tudo funcionou)
-- ============================================================
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count FROM pg_extension WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'extensions');
    RAISE NOTICE 'Extensões instaladas no schema extensions: %', v_count;
END $$;