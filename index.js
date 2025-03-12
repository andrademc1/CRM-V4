
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Client } = require('pg');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'crm-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hora
}));

// Configurar visualizações EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para verificar autenticação
const requireLogin = (req, res, next) => {
  if (!req.session.usuarioLogado) {
    return res.redirect('/login');
  }
  next();
};

// Função para conectar ao banco de dados
async function getDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  return client;
}

// Inicializar tabelas do banco de dados
async function inicializarBancoDados() {
  if (!process.env.DATABASE_URL) {
    console.log('Variável DATABASE_URL não encontrada. Por favor, crie um banco de dados PostgreSQL no Replit.');
    return;
  }

  try {
    const client = await getDbClient();
    
    // Criar tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(100) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela de clientes
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
    
    // Criar tabela de owners
    await client.query(`
      CREATE TABLE IF NOT EXISTS owners (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        logo_url TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela de contas de faturamento de owners
    await client.query(`
      CREATE TABLE IF NOT EXISTS owner_billing_accounts (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES owners(id),
        billing_name VARCHAR(100) NOT NULL,
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
    
    // Criar tabela de grupos
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        status VARCHAR(20) DEFAULT 'active',
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Verificar se a coluna status existe e adicionar se necessário
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'status'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('Adicionando coluna "status" à tabela owners...');
        await client.query(`
          ALTER TABLE owners 
          ADD COLUMN status VARCHAR(20) DEFAULT 'active'
        `);
      }
    } catch (err) {
      console.error('Erro ao verificar/adicionar coluna status:', err);
    }

    // Inserir usuário padrão, se não existir
    const usuarioExistente = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@exemplo.com']);
    if (usuarioExistente.rows.length === 0) {
      await client.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
        ['Administrador', 'admin@exemplo.com', 'admin123']
      );
      console.log('Usuário padrão criado. Email: admin@exemplo.com, Senha: admin123');
    }

    await client.end();
    console.log('Banco de dados inicializado com sucesso');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err);
  }
}

// Rotas
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.usuarioLogado) {
    return res.redirect('/dashboard');
  }
  res.render('login', { erro: null });
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  
  try {
    const client = await getDbClient();
    const result = await client.query('SELECT * FROM usuarios WHERE email = $1 AND senha = $2', [email, senha]);
    await client.end();
    
    if (result.rows.length > 0) {
      const usuario = result.rows[0];
      req.session.usuarioLogado = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      };
      return res.redirect('/dashboard');
    } else {
      res.render('login', { erro: 'Email ou senha incorretos' });
    }
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.render('login', { erro: 'Erro ao processar login' });
  }
});

app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const client = await getDbClient();
    const result = await client.query('SELECT * FROM clientes ORDER BY data_criacao DESC LIMIT 10');
    await client.end();
    
    res.render('dashboard', { 
      usuario: req.session.usuarioLogado,
      clientes: result.rows
    });
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    res.render('dashboard', { 
      usuario: req.session.usuarioLogado,
      clientes: [],
      erro: 'Erro ao carregar clientes'
    });
  }
});

// Rota para bookmakers
app.get('/bookmakers', requireLogin, async (req, res) => {
  try {
    const client = await getDbClient();
    const ownersResult = await client.query('SELECT * FROM owners ORDER BY nome');
    const groupsResult = await client.query('SELECT * FROM groups ORDER BY nome');
    
    // Para cada owner, recuperar suas contas de faturamento
    for (const owner of ownersResult.rows) {
      const billingAccountsResult = await client.query(
        'SELECT * FROM owner_billing_accounts WHERE owner_id = $1 ORDER BY id',
        [owner.id]
      );
      owner.billingAccounts = billingAccountsResult.rows;
    }
    
    await client.end();
    
    // Importar o array de países para usar na renderização
    const countriesPath = path.join(__dirname, 'public', 'js', 'countries.js');
    let countries = [];
    try {
      // Tentar ler o array de países do arquivo
      const fs = require('fs');
      const content = fs.readFileSync(countriesPath, 'utf8');
      // Extrair apenas o array de países do arquivo
      const match = content.match(/window\.countries\s*=\s*(\[[\s\S]*?\]);/);
      if (match && match[1]) {
        countries = eval(match[1]); // Avaliação segura pois estamos lendo nosso próprio arquivo
      }
    } catch (err) {
      console.error('Erro ao ler arquivo de países:', err);
    }
    
    res.render('bookmakers', { 
      usuario: req.session.usuarioLogado,
      owners: ownersResult.rows,
      groups: groupsResult.rows,
      mensagem: req.session.mensagem,
      countries: countries
    });
    // Limpar mensagem da sessão após exibir
    req.session.mensagem = null;
  } catch (err) {
    console.error('Erro ao carregar bookmakers:', err);
    res.render('bookmakers', { 
      usuario: req.session.usuarioLogado,
      owners: [],
      groups: [],
      mensagem: { tipo: 'erro', texto: 'Erro ao carregar bookmakers' }
    });
  }
});

// Rota para formulário de adicionar owner
app.get('/bookmakers/adicionar-owner', requireLogin, (req, res) => {
  res.render('adicionar-owner', { 
    usuario: req.session.usuarioLogado,
    erro: null
  });
});

// Rota para processar adição de owner
app.post('/bookmakers/adicionar-owner', requireLogin, upload.single('ownerLogo'), async (req, res) => {
  console.log('Dados do formulário:', req.body);
  
  const { 
    nome, 
    ownerStatus,
    applyBilling,
    billingName,
    billingVat,
    billingAddress1,
    billingAddress2,
    billingCity,
    billingState,
    billingZipCode,
    countryCode,
    // Novos campos para billing accounts (serão enviados pelo JavaScript)
    billingAccounts
  } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.render('adicionar-owner', { 
      usuario: req.session.usuarioLogado,
      erro: 'O campo Nome é obrigatório'
    });
  }
  
  // Verificar se está aplicando detalhes de faturamento
  const applyBillingBool = applyBilling === 'yes';
  
  try {
    const client = await getDbClient();
    
    // Processar upload de logo
    let logoUrl = '';
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
      console.log('Logo URL:', logoUrl);
    }
    
    // Inserir novo owner
    const ownerResult = await client.query(
      `INSERT INTO owners (
        nome, 
        status, 
        logo_url
      ) VALUES ($1, $2, $3) RETURNING id`,
      [
        nome, 
        ownerStatus || 'inactive', 
        logoUrl
      ]
    );
    
    // Verificar se o usuário selecionou "yes" para Apply Billing
    if (applyBillingBool && billingAccounts) {
      try {
        console.log('Dados recebidos:', billingAccounts);
        const accounts = JSON.parse(billingAccounts);
        console.log(`Recebidos ${accounts.length} billing accounts adicionais:`, accounts);
        
        // Inserir as contas adicionais na tabela owner_billing_accounts
        for (const account of accounts) {
          console.log('Processando conta:', account);
          await client.query(
            `INSERT INTO owner_billing_accounts (
              owner_id, billing_name, billing_vat, billing_address1, billing_address2, 
              billing_city, billing_state, billing_zipcode, billing_country
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              ownerResult.rows[0].id,
              account.name,
              account.vat,
              account.address1,
              account.address2,
              account.city,
              account.state,
              account.zipCode,
              account.countryCode
            ]
          );
          console.log('Conta inserida com sucesso');
        }
      } catch (e) {
        console.error('Erro ao processar contas adicionais:', e, e.stack);
      }
    } else {
      console.log('Opção Apply Billing = No ou nenhuma conta de faturamento recebida');
    }
    
    await client.end();
    
    // Adicionar mensagem de sucesso à sessão
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Owner adicionado com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao adicionar owner:', err);
    res.render('adicionar-owner', { 
      usuario: req.session.usuarioLogado,
      erro: 'Erro ao adicionar owner: ' + err.message
    });
  }
});

// Rota para excluir owner
app.get('/bookmakers/excluir/:id', requireLogin, async (req, res) => {
  const ownerId = req.params.id;
  
  try {
    const client = await getDbClient();
    
    // Primeiro, excluir as contas de faturamento relacionadas
    await client.query('DELETE FROM owner_billing_accounts WHERE owner_id = $1', [ownerId]);
    
    // Depois, excluir o owner
    await client.query('DELETE FROM owners WHERE id = $1', [ownerId]);
    
    await client.end();
    
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Owner excluído com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao excluir owner:', err);
    req.session.mensagem = {
      tipo: 'erro',
      texto: 'Erro ao excluir owner: ' + err.message
    };
    res.redirect('/bookmakers');
  }
});

// Rota para formulário de adicionar grupo
app.get('/bookmakers/adicionar-grupo', requireLogin, (req, res) => {
  res.render('adicionar-grupo', { 
    usuario: req.session.usuarioLogado,
    erro: null
  });
});

// Rota para processar adição de grupo
app.post('/bookmakers/adicionar-grupo', requireLogin, async (req, res) => {
  const { nome, descricao, status } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.render('adicionar-grupo', { 
      usuario: req.session.usuarioLogado,
      erro: 'O campo Nome é obrigatório'
    });
  }
  
  try {
    const client = await getDbClient();
    
    // Inserir novo grupo
    await client.query(
      'INSERT INTO groups (nome, descricao, status) VALUES ($1, $2, $3)',
      [nome, descricao, status || 'active']
    );
    
    await client.end();
    
    // Adicionar mensagem de sucesso à sessão
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Grupo adicionado com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao adicionar grupo:', err);
    res.render('adicionar-grupo', { 
      usuario: req.session.usuarioLogado,
      erro: 'Erro ao adicionar grupo: ' + err.message
    });
  }
});

// Rota para excluir grupo
app.get('/bookmakers/excluir-grupo/:id', requireLogin, async (req, res) => {
  const groupId = req.params.id;
  
  try {
    const client = await getDbClient();
    
    // Excluir o grupo
    await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
    
    await client.end();
    
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Grupo excluído com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao excluir grupo:', err);
    req.session.mensagem = {
      tipo: 'erro',
      texto: 'Erro ao excluir grupo: ' + err.message
    };
    res.redirect('/bookmakers');
  }
});

// Rota para users
app.get('/users', requireLogin, async (req, res) => {
  try {
    const client = await getDbClient();
    const result = await client.query('SELECT * FROM usuarios ORDER BY nome');
    await client.end();
    
    res.render('users', { 
      usuario: req.session.usuarioLogado,
      usuarios: result.rows,
      mensagem: req.session.mensagem
    });
    // Limpar mensagem da sessão após exibir
    req.session.mensagem = null;
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    res.render('users', { 
      usuario: req.session.usuarioLogado,
      usuarios: [],
      mensagem: { tipo: 'erro', texto: 'Erro ao carregar usuários' }
    });
  }
});

// Rota para formulário de adicionar usuário
app.get('/users/adicionar', requireLogin, (req, res) => {
  res.render('adicionar-user', { 
    usuario: req.session.usuarioLogado,
    erro: null
  });
});

// Rota para processar adição de usuário
app.post('/users/adicionar', requireLogin, async (req, res) => {
  const { nome, email, senha } = req.body;
  
  if (!nome || !email || !senha) {
    return res.render('adicionar-user', { 
      usuario: req.session.usuarioLogado,
      erro: 'Todos os campos são obrigatórios'
    });
  }
  
  try {
    const client = await getDbClient();
    
    // Verificar se e-mail já existe
    const verificacao = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (verificacao.rows.length > 0) {
      await client.end();
      return res.render('adicionar-user', { 
        usuario: req.session.usuarioLogado,
        erro: 'Este e-mail já está em uso'
      });
    }
    
    // Inserir novo usuário
    await client.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
      [nome, email, senha]
    );
    
    await client.end();
    
    // Adicionar mensagem de sucesso à sessão
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Usuário adicionado com sucesso!'
    };
    
    res.redirect('/users');
  } catch (err) {
    console.error('Erro ao adicionar usuário:', err);
    res.render('adicionar-user', { 
      usuario: req.session.usuarioLogado,
      erro: 'Erro ao adicionar usuário'
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Iniciar servidor
inicializarBancoDados().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor CRM rodando na porta ${PORT}`);
    console.log(`Acesse: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  });
});
