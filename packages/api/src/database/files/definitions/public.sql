DROP TABLE IF EXISTS public.versions;

CREATE TABLE public.versions (
    version INT NOT NULL,
    updated_on TIMESTAMPTZ NOT NULL,
    CONSTRAINT "PK_versions_version" PRIMARY KEY (version)
);

INSERT INTO public.versions (version, updated_on) VALUES (0, CURRENT_TIMESTAMP);
