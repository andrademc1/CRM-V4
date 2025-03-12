
const { Client } = require('pg');

async function removeDescricaoColumn() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Conectado ao banco de dados. Verificando a coluna descricao...');
    
    // Verificar se a coluna descricao existe na tabela groups
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'groups' AND column_name = 'descricao'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('Coluna descricao encontrada. Removendo coluna...');
      
      // Remover a coluna descricao
      await client.query(`ALTER TABLE groups DROP COLUMN descricao`);
      
      console.log('Coluna descricao removida com sucesso!');
    } else {
      console.log('A coluna descricao não existe na tabela groups.');
    }
    
    await client.end();
  } catch (err) {
    console.error('Erro ao remover coluna descricao:', err);
  }
}

removeDescricaoColumn()
  .then(() => console.log('Processo concluído.'))
  .catch(err => console.error('Erro no processo principal:', err));
