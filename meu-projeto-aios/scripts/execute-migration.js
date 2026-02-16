/**
 * Script para executar migration no Supabase via API REST
 * Este script cria as tabelas necessárias para a integração ClickUp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Configure SUPABASE_URL e SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Ler SQL
const sqlPath = path.join(__dirname, '../migrations/001_add_tasks_tables.sql');
const fullSQL = fs.readFileSync(sqlPath, 'utf-8');

// Separar statements
const statements = fullSQL
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log('📋 SQL Migration Runner');
console.log('═'.repeat(60));
console.log(`Ficheiro: ${path.basename(sqlPath)}`);
console.log(`Statements: ${statements.length}`);
console.log(`URL: ${SUPABASE_URL}`);
console.log('═'.repeat(60) + '\n');

async function executeSQL(sql) {
  try {
    // Tentar usar a API de query do Supabase
    // Nota: Isto pode não funcionar se o endpoint não existe
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    return {
      success: response.ok,
      status: response.status,
      data: await response.json()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkTables() {
  try {
    // Tentar verificar se tabelas existem
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?table_name=in.("tasks","task_assignments")`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('⚠️  Não foi possível verificar tabelas:', error.message);
  }
  return null;
}

async function main() {
  console.log('🔄 Verificando estado das tabelas...\n');

  const existing = await checkTables();
  if (existing && existing.length > 0) {
    console.log('✅ Tabelas já existem:');
    existing.forEach(t => console.log(`   • ${t.table_name}`));
    console.log('\n✅ Migration já foi executada!\n');
    return;
  }

  console.log('📝 Executando migration SQL...\n');

  // Tentar executar o SQL completo
  const result = await executeSQL(fullSQL);

  if (result.success) {
    console.log('✅ Migration executada com sucesso!\n');

    // Verificar novamente
    const tables = await checkTables();
    if (tables) {
      console.log('📊 Tabelas criadas:');
      tables.forEach(t => {
        console.log(`   ✅ ${t.table_name}`);
      });
    }
  } else if (result.status === 404) {
    console.log('ℹ️  Endpoint RPC não disponível');
    console.log('📋 Use o método manual:\n');
    printManualInstructions();
  } else {
    console.log('⚠️  Erro ao executar:', result.error || result.data);
    console.log('\n📋 Use o método manual:\n');
    printManualInstructions();
  }
}

function printManualInstructions() {
  const dashboardUrl = `https://app.supabase.com/project/${SUPABASE_URL.split('https://')[1]?.split('.')[0] || 'byfzlwkgzftpzduswxus'}`;

  console.log('1️⃣  Abrir: https://app.supabase.com');
  console.log('2️⃣  Seleccione o projeto');
  console.log('3️⃣  Menu: SQL Editor > New Query');
  console.log('4️⃣  Copie e execute:\n');
  console.log('─'.repeat(60));
  console.log(fullSQL);
  console.log('─'.repeat(60));
  console.log('\n5️⃣  Execute (Ctrl+Enter ou botão "Run")');
  console.log('\n🔗 Link directo:');
  console.log(`${dashboardUrl}/sql/new`);
}

main().catch(console.error);
