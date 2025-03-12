
const { Client } = require('pg');

// Função para conectar ao banco de dados
async function connectToDatabase() {
  // Verifica se a variável de ambiente DATABASE_URL está definida
  if (!process.env.DATABASE_URL) {
    console.log('Variável DATABASE_URL não encontrada. Por favor, crie um banco de dados PostgreSQL no Replit.');
    console.log('Siga as instruções:');
    console.log('1. Abra uma nova aba no Replit e digite "Database"');
    console.log('2. No painel "Database", clique em "create a database"');
    console.log('3. Depois de criar o banco, as variáveis de ambiente estarão disponíveis');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados PostgreSQL!');
    
    // Exemplo de criação de tabela
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela "usuarios" criada ou já existente');

    // Exemplo de inserção de dados
    const insertResult = await client.query(
      'INSERT INTO usuarios (nome, email) VALUES ($1, $2) RETURNING *',
      ['Usuário Teste', 'teste@exemplo.com']
    );
    console.log('Usuário inserido:', insertResult.rows[0]);

    // Exemplo de consulta
    const queryResult = await client.query('SELECT * FROM usuarios');
    console.log('Usuários no banco de dados:');
    queryResult.rows.forEach(row => {
      console.log(`- ${row.id}: ${row.nome} (${row.email})`);
    });

  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } finally {
    await client.end();
    console.log('Conexão com o banco de dados encerrada');
  }
}

// Executar a função principal
connectToDatabase();
