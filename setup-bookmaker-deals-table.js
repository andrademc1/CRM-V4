
const { Client } = require('pg');

async function setupBookmakerDealsTable() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Iniciando configuração da tabela bookmaker_deals...');
    
    // Verificar se a tabela bookmaker_deals existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookmaker_deals'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('A tabela bookmaker_deals não existe. Criando tabela...');
      await client.query(`
        CREATE TABLE bookmaker_deals (
          id SERIAL PRIMARY KEY,
          bookmaker_id INTEGER REFERENCES bookmakers(id) ON DELETE CASCADE,
          deal_type VARCHAR(20) NOT NULL, -- 'single' ou 'multi'
          deal_values JSONB, -- Para armazenar diferentes valores baseados no tipo
          default_deal BOOLEAN DEFAULT false,
          geographies JSONB,
          status VARCHAR(20) DEFAULT 'active',
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabela bookmaker_deals criada com sucesso!');
    } else {
      console.log('Tabela bookmaker_deals já existe.');
      
      // Verificar e adicionar colunas que possam faltar
      const columns = [
        { name: 'bookmaker_id', type: 'INTEGER REFERENCES bookmakers(id) ON DELETE CASCADE' },
        { name: 'deal_type', type: 'VARCHAR(20) NOT NULL' },
        { name: 'deal_values', type: 'JSONB' },
        { name: 'default_deal', type: 'BOOLEAN DEFAULT false' },
        { name: 'geographies', type: 'JSONB' },
        { name: 'status', type: 'VARCHAR(20) DEFAULT \'active\'' },
        { name: 'data_criacao', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
      ];
      
      for (const column of columns) {
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bookmaker_deals' AND column_name = $1
        `, [column.name]);
        
        if (columnCheck.rows.length === 0) {
          await client.query(`ALTER TABLE bookmaker_deals ADD COLUMN ${column.name} ${column.type}`);
          console.log(`Coluna ${column.name} adicionada à tabela bookmaker_deals.`);
        }
      }
    }
    
    console.log('Configuração da tabela bookmaker_deals concluída com sucesso!');
    
    await client.end();
  } catch (err) {
    console.error('Erro ao configurar tabela bookmaker_deals:', err);
  }
}

setupBookmakerDealsTable()
  .then(() => console.log('Processo de configuração concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
