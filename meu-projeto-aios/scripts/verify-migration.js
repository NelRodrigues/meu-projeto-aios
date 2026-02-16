/**
 * Script para verificar se as tabelas foram criadas no Supabase
 * Uso: node scripts/verify-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Configure SUPABASE_URL e SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyMigration() {
  console.log('\n🔍 Verificando Migration no Supabase...\n');
  console.log('═'.repeat(60));

  try {
    // 1. Verificar tabela tasks
    console.log('\n1️⃣ Verificando tabela: tasks');
    console.log('─'.repeat(60));

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (!tasksError) {
      console.log('✅ Tabela tasks EXISTE');
      console.log(`   Estrutura verificada: ${tasksData ? 'OK' : 'Erro ao ler'}`);

      // Tentar contar registos
      const { count: tasksCount, error: countError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`   Registos: ${tasksCount || 0}`);
      }
    } else {
      console.log('❌ Tabela tasks NÃO EXISTE');
      console.log(`   Erro: ${tasksError.message}`);
    }

    // 2. Verificar tabela task_assignments
    console.log('\n2️⃣ Verificando tabela: task_assignments');
    console.log('─'.repeat(60));

    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1);

    if (!assignmentsError) {
      console.log('✅ Tabela task_assignments EXISTE');
      console.log(`   Estrutura verificada: ${assignmentsData ? 'OK' : 'Erro ao ler'}`);

      // Tentar contar registos
      const { count: assignCount, error: countError } = await supabase
        .from('task_assignments')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`   Registos: ${assignCount || 0}`);
      }
    } else {
      console.log('❌ Tabela task_assignments NÃO EXISTE');
      console.log(`   Erro: ${assignmentsError.message}`);
    }

    // 3. Verificar estrutura das tabelas via information_schema
    console.log('\n3️⃣ Verificando colunas das tabelas');
    console.log('─'.repeat(60));

    // Tabela tasks
    const { data: taskColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'tasks');

    if (!columnsError && taskColumns && taskColumns.length > 0) {
      console.log('\n📋 Tabela: tasks');
      console.log('   Colunas:');
      taskColumns.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
    }

    // Tabela task_assignments
    const { data: assignColumns, error: assignColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'task_assignments');

    if (!assignColError && assignColumns && assignColumns.length > 0) {
      console.log('\n📋 Tabela: task_assignments');
      console.log('   Colunas:');
      assignColumns.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
    }

    // 4. Verificar índices
    console.log('\n4️⃣ Verificando índices');
    console.log('─'.repeat(60));

    const { data: indexes, error: indexError } = await supabase
      .from('information_schema.statistics')
      .select('index_name, column_name')
      .in('table_name', ['tasks', 'task_assignments']);

    if (!indexError && indexes && indexes.length > 0) {
      console.log('\n📊 Índices encontrados:');
      const uniqueIndexes = [...new Set(indexes.map(i => i.index_name))];
      uniqueIndexes.forEach(idx => {
        console.log(`   ✅ ${idx}`);
      });
    } else {
      console.log('⚠️  Não foi possível verificar índices');
    }

    // 5. Teste de inserção
    console.log('\n5️⃣ Teste de inserção (INSERT)');
    console.log('─'.repeat(60));

    const testTask = {
      external_id: `test_${Date.now()}`,
      name: 'Tarefa de Teste',
      status: 'open',
      priority: 3
    };

    const { data: insertData, error: insertError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select();

    if (!insertError) {
      console.log('✅ INSERT funciona corretamente');
      console.log(`   Tarefa criada: ${testTask.external_id}`);

      // Limpar dados de teste
      await supabase
        .from('tasks')
        .delete()
        .eq('external_id', testTask.external_id);
      console.log('   Dados de teste removidos');
    } else {
      console.log('❌ Erro ao fazer INSERT');
      console.log(`   Erro: ${insertError.message}`);
    }

    // 6. Resumo final
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMO DA VERIFICAÇÃO');
    console.log('═'.repeat(60));

    const tasksExists = !tasksError;
    const assignmentsExists = !assignmentsError;
    const columnsOk = taskColumns && taskColumns.length > 0;
    const indexesOk = indexes && indexes.length > 0;
    const insertOk = !insertError;

    console.log('\n✅ MIGRATION STATUS:');
    console.log(`   ${tasksExists ? '✅' : '❌'} Tabela tasks criada`);
    console.log(`   ${assignmentsExists ? '✅' : '❌'} Tabela task_assignments criada`);
    console.log(`   ${columnsOk ? '✅' : '⚠️'} Colunas verificadas`);
    console.log(`   ${indexesOk ? '✅' : '⚠️'} Índices criados`);
    console.log(`   ${insertOk ? '✅' : '❌'} INSERT/SELECT funcionam`);

    if (tasksExists && assignmentsExists && insertOk) {
      console.log('\n🎉 MIGRATION COMPLETA E FUNCIONAL!\n');
      return true;
    } else {
      console.log('\n⚠️  MIGRATION INCOMPLETA OU COM ERROS\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar migration:', error.message);
    return false;
  }
}

verifyMigration();
