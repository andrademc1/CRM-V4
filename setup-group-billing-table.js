
const { Client } = require('pg');

async function setupGroupBillingTable() {
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

    // Criar tabela de contas de faturamento de grupos se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_billing_accounts (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        billing_name VARCHAR(100) NOT NULL,
        billing_vat VARCHAR(50),
        billing_address1 VARCHAR(200),
        billing_address2 VARCHAR(200),
        billing_city VARCHAR(100),
        billing_state VARCHAR(100),
        billing_zipcode VARCHAR(20),
        billing_country VARCHAR(100),
        billing_country_code VARCHAR(5),
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela group_billing_accounts verificada/criada.');

    console.log('Configuração da tabela concluída com sucesso!');
    await client.end();
  } catch (err) {
    console.error('Erro ao configurar tabela de faturamento do grupo:', err);
  }
}

setupGroupBillingTable()
  .then(() => console.log('Processo concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
