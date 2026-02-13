const { Server } = require('aios');

// Criar uma instância do servidor AIOS
const server = new Server({
  host: 'localhost',
  port: 8118
});

console.log('✅ Servidor AIOS criado com sucesso!');
console.log('Configuração:', server.options);
console.log('');

// Exemplo 1: Testar ping
console.log('📡 Testando ping....');
const pingResult = server.ping();
console.log('Resultado do ping:', pingResult);
console.log('');

// Exemplo 2: Executar um comando
console.log('⚙️  Executando comando....');
const cmdResult = server.command('info');
console.log('Resultado do comando:', cmdResult);
console.log('');

// Exemplo 3: Verificar data sources
console.log('📊 Data sources disponíveis:', Object.keys(server.dataSources));
console.log('');

// Exemplo 4: Operações assíncronas
async function exemploAssincrono() {
  console.log('⏳ Executando operações assíncronas...');

  try {
    // Ping assíncrono
    const pingAsync = await server.pingAsync();
    console.log('Ping assíncrono:', pingAsync);

    // Comando assíncrono
    const cmdAsync = await server.commandAsync('status');
    console.log('Comando assíncrono:', cmdAsync);

  } catch (error) {
    console.error('Erro:', error.message);
  }

  console.log('\n✨ Exemplos concluídos!');
}

// Executar exemplos assíncronos
exemploAssincrono();

