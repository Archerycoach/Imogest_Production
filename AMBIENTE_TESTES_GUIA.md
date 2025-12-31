# 🧪 GUIA COMPLETO: Ambiente de Testes

## 📋 ÍNDICE
1. [Visão Geral](#visão-geral)
2. [Passo 1: Criar Projeto Supabase de Testes](#passo-1-criar-projeto-supabase-de-testes)
3. [Passo 2: Configurar Credenciais](#passo-2-configurar-credenciais)
4. [Passo 3: Migrar Schema](#passo-3-migrar-schema)
5. [Passo 4: Scripts de Ambiente](#passo-4-scripts-de-ambiente)
6. [Passo 5: Dados de Teste](#passo-5-dados-de-teste)
7. [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
8. [Boas Práticas](#boas-práticas)

---

## 📊 VISÃO GERAL

### **Por que usar ambiente de testes?**
- ✅ Protege dados reais de produção
- ✅ Testa mudanças sem riscos
- ✅ Permite experimentação livre
- ✅ Facilita debug e desenvolvimento
- ✅ Simula cenários de teste
- ✅ Reversão fácil se algo der errado

### **Estrutura de Ambientes:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SUA APLICAÇÃO                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  .env.local (atual) ────┐                                   │
│                         │                                   │
│  .env.local.production ─┼─ PRODUÇÃO (dados reais)          │
│  (backup)               │   └─ Supabase Prod DB            │
│                         │                                   │
│  .env.local.testing ────┴─ TESTES (dados fictícios)        │
│  (alternativo)              └─ Supabase Test DB            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 PASSO 1: CRIAR PROJETO SUPABASE DE TESTES

### **1.1 Acessar Dashboard Supabase**
```
1. Acesse: https://supabase.com/dashboard
2. Login com sua conta
3. Clique "New Project"
```

### **1.2 Configurar Novo Projeto**
```
Nome: imogest-testing (ou imogest_test)
Database Password: [crie senha forte]
Region: Europe West (Irlanda) [mesma da produção]
Pricing Plan: Free (suficiente para testes)

✅ Clique "Create new project"
⏱️ Aguarde 2-3 minutos (criação do projeto)
```

### **1.3 Verificar Projeto Criado**
```
✅ Dashboard mostra projeto "imogest-testing"
✅ Status: Active
✅ Database online
✅ API running
```

---

## 🔑 PASSO 2: CONFIGURAR CREDENCIAIS

### **2.1 Obter Credenciais do Novo Projeto**

**No Dashboard do projeto de testes:**

```
1. Clique em "Settings" (lado esquerdo)
2. Clique em "API"
3. Copie as seguintes informações:
```

#### **Project URL:**
```
https://[seu-project-ref].supabase.co
```

#### **API Keys:**
```
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Database Password:**
```
[a senha que você criou no passo 1.2]
```

### **2.2 Atualizar `.env.local.testing`**

**Abra o arquivo `.env.local.testing` e substitua os valores:**

```bash
# =====================================================
# TESTING ENVIRONMENT
# =====================================================
# Projeto Supabase separado para testes/desenvolvimento

# Supabase Testing Project
NEXT_PUBLIC_SUPABASE_URL=https://[SEU-PROJECT-REF-TESTING].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[SUA-ANON-KEY-TESTING]
SUPABASE_SERVICE_ROLE_KEY=[SUA-SERVICE-ROLE-KEY-TESTING]
SUPABASE_DB_PASSWORD=[SUA-DB-PASSWORD-TESTING]

# Site URL (development)
NEXT_PUBLIC_SITE_URL=https://3000-9d804bf8-0d80-4823-af0f-2c9bbddb5de7.softgen.dev

# Stripe (Test Mode - manter test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51QQKjSJBpxeKs0dJqvJLd8c7KuxYzTDTABjfDi4O1C1KSGCl0BQzJU4vWYLmqxQy0ghzIIpz9PNRZe3aLrL35GkK00PvCqgZ8w
STRIPE_SECRET_KEY=sk_test_51QQKjSJBpxeKs0dJz7IjDJV7S0YjCOjK0yEqvK9d0vHdY1YfVZ1eHwYJw5A3mLxgpNVFwqJ3Mf3I6sO8J7R8M5v100v89aTlhU
STRIPE_WEBHOOK_SECRET=whsec_zKw8lzM5K5GvgW8J9L5E0K8j9L5E0K8j9

# Eupago (Demo/Test)
EUPAGO_API_KEY=demo-dd2f6cc5-0a94-401a-b0b9-6a1e27e01234

# Google Calendar (Testing)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://3000-9d804bf8-0d80-4823-af0f-2c9bbddb5de7.softgen.dev/api/google-calendar/callback
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-api-key

# WhatsApp Business API (Testing)
NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token

# Email (Testing)
RESEND_API_KEY=re_your_resend_api_key

# Other
NEXT_PUBLIC_APP_URL=https://3000-9d804bf8-0d80-4823-af0f-2c9bbddb5de7.softgen.dev
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
OPENAI_API_KEY=sk-proj-your_openai_api_key

# Environment
NODE_ENV=development
```

### **2.3 Verificar Configuração**

**Checklist:**
- ✅ NEXT_PUBLIC_SUPABASE_URL atualizado
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY atualizado
- ✅ SUPABASE_SERVICE_ROLE_KEY atualizado
- ✅ SUPABASE_DB_PASSWORD atualizado
- ✅ NODE_ENV=development
- ✅ NEXT_PUBLIC_SITE_URL correto

---

## 🗄️ PASSO 3: MIGRAR SCHEMA

### **3.1 Conectar Softgen ao Projeto de Testes**

**IMPORTANTE:** Antes de migrar o schema, você precisa conectar o Softgen ao novo projeto de testes.

```
1. No Softgen, clique em "Settings" (navbar superior direita)
2. Clique em "Supabase" no menu lateral
3. Clique "Disconnect" no projeto atual (se conectado)
4. Clique "Connect New Project"
5. Cole as credenciais do projeto de testes:
   - Project URL: https://[seu-project-ref-testing].supabase.co
   - Anon Key: [sua-anon-key-testing]
6. Clique "Connect"
```

### **3.2 Aplicar Schema via SQL Editor**

**Opção A: Via Supabase Dashboard (RECOMENDADO)**

```
1. Acesse: https://supabase.com/dashboard
2. Selecione projeto "imogest-testing"
3. Clique "SQL Editor" (lado esquerdo)
4. Clique "New Query"
5. Copie TODO o conteúdo do arquivo "database-schema.sql"
6. Cole no editor SQL
7. Clique "Run" (Ctrl/Cmd + Enter)
8. ✅ Aguarde execução (~10-30 segundos)
9. ✅ Verifique: "Success. No rows returned"
```

**Opção B: Via Softgen (depois de conectado)**

```
1. No chat do Softgen, peça:
   "Aplica o schema do arquivo database-schema.sql ao projeto de testes"

2. Softgen executará o SQL automaticamente
3. ✅ Verificará se todas as tabelas foram criadas
4. ✅ Aplicará RLS policies
```

### **3.3 Verificar Schema Aplicado**

**No Dashboard Supabase:**

```
1. Clique "Table Editor" (lado esquerdo)
2. ✅ Verifique se as seguintes tabelas existem:
   - profiles
   - leads
   - properties
   - contacts
   - interactions
   - tasks
   - calendar_events
   - notifications
   - documents
   - workflow_templates
   - workflow_executions
   - subscriptions
   - payment_methods
   - system_settings
   - lead_property_matches

3. Clique "Authentication" → "Policies"
4. ✅ Verifique RLS policies em cada tabela
```

---

## ⚙️ PASSO 4: SCRIPTS DE AMBIENTE

### **4.1 Criar Scripts de Alternância**

Vou adicionar scripts ao `package.json` para facilitar a troca de ambientes:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:test": "npm run env:test && next dev --turbopack",
    "dev:prod": "npm run env:prod && next dev --turbopack",
    "env:test": "cp .env.local.testing .env.local && echo '✅ Ambiente: TESTES'",
    "env:prod": "cp .env.local.production .env.local && echo '✅ Ambiente: PRODUÇÃO'",
    "env:check": "node -e \"console.log('\\n📊 Ambiente Atual:'); console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL); console.log('Env:', process.env.NODE_ENV);\"",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### **4.2 Como Usar os Scripts**

#### **Iniciar em Modo de Testes:**
```bash
npm run dev:test
```
✅ Copia `.env.local.testing` → `.env.local`
✅ Inicia servidor Next.js
✅ Conectado ao banco de dados de TESTES

#### **Iniciar em Modo de Produção:**
```bash
npm run dev:prod
```
✅ Copia `.env.local.production` → `.env.local`
✅ Inicia servidor Next.js
✅ Conectado ao banco de dados de PRODUÇÃO

#### **Verificar Ambiente Atual:**
```bash
npm run env:check
```
✅ Mostra URL do Supabase atual
✅ Mostra NODE_ENV

#### **Trocar para Testes (sem iniciar servidor):**
```bash
npm run env:test
```
✅ Apenas copia `.env.local.testing` → `.env.local`

#### **Trocar para Produção (sem iniciar servidor):**
```bash
npm run env:prod
```
✅ Apenas copia `.env.local.production` → `.env.local`

---

## 🎭 PASSO 5: DADOS DE TESTE

### **5.1 Criar Usuário Admin de Testes**

**Via Supabase Dashboard:**

```
1. No projeto de testes, clique "Authentication"
2. Clique "Users"
3. Clique "Add user" → "Create new user"
4. Preencha:
   - Email: admin@test.com
   - Password: Test123!@# (ou outra senha forte)
   - Auto Confirm User: ✅ SIM
5. Clique "Create user"
```

**Tornar Admin:**

```
1. Clique "SQL Editor"
2. Execute:

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';
```

### **5.2 Criar Dados de Teste Básicos**

**SQL para Popular Base de Testes:**

```sql
-- Inserir leads de teste
INSERT INTO leads (name, email, phone, status, budget_min, budget_max, lead_type, user_id)
VALUES 
  ('João Silva', 'joao@test.com', '912345678', 'new', 150000, 250000, 'buyer', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Maria Santos', 'maria@test.com', '913456789', 'contacted', 200000, 300000, 'buyer', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Pedro Costa', 'pedro@test.com', '914567890', 'qualified', 180000, 280000, 'seller', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- Inserir propriedades de teste
INSERT INTO properties (title, description, type, price, location, bedrooms, bathrooms, area, status, user_id)
VALUES 
  ('Apartamento T2 Centro', 'Apartamento moderno no centro', 'apartment', 220000, 'Lisboa, Portugal', 2, 2, 85, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Moradia T3 Cascais', 'Moradia com jardim', 'house', 450000, 'Cascais, Portugal', 3, 3, 150, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- Inserir contactos de teste
INSERT INTO contacts (name, email, phone, type, user_id)
VALUES 
  ('Ana Oliveira', 'ana@test.com', '915678901', 'lead', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Carlos Ferreira', 'carlos@test.com', '916789012', 'client', (SELECT id FROM profiles WHERE email = 'admin@test.com'));
```

### **5.3 Script para Limpar Dados de Teste**

**Guardar como `clear-test-data.sql`:**

```sql
-- ATENÇÃO: Apenas executar em ambiente de TESTES!

-- Limpar todas as tabelas (ordem importante por foreign keys)
DELETE FROM lead_property_matches;
DELETE FROM workflow_executions;
DELETE FROM notifications;
DELETE FROM documents;
DELETE FROM tasks;
DELETE FROM calendar_events;
DELETE FROM interactions;
DELETE FROM payment_methods;
DELETE FROM subscriptions;
DELETE FROM properties;
DELETE FROM leads;
DELETE FROM contacts;
DELETE FROM system_settings;

-- Reset sequences (opcional)
-- Isso faz os IDs voltarem a começar do 1

TRUNCATE TABLE lead_property_matches RESTART IDENTITY CASCADE;
TRUNCATE TABLE workflow_executions RESTART IDENTITY CASCADE;
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE documents RESTART IDENTITY CASCADE;
TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;
TRUNCATE TABLE calendar_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE interactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE payment_methods RESTART IDENTITY CASCADE;
TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE properties RESTART IDENTITY CASCADE;
TRUNCATE TABLE leads RESTART IDENTITY CASCADE;
TRUNCATE TABLE contacts RESTART IDENTITY CASCADE;
TRUNCATE TABLE system_settings RESTART IDENTITY CASCADE;

-- Manter apenas o perfil admin
DELETE FROM auth.users WHERE email != 'admin@test.com';
```

---

## 🔄 WORKFLOW DE DESENVOLVIMENTO

### **Workflow Recomendado:**

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO DE DESENVOLVIMENTO                  │
└─────────────────────────────────────────────────────────────┘

1. 🧪 TESTES - Desenvolver Features
   ├─ npm run dev:test
   ├─ Desenvolver nova funcionalidade
   ├─ Testar completamente
   └─ Verificar se funciona perfeitamente

2. ✅ VALIDAÇÃO - Confirmar Funcionamento
   ├─ Testar cenários extremos
   ├─ Verificar erros e edge cases
   └─ Garantir qualidade

3. 📦 COMMIT - Salvar Alterações
   ├─ git add .
   ├─ git commit -m "feat: nova funcionalidade"
   └─ git push

4. 🚀 PRODUÇÃO - Deploy Seguro
   ├─ npm run env:prod
   ├─ npm run build (verificar build)
   ├─ Testar rapidamente em produção
   └─ Monitorar comportamento

5. 🔄 REPETIR
```

### **Exemplo Prático:**

```bash
# Manhã: Desenvolver feature de exportação Excel
$ npm run dev:test
✅ Ambiente: TESTES
🧪 Desenvolver feature...
✅ Testar com dados fictícios
✅ Tudo funcionando!

# Tarde: Aplicar em produção
$ git add .
$ git commit -m "feat: add Excel export"
$ git push
$ npm run env:prod
✅ Ambiente: PRODUÇÃO
🚀 Vercel deploy automático
✅ Feature em produção!
```

---

## 📋 BOAS PRÁTICAS

### **1. SEMPRE começar em Testes**
```bash
# ❌ EVITAR: Desenvolver direto em produção
$ npm run dev  # Pode estar em produção!

# ✅ CORRETO: Sempre especificar ambiente
$ npm run dev:test  # Explicitamente em testes
```

### **2. Verificar Ambiente Antes de Operações Destrutivas**
```bash
# Antes de deletar/modificar dados em massa
$ npm run env:check
📊 Ambiente Atual:
URL: https://[project-ref].supabase.co
Env: development

# Confirme que é TESTES antes de prosseguir
```

### **3. Backups Regulares da Produção**
```
1. Dashboard Supabase → Projeto Produção
2. Database → Backups
3. "Create backup" (semanal ou antes de grandes mudanças)
```

### **4. Nunca Commitar `.env.local`**
```bash
# .gitignore já inclui:
.env.local
.env*.local

# Verifique:
$ git status
# .env.local NÃO deve aparecer
```

### **5. Documentar Mudanças no Schema**
```bash
# Sempre que alterar schema:
1. Testar em ambiente de testes
2. Exportar nova versão de database-schema.sql
3. Commitar versão atualizada
4. Aplicar em produção com cautela
```

### **6. Usar Branches para Features Arriscadas**
```bash
$ git checkout -b feature/nova-funcionalidade-arriscada
$ npm run dev:test
# Desenvolver e testar extensivamente
$ git checkout main
$ git merge feature/nova-funcionalidade-arriscada
```

---

## 🎯 RESUMO RÁPIDO

### **Setup Inicial (fazer uma vez):**
```bash
1. Criar projeto Supabase de testes
2. Copiar credenciais para .env.local.testing
3. Aplicar schema (database-schema.sql)
4. Criar usuário admin@test.com
5. Popular com dados de teste
```

### **Uso Diário:**
```bash
# Desenvolvimento de features:
$ npm run dev:test

# Verificar ambiente:
$ npm run env:check

# Trocar para produção:
$ npm run env:prod

# Build de produção:
$ npm run build
```

### **Comandos Essenciais:**
| Comando | Descrição |
|---------|-----------|
| `npm run dev:test` | Inicia em modo TESTES |
| `npm run dev:prod` | Inicia em modo PRODUÇÃO |
| `npm run env:test` | Troca para TESTES (sem iniciar) |
| `npm run env:prod` | Troca para PRODUÇÃO (sem iniciar) |
| `npm run env:check` | Mostra ambiente atual |

---

## ⚠️ AVISOS IMPORTANTES

### **🚨 CRÍTICO:**
```
NUNCA desenvolva funcionalidades destrutivas diretamente em produção!

Exemplos de operações destrutivas:
- DELETE em massa
- DROP TABLE
- TRUNCATE
- ALTER TABLE (mudanças estruturais)
- UPDATE sem WHERE clause
```

### **✅ WORKFLOW SEGURO:**
```
1. Desenvolver e testar em TESTES
2. Commitar código
3. Fazer backup de PRODUÇÃO
4. Aplicar em PRODUÇÃO
5. Monitorar resultados
6. Rollback se necessário
```

### **🔐 SEGURANÇA:**
```
- Nunca compartilhar credenciais de produção
- Usar senhas fortes diferentes para cada ambiente
- Manter .env.local fora do Git
- Rotacionar API keys periodicamente
```

---

## 📞 SUPORTE

Se tiver dúvidas ou problemas:

1. **Verificar Logs:**
   ```bash
   # Logs do Next.js
   $ tail -f logs/out.log
   $ tail -f logs/err.log
   ```

2. **Verificar Supabase:**
   - Dashboard → Logs
   - Database → Query Performance
   - API → Logs

3. **Perguntar no Chat Softgen:**
   ```
   "Estou com problema no ambiente de testes..."
   "Como fazer [operação] sem afetar produção?"
   ```

---

## ✅ CHECKLIST FINAL

Antes de considerar o setup completo:

- [ ] Projeto Supabase de testes criado
- [ ] Credenciais em `.env.local.testing` configuradas
- [ ] Schema aplicado no banco de testes
- [ ] Usuário admin@test.com criado
- [ ] Dados de teste populados
- [ ] Scripts npm funcionando (`npm run dev:test`)
- [ ] Testado alternar entre ambientes
- [ ] `.env.local` não commitado no Git
- [ ] Backup de produção realizado
- [ ] Workflow de desenvolvimento compreendido

---

**🎉 PARABÉNS! Ambiente de testes configurado com sucesso!**

Agora você pode desenvolver e testar features com segurança, sem risco de afetar dados reais de produção! 🚀✨