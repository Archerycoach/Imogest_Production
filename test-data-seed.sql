-- ============================================
-- SCRIPT PARA POPULAR DADOS DE TESTE
-- ============================================
-- 📝 Cria dados fictícios realistas para testes

-- ⚠️ IMPORTANTE: Execute apenas em ambiente de TESTES
-- Verifique que está no projeto correto antes de executar!

-- ============================================
-- LEADS DE TESTE (15 leads com status variados)
-- ============================================

INSERT INTO leads (name, email, phone, status, budget_min, budget_max, lead_type, source, notes, user_id)
VALUES 
  -- Compradores
  ('João Silva', 'joao.silva@test.com', '912345678', 'new', 150000, 250000, 'buyer', 'website', 'Primeiro contacto, procura T2 em Lisboa', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Maria Santos', 'maria.santos@test.com', '913456789', 'contacted', 200000, 300000, 'buyer', 'referral', 'Interessada em apartamento com varanda', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Pedro Costa', 'pedro.costa@test.com', '914567890', 'qualified', 250000, 350000, 'buyer', 'phone', 'Orçamento confirmado, quer visitar propriedades', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Ana Oliveira', 'ana.oliveira@test.com', '915678901', 'proposal', 220000, 320000, 'buyer', 'website', 'Proposta enviada para apartamento em Cascais', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Carlos Ferreira', 'carlos.ferreira@test.com', '916789012', 'negotiation', 300000, 400000, 'buyer', 'social_media', 'Negociando preço final', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Rita Mendes', 'rita.mendes@test.com', '917890123', 'closed', 280000, 280000, 'buyer', 'referral', 'Negócio fechado! Apartamento T3', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Bruno Alves', 'bruno.alves@test.com', '918901234', 'lost', 180000, 250000, 'buyer', 'website', 'Desistiu - encontrou via concorrência', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Vendedores
  ('Sofia Rodrigues', 'sofia.rodrigues@test.com', '919012345', 'new', 0, 0, 'seller', 'phone', 'Quer vender apartamento T2 no Porto', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Miguel Rocha', 'miguel.rocha@test.com', '920123456', 'contacted', 0, 0, 'seller', 'website', 'Moradia T3 em Braga para avaliação', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Patrícia Lima', 'patricia.lima@test.com', '921234567', 'qualified', 0, 0, 'seller', 'referral', 'Avaliação feita: 350.000€', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Rui Santos', 'rui.santos@test.com', '922345678', 'proposal', 0, 0, 'seller', 'social_media', 'Contrato de angariação assinado', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Teresa Costa', 'teresa.costa@test.com', '923456789', 'negotiation', 0, 0, 'seller', 'website', 'Marketing ativo, 3 propostas recebidas', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('André Martins', 'andre.martins@test.com', '924567890', 'closed', 0, 0, 'seller', 'referral', 'Vendido! CPCV assinado', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Ambos (comprador + vendedor)
  ('Luísa Pereira', 'luisa.pereira@test.com', '925678901', 'contacted', 300000, 450000, 'both', 'website', 'Quer vender T2 e comprar T3', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Gonçalo Neves', 'goncalo.neves@test.com', '926789012', 'qualified', 400000, 600000, 'both', 'referral', 'Troca de moradia - timing importante', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ============================================
-- PROPRIEDADES DE TESTE (20 propriedades variadas)
-- ============================================

INSERT INTO properties (title, description, type, price, location, bedrooms, bathrooms, area, status, features, images, user_id)
VALUES 
  -- Apartamentos
  ('Apartamento T2 Centro Lisboa', 'Apartamento moderno totalmente renovado no coração de Lisboa. Cozinha equipada, ar condicionado, excelentes acabamentos.', 'apartment', 220000, 'Av. da Liberdade, Lisboa', 2, 2, 85, 'available', 'Ar Condicionado,Elevador,Cozinha Equipada,Varanda', '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Apartamento T1 Estoril', 'Apartamento renovado a 5min da praia. Vista mar, varandas, garagem. Perfeito para investimento ou habitação própria.', 'apartment', 180000, 'Rua do Mar, Estoril', 1, 1, 55, 'available', 'Vista Mar,Garagem,Piscina,Elevador', '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Apartamento T3 Cascais', 'Espaçoso T3 em condomínio fechado com jardins e piscina. 3 frentes, muita luz natural, 2 lugares de garagem.', 'apartment', 320000, 'Cascais Centro, Cascais', 3, 2, 110, 'available', 'Condomínio Fechado,Piscina,Garagem,Ar Condicionado', '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Apartamento T2 Belém', 'T2 junto ao rio com vista panorâmica. Acabamentos de luxo, domotica, cozinha italiana, 2 varandas amplas.', 'apartment', 380000, 'Av. Brasília, Belém', 2, 2, 95, 'available', 'Vista Rio,Domotica,Varanda,Garagem', '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Apartamento T0 Parque Nações', 'Studio moderno ideal para investimento. Totalmente mobilado e equipado. Alta rentabilidade em arrendamento.', 'apartment', 150000, 'Parque das Nações, Lisboa', 0, 1, 35, 'rented', 'Mobilado,Ar Condicionado,Condomínio Fechado', '["https://images.unsplash.com/photo-1536376072261-38c75010e6c9"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Moradias
  ('Moradia T3 Sintra', 'Moradia isolada com jardim e piscina. Vista serra, 3 quartos suite, garagem para 2 carros, churrasqueira.', 'house', 550000, 'Colares, Sintra', 4, 3, 200, 'available', 'Piscina,Jardim,Garagem,Churrasqueira,Vista Serra', '["https://images.unsplash.com/photo-1568605114967-8130f3a36994"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Moradia T4 Cascais', 'Moradia de luxo em condomínio privado. Piscina aquecida, ginásio, wine cellar, domótica completa.', 'house', 890000, 'Quinta da Beloura, Cascais', 4, 4, 280, 'available', 'Piscina Aquecida,Ginásio,Condomínio Fechado,Domotica,Garagem', '["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Moradia T3 Oeiras', 'Moradia geminada renovada. Jardim privativo, garagem, 2 pisos, excelente exposição solar.', 'house', 420000, 'Paço de Arcos, Oeiras', 3, 3, 145, 'available', 'Jardim,Garagem,Renovado,Churrasqueira', '["https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Moradia T5 Estoril', 'Moradia clássica com charme único. Jardim com árvores centenárias, piscina, anexo independente.', 'house', 1200000, 'Monte Estoril, Cascais', 5, 4, 350, 'sold', 'Piscina,Jardim,Anexo,Vista Mar,Garagem', '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Terrenos
  ('Terreno Construção Sintra', 'Terreno para construção de moradia unifamiliar. Área 500m2, todas as infraestruturas, excelente localização.', 'land', 180000, 'Sintra', 0, 0, 500, 'available', 'Infraestruturas,Zona Residencial', '["https://images.unsplash.com/photo-1500382017468-9049fed747ef"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Terreno Urbano Cascais', 'Lote para construção em zona premium. 800m2, permite construção de 400m2. Vista mar ao longe.', 'land', 350000, 'Cascais', 0, 0, 800, 'available', 'Vista Mar,Zona Premium,Infraestruturas', '["https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Comercial
  ('Loja Centro Lisboa', 'Loja comercial em zona de grande movimento. 80m2, montra para rua, wc, ideal para comércio ou serviços.', 'commercial', 220000, 'Chiado, Lisboa', 0, 1, 80, 'available', 'Montra,WC,Zona Comercial', '["https://images.unsplash.com/photo-1441986300917-64674bd600d8"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Escritório Parque Nações', 'Escritório moderno em edifício prime. 120m2, open space, 3 wc, ar condicionado, 3 lugares estacionamento.', 'commercial', 280000, 'Parque das Nações, Lisboa', 0, 3, 120, 'available', 'Ar Condicionado,Estacionamento,Elevador', '["https://images.unsplash.com/photo-1497366216548-37526070297c"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Armazém Loures', 'Armazém industrial com área de escritórios. 500m2, pé direito 6m, portão para camiões, zona industrial.', 'commercial', 380000, 'Loures', 0, 2, 500, 'available', 'Zona Industrial,Portão Camiões,Escritórios', '["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  -- Propriedades adicionais para completar 20
  ('Apartamento T2 Campo Ourique', 'Apartamento típico lisboeta. Tetos altos, chão madeira original, varanda, próximo comércio e transportes.', 'apartment', 250000, 'Campo de Ourique, Lisboa', 2, 1, 75, 'available', 'Tetos Altos,Chão Madeira,Varanda', '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Moradia T3 Ericeira', 'Moradia a 10min da praia. Jardim, churrasqueira, garagem, perfeita para viver ou férias.', 'house', 380000, 'Ericeira, Mafra', 3, 2, 150, 'available', 'Jardim,Churrasqueira,Garagem,Próximo Praia', '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Apartamento T1 Cais Sodré', 'T1 totalmente renovado em edifício histórico. Cozinha americana, ar condicionado, ideal para investimento.', 'apartment', 195000, 'Cais do Sodré, Lisboa', 1, 1, 45, 'available', 'Renovado,Ar Condicionado,Zona Turística', '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Moradia T4 Mafra', 'Moradia espaçosa em zona calma. 4 quartos, jardim amplo, garagem dupla, próximo escolas.', 'house', 460000, 'Mafra', 4, 3, 180, 'available', 'Jardim,Garagem,Zona Calma,Próximo Escolas', '["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Penthouse T3 Avenidas Novas', 'Penthouse de luxo com terraço 360°. Vista cidade, piscina privada, 2 suites, garagem 3 carros.', 'apartment', 750000, 'Avenidas Novas, Lisboa', 3, 3, 150, 'available', 'Terraço,Piscina Privada,Vista Cidade,Garagem', '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"]', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  
  ('Quinta Alentejo', 'Quinta com 5 hectares. Casa principal T4, anexo T2, piscina, olival, vinha. Ideal turismo rural.', 'house', 680000, 'Évora, Alentejo', 6, 4, 300, 'available', 'Piscina,Terreno 5ha,Anexo,Olival,Vinha', '["https://images.unsplash.com/photo-1564013799919-ab600027ffc6"]', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ============================================
-- CONTACTOS DE TESTE (10 contactos)
-- ============================================

INSERT INTO contacts (name, email, phone, type, company, notes, user_id)
VALUES 
  ('Ricardo Almeida', 'ricardo.almeida@test.com', '917890123', 'lead', NULL, 'Contacto inicial por website', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Sofia Martins', 'sofia.martins@test.com', '918901234', 'client', NULL, 'Cliente ativo - comprou T2 em 2024', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Miguel Rocha', 'miguel.rocha@test.com', '919012345', 'partner', 'Banco Exemplo', 'Parceiro financiamento', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Catarina Lopes', 'catarina.lopes@test.com', '920123456', 'lead', NULL, 'Interessada em T3 Cascais', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Diogo Silva', 'diogo.silva@test.com', '921234567', 'client', NULL, 'Cliente vendedor - moradia Sintra', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Inês Costa', 'ines.costa@test.com', '922345678', 'partner', 'Seguros Exemplo', 'Parceira seguros habitação', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Tiago Mendes', 'tiago.mendes@test.com', '923456789', 'lead', NULL, 'Procura investimento - apartamentos', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Mariana Ferreira', 'mariana.ferreira@test.com', '924567890', 'client', NULL, 'Cliente comprador - fechado 2024', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Hugo Santos', 'hugo.santos@test.com', '925678901', 'partner', 'Construções Exemplo', 'Parceiro obras e renovações', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Beatriz Oliveira', 'beatriz.oliveira@test.com', '926789012', 'lead', NULL, 'Referenciada por Sofia Martins', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ============================================
-- TAREFAS DE TESTE (8 tarefas)
-- ============================================

INSERT INTO tasks (title, description, due_date, priority, status, assigned_to, user_id)
VALUES 
  ('Ligar João Silva', 'Seguimento após envio brochuras T2 Lisboa', CURRENT_DATE + INTERVAL '1 day', 'high', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Preparar proposta Ana Oliveira', 'Proposta apartamento Cascais - 320k', CURRENT_DATE + INTERVAL '2 days', 'high', 'in_progress', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Agendar visita Maria Santos', 'Visita a 3 apartamentos T2 amanhã 15h', CURRENT_DATE + INTERVAL '1 day', 'medium', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Fotografia Moradia Sintra', 'Agendar fotógrafo profissional', CURRENT_DATE + INTERVAL '3 days', 'medium', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Enviar contrato Teresa Costa', 'Contrato angariação para assinatura', CURRENT_DATE, 'high', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Seguimento Rita Mendes', 'Confirmar data escritura', CURRENT_DATE + INTERVAL '5 days', 'low', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Atualizar anúncios online', 'Refresh fotos e descrições portais', CURRENT_DATE + INTERVAL '7 days', 'low', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ('Reunião equipa semanal', 'Review de leads e objetivos', CURRENT_DATE + INTERVAL '7 days', 'medium', 'pending', (SELECT id FROM profiles WHERE email = 'admin@test.com'), (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ============================================
-- INTERAÇÕES DE TESTE (5 interações)
-- ============================================

INSERT INTO interactions (lead_id, type, notes, user_id)
VALUES 
  ((SELECT id FROM leads WHERE email = 'joao.silva@test.com'), 'call', 'Primeiro contacto - interessado em T2 centro Lisboa. Budget confirmado 150k-250k. Agendar visitas próxima semana.', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ((SELECT id FROM leads WHERE email = 'maria.santos@test.com'), 'email', 'Enviadas brochuras de 5 apartamentos T2. Aguardar feedback até sexta-feira.', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ((SELECT id FROM leads WHERE email = 'pedro.costa@test.com'), 'meeting', 'Reunião presencial. Perfil definido: T2/T3, máx 350k, zona Cascais/Estoril. Visitou 2 propriedades - feedback positivo.', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ((SELECT id FROM leads WHERE email = 'ana.oliveira@test.com'), 'email', 'Proposta formal enviada para apartamento Cascais 320k. Prazo resposta: 48h.', (SELECT id FROM profiles WHERE email = 'admin@test.com')),
  ((SELECT id FROM leads WHERE email = 'carlos.ferreira@test.com'), 'call', 'Negociação preço - vendedor aceita 380k (inicial 400k). Cliente pensa até segunda.', (SELECT id FROM profiles WHERE email = 'admin@test.com'));

-- ============================================
-- MATCHES LEAD-PROPRIEDADE (10 matches)
-- ============================================

INSERT INTO lead_property_matches (lead_id, property_id, match_score, status)
VALUES 
  ((SELECT id FROM leads WHERE email = 'joao.silva@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T2 Centro Lisboa'), 95, 'matched'),
  ((SELECT id FROM leads WHERE email = 'joao.silva@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T2 Campo Ourique'), 88, 'matched'),
  ((SELECT id FROM leads WHERE email = 'maria.santos@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T2 Belém'), 92, 'viewed'),
  ((SELECT id FROM leads WHERE email = 'maria.santos@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T2 Centro Lisboa'), 85, 'viewed'),
  ((SELECT id FROM leads WHERE email = 'pedro.costa@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T3 Cascais'), 94, 'interested'),
  ((SELECT id FROM leads WHERE email = 'ana.oliveira@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T3 Cascais'), 96, 'proposal_sent'),
  ((SELECT id FROM leads WHERE email = 'carlos.ferreira@test.com'), (SELECT id FROM properties WHERE title = 'Moradia T3 Oeiras'), 89, 'negotiating'),
  ((SELECT id FROM leads WHERE email = 'rita.mendes@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T2 Belém'), 93, 'closed'),
  ((SELECT id FROM leads WHERE email = 'luisa.pereira@test.com'), (SELECT id FROM properties WHERE title = 'Apartamento T3 Cascais'), 87, 'matched'),
  ((SELECT id FROM leads WHERE email = 'goncalo.neves@test.com'), (SELECT id FROM properties WHERE title = 'Moradia T4 Mafra'), 91, 'matched');

-- ============================================
-- VERIFICAÇÃO DOS DADOS CRIADOS
-- ============================================

-- Execute estas queries para confirmar:
-- SELECT COUNT(*) as total_leads FROM leads;           -- Deve retornar 15
-- SELECT COUNT(*) as total_properties FROM properties; -- Deve retornar 20
-- SELECT COUNT(*) as total_contacts FROM contacts;     -- Deve retornar 10
-- SELECT COUNT(*) as total_tasks FROM tasks;           -- Deve retornar 8
-- SELECT COUNT(*) as total_interactions FROM interactions; -- Deve retornar 5
-- SELECT COUNT(*) as total_matches FROM lead_property_matches; -- Deve retornar 10

-- ✅ Dados de teste criados com sucesso!
-- 📊 15 Leads | 20 Propriedades | 10 Contactos | 8 Tarefas | 5 Interações | 10 Matches