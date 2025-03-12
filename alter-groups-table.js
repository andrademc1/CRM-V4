
const { Client } = require('pg');

async function alterTableGroups() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Iniciando alteração da tabela groups...');
    
    // Verificar se a tabela groups existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'groups'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('A tabela groups não existe. Criando tabela...');
      await client.query(`
        CREATE TABLE groups (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(100) NOT NULL,
          descricao TEXT,
          status VARCHAR(20) DEFAULT 'active',
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabela groups criada com sucesso!');
    }
    
    // Verificar quais colunas já existem
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'groups' AND column_name IN ('logo_url', 'group_url', 'affiliate_url')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('Colunas existentes:', existingColumns);
    
    // Adicionar as colunas que não existem
    if (!existingColumns.includes('logo_url')) {
      await client.query(`ALTER TABLE groups ADD COLUMN logo_url TEXT`);
      console.log('Coluna logo_url adicionada.');
    } else {
      console.log('Coluna logo_url já existe.');
    }
    
    if (!existingColumns.includes('group_url')) {
      await client.query(`ALTER TABLE groups ADD COLUMN group_url TEXT`);
      console.log('Coluna group_url adicionada.');
    } else {
      console.log('Coluna group_url já existe.');
    }
    
    if (!existingColumns.includes('affiliate_url')) {
      await client.query(`ALTER TABLE groups ADD COLUMN affiliate_url TEXT`);
      console.log('Coluna affiliate_url adicionada.');
    } else {
      console.log('Coluna affiliate_url já existe.');
    }
    
    console.log('Tabela groups adaptada com sucesso!');
    
    await client.end();
  } catch (err) {
    console.error('Erro ao alterar tabela groups:', err);
  }
}

alterTableGroups()
  .then(() => console.log('Processo de alteração concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
