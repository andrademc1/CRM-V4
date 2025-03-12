
const { Client } = require('pg');

async function setupBookmakerAccountsTable() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Iniciando configuração da tabela bookmaker_accounts...');
    
    // Verificar se a tabela bookmaker_accounts existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookmaker_accounts'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('A tabela bookmaker_accounts não existe. Criando tabela...');
      await client.query(`
        CREATE TABLE bookmaker_accounts (
          id SERIAL PRIMARY KEY,
          bookmaker_id INTEGER REFERENCES bookmakers(id) ON DELETE CASCADE,
          owner_id INTEGER REFERENCES owners(id),
          status VARCHAR(20) DEFAULT 'active',
          username VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL,
          geographies TEXT,
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabela bookmaker_accounts criada com sucesso!');
    } else {
      console.log('A tabela bookmaker_accounts já existe.');
      
      // Verificar e adicionar colunas necessárias se não existirem
      const columns = [
        { name: 'bookmaker_id', type: 'INTEGER REFERENCES bookmakers(id) ON DELETE CASCADE' },
        { name: 'owner_id', type: 'INTEGER REFERENCES owners(id)' },
        { name: 'status', type: 'VARCHAR(20) DEFAULT \'active\'' },
        { name: 'username', type: 'VARCHAR(100) NOT NULL' },
        { name: 'password', type: 'VARCHAR(100) NOT NULL' },
        { name: 'geographies', type: 'TEXT' },
        { name: 'data_criacao', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
      ];
      
      for (const column of columns) {
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bookmaker_accounts' AND column_name = $1
        `, [column.name]);
        
        if (columnCheck.rows.length === 0) {
          await client.query(`ALTER TABLE bookmaker_accounts ADD COLUMN ${column.name} ${column.type}`);
          console.log(`Coluna ${column.name} adicionada à tabela bookmaker_accounts.`);
        }
      }
    }
    
    console.log('Configuração da tabela bookmaker_accounts concluída com sucesso!');
    
    await client.end();
  } catch (err) {
    console.error('Erro ao configurar tabela bookmaker_accounts:', err);
  }
}

setupBookmakerAccountsTable()
  .then(() => console.log('Processo de configuração concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
