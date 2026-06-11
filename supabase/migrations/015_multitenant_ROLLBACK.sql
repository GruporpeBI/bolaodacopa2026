-- ROLLBACK da migration 015 (multi-tenant) — usar SÓ se precisar reverter.
-- Reverte o schema ao estado pré-multitenant. Os dados permanecem (só perde tenant_id).
-- =====================================================================

-- 1. Restaura uniques antigas
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tenant_cpf_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_cpf_key;
ALTER TABLE public.users ADD  CONSTRAINT users_cpf_key UNIQUE (cpf);

ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_pkey;
ALTER TABLE public.app_config ADD  CONSTRAINT app_config_pkey PRIMARY KEY (key);

-- 2. Remove índices por tenant
DROP INDEX IF EXISTS public.users_tenant_idx;
DROP INDEX IF EXISTS public.predictions_tenant_idx;
DROP INDEX IF EXISTS public.attendances_tenant_idx;
DROP INDEX IF EXISTS public.tournament_predictions_tenant_idx;
DROP INDEX IF EXISTS public.scores_tenant_idx;

-- 3. Remove a coluna tenant_id
ALTER TABLE public.users                  DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.predictions            DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.attendances            DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.tournament_predictions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.scores                 DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.app_config             DROP COLUMN IF EXISTS tenant_id;

-- 4. Remove a tabela tenants
DROP TABLE IF EXISTS public.tenants;

-- Obs.: também é preciso reverter o auth dos novos tenants (se houver) — mas, se reverter
-- ANTES de criar forks, não há nada a desfazer no auth (amauri usa e-mail sem sufixo).
