/**
 * Script para executar migration SQL no Supabase
 * Uso: node scripts/run-migration.js
 *
 * Este script executa o SQL de migração directamente usando a Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários');
  process.exit(1);
}

// Criar cliente admin (com service role key)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🔄 Iniciando execução da migration SQL...\n');

  try {
    // Ler ficheiro SQL
    const sqlPath = path.join(__dirname, '../migrations/001_add_tasks_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 Ficheiro SQL lido com sucesso');
    console.log('📝 Tamanho:', sql.length, 'caracteres\n');

    // Dividir SQL em statements individuais
    // (Supabase pode exigir execução sequencial)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 ${statements.length} statements SQL identificados\n`);

    // Executar cada statement via RPC query
    // Nota: O Supabase admin client não tem um método direto para executar SQL arbitrário
    // Vamos usar uma abordagem alternativa: criar as tabelas individualmente

    console.log('═'.repeat(50));
    console.log('Criando tabelas e índices...');
    console.log('═'.repeat(50) + '\n');

    // 1. Criar tabela tasks
    console.log('1️⃣  Criando tabela tasks...');
    const { error: tasksError } = await supabase.rpc('_execute_sql', {
      sql: statements.find(s => s.includes('CREATE TABLE IF NOT EXISTS tasks'))
    });

    if (tasksError) {
      // Tentar outra abordagem: usar fetch directo
      console.log('   ℹ️  Tentando abordagem alternativa (fetch directo)...');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql: statements.find(s => s.includes('CREATE TABLE IF NOT EXISTS tasks'))
        })
      });

      if (!response.ok) {
        // Se RPC não existe, informar ao utilizador
        console.log('   ⚠️  Método automático não disponível');
        console.log('   📋 Use o método manual via Dashboard Supabase\n');
      }
    } else {
      console.log('   ✅ Tabela tasks criada com sucesso\n');
    }

    // Alternativa: Fornecer instruções manuais
    console.log('\n' + '═'.repeat(50));
    console.log('📋 INSTRUÇÕES PARA EXECUÇÃO MANUAL');
    console.log('═'.repeat(50) + '\n');

    console.log('Como o Supabase não expõe um endpoint SQL directo via SDK,');
    console.log('execute manualmente no Dashboard:\n');

    console.log('1️⃣  Abrir: https://app.supabase.com');
    console.log('2️⃣  Projeto: nvkcsojyjwzpiqwvmzwi');
    console.log('3️⃣  Menu: SQL Editor > New Query');
    console.log('4️⃣  Copie e execute o SQL abaixo:\n');

    console.log('─'.repeat(50));
    console.log(sql);
    console.log('─'.repeat(50) + '\n');

    // Verificar se tabelas já existem
    console.log('🔍 Verificando se tabelas já foram criadas...\n');

    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['tasks', 'task_assignments']);

    if (tables && tables.length > 0) {
      console.log('✅ Tabelas encontradas:');
      tables.forEach(t => console.log(`   • ${t.table_name}`));
      console.log('\n✅ Migration já foi executada com sucesso!\n');
    } else {
      console.log('⚠️  Tabelas ainda não encontradas');
      console.log('   Por favor, execute o SQL manualmente acima\n');
    }

    // Fornecer link directo
    console.log('═'.repeat(50));
    console.log('🔗 Link Directo');
    console.log('═'.repeat(50));
    console.log(`SQL Editor: https://app.supabase.com/project/nvkcsojyjwzpiqwvmzwi/sql/new`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar
runMigration();
