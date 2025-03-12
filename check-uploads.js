
const fs = require('fs');
const path = require('path');

// Diretório de uploads
const uploadsDir = path.join(__dirname, 'public/uploads');

console.log(`Verificando diretório de uploads: ${uploadsDir}`);

// Verificar se o diretório existe
if (!fs.existsSync(uploadsDir)) {
  console.log('Diretório de uploads não existe, criando...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Diretório criado com sucesso.');
} else {
  console.log('O diretório de uploads existe.');
  
  // Listar todos os arquivos no diretório
  const files = fs.readdirSync(uploadsDir);
  console.log(`Total de arquivos encontrados: ${files.length}`);
  
  // Mostrar os primeiros 10 arquivos
  console.log('Arquivos:');
  files.slice(0, 10).forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file} (${stats.size} bytes)`);
  });
  
  if (files.length > 10) {
    console.log(`... e mais ${files.length - 10} arquivos.`);
  }
}

console.log('\nVerificação concluída.');
