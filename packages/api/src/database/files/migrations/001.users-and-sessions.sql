BEGIN;

CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMPTZ NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_users_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_users_email" UNIQUE (email)
);

-- Long-lived login sessions (one per device), identified by the SHA-256 hash of the refresh cookie
CREATE TABLE public.sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_on TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_sessions_id" PRIMARY KEY (id),
    CONSTRAINT "UQ_sessions_token_hash" UNIQUE (token_hash),
    CONSTRAINT "FK_sessions_user_id" FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE INDEX "IDX_sessions_user_id" ON public.sessions (user_id);

COMMIT;
