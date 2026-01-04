# ⏰ Configurar Cron Jobs no Supabase Pro - Guia Completo

## 🎯 PARA PLANO PRO DO SUPABASE

Se tens o **plano Pro**, tens acesso total a Cron Jobs via extensão `pg_cron`!

A UI pode não mostrar a opção "Cron Jobs" visualmente, mas podes **criar via SQL** de forma muito simples.

---

## 📋 O QUE VAIS FAZER

1. ✅ Habilitar extensão `pg_cron`
2. ✅ Criar 3 Cron Jobs via SQL
3. ✅ Verificar que estão ativos
4. ✅ Monitorar execuções

**Tempo total:** 10 minutos

---

## 🔧 PASSO A PASSO

### **PASSO 1: Aceder ao SQL Editor**

```
Supabase Dashboard
└── SQL Editor (menu lateral)
    └── "New query" ou "+"
```

---

### **PASSO 2: Obter Informações do Projeto**

Precisas de **2 informações** antes de executar o script:

#### **A) Project Reference (PROJECT_REF)**

```
Settings (⚙️) → API → Project URL
Exemplo: https://abcdefghijk.supabase.co
PROJECT_REF = abcdefghijk
```

#### **B) Anon Key (ANON_KEY)**

```
Settings (⚙️) → API → Project API keys → anon public
Copiar a key completa que começa com: eyJhbGci...
```

**⚠️ IMPORTANTE:** Guardar estas 2 informações para usar no script!

---

### **PASSO 3: Executar Script de Configuração**

1. Abrir o arquivo: **`SUPABASE_PRO_CRON_SETUP.sql`**
2. Copiar TODO o conteúdo
3. Colar no SQL Editor do Supabase
4. **SUBSTITUIR** em TODO o script:
   - `PROJECT_REF` → tua project reference
   - `ANON_KEY` → tua anon key completa
5. Executar passo a passo (explicação abaixo)

---

### **PASSO 4: Execução Passo a Passo**

Recomendo executar **um bloco de cada vez** para ver o resultado:

#### **Bloco 1: Habilitar pg_cron**

```sql
-- Verificar se pg_cron já está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Se retornar vazio, habilitar:
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Resultado esperado:** Deve aparecer uma linha com `extname = pg_cron`

---

#### **Bloco 2: Criar Cron Job #1 (Daily Emails)**

```sql
SELECT cron.schedule(
  'daily-email-notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/daily-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**⚠️ Substituir:**
- `SEU_PROJECT_REF` → tua project reference
- `SUA_ANON_KEY` → tua anon key completa

**Resultado esperado:** Retorna o `jobid` (ex: 1)

---

#### **Bloco 3: Criar Cron Job #2 (Daily WhatsApp)**

```sql
SELECT cron.schedule(
  'daily-whatsapp-tasks',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/daily-tasks-whatsapp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Resultado esperado:** Retorna o `jobid` (ex: 2)

---

#### **Bloco 4: Criar Cron Job #3 (Calendar Sync)**

```sql
SELECT cron.schedule(
  'calendar-auto-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/sync-google-calendar',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Resultado esperado:** Retorna o `jobid` (ex: 3)

---

#### **Bloco 5: Verificar Cron Jobs Criados**

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY jobid;
```

**Resultado esperado:**

```
┌────────┬───────────────────────────┬──────────────┬────────┐
│ jobid  │ jobname                   │ schedule     │ active │
├────────┼───────────────────────────┼──────────────┼────────┤
│ 1      │ daily-email-notifications │ 0 8 * * *    │ true   │
│ 2      │ daily-whatsapp-tasks      │ 0 8 * * *    │ true   │
│ 3      │ calendar-auto-sync        │ */15 * * * * │ true   │
└────────┴───────────────────────────┴──────────────┴────────┘
```

✅ **Todos devem ter `active = true`**

---

### **PASSO 5: Testar Manualmente (Antes de Agendar)**

Antes de esperar pelo Cron, podes testar manualmente:

```sql
-- Testar daily-emails manualmente
SELECT net.http_post(
  url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/daily-emails',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
  body := '{}'::jsonb
) as request_id;
```

**Resultado esperado:** Retorna um `request_id` (UUID)

Depois, verificar logs da Edge Function:
```
Edge Functions → daily-emails → Logs
```

---

## 📊 MONITORAR EXECUÇÕES

### **Ver Histórico de Execuções**

```sql
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
ORDER BY jrd.start_time DESC
LIMIT 20;
```

**Colunas importantes:**
- `status` → 'succeeded' ou 'failed'
- `return_message` → Mensagem de erro (se houver)
- `start_time` → Quando executou
- `end_time` → Quando terminou

---

### **Ver Logs em Tempo Real**

```
Edge Functions (menu lateral)
└── Selecionar função (ex: daily-emails)
    └── Tab "Logs"
        → Ver execuções em tempo real
```

---

## 🎯 EXPRESSÕES CRON EXPLICADAS

### **`0 8 * * *` (Daily Emails e WhatsApp)**

```
0    8    *    *    *
│    │    │    │    │
│    │    │    │    └─── Dia da semana (qualquer)
│    │    │    └───── Mês (qualquer)
│    │    └─────── Dia do mês (qualquer)
│    └───────── Hora (08:00)
└─────────── Minuto (00)
```

**Significado:** Todos os dias às 08:00 UTC

---

### **`*/15 * * * *` (Calendar Sync)**

```
*/15  *    *    *    *
│     │    │    │    │
│     │    │    │    └─── Dia da semana (qualquer)
│     │    │    └───── Mês (qualquer)
│     │    └─────── Dia do mês (qualquer)
│     └───────── Hora (qualquer)
└─────────── Minuto (a cada 15)
```

**Significado:** A cada 15 minutos (:00, :15, :30, :45)

---

### **Outras Expressões Úteis**

| Expressão | Descrição |
|---|---|
| `0 9 * * 1-5` | Segunda a Sexta às 09:00 |
| `30 14 * * *` | Todos os dias às 14:30 |
| `0 */6 * * *` | A cada 6 horas |
| `0 0 * * 0` | Todo Domingo à meia-noite |

**Validar expressões:** https://crontab.guru/

---

## ⚠️ TROUBLESHOOTING

### **Problema 1: "extension pg_cron does not exist"**

**Causa:** Extensão não habilitada

**Solução:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### **Problema 2: "function net.http_post does not exist"**

**Causa:** Extensão `pg_net` não habilitada

**Solução:**
```
Database → Extensions → Procurar "pg_net" → Enable
```

Ou via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

### **Problema 3: Cron criado mas não executa**

**Verificar:**

1. **Job está ativo?**
```sql
SELECT jobid, jobname, active FROM cron.job;
```

Se `active = false`:
```sql
SELECT cron.alter_job(job_id := SEU_JOB_ID, schedule := '0 8 * * *');
```

2. **Edge Function está deployed?**
```
Edge Functions → Verificar badge "Deployed"
```

3. **URL e Authorization corretos?**
```sql
-- Ver comando do job
SELECT command FROM cron.job WHERE jobname = 'daily-email-notifications';
```

---

### **Problema 4: Job executa mas sem resultados**

**Verificar logs da Edge Function:**
```
Edge Functions → daily-emails → Logs
```

**Causas comuns:**
- Gmail não configurado: `/admin/integrations`
- User sem notificações ativas: `/settings`
- User sem Gmail conectado: `/settings → Integrações`

---

## 🔧 COMANDOS DE GESTÃO

### **Desativar um Cron Job**

```sql
SELECT cron.unschedule('daily-email-notifications');
```

---

### **Reativar um Cron Job**

```sql
-- Recriar com cron.schedule (mesmo comando do PASSO 3)
```

---

### **Alterar horário de um Job**

```sql
SELECT cron.alter_job(
  job_id := 1,              -- ID do job (ver em cron.job)
  schedule := '0 9 * * *'   -- Novo horário: 09:00 em vez de 08:00
);
```

---

### **Deletar um Cron Job**

```sql
SELECT cron.unschedule('daily-whatsapp-tasks');
```

---

### **Listar todos os Jobs**

```sql
SELECT * FROM cron.job;
```

---

## ✅ CHECKLIST FINAL

Após seguir este guia:

### **Configuração:**
- [ ] Extensão `pg_cron` habilitada ✅
- [ ] Extensão `pg_net` habilitada ✅
- [ ] 3 Cron Jobs criados ✅
- [ ] Todos com `active = true` ✅

### **Testes:**
- [ ] Teste manual executado com sucesso ✅
- [ ] Edge Functions deployed ✅
- [ ] Logs verificados sem erros ✅

### **Integrations:**
- [ ] Gmail OAuth2 configurado ✅
- [ ] WhatsApp Business configurado ✅
- [ ] Google Calendar OAuth2 configurado ✅

### **Utilizadores:**
- [ ] Pelo menos 1 user com Gmail conectado ✅
- [ ] Pelo menos 1 user com notificações ativas ✅
- [ ] Pelo menos 1 user com telefone ✅

---

## 🎉 RESULTADO FINAL

Depois de completar este guia, terás:

✅ **3 Cron Jobs ativos no Supabase Pro:**
- `daily-email-notifications` → Diário 08:00
- `daily-whatsapp-tasks` → Diário 08:00
- `calendar-auto-sync` → A cada 15 min

✅ **Sistema totalmente automatizado:**
- Notificações diárias sem intervenção
- Sincronização contínua do calendário
- Logs detalhados para monitoramento

✅ **Monitoramento completo:**
- Histórico via `cron.job_run_details`
- Logs em tempo real nas Edge Functions
- Status visível em `cron.job`

---

## 📊 COMPARAÇÃO: PRO vs FREE

| Recurso | Free Tier | Pro Tier |
|---|---|---|
| **pg_cron** | ❌ Não | ✅ Sim (via SQL) |
| **UI Cron Jobs** | ❌ Não | ⚠️ Depende da versão |
| **SQL Cron Jobs** | ❌ Não | ✅ Sim |
| **Limite de Jobs** | N/A | ✅ Ilimitado |
| **Execuções/mês** | N/A | ✅ Ilimitado |

**Conclusão:** Com o plano Pro, tens **acesso total** via SQL!

---

## 📚 RECURSOS ADICIONAIS

### **Documentação Oficial:**
- 📖 Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
- 📖 PostgreSQL pg_cron: https://github.com/citusdata/pg_cron
- 📖 Cron Expression Syntax: https://en.wikipedia.org/wiki/Cron

### **Ferramentas Úteis:**
- 🔧 Validar Expressões Cron: https://crontab.guru/
- 🔧 Converter Timezones: https://www.timeanddate.com/worldclock/converter.html

### **Guias Relacionados:**
- 📄 `DEPLOY_EDGE_FUNCTIONS_NOW.md` - Deploy das Edge Functions
- 📄 `SUPABASE_PRO_CRON_SETUP.sql` - Script SQL completo

---

## 💡 PRÓXIMOS PASSOS

1. ✅ Executar script SQL (`SUPABASE_PRO_CRON_SETUP.sql`)
2. ✅ Verificar Cron Jobs criados
3. ✅ Testar manualmente
4. ✅ Aguardar primeira execução automática
5. ✅ Monitorar logs
6. ✅ Confirmar que utilizadores recebem notificações

---

**Tempo total:** ~15 minutos
**Dificuldade:** Médio (requer SQL básico)
**Resultado:** Sistema 100% automatizado! 🚀

---

Alguma dúvida? Consulta a seção Troubleshooting ou os logs! 📞