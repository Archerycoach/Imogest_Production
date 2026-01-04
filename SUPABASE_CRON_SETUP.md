# ⏰ Guia: Agendar Edge Functions no Supabase (Cron Jobs)

## 🎯 OBJETIVO

Configurar execução automática das 3 Edge Functions:
- ✅ `daily-emails` → Diário às 08:00 UTC
- ✅ `daily-tasks-whatsapp` → Diário às 08:00 UTC  
- ✅ `sync-google-calendar` → A cada 15 minutos

---

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se que:
- ✅ As 3 Edge Functions já estão **deployed** no Supabase
- ✅ Status "Deployed" visível no Dashboard
- ✅ Teste manual funcionou (Invoke retornou 200)

**Se ainda não fez deploy, siga primeiro:** `DEPLOY_EDGE_FUNCTIONS_NOW.md`

---

## 🚀 MÉTODO 1: AGENDAR VIA DASHBOARD (RECOMENDADO)

### **PASSO 1: Acessar Cron Jobs no Dashboard**

1. Abra: https://supabase.com/dashboard
2. Selecione projeto: **Imogest**
3. Menu lateral esquerdo → **Database** (ícone de cilindro)
4. No submenu → **Cron Jobs**

**Ou use o caminho direto:**
```
Dashboard → Database → Cron Jobs
```

---

### **PASSO 2: Configurar Cron Job #1 - daily-emails**

#### **2.1 Criar Novo Cron Job**
- Clicar botão: **"Create a new cron job"** (canto superior direito)

#### **2.2 Preencher Formulário**

**Nome:**
```
daily-email-notifications
```

**Schedule (Expressão Cron):**
```
0 8 * * *
```
> 📝 Significa: Todos os dias às 08:00 UTC

**Command (SQL a executar):**
```sql
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**⚠️ IMPORTANTE - Substituir:**
- `YOUR_PROJECT_REF` → Seu Project Reference (ex: `abcdefghijk`)
- `YOUR_ANON_KEY` → Sua Anon Key (pegar em Settings → API)

**Como encontrar essas informações:**
1. Settings (⚙️) → API
2. **Project URL:** `https://abcdefghijk.supabase.co`
   - Copie só a parte: `abcdefghijk`
3. **Anon (public) key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copie a key completa

#### **2.3 Exemplo Completo:**
```sql
SELECT
  net.http_post(
    url:='https://abcdefghijk.supabase.co/functions/v1/daily-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQ4NTE2MDAsImV4cCI6MjAwMDQyNzYwMH0.xxxxxxxxxxxxx"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

#### **2.4 Salvar**
- Clicar: **"Create cron job"**
- ✅ Status deve aparecer como **"Active"**

---

### **PASSO 3: Configurar Cron Job #2 - daily-tasks-whatsapp**

#### **3.1 Criar Novo Cron Job**
- Clicar novamente: **"Create a new cron job"**

#### **3.2 Preencher Formulário**

**Nome:**
```
daily-whatsapp-tasks
```

**Schedule:**
```
0 8 * * *
```
> 📝 Mesmo horário: 08:00 UTC

**Command:**
```sql
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-tasks-whatsapp',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**Substituir YOUR_PROJECT_REF e YOUR_ANON_KEY** (mesmos valores do PASSO 2)

#### **3.3 Salvar**
- **"Create cron job"**
- ✅ Verificar status **"Active"**

---

### **PASSO 4: Configurar Cron Job #3 - sync-google-calendar**

#### **4.1 Criar Novo Cron Job**
- **"Create a new cron job"**

#### **4.2 Preencher Formulário**

**Nome:**
```
calendar-auto-sync
```

**Schedule:**
```
*/15 * * * *
```
> 📝 Significa: A cada 15 minutos

**Command:**
```sql
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-google-calendar',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**Substituir YOUR_PROJECT_REF e YOUR_ANON_KEY**

#### **4.3 Salvar**
- **"Create cron job"**
- ✅ Status **"Active"**

---

## ✅ VERIFICAÇÃO RÁPIDA

Após criar os 3 Cron Jobs, você deve ver:

```
Database → Cron Jobs (3 itens)

┌──────────────────────────┬──────────────┬──────────┐
│ Name                     │ Schedule     │ Status   │
├──────────────────────────┼──────────────┼──────────┤
│ daily-email-notifications│ 0 8 * * *    │ Active ✓ │
│ daily-whatsapp-tasks     │ 0 8 * * *    │ Active ✓ │
│ calendar-auto-sync       │ */15 * * * * │ Active ✓ │
└──────────────────────────┴──────────────┴──────────┘
```

---

## 🧪 TESTAR EXECUÇÃO MANUAL (Antes de Esperar o Cron)

### **Opção 1: Via SQL Editor**

1. Database → SQL Editor
2. Nova query
3. Colar e executar:

```sql
-- Testar daily-emails
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

4. Verificar resposta (deve retornar um `request_id`)

### **Opção 2: Via Edge Function Dashboard**

1. Edge Functions → `daily-emails`
2. Tab "Invoke"
3. Method: POST
4. Body: `{}`
5. Clicar "Send request"
6. Verificar response 200

---

## 📊 MONITORAR EXECUÇÕES

### **Ver Logs das Edge Functions**

1. **Edge Functions** → Selecionar função (ex: `daily-emails`)
2. Tab **"Logs"**
3. Ver execuções em tempo real

**Logs esperados após execução do Cron:**
```
2026-01-04 08:00:01 | 🔔 [daily-emails] Starting daily email notifications...
2026-01-04 08:00:02 | ✅ [daily-emails] Gmail integration is active
2026-01-04 08:00:02 | 📊 [daily-emails] Found 5 users with notifications enabled
2026-01-04 08:00:03 | ✅ [daily-emails] Email sent to user@example.com
2026-01-04 08:00:04 | ✅ [daily-emails] Daily email notifications completed
```

### **Ver Histórico de Execuções do Cron**

1. Database → Cron Jobs
2. Clicar no nome do Cron (ex: `daily-email-notifications`)
3. Ver histórico de runs
4. Verificar sucessos/falhas

---

## 🕐 REFERÊNCIA DE EXPRESSÕES CRON

### **Formato:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-7, 0=Domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

### **Exemplos Práticos:**

| Expressão | Descrição | Quando Executa |
|---|---|---|
| `0 8 * * *` | Diário às 08:00 | Todos os dias às 08:00 UTC |
| `*/15 * * * *` | A cada 15 minutos | :00, :15, :30, :45 de cada hora |
| `0 */6 * * *` | A cada 6 horas | 00:00, 06:00, 12:00, 18:00 |
| `30 9 * * 1-5` | Seg-Sex às 09:30 | Segunda a Sexta às 09:30 UTC |
| `0 0 * * 0` | Semanal domingo | Todo domingo à meia-noite |
| `0 12 1 * *` | Mensal dia 1 | Dia 1 de cada mês às 12:00 |

### **Validar Expressão:**
Use: https://crontab.guru/

Exemplo:
- Expressão: `0 8 * * *`
- Resultado: "At 08:00 every day"

---

## ⚙️ AJUSTAR TIMEZONE (UTC vs Local)

### **⚠️ IMPORTANTE: Supabase Cron usa UTC!**

**Portugal:**
- Inverno (out-mar): UTC+0 (igual a UTC)
- Verão (abr-set): UTC+1 (1 hora à frente)

### **Exemplos de Conversão:**

**Quero notificações às 08:00 em Lisboa (inverno):**
```
Horário Local: 08:00 (UTC+0)
Horário UTC: 08:00
Expressão Cron: 0 8 * * *
```

**Quero notificações às 08:00 em Lisboa (verão):**
```
Horário Local: 08:00 (UTC+1)
Horário UTC: 07:00
Expressão Cron: 0 7 * * *
```

**Quero notificações às 09:30 em Lisboa (inverno):**
```
Horário Local: 09:30 (UTC+0)
Horário UTC: 09:30
Expressão Cron: 30 9 * * *
```

### **Ferramenta para Conversão:**
https://www.timeanddate.com/worldclock/converter.html

---

## 🔧 TROUBLESHOOTING

### **Problema 1: Cron não executa**

**Sintomas:**
- Criado mas não aparece nos logs
- Não recebe notificações

**Causas Possíveis:**
1. Status não está "Active"
2. URL da Edge Function incorreta
3. Anon Key incorreta
4. Edge Function não deployada

**Solução:**
1. Database → Cron Jobs → Verificar status "Active" ✓
2. Verificar URL: `https://PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME`
3. Settings → API → Copiar Anon Key novamente
4. Edge Functions → Verificar badge "Deployed"

---

### **Problema 2: Erro "function not found"**

**Causa:**
Edge Function não foi deployada ou nome incorreto

**Solução:**
1. Edge Functions → Verificar se a função existe
2. Verificar nome exato (case-sensitive):
   - ✅ `daily-emails` (correto)
   - ❌ `daily_emails` (errado)
   - ❌ `Daily-Emails` (errado)

---

### **Problema 3: Erro "unauthorized"**

**Causa:**
Anon Key incorreta ou expirada

**Solução:**
1. Settings → API → Project API keys
2. Copiar **"anon public"** key completa
3. Atualizar Cron Job command com nova key

---

### **Problema 4: Executa mas sem resultados**

**Sintomas:**
- Cron executa (logs mostram)
- Mas nenhum email/WhatsApp enviado

**Causas Possíveis:**
1. Integrações não configuradas (Gmail, WhatsApp)
2. Users sem notificações ativas
3. Users sem Gmail conectado
4. Sem tarefas/eventos para o dia

**Solução:**
1. Admin: `/admin/integrations` → Verificar Gmail e WhatsApp ativos
2. User: `/settings` → Tab "Notificações" → Ativar
3. User: `/settings` → Tab "Integrações" → Conectar Gmail
4. Criar tarefa/evento de teste para hoje

**Verificar Logs:**
```
Edge Functions → daily-emails → Logs
Procurar por:
- "No users with notifications enabled"
- "Gmail account not connected"
- "No tasks for user"
```

---

## 📈 PERFORMANCE E LIMITES

### **Limites do Free Tier:**
- **Invocações:** 500,000/mês
- **Execução:** 200 horas/mês
- **Bandwidth:** 5GB/mês

### **Uso Estimado:**

**calendar-auto-sync (a cada 15 min):**
```
4 execuções/hora × 24 horas × 30 dias = 2,880 execuções/mês
Tempo médio: ~5s por execução
Total: 2,880 × 5s = 4 horas/mês
```

**daily-emails (1x por dia):**
```
1 execução/dia × 30 dias = 30 execuções/mês
Tempo médio: ~10s (depende de quantos users)
Total: 30 × 10s = 5 minutos/mês
```

**daily-tasks-whatsapp (1x por dia):**
```
1 execução/dia × 30 dias = 30 execuções/mês
Tempo médio: ~8s
Total: 30 × 8s = 4 minutos/mês
```

### **Total Estimado:**
- **Invocações:** ~3,000/mês (0.6% do limite)
- **Tempo de Execução:** ~4 horas/mês (2% do limite)
- ✅ **Muito abaixo dos limites do Free Tier!**

---

## 🎯 OTIMIZAÇÕES RECOMENDADAS

### **1. Ajustar Frequência do Sync**

Se tiver poucos users ou não precisar de sync tão frequente:

**Em vez de a cada 15 min:**
```
*/15 * * * *  → 2,880 execuções/mês
```

**Considerar a cada 30 min:**
```
*/30 * * * *  → 1,440 execuções/mês (50% menos)
```

**Ou a cada 1 hora:**
```
0 * * * *  → 720 execuções/mês (75% menos)
```

---

### **2. Agendar Notificações em Horários Úteis**

**Evitar fins de semana para notificações de trabalho:**
```
0 8 * * 1-5  → Segunda a Sexta às 08:00
```

**Múltiplos horários por dia:**
```
0 8,14,18 * * *  → Às 08:00, 14:00 e 18:00
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

Após seguir este guia:

### **Cron Jobs Criados:**
- [ ] `daily-email-notifications` criado ✅
- [ ] `daily-whatsapp-tasks` criado ✅
- [ ] `calendar-auto-sync` criado ✅

### **Status Verificado:**
- [ ] 3 Cron Jobs com status "Active" ✅
- [ ] URLs corretas nas commands ✅
- [ ] Anon Keys corretas ✅

### **Testes Executados:**
- [ ] Teste manual via SQL executado com sucesso ✅
- [ ] Logs mostram execuções sem erros ✅
- [ ] Primeira notificação recebida (email ou WhatsApp) ✅

### **Monitoramento Configurado:**
- [ ] Logs das Edge Functions acessíveis ✅
- [ ] Histórico de Cron runs visível ✅

---

## 🎉 RESULTADO FINAL

Após completar este guia, você terá:

✅ **Sistema Totalmente Automatizado:**
- Notificações diárias de tarefas via email (08:00)
- Notificações diárias de tarefas via WhatsApp (08:00)
- Sincronização automática do Google Calendar (a cada 15 min)

✅ **Monitoramento Ativo:**
- Logs em tempo real de todas as execuções
- Histórico de sucessos/falhas
- Alertas em caso de erros

✅ **Zero Intervenção Manual:**
- Tudo roda automaticamente
- Users recebem notificações no horário
- Calendário sempre sincronizado

---

## 📚 RECURSOS ADICIONAIS

### **Documentação Oficial:**
- 📖 Supabase Cron Jobs: https://supabase.com/docs/guides/database/cron-jobs
- 📖 PostgreSQL pg_cron: https://github.com/citusdata/pg_cron
- 📖 Cron Expression Syntax: https://en.wikipedia.org/wiki/Cron

### **Ferramentas Úteis:**
- 🔧 Cron Expression Editor: https://crontab.guru/
- 🔧 Timezone Converter: https://www.timeanddate.com/worldclock/converter.html
- 🔧 Cron Generator: https://crontab-generator.org/

### **Guias Relacionados:**
- 📄 `DEPLOY_EDGE_FUNCTIONS_NOW.md` - Deploy das Edge Functions
- 📄 `EDGE_FUNCTIONS_CODE_READY.md` - Código completo das funções
- 📄 `EDGE_FUNCTIONS_DEPLOY_GUIDE.md` - Guia detalhado de deploy

---

## 💡 PRÓXIMOS PASSOS

1. ✅ **Configurar Integrações** (se ainda não fez):
   - Admin: Gmail OAuth2
   - Admin: WhatsApp Business
   - Admin: Google Calendar OAuth2

2. ✅ **Conectar Contas de Utilizadores:**
   - Users: `/settings` → Conectar Gmail
   - Users: `/settings` → Conectar Calendar
   - Users: Preencher telefone (perfil)

3. ✅ **Ativar Notificações:**
   - Users: `/settings` → Tab "Notificações"
   - Ativar preferências desejadas

4. ✅ **Monitorar Primeira Execução:**
   - Aguardar próximo horário do Cron
   - Verificar logs
   - Confirmar recebimento de notificações

---

## 🎊 CONCLUÍDO!

Parabéns! Seu sistema de automações está agora **100% funcional** e **totalmente automatizado**! 🚀

**Benefícios Imediatos:**
- ✅ Time economiza tempo com notificações automáticas
- ✅ Nenhuma tarefa importante é esquecida
- ✅ Calendário sempre atualizado
- ✅ Comunicação proativa com clientes
- ✅ Zero custo (Free Tier do Supabase)

**Tempo de Setup Total:** ~10 minutos ⏱️
**ROI:** Infinito (grátis, mas economiza horas de trabalho) 💰

---

**Dúvidas? Consulte a seção Troubleshooting ou os logs das Edge Functions!** 📞