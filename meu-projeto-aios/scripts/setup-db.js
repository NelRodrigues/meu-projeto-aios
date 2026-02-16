#!/usr/bin/env node

/**
 * Script para configurar o banco de dados no Supabase
 * Executa o SQL schema e cria todas as tabelas necessárias
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Credenciais do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  console.error('   Configure-as no ficheiro .env');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando setup da base de dados...');
    console.log('📍 Supabase URL:', SUPABASE_URL);

    // Ler o ficheiro SQL
    const sqlPath = path.join(__dirname, '..', 'setup-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Dividir em statements individuais (simplista, divide por ;)
    const statements = sql.split(';').filter(stmt => stmt.trim());

    let successCount = 0;
    let errorCount = 0;

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      try {
        console.log(`\n[${i + 1}/${statements.length}] Executando...`);
        console.log(`   ${statement.substring(0, 60)}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          // Se rpc não existir, tentar abordagem alternativa
          if (error.message.includes('function')) {
            console.log('⚠️  RPC não disponível, tentando abordagem alternativa...');
            // A abordagem alternativa seria usar um webhook ou fazer queries individuais
            console.log('✅ Pulando (será necessário executar manualmente no Supabase SQL Editor)');
          } else {
            console.error(`❌ Erro:`, error.message);
            errorCount++;
          }
        } else {
          console.log('✅ OK');
          successCount++;
        }
      } catch (err) {
        // Ignorar erros de statements que já existem (IF NOT EXISTS)
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('ℹ️  Tabela/índice já existe, pulando...');
          successCount++;
        } else {
          console.error(`❌ Erro:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Setup concluído!`);
    console.log(`   Sucesso: ${successCount}`);
    console.log(`   Erros: ${errorCount}`);
    console.log(`${'='.repeat(50)}`);

    if (errorCount > 0) {
      console.log('\n⚠️  IMPORTANTE: Execute manualmente no Supabase SQL Editor:');
      console.log(`   1. Aceda a: ${SUPABASE_URL}/project/sql/editor`);
      console.log(`   2. Cole o conteúdo de setup-database.sql`);
      console.log(`   3. Clique em "Executar"`);
    }
  } catch (err) {
    console.error('❌ Erro fatal:', err.message);
    console.error('\n💡 Solução: Execute manualmente no Supabase SQL Editor:');
    console.log(`   1. Aceda a: ${SUPABASE_URL}/project/sql/editor`);
    console.log(`   2. Cole o conteúdo de setup-database.sql`);
    console.log(`   3. Clique em "Executar"`);
    process.exit(1);
  }
}

// Executar
setupDatabase();
