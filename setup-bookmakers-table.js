
const { Client } = require('pg');

async function setupBookmakersTable() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Iniciando configuração da tabela bookmakers...');
    
    // Verificar se a tabela bookmakers existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookmakers'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('A tabela bookmakers não existe. Criando tabela...');
      await client.query(`
        CREATE TABLE bookmakers (
          id SERIAL PRIMARY KEY,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
          nome VARCHAR(100) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          logo_url TEXT,
          affiliate_url TEXT,
          geographies JSONB,
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabela bookmakers criada com sucesso!');
    } else {
      console.log('Tabela bookmakers já existe.');
      
      // Verificar e adicionar colunas que possam faltar
      const columns = [
        { name: 'group_id', type: 'INTEGER REFERENCES groups(id) ON DELETE CASCADE' },
        { name: 'logo_url', type: 'TEXT' },
        { name: 'affiliate_url', type: 'TEXT' },
        { name: 'geographies', type: 'JSONB' }
      ];
      
      for (const column of columns) {
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bookmakers' AND column_name = $1
        `, [column.name]);
        
        if (columnCheck.rows.length === 0) {
          await client.query(`ALTER TABLE bookmakers ADD COLUMN ${column.name} ${column.type}`);
          console.log(`Coluna ${column.name} adicionada à tabela bookmakers.`);
        }
      }
    }
    
    console.log('Configuração da tabela bookmakers concluída com sucesso!');
    
    await client.end();
  } catch (err) {
    console.error('Erro ao configurar tabela bookmakers:', err);
  }
}

setupBookmakersTable()
  .then(() => console.log('Processo de configuração concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
