
const { Client } = require('pg');

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('Variável DATABASE_URL não encontrada. Por favor, crie um banco de dados PostgreSQL no Replit.');
    return;
  }

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Iniciando reinicialização...');
    
    // Remover tabelas existentes
    await client.query('DROP TABLE IF EXISTS usuarios CASCADE');
    await client.query('DROP TABLE IF EXISTS clientes CASCADE');
    await client.query('DROP TABLE IF EXISTS owner_billing_accounts CASCADE');
    await client.query('DROP TABLE IF EXISTS owners CASCADE');
    
    console.log('Tabelas removidas com sucesso.');
    
    // Recriar tabelas
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(100) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        telefone VARCHAR(20),
        empresa VARCHAR(100),
        observacoes TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS owners (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        logo_url TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS owner_billing_accounts (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
        billing_name VARCHAR(100),
        billing_vat VARCHAR(50),
        billing_address1 VARCHAR(200),
        billing_address2 VARCHAR(200),
        billing_city VARCHAR(100),
        billing_state VARCHAR(100),
        billing_zipcode VARCHAR(20),
        billing_country VARCHAR(5),
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Inserir usuário padrão
    await client.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
      ['Administrador', 'admin@exemplo.com', 'admin123']
    );
    
    console.log('Tabelas recriadas com sucesso.');
    console.log('Usuário padrão criado. Email: admin@exemplo.com, Senha: admin123');
    
    await client.end();
    console.log('Banco de dados reinicializado com sucesso!');
  } catch (err) {
    console.error('Erro ao reinicializar banco de dados:', err);
  }
}

resetDatabase();
