-- ============================================
-- SCRIPT PARA LIMPAR DADOS DE TESTE
-- ============================================
-- ⚠️ ATENÇÃO: Apenas executar em ambiente de TESTES!
-- ⚠️ Este script apaga TODOS os dados das tabelas

-- ANTES DE EXECUTAR, CONFIRME:
-- 1. Você está no projeto Supabase de TESTES (não produção)
-- 2. Verificou o nome do projeto no dashboard
-- 3. Tem certeza que quer apagar todos os dados

-- ============================================
-- DELETAR DADOS (ordem importante por foreign keys)
-- ============================================

-- Tabelas dependentes primeiro
DELETE FROM lead_property_matches;
DELETE FROM workflow_executions;
DELETE FROM notifications;
DELETE FROM documents;
DELETE FROM tasks;
DELETE FROM calendar_events;
DELETE FROM interactions;
DELETE FROM payment_methods;
DELETE FROM subscriptions;

-- Tabelas principais
DELETE FROM properties;
DELETE FROM leads;
DELETE FROM contacts;
DELETE FROM system_settings;
DELETE FROM workflow_templates;

-- ============================================
-- RESET SEQUENCES (OPCIONAL)
-- ============================================
-- Isso faz os IDs voltarem a começar do 1
-- Comentado por padrão para segurança

-- TRUNCATE TABLE lead_property_matches RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE workflow_executions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE documents RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE calendar_events RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE interactions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE payment_methods RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE properties RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE leads RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE contacts RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE system_settings RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE workflow_templates RESTART IDENTITY CASCADE;

-- ============================================
-- MANTER APENAS USUÁRIO ADMIN
-- ============================================
-- Remove todos os usuários exceto admin@test.com

DELETE FROM auth.users WHERE email != 'admin@test.com';
DELETE FROM profiles WHERE email != 'admin@test.com';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute estas queries para confirmar limpeza:

-- SELECT COUNT(*) as total_leads FROM leads;
-- SELECT COUNT(*) as total_properties FROM properties;
-- SELECT COUNT(*) as total_contacts FROM contacts;
-- SELECT COUNT(*) as total_users FROM auth.users;

-- ✅ Todos os counts devem retornar 0, exceto users (deve ser 1 - admin)

-- ============================================
-- POPULAR COM DADOS DE TESTE BÁSICOS (OPCIONAL)
-- ============================================

-- Inserir leads de teste
INSERT INTO leads (name, email, phone, status, budget_min, budget_max, lead_type, user_id)
VALUES 
  ('João Silva', 'joao@test.com', '912345678', 'new', 150000, 250000, 'buyer', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Maria Santos', 'maria@test.com', '913456789', 'contacted', 200000, 300000, 'buyer', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Pedro Costa', 'pedro@test.com', '914567890', 'qualified', 180000, 280000, 'seller', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Ana Oliveira', 'ana@test.com', '915678901', 'proposal', 220000, 320000, 'buyer', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Carlos Ferreira', 'carlos@test.com', '916789012', 'negotiation', 300000, 400000, 'both', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- Inserir propriedades de teste
INSERT INTO properties (title, description, type, price, location, bedrooms, bathrooms, area, status, user_id)
VALUES 
  ('Apartamento T2 Centro', 'Apartamento moderno no centro da cidade', 'apartment', 220000, 'Lisboa, Portugal', 2, 2, 85, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Moradia T3 Cascais', 'Moradia com jardim e piscina', 'house', 450000, 'Cascais, Portugal', 3, 3, 150, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Apartamento T1 Estoril', 'Apartamento renovado junto à praia', 'apartment', 180000, 'Estoril, Portugal', 1, 1, 55, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Moradia T4 Sintra', 'Moradia espaçosa com vista serra', 'house', 550000, 'Sintra, Portugal', 4, 3, 200, 'available', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- Inserir contactos de teste
INSERT INTO contacts (name, email, phone, type, user_id)
VALUES 
  ('Ricardo Almeida', 'ricardo@test.com', '917890123', 'lead', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Sofia Martins', 'sofia@test.com', '918901234', 'client', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Miguel Rocha', 'miguel@test.com', '919012345', 'partner', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ✅ Dados de teste básicos criados!