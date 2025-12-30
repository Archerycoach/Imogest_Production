# 🚀 Guia Completo de Deployment - Imogest CRM

Este guia explica como configurar dois ambientes separados (Testing e Production) para o seu CRM imobiliário.

---

## 📋 Índice

1. [Visão Geral dos Ambientes](#visão-geral)
2. [Configuração do Supabase](#configuração-supabase)
3. [Configuração do Vercel](#configuração-vercel)
4. [Configuração de Pagamentos](#configuração-pagamentos)
5. [Google Calendar (Opcional)](#google-calendar)
6. [Primeiro Deploy](#primeiro-deploy)
7. [Gestão de Ambientes](#gestão-ambientes)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral dos Ambientes {#visão-geral}

### **Testing Environment**
- **Propósito**: Testes, desenvolvimento, demonstrações
- **URL**: `https://imogest-testing.vercel.app` (ou similar)
- **Base de Dados**: Projeto Supabase separado
- **Pagamentos**: Modo Sandbox/Test
- **Dados**: Dados de demonstração, resets permitidos

### **Production Environment**
- **Propósito**: Clientes reais, dados de produção
- **URL**: `https://imogest.vercel.app` (ou domínio personalizado)
- **Base de Dados**: Projeto Supabase de produção
- **Pagamentos**: Modo Live/Real
- **Dados**: Dados reais, backups automáticos

---

## 🗄️ Configuração do Supabase {#configuração-supabase}

### **Passo 1: Criar 2 Projetos Supabase**

1. Aceda a [https://supabase.com](https://supabase.com)
2. Crie **2 novos projetos**:
   - `imogest-testing` (ou nome similar)
   - `imogest-production`

### **Passo 2: Configurar Base de Dados (Para CADA Projeto)**

Execute o script SQL completo em cada projeto:

1. Abra o **SQL Editor** no dashboard Supabase
2. Cole o conteúdo do ficheiro `database-schema.sql`
3. Execute o script completo
4. Verifique se todas as tabelas foram criadas

**Tabelas Principais:**
- `profiles` (Utilizadores)
- `leads` (Leads)
- `properties` (Imóveis)
- `tasks` (Tarefas)
- `calendar_events` (Eventos)
- `subscriptions` (Subscrições)
- `subscription_plans` (Planos)
- `payment_history` (Histórico de Pagamentos)
- `templates` (Templates)
- `interactions` (Interações)
- `notifications` (Notificações)
- `lead_workflow_rules` (Regras de Workflow)
- `system_settings` (Configurações)
- `activity_logs` (Logs de Atividade)

### **Passo 3: Configurar Authentication**

**Para CADA projeto Supabase:**

1. Vá a **Authentication → Settings**
2. Configure:
   - ✅ **Enable Email Confirmations**: OFF (para testing) / ON (para production)
   - ✅ **Enable Signup**: ON
   - ✅ **Minimum Password Length**: 8
3. **Site URL**: 
   - Testing: `https://seu-app-testing.vercel.app`
   - Production: `https://seu-dominio.com`
4. **Redirect URLs** (adicione ambos):
   ```
   https://seu-app.vercel.app/**
   http://localhost:3000/**
   ```

### **Passo 4: Configurar Storage (Para Fotos)**

**Para CADA projeto:**

1. Vá a **Storage → Create bucket**
2. Crie os seguintes buckets:
   - `avatars` (público)
   - `property-images` (público)
   - `documents` (privado)
3. Configure políticas de acesso:
   ```sql
   -- Política para avatars (público)
   CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
   CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
   
   -- Política para property-images (público)
   CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
   CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);
   
   -- Política para documents (privado)
   CREATE POLICY "User Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() = owner);
   CREATE POLICY "User Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
   ```

### **Passo 5: Copiar Credenciais**

**Para CADA projeto, copie:**

1. **Project URL**: Encontra-se em Settings → API
2. **Anon Key**: Encontra-se em Settings → API
3. **Service Role Key**: Encontra-se em Settings → API (⚠️ **NUNCA exponha esta chave publicamente**)

**Guarde estas credenciais:**
- Testing → irá para `.env.local.testing`
- Production → irá para `.env.local.production`

---

## ☁️ Configuração do Vercel {#configuração-vercel}

### **Passo 1: Conectar Repositório GitHub**

1. Aceda a [https://vercel.com](https://vercel.com)
2. Clique em **Add New... → Project**
3. Importe o repositório do GitHub com o código Imogest

### **Passo 2: Criar 2 Projetos Vercel**

Você vai criar **2 deploys diferentes do mesmo repositório**:

#### **Deploy 1: Testing Environment**

1. Nome do projeto: `imogest-testing`
2. **Framework Preset**: Next.js
3. **Root Directory**: `.` (raiz do projeto)
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. Configure as **Environment Variables** (copie de `.env.local.testing`):

```env
# Supabase (Testing)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-testing.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-testing

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_test_...
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_test_...

# EuPago (Test Mode)
EUPAGO_API_KEY=sua-key-teste
EUPAGO_ENDPOINT=https://sandbox.eupago.pt

# Google Calendar (Opcional)
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret

# App Config
NEXT_PUBLIC_APP_URL=https://imogest-testing.vercel.app
NODE_ENV=development
```

7. Clique em **Deploy**

#### **Deploy 2: Production Environment**

1. **Novo projeto** no Vercel
2. Nome do projeto: `imogest-production` (ou `imogest`)
3. **Mesmo repositório GitHub**
4. Configure **Environment Variables** (copie de `.env.local.production`):

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-production.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-production

# Stripe (Live Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_live_...
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_live_...

# EuPago (Live Mode)
EUPAGO_API_KEY=sua-key-producao
EUPAGO_ENDPOINT=https://clientes.eupago.pt

# Google Calendar (Opcional)
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret

# App Config
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
NODE_ENV=production
```

5. Clique em **Deploy**

### **Passo 3: Configurar Domínios Personalizados (Opcional)**

**Production:**
1. Vá a **Settings → Domains**
2. Adicione o seu domínio (ex: `www.imogest.pt`)
3. Configure DNS conforme instruções do Vercel

**Testing:**
1. Pode usar o domínio Vercel padrão (`imogest-testing.vercel.app`)
2. Ou adicionar subdomínio (ex: `testing.imogest.pt`)

---

## 💳 Configuração de Pagamentos {#configuração-pagamentos}

### **Stripe Configuration**

#### **Testing Environment**

1. Aceda a [https://dashboard.stripe.com/test](https://dashboard.stripe.com/test)
2. Ative o **Test Mode** (toggle no canto superior direito)
3. Crie **2 produtos** (Mensal e Anual):
   - **Produto 1**: Plano Mensal (€49/mês)
   - **Produto 2**: Plano Anual (€490/ano)
4. Copie os **Price IDs** (começam com `price_test_...`)
5. Configure **Webhook**:
   - URL: `https://imogest-testing.vercel.app/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copie o **Webhook Secret** (`whsec_test_...`)

#### **Production Environment**

1. **Desative** o Test Mode no Stripe
2. Repita os passos acima, mas em **Live Mode**
3. Use URL de produção: `https://seu-dominio.com/api/stripe/webhook`
4. Copie as chaves **Live** (começam com `pk_live_...` e `sk_live_...`)

### **EuPago Configuration**

#### **Testing Environment**

1. Contacte EuPago para credenciais de **Sandbox**
2. URL: `https://sandbox.eupago.pt`
3. Configure Webhook: `https://imogest-testing.vercel.app/api/eupago/webhook`

#### **Production Environment**

1. Use credenciais de **Produção** do EuPago
2. URL: `https://clientes.eupago.pt`
3. Configure Webhook: `https://seu-dominio.com/api/eupago/webhook`

---

## 📅 Google Calendar (Opcional) {#google-calendar}

Se quiser ativar a sincronização com Google Calendar:

1. Siga as instruções em `GOOGLE_CALENDAR_SETUP.md`
2. Use as **mesmas credenciais** para ambos os ambientes
3. Adicione ambas as URLs de redirect:
   - `https://imogest-testing.vercel.app/api/google-calendar/callback`
   - `https://seu-dominio.com/api/google-calendar/callback`

---

## 🚀 Primeiro Deploy {#primeiro-deploy}

### **Testing Environment**

1. Aceda ao URL do Vercel: `https://imogest-testing.vercel.app`
2. Crie o **primeiro utilizador** (será automaticamente Admin)
3. Faça login
4. Vá a **Admin → Subscriptions**
5. Crie um **Plano de Teste**:
   - Nome: "Plano Basic"
   - Preço: €49
   - Billing: Mensal
   - Limites: 5 utilizadores, 100 leads, 50 imóveis
6. Atribua subscrição ao utilizador admin

### **Production Environment**

1. Aceda ao URL de produção
2. Crie o **primeiro utilizador admin**
3. Configure os **Planos de Subscrição** reais
4. Configure **System Settings**:
   - Branding (logo, cores)
   - Email templates
   - Workflows padrão

---

## 🔄 Gestão de Ambientes {#gestão-ambientes}

### **Workflow Recomendado**

```
Desenvolvimento Local → Testing Environment → Production Environment
```

1. **Desenvolvimento Local**:
   - Use `.env.local` (cópia de `.env.local.testing`)
   - Teste funcionalidades localmente
   - Commit para branch `develop` ou `feature/*`

2. **Testing Environment**:
   - Merge para branch `testing` ou `staging`
   - Deploy automático no Vercel (configure branch)
   - Testes de QA e validação

3. **Production Environment**:
   - Merge para branch `main` ou `production`
   - Deploy automático no Vercel
   - Apenas código testado e aprovado

### **Configurar Deploy Automático no Vercel**

**Testing Project:**
1. Vá a **Settings → Git**
2. **Production Branch**: `testing` ou `staging`
3. ✅ **Auto-Deploy**: ON

**Production Project:**
1. Vá a **Settings → Git**
2. **Production Branch**: `main`
3. ✅ **Auto-Deploy**: ON

### **Sincronização de Schema**

Quando fizer alterações na base de dados:

1. Teste no **Testing Environment** primeiro
2. Execute migrações no Supabase Testing
3. Valide que tudo funciona
4. Exporte SQL da migração
5. Execute no **Production Environment**

**Comandos úteis:**
```bash
# Exportar schema do Testing
supabase db dump --db-url "postgresql://..." > migration.sql

# Aplicar no Production
psql "postgresql://..." < migration.sql
```

---

## 🛠️ Troubleshooting {#troubleshooting}

### **Erro: "Invalid API Key"**

**Causa**: Environment variables não configuradas corretamente no Vercel

**Solução**:
1. Vá a **Settings → Environment Variables** no Vercel
2. Verifique se todas as variáveis estão preenchidas
3. Faça **Redeploy** após corrigir

### **Erro: "Webhook signature verification failed"**

**Causa**: Webhook secret incorreto

**Solução**:
1. Copie o **Webhook Secret** correto do Stripe/EuPago
2. Atualize `STRIPE_WEBHOOK_SECRET` ou `EUPAGO_WEBHOOK_SECRET`
3. Redeploy

### **Preview não carrega após deploy**

**Solução**:
1. Verifique logs no Vercel: **Deployments → [seu deploy] → Logs**
2. Verifique se `next.config.mjs` está correto
3. Limpe cache: **Settings → General → Clear Cache**

### **Supabase Connection Error**

**Solução**:
1. Verifique se o projeto Supabase está ativo
2. Confirme que as **credenciais** estão corretas
3. Teste conexão direta: `https://SEU-PROJETO.supabase.co/rest/v1/`

---

## ✅ Checklist Final

### **Testing Environment**
- [ ] Projeto Supabase criado
- [ ] Schema SQL executado
- [ ] Storage buckets configurados
- [ ] Auth configurado
- [ ] Deploy Vercel configurado
- [ ] Environment variables configuradas
- [ ] Stripe Test Mode configurado
- [ ] EuPago Sandbox configurado
- [ ] Primeiro utilizador admin criado
- [ ] Planos de teste criados

### **Production Environment**
- [ ] Projeto Supabase criado
- [ ] Schema SQL executado
- [ ] Storage buckets configurados
- [ ] Auth configurado (confirmação de email ON)
- [ ] Deploy Vercel configurado
- [ ] Environment variables configuradas
- [ ] Stripe Live Mode configurado
- [ ] EuPago Production configurado
- [ ] Domínio personalizado configurado (opcional)
- [ ] SSL ativo
- [ ] Backups automáticos configurados
- [ ] Monitoring ativo

---

## 📞 Suporte

**Documentação adicional:**
- `SETUP_INSTRUCTIONS.md` - Instruções gerais de setup
- `GOOGLE_CALENDAR_SETUP.md` - Configuração Google Calendar
- `SUPABASE_EMAIL_CONFIG.md` - Configuração de emails Supabase
- `README_DEPLOYMENT.md` - Deployment geral

**Links úteis:**
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Stripe](https://stripe.com/docs)
- [Documentação Next.js](https://nextjs.org/docs)

---

🎉 **Parabéns!** O seu CRM imobiliário está agora configurado com ambientes de Testing e Production separados e profissionais!