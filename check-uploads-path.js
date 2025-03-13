
const fs = require('fs');
const path = require('path');

// Verificar diretório de uploads
const uploadsDir = path.join(__dirname, 'public/uploads');
console.log('Verificando diretório de uploads:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  console.log('Diretório de uploads não existe! Criando...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Diretório de uploads criado com sucesso!');
} else {
  console.log('Diretório de uploads existe!');
  
  // Listar arquivos no diretório
  const files = fs.readdirSync(uploadsDir);
  console.log('Arquivos no diretório de uploads:', files);
}

// Verificar configuração de rotas estáticas no index.js
const indexPath = path.join(__dirname, 'index.js');
let indexContent = '';

try {
  indexContent = fs.readFileSync(indexPath, 'utf8');
  console.log('index.js encontrado!');
  
  // Verificar rotas estáticas
  if (indexContent.includes('app.use(express.static(')) {
    console.log('Rota estática para arquivos públicos encontrada!');
  } else {
    console.log('AVISO: Rota estática para arquivos públicos NÃO encontrada no index.js!');
  }
  
  if (indexContent.includes('app.use(\'/uploads\'') || 
      indexContent.includes('app.use("/uploads"')) {
    console.log('Rota estática para uploads encontrada!');
  } else {
    console.log('AVISO: Rota estática específica para uploads NÃO encontrada no index.js!');
  }
} catch (err) {
  console.error('Erro ao ler index.js:', err);
}

console.log('\nExecute este script com: node check-uploads-path.js');
