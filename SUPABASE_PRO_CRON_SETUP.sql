-- ⏰ CONFIGURAÇÃO DE CRON JOBS NO SUPABASE PRO
-- Execute este script no SQL Editor do Supabase Dashboard

-- ============================================
-- PASSO 1: HABILITAR EXTENSÃO PG_CRON
-- ============================================

-- Verificar se pg_cron já está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Se retornar vazio, habilitar:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verificar novamente (deve aparecer agora)
SELECT * FROM pg_extension WHERE extname = 'pg_cron';


-- ============================================
-- PASSO 1.5: HABILITAR EXTENSÃO PG_NET (IMPORTANTE!)
-- ============================================

-- Esta extensão é necessária para fazer chamadas HTTP às Edge Functions
-- Verificar se pg_net já está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Se retornar vazio, habilitar:
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar novamente (deve aparecer agora)
SELECT * FROM pg_extension WHERE extname = 'pg_net';


-- ============================================
-- PASSO 2: OBTER INFORMAÇÕES DO PROJETO
-- ============================================

-- Antes de criar os Cron Jobs, precisas de:
-- 1. PROJECT_REF (da URL do projeto)
-- 2. ANON_KEY (de Settings → API)

-- Substituir nos comandos abaixo:
-- PROJECT_REF = sua project reference
-- ANON_KEY = sua anon key completa


-- ============================================
-- PASSO 3: CRIAR CRON JOB #1 - DAILY EMAILS
-- ============================================

SELECT cron.schedule(
  'daily-email-notifications',  -- Nome do job
  '0 8 * * *',                   -- Diário às 08:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/daily-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);


-- ============================================
-- PASSO 4: CRIAR CRON JOB #2 - DAILY WHATSAPP
-- ============================================

SELECT cron.schedule(
  'daily-whatsapp-tasks',        -- Nome do job
  '0 8 * * *',                   -- Diário às 08:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/daily-tasks-whatsapp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);


-- ============================================
-- PASSO 5: CRIAR CRON JOB #3 - CALENDAR SYNC
-- ============================================

SELECT cron.schedule(
  'calendar-auto-sync',          -- Nome do job
  '*/15 * * * *',                -- A cada 15 minutos
  $$
  SELECT net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-google-calendar',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);


-- ============================================
-- PASSO 6: VERIFICAR CRON JOBS CRIADOS
-- ============================================

-- Listar todos os Cron Jobs ativos
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobid;


-- ============================================
-- PASSO 7 (OPCIONAL): VISUALIZAR HISTÓRICO
-- ============================================

-- Ver últimas 10 execuções de cada job
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;


-- ============================================
-- COMANDOS ÚTEIS PARA GESTÃO
-- ============================================

-- DESATIVAR um Cron Job (se necessário)
-- SELECT cron.unschedule('daily-email-notifications');

-- ATUALIZAR schedule de um job existente
-- SELECT cron.alter_job(
--   job_id := 1,  -- ID do job (ver em cron.job)
--   schedule := '0 9 * * *'  -- Novo horário
-- );

-- DELETAR um Cron Job
-- SELECT cron.unschedule('nome-do-job');

-- DELETAR TODOS os Cron Jobs (CUIDADO!)
-- SELECT cron.unschedule(jobname) FROM cron.job;