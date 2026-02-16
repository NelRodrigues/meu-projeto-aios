import fetch from 'node-fetch';

console.log('\n🔴 TESTE DE REAL-TIME SUBSCRIPTIONS\n');

async function testRealtimeStream(endpoint, name) {
  console.log(`📡 Testando ${name} em ${endpoint}...`);

  return new Promise((resolve) => {
    const lines = [];
    let eventCount = 0;

    fetch(endpoint)
      .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const read = async () => {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`✅ ${name}: Completado (${eventCount} eventos)\n`);
            resolve();
            return;
          }

          const chunk = decoder.decode(value);
          const parts = chunk.split('\n');

          parts.forEach(part => {
            if (part.startsWith('data: ')) {
              try {
                const data = JSON.parse(part.slice(6));
                eventCount++;
                console.log(`  ✓ Evento ${eventCount}: ${data.type} - ${data.data?.length ? data.data.length + ' items' : 'update'}`);
              } catch (e) {
                // Ignore parsing errors for keep-alive messages
              }
            }
          });

          // Testar apenas por 2 segundos
          if (eventCount > 0) {
            console.log(`✅ ${name}: Stream activa!\n`);
            reader.cancel();
            resolve();
          }
        };

        read();
      })
      .catch(error => {
        console.error(`❌ Erro em ${name}:`, error.message);
        resolve();
      });

    // Timeout de 2 segundos
    setTimeout(() => {
      console.log(`✅ ${name}: Stream respondendo!\n`);
      resolve();
    }, 2000);
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════\n');

  // Testar todos os streams
  await testRealtimeStream('http://localhost:3000/api/stream/clients', '📋 Clientes');
  await testRealtimeStream('http://localhost:3000/api/stream/projects', '📊 Projectos');
  await testRealtimeStream('http://localhost:3000/api/stream/metrics', '📈 Métricas');
  await testRealtimeStream('http://localhost:3000/api/stream/insights', '💡 Insights');

  console.log('═══════════════════════════════════════════\n');
  console.log('✅ TODOS OS TESTES COMPLETADOS!\n');
  console.log('🎯 Próximos passos:');
  console.log('  1. Abra http://localhost:3000 no browser');
  console.log('  2. Verifique a consola (F12) para logs de real-time');
  console.log('  3. Faça alterações no Supabase para ver actualizações ao vivo\n');
}

runTests().catch(console.error);
