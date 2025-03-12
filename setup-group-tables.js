
const { Client } = require('pg');

async function setupGroupTables() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('Variável DATABASE_URL não encontrada. Configure a conexão com o banco de dados.');
      return;
    }

    console.log('Conectando ao banco de dados...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('Conexão realizada com sucesso.');

    // 1. Verificar e criar tabela groups se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        logo_url TEXT,
        group_url TEXT,
        affiliate_url TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela groups verificada/criada.');

    // 2. Criar tabela group_accounts se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_accounts (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES owners(id),
        status VARCHAR(20) DEFAULT 'active',
        username VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela group_accounts verificada/criada.');

    // 3. Verificar se todas as colunas necessárias existem na tabela groups
    const columnsToCheck = [
      'logo_url', 'group_url', 'affiliate_url'
    ];

    for (const column of columnsToCheck) {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'groups' AND column_name = $1
      `, [column]);

      if (columnCheck.rows.length === 0) {
        await client.query(`ALTER TABLE groups ADD COLUMN ${column} TEXT`);
        console.log(`Coluna ${column} adicionada à tabela groups.`);
      } else {
        console.log(`Coluna ${column} já existe na tabela groups.`);
      }
    }

    console.log('Configuração das tabelas concluída com sucesso!');
    await client.end();
  } catch (err) {
    console.error('Erro ao configurar tabelas:', err);
  }
}

setupGroupTables()
  .then(() => console.log('Processo concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
