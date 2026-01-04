# 🚀 Guia: Deploy de Edge Functions no Supabase

Este guia mostra como fazer deploy das 3 Edge Functions do Imogest para o Supabase.

---

## 📋 **EDGE FUNCTIONS DISPONÍVEIS**

### **1. daily-emails** 📧
- **Função:** Envia notificações diárias por email via Gmail
- **Frequência:** Diária (configurável via Cron)
- **Requisitos:** 
  - Integração Gmail configurada (Admin)
  - Utilizadores com Gmail conectado
  - Preferências de notificação ativas

### **2. daily-tasks-whatsapp** 📱
- **Função:** Envia tarefas diárias via WhatsApp
- **Frequência:** Diária (configurável via Cron)
- **Requisitos:**
  - Integração WhatsApp configurada (Admin)
  - Utilizadores com números de telefone

### **3. sync-google-calendar** 📅
- **Função:** Sincronização automática Google Calendar ↔ Imogest
- **Frequência:** A cada 15 minutos (configurável via Cron)
- **Requisitos:**
  - Integração Google Calendar configurada (Admin)
  - Utilizadores com Google Calendar conectado

---

## 🎯 **MÉTODO 1: Deploy via Supabase Dashboard (RECOMENDADO)**

### **Vantagens:**
- ✅ Não requer CLI local
- ✅ Interface visual intuitiva
- ✅ Fácil de configurar
- ✅ Logs em tempo real

### **Passo 1: Aceder ao Dashboard**

1. Abrir: https://supabase.com/dashboard
2. Login com sua conta
3. Selecionar projeto **Imogest**
4. Menu lateral → **Edge Functions**

---

### **Passo 2: Criar Edge Function - daily-emails**

**2.1. Criar Nova Function**
```
1. Clicar em "Create a new function"
2. Function name: daily-emails
3. Clicar "Create function"
```

**2.2. Colar o Código**
```
1. Editor aparece automaticamente
2. Apagar código de exemplo
3. Copiar conteúdo de: supabase/functions/daily-emails/index.ts
4. Colar no editor
5. Clicar "Deploy" (canto superior direito)
```

**2.3. Verificar Deploy**
```
✅ Status: "Deployed"
✅ Badge verde aparece
✅ Última versão mostra timestamp recente
```

---

### **Passo 3: Criar Edge Function - daily-tasks-whatsapp**

**3.1. Criar Nova Function**
```
1. Voltar para lista de Edge Functions
2. Clicar em "Create a new function"
3. Function name: daily-tasks-whatsapp
4. Clicar "Create function"
```

**3.2. Colar o Código**
```
1. Copiar conteúdo de: supabase/functions/daily-tasks-whatsapp/index.ts
2. Colar no editor
3. Clicar "Deploy"
```

**3.3. Verificar Deploy**
```
✅ Status: "Deployed"
✅ Verde ativo
```

---

### **Passo 4: Criar Edge Function - sync-google-calendar**

**4.1. Criar Nova Function**
```
1. Voltar para lista de Edge Functions
2. Clicar em "Create a new function"
3. Function name: sync-google-calendar
4. Clicar "Create function"
```

**4.2. Colar o Código**
```
1. Copiar conteúdo de: supabase/functions/sync-google-calendar/index.ts
2. Colar no editor
3. Clicar "Deploy"
```

**4.3. Verificar Deploy**
```
✅ Status: "Deployed"
✅ Verde ativo
```

---

### **Passo 5: Configurar Variáveis de Ambiente (Secrets)**

Todas as Edge Functions já têm acesso automático a:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

**Secrets adicionais necessários:**

Para WhatsApp e outros, já estão configurados via `integration_settings` na BD.
Não é necessário configurar secrets adicionais manualmente! ✅

---

### **Passo 6: Testar Execução Manual**

**6.1. Testar daily-emails**
```
1. Abrir Edge Function "daily-emails"
2. Clicar em "Invoke function" (botão de teste)
3. Method: POST
4. Body: {} (vazio)
5. Clicar "Send request"
6. Verificar response:
   {
     "success": true,
     "message": "Daily emails processed",
     "results": [...]
   }
```

**6.2. Testar daily-tasks-whatsapp**
```
1. Abrir Edge Function "daily-tasks-whatsapp"
2. Clicar em "Invoke function"
3. Method: POST
4. Body: {}
5. Verificar response:
   {
     "success": true,
     "messagesSent": 2,
     "messagesFailed": 0
   }
```

**6.3. Testar sync-google-calendar**
```
1. Abrir Edge Function "sync-google-calendar"
2. Clicar em "Invoke function"
3. Method: POST
4. Body: {}
5. Verificar response:
   {
     "success": true,
     "totals": {
       "imported": 5,
       "updated": 3,
       "skipped": 10
     }
   }
```

---

### **Passo 7: Configurar Cron Jobs (Agendamento Automático)**

**7.1. Configurar daily-emails (Diário às 08:00)**

```
1. Abrir Edge Function "daily-emails"
2. Tab "Settings"
3. Section "Cron Jobs"
4. Clicar "Add cron job"
5. Preencher:
   - Name: daily-email-notifications
   - Schedule: 0 8 * * * (todos os dias às 08:00 UTC)
   - HTTP Method: POST
   - Headers: (deixar vazio)
6. Clicar "Create"
7. Toggle para "Enabled" ✅
```

**Expressão Cron:** `0 8 * * *`
- Executa todos os dias às 08:00 UTC
- Para Portugal (UTC+0 no inverno, UTC+1 no verão), considerar offset

**7.2. Configurar daily-tasks-whatsapp (Diário às 08:00)**

```
1. Abrir Edge Function "daily-tasks-whatsapp"
2. Tab "Settings"
3. Section "Cron Jobs"
4. Clicar "Add cron job"
5. Preencher:
   - Name: daily-whatsapp-tasks
   - Schedule: 0 8 * * *
   - HTTP Method: POST
6. Clicar "Create"
7. Toggle para "Enabled" ✅
```

**7.3. Configurar sync-google-calendar (A cada 15 minutos)**

```
1. Abrir Edge Function "sync-google-calendar"
2. Tab "Settings"
3. Section "Cron Jobs"
4. Clicar "Add cron job"
5. Preencher:
   - Name: calendar-auto-sync
   - Schedule: */15 * * * *
   - HTTP Method: POST
6. Clicar "Create"
7. Toggle para "Enabled" ✅
```

**Expressão Cron:** `*/15 * * * *`
- Executa a cada 15 minutos
- 96 vezes por dia
- Sincronização em tempo real

---

## 🕐 **REFERÊNCIA: Expressões Cron**

### **Formato:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-7, 0 e 7 = Domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

### **Exemplos Úteis:**

| Expressão | Descrição |
|---|---|
| `0 8 * * *` | Diário às 08:00 |
| `0 9 * * 1` | Todas as segundas às 09:00 |
| `0 */6 * * *` | A cada 6 horas |
| `*/15 * * * *` | A cada 15 minutos |
| `*/30 * * * *` | A cada 30 minutos |
| `0 0 * * *` | Diário à meia-noite |
| `0 12 * * *` | Diário ao meio-dia |

### **Ferramentas de Teste:**
- https://crontab.guru/ - Validador de expressões Cron
- https://crontab-generator.org/ - Gerador visual

---

## 📊 **MONITORAMENTO E LOGS**

### **Visualizar Logs em Tempo Real**

**Opção 1: Dashboard**
```
1. Abrir Edge Function
2. Tab "Logs"
3. Logs aparecem automaticamente
4. Filtrar por:
   - Level (info, error, warn)
   - Time range (última hora, dia, semana)
   - Search (buscar texto específico)
```

**Opção 2: Logs API**
```bash
# Via Supabase CLI (se configurado)
supabase functions logs daily-emails --tail
supabase functions logs daily-tasks-whatsapp --tail
supabase functions logs sync-google-calendar --tail
```

---

### **Logs Esperados**

**daily-emails - Sucesso:**
```
🔔 [daily-emails] Starting daily email notifications...
✅ [daily-emails] Gmail integration is active
📊 [daily-emails] Found 5 users with notifications enabled
🔄 [daily-emails] Processing user: joao@example.com
📋 [daily-emails] Found 3 tasks for joao@example.com
📅 [daily-emails] Found 2 events for joao@example.com
✅ [daily-emails] Email sent successfully to joao@example.com
✅ [daily-emails] Daily email notifications completed
```

**daily-tasks-whatsapp - Sucesso:**
```
🔵 [daily-tasks-whatsapp] Starting WhatsApp task notifications...
📱 [daily-tasks-whatsapp] Processing 3 users
📋 [daily-tasks-whatsapp] Found 2 tasks for user@example.com
✅ [daily-tasks-whatsapp] Message sent to +351912345678
✅ [daily-tasks-whatsapp] Completed: 3 sent, 0 failed
```

**sync-google-calendar - Sucesso:**
```
🔄 [sync-google-calendar] Starting automatic sync...
✅ [sync-google-calendar] Google Calendar integration is active
📊 [sync-google-calendar] Found 4 users with Google Calendar connected
🔄 [sync-google-calendar] Syncing for user: maria@example.com
📅 [sync-google-calendar] Google events fetched: 15
📊 [sync-google-calendar] Existing synced events: 12
➕ [sync-google-calendar] Importing new event: abc123
🔄 [sync-google-calendar] Updating event: xyz789
✅ [sync-google-calendar] User maria@example.com: 2 imported, 1 updated, 12 skipped
✅ [sync-google-calendar] Sync completed
```

---

## 🐛 **TROUBLESHOOTING**

### **Erro 1: "Gmail integration not configured"**

**Causa:** Admin não configurou Gmail OAuth2

**Solução:**
```
1. Login como Admin
2. /admin/integrations
3. Tab "Comunicação"
4. Configurar "Gmail Integration"
5. Guardar credenciais OAuth2
```

---

### **Erro 2: "Gmail account not connected"**

**Causa:** Utilizador não conectou sua conta Gmail

**Solução:**
```
1. Utilizador vai para /settings
2. Tab "Integrações"
3. Clicar "Conectar Gmail"
4. Autorizar no Google
```

---

### **Erro 3: "WhatsApp integration not configured"**

**Causa:** Admin não configurou WhatsApp Business

**Solução:**
```
1. Login como Admin
2. /admin/integrations
3. Tab "Comunicação"
4. Configurar "WhatsApp Business"
5. Preencher Phone Number ID e Access Token
```

---

### **Erro 4: "No users to notify"**

**Causa:** Nenhum utilizador tem notificações ativas

**Solução:**
```
1. Utilizador vai para /settings
2. Tab "Notificações"
3. Ativar preferências:
   - ✅ Receber tarefas diárias por email
   - ✅ Receber eventos diários por email
```

---

### **Erro 5: Edge Function timeout**

**Causa:** Muitos utilizadores/eventos processados (>30s)

**Solução:**
```
1. Dividir processamento em batches
2. Aumentar timeout no Supabase (plano Pro)
3. Otimizar queries (usar índices)
```

---

### **Erro 6: "Invalid OAuth2 credentials"**

**Causa:** Tokens expirados ou revogados

**Solução:**
```
1. Utilizador desconecta integração
2. Conecta novamente
3. Novos tokens gerados
```

---

## ✅ **CHECKLIST DE VERIFICAÇÃO**

### **Após Deploy:**

**Edge Functions Criadas:**
- [ ] `daily-emails` - Status: Deployed ✅
- [ ] `daily-tasks-whatsapp` - Status: Deployed ✅
- [ ] `sync-google-calendar` - Status: Deployed ✅

**Cron Jobs Configurados:**
- [ ] `daily-emails` - Diário às 08:00 ✅
- [ ] `daily-tasks-whatsapp` - Diário às 08:00 ✅
- [ ] `sync-google-calendar` - A cada 15 minutos ✅

**Testes Manuais:**
- [ ] Invocar `daily-emails` - Response 200 ✅
- [ ] Invocar `daily-tasks-whatsapp` - Response 200 ✅
- [ ] Invocar `sync-google-calendar` - Response 200 ✅

**Logs Verificados:**
- [ ] `daily-emails` - Logs claros sem erros ✅
- [ ] `daily-tasks-whatsapp` - Logs claros sem erros ✅
- [ ] `sync-google-calendar` - Logs claros sem erros ✅

**Integrações Configuradas:**
- [ ] Gmail OAuth2 (Admin) ✅
- [ ] Gmail conectado (Utilizador) ✅
- [ ] WhatsApp Business (Admin) ✅
- [ ] Google Calendar OAuth2 (Admin) ✅
- [ ] Google Calendar conectado (Utilizador) ✅

**Notificações Ativas:**
- [ ] Preferências de email configuradas ✅
- [ ] Números de telefone preenchidos ✅

---

## 🎯 **MÉTODO 2: Deploy via Supabase CLI (Alternativo)**

### **Passo 1: Instalar Supabase CLI**

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop install supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

---

### **Passo 2: Login no Supabase**

```bash
supabase login
```
- Abre browser automaticamente
- Login com conta Supabase
- Token salvo localmente

---

### **Passo 3: Linkar Projeto**

```bash
# Na pasta raiz do projeto Imogest
supabase link --project-ref YOUR_PROJECT_REF
```

**Onde encontrar PROJECT_REF:**
```
1. Supabase Dashboard
2. Settings → General
3. Project Settings
4. Reference ID: abcdefghijklmnop
```

---

### **Passo 4: Deploy das Functions**

```bash
# Deploy todas as functions
supabase functions deploy

# Ou deploy individual
supabase functions deploy daily-emails
supabase functions deploy daily-tasks-whatsapp
supabase functions deploy sync-google-calendar
```

**Output Esperado:**
```
Deploying Functions to project: YOUR_PROJECT_REF
  ✓ daily-emails
  ✓ daily-tasks-whatsapp
  ✓ sync-google-calendar

Functions deployed successfully!
```

---

### **Passo 5: Verificar Deploy**

```bash
supabase functions list
```

**Output:**
```
┌──────────────────────────┬──────────┬─────────────────────┐
│ Name                     │ Status   │ Version             │
├──────────────────────────┼──────────┼─────────────────────┤
│ daily-emails             │ ACTIVE   │ 2026-01-04T15:30:00 │
│ daily-tasks-whatsapp     │ ACTIVE   │ 2026-01-04T15:30:00 │
│ sync-google-calendar     │ ACTIVE   │ 2026-01-04T15:30:00 │
└──────────────────────────┴──────────┴─────────────────────┘
```

---

### **Passo 6: Testar via CLI**

```bash
# Invocar function
supabase functions invoke daily-emails --method POST

# Com payload
supabase functions invoke sync-google-calendar \
  --method POST \
  --body '{"manual": true}'

# Ver logs em tempo real
supabase functions logs daily-emails --tail
```

---

## 📈 **MÉTRICAS E PERFORMANCE**

### **Limites do Supabase (Free Tier):**
- **Edge Functions:**
  - 500,000 invocações/mês
  - 100 execuções simultâneas
  - Timeout: 30 segundos

- **Upgrade para Pro:**
  - 2,000,000 invocações/mês
  - 200 execuções simultâneas
  - Timeout: 150 segundos

### **Performance Esperada:**

**daily-emails:**
```
Users: 10 → 2-5 segundos
Users: 50 → 10-15 segundos
Users: 100 → 20-30 segundos
```

**daily-tasks-whatsapp:**
```
Users: 10 → 3-6 segundos
Users: 50 → 15-20 segundos
Users: 100 → 25-35 segundos
```

**sync-google-calendar:**
```
Users: 5 → 5-10 segundos
Users: 20 → 15-25 segundos
Users: 50 → 30-45 segundos
```

---

## 🔐 **SEGURANÇA**

### **Secrets Management:**

Todas as credenciais sensíveis são armazenadas em:
1. **integration_settings** (configurações Admin)
2. **user_integrations** (tokens OAuth2 por utilizador)

**Nunca hardcoded:**
- ✅ API Keys
- ✅ Access Tokens
- ✅ Refresh Tokens
- ✅ Client Secrets

### **Autenticação:**

Edge Functions usam:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (server-side)
- ✅ RLS bypass permitido (necessário para processar todos os users)
- ✅ Logs detalhados para auditoria

---

## 📞 **SUPORTE**

### **Recursos:**
- 📖 Supabase Docs: https://supabase.com/docs/guides/functions
- 💬 Discord: https://discord.supabase.com
- 🐙 GitHub: https://github.com/supabase/supabase

### **Comandos Úteis:**

```bash
# Ver status
supabase functions list

# Ver logs
supabase functions logs <function-name>

# Deletar function
supabase functions delete <function-name>

# Re-deploy
supabase functions deploy <function-name>
```

---

## ✅ **CONCLUSÃO**

Após seguir este guia:

- ✅ 3 Edge Functions deployadas no Supabase
- ✅ Cron Jobs configurados e ativos
- ✅ Notificações automáticas funcionando
- ✅ Sincronização Google Calendar em tempo real
- ✅ Logs e monitoramento configurados

**Próximos Passos:**
1. Configurar integrações no Admin
2. Utilizadores conectarem contas (Gmail, Calendar)
3. Ativar preferências de notificação
4. Monitorar logs nas primeiras 24h
5. Ajustar timings dos Cron Jobs conforme necessário

---

🎉 **Edge Functions prontas para produção!**