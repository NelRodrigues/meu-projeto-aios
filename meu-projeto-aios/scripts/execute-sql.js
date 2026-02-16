#!/usr/bin/env node

/**
 * Script para executar o SQL de setup da base de dados
 * Executa via PostgreSQL wire protocol através do cliente pg
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  process.exit(1);
}

// Extrair credenciais Supabase da URL
// Format: https://[project-id].supabase.co
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectId) {
  console.error('❌ Erro: Não foi possível extrair o project ID da SUPABASE_URL');
  process.exit(1);
}

// Configuração PostgreSQL
const pgConfig = {
  host: `${projectId}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: SUPABASE_SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false }
};

async function executeSql() {
  const client = new pg.Client(pgConfig);

  try {
    console.log('🚀 Conectando ao Supabase PostgreSQL...');
    console.log(`   Host: ${pgConfig.host}`);
    console.log(`   Port: ${pgConfig.port}`);
    console.log(`   Database: ${pgConfig.database}`);
    console.log(`   User: ${pgConfig.user}\n`);

    await client.connect();
    console.log('✅ Conectado!\n');

    // Ler o ficheiro SQL
    const sqlPath = path.join(__dirname, '..', 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Dividir em statements (simplista, divide por ;)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    console.log(`📋 Executando ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        // Mostrar progresso
        const preview = statement.substring(0, 80).replace(/\n/g, ' ') + (statement.length > 80 ? '...' : '');
        process.stdout.write(`[${i + 1}/${statements.length}] ${preview}`);

        // Executar statement
        await client.query(statement);

        console.log(' ✅');
        successCount++;
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(' ℹ️  (já existe)');
          successCount++;
        } else {
          console.log(` ❌ ${err.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ SQL Executado com Sucesso!');
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Resultados:`);
    console.log(`   Statements Executados: ${successCount}`);
    console.log(`   Erros: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    // Verificar tabelas criadas
    console.log('📋 Verificando tabelas criadas...\n');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const expectedTables = [
      'clients',
      'projects',
      'revenues',
      'metrics_snapshots',
      'ai_insights',
      'ai_conversations',
      'data_sync_logs'
    ];

    const createdTables = tablesResult.rows.map(r => r.table_name);

    for (const table of expectedTables) {
      const exists = createdTables.includes(table);
      const symbol = exists ? '✅' : '❌';
      console.log(`${symbol} ${table}`);
    }

    console.log();

  } catch (err) {
    console.error('❌ Erro Fatal:', err.message);
    console.error('\n📋 Detalhes do Erro:');
    console.error(err.toString());
    if (err.code) console.error(`Código: ${err.code}`);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignorar erro ao fechar conexão
    }
  }
}

// Executar
executeSql();
