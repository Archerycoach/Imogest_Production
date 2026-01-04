# ⏰ Como Ativar Cron Jobs no Supabase - Guia Visual

## 🎯 LOCALIZAÇÃO DOS CRON JOBS

### **CAMINHO NO DASHBOARD:**

```
Supabase Dashboard
    └── Database (ícone cilindro/base de dados)
        └── Cron Jobs
```

---

## 📍 PASSO A PASSO VISUAL

### **PASSO 1: Aceder ao Dashboard**

1. Abrir: **https://supabase.com/dashboard**
2. Fazer login (se necessário)
3. Selecionar projeto: **Imogest**

```
┌─────────────────────────────────────────────┐
│  🏠 Dashboard → Projects                    │
│                                             │
│  📁 My Projects                             │
│    └── 📊 Imogest  [SELECIONAR]             │
│                                             │
└─────────────────────────────────────────────┘
```

---

### **PASSO 2: Navegar para Database**

No **menu lateral esquerdo**, procurar pelo ícone de **Database** (cilindro)

```
┌─────────────────────────────────────────────┐
│  MENU LATERAL ESQUERDO:                     │
│                                             │
│  🏠 Home                                    │
│  📊 Table Editor                            │
│  🔐 Authentication                          │
│  📦 Storage                                 │
│  ⚡ Edge Functions                          │
│  🗄️  Database  ← CLICAR AQUI                │
│  🔧 Settings                                │
│                                             │
└─────────────────────────────────────────────┘
```

---

### **PASSO 3: Abrir Cron Jobs**

Após clicar em **Database**, vai aparecer um **submenu**:

```
┌─────────────────────────────────────────────┐
│  🗄️  DATABASE (SUBMENU):                    │
│                                             │
│  📊 Tables                                  │
│  🔍 SQL Editor                              │
│  🔗 Replication                             │
│  🔄 Backups                                 │
│  ⏰ Cron Jobs  ← CLICAR AQUI                │
│  🔌 Webhooks                                │
│  🔬 Extensions                              │
│                                             │
└─────────────────────────────────────────────┘
```

---

### **PASSO 4: Criar Primeiro Cron Job**

Na página de **Cron Jobs**, verás:

```
┌─────────────────────────────────────────────┐
│  ⏰ Cron Jobs                                │
│                                             │
│  Schedule SQL commands to run at specific   │
│  times using PostgreSQL cron syntax.        │
│                                             │
│  [+ Create a new cron job]  ← CLICAR AQUI  │
│                                             │
│  (vazio se ainda não criaste nenhum)        │
│                                             │
└─────────────────────────────────────────────┘
```

---

### **PASSO 5: Preencher Formulário do Cron Job #1**

Vai abrir um **formulário** com os seguintes campos:

```
┌─────────────────────────────────────────────────────────┐
│  Create Cron Job                                        │
│                                                         │
│  Name *                                                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ daily-email-notifications                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Schedule (Cron expression) *                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 0 8 * * *                                         │ │
│  └───────────────────────────────────────────────────┘ │
│  💡 Runs every day at 08:00 UTC                        │
│                                                         │
│  Command (SQL) *                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ SELECT                                            │ │
│  │   net.http_post(                                  │ │
│  │     url:='https://YOUR_REF.supabase.co/...',      │ │
│  │     headers:='{"Authorization": "Bearer ..."}'     │ │
│  │   ) as request_id;                                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancel]  [Create cron job]  ← CLICAR PARA CRIAR     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 INFORMAÇÕES NECESSÁRIAS

Antes de preencher, precisas de **2 informações** do teu projeto:

### **1. Project Reference (PROJECT_REF)**

**Como encontrar:**
```
Settings (⚙️ no menu lateral)
    └── API
        └── Project URL
            → https://PROJECT_REF.supabase.co
```

**Exemplo:**
```
Se a URL for: https://abcdefghijk.supabase.co
Então PROJECT_REF = abcdefghijk
```

---

### **2. Anon Key (ANON_KEY)**

**Como encontrar:**
```
Settings (⚙️ no menu lateral)
    └── API
        └── Project API keys
            └── anon public
                → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**É uma key LONGA começando com `eyJ`**

---

## 📝 COMANDO SQL COMPLETO PARA CADA CRON JOB

### **CRON JOB #1: daily-email-notifications**

```sql
SELECT
  net.http_post(
    url:='https://PROJECT_REF.supabase.co/functions/v1/daily-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**Preencher no formulário:**
- **Name:** `daily-email-notifications`
- **Schedule:** `0 8 * * *`
- **Command:** (colar o SQL acima com PROJECT_REF e ANON_KEY substituídos)

---

### **CRON JOB #2: daily-whatsapp-tasks**

```sql
SELECT
  net.http_post(
    url:='https://PROJECT_REF.supabase.co/functions/v1/daily-tasks-whatsapp',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**Preencher no formulário:**
- **Name:** `daily-whatsapp-tasks`
- **Schedule:** `0 8 * * *`
- **Command:** (colar o SQL acima com PROJECT_REF e ANON_KEY substituídos)

---

### **CRON JOB #3: calendar-auto-sync**

```sql
SELECT
  net.http_post(
    url:='https://PROJECT_REF.supabase.co/functions/v1/sync-google-calendar',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

**Preencher no formulário:**
- **Name:** `calendar-auto-sync`
- **Schedule:** `*/15 * * * *`
- **Command:** (colar o SQL acima com PROJECT_REF e ANON_KEY substituídos)

---

## ✅ VERIFICAÇÃO APÓS CRIAR

Depois de criar os 3 Cron Jobs, deverás ver:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏰ Cron Jobs                                    [+ Create new]  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Name                      │ Schedule     │ Active │ Edit   │ │
│  ├───────────────────────────┼──────────────┼────────┼────────┤ │
│  │ daily-email-notifications │ 0 8 * * *    │ ✅ Yes │ [...]  │ │
│  │ daily-whatsapp-tasks      │ 0 8 * * *    │ ✅ Yes │ [...]  │ │
│  │ calendar-auto-sync        │ */15 * * * * │ ✅ Yes │ [...]  │ │
│  └───────────────────────────┴──────────────┴────────┴────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Todos devem estar com:**
- ✅ **Active: Yes**
- ✅ **Schedule correto**

---

## 🧪 TESTAR ANTES DE AGENDAR

Antes de os Cron Jobs começarem a correr automaticamente, podes **testá-los manualmente**:

### **Opção 1: Via SQL Editor**

```
1. Database → SQL Editor
2. Nova query
3. Colar o comando SELECT net.http_post(...)
4. Run (F5)
5. Ver resultado
```

### **Opção 2: Via Edge Function Invoke**

```
1. Edge Functions → daily-emails
2. Tab "Invoke"
3. Method: POST
4. Body: {}
5. Send request
6. ✅ Ver response 200
```

---

## 📊 MONITORAR EXECUÇÕES

### **Ver Logs das Edge Functions:**

```
Edge Functions (menu lateral)
    └── Selecionar função (ex: daily-emails)
        └── Tab "Logs"
            → Ver execuções em tempo real
```

### **Ver Histórico do Cron Job:**

```
Database → Cron Jobs
    └── Clicar no nome do Cron (ex: daily-email-notifications)
        → Ver histórico de execuções
        → Ver sucessos/falhas
```

---

## ⚠️ TROUBLESHOOTING RÁPIDO

### **Problema: "net.http_post não existe"**

**Causa:** Extensão `pg_net` não está habilitada

**Solução:**
```
1. Database → Extensions
2. Procurar "pg_net"
3. Enable
4. Tentar novamente
```

---

### **Problema: Cron criado mas não executa**

**Verificar:**
1. ✅ Status é "Active"?
2. ✅ Edge Function está deployed?
3. ✅ PROJECT_REF está correto?
4. ✅ ANON_KEY está correto (completo)?
5. ✅ URL tem `/functions/v1/` no caminho?

---

### **Problema: Executa mas sem resultados**

**Verificar nos Logs da Edge Function:**
```
Edge Functions → daily-emails → Logs

Procurar por:
- "Gmail integration not configured"
- "No users with notifications enabled"
- "Gmail account not connected"
```

**Soluções:**
- Configurar integrações: `/admin/integrations`
- Conectar Gmail: `/settings` (como user)
- Ativar notificações: `/settings` → Tab "Notificações"

---

## 🎯 RESUMO RÁPIDO

**Para ativar Cron Jobs:**

1. ✅ Dashboard → **Database** → **Cron Jobs**
2. ✅ Clicar **"+ Create a new cron job"**
3. ✅ Preencher 3 campos:
   - Name
   - Schedule (expressão cron)
   - Command (SQL com net.http_post)
4. ✅ Substituir `PROJECT_REF` e `ANON_KEY`
5. ✅ Clicar **"Create cron job"**
6. ✅ Repetir para os 3 Cron Jobs
7. ✅ Verificar **"Active: Yes"**

**Tempo total:** 5-10 minutos
**Dificuldade:** Fácil
**Custo:** Grátis

---

## 📍 CAMINHO VISUAL COMPLETO

```
https://supabase.com/dashboard
    └── [Login]
        └── [Selecionar projeto "Imogest"]
            └── Menu lateral: 🗄️ Database
                └── Submenu: ⏰ Cron Jobs
                    └── Botão: [+ Create a new cron job]
                        └── Formulário:
                            ├── Name: daily-email-notifications
                            ├── Schedule: 0 8 * * *
                            └── Command: SELECT net.http_post(...)
                                └── [Create cron job] ← CLICAR
```

---

## 🎉 PRONTO!

Agora sabes **exatamente onde** e **como** ativar os Cron Jobs no Supabase!

**Próximos passos:**
1. ✅ Abrir Supabase Dashboard
2. ✅ Seguir este guia passo a passo
3. ✅ Criar os 3 Cron Jobs
4. ✅ Testar manualmente
5. ✅ Aguardar primeira execução automática
6. ✅ Verificar logs

**Boa sorte!** 🚀