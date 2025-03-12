
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Client } = require('pg');
const multer = require('multer');
// Configurar armazenamento para upload de arquivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Garantir que o diretório existe
    const uploadPath = path.join(__dirname, 'public/uploads/');
    if (!fs.existsSync(uploadPath)){
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
// Garantir que os arquivos de uploads sejam servidos diretamente
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Fallback para caminhos antigos
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Certificar-se de que o diretório de uploads existe
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Diretório de uploads criado em ${uploadsDir}`);
}
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
  
  try {
    await client.connect();
    console.log('Conexão ao banco de dados realizada com sucesso.');
    return client;
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    throw err; // Lança o erro para que a função chamadora possa lidar com ele.
  }
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
    
    // Verificar se a tabela bookmakers existe
    const bookmakerTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bookmakers'
      );
    `);
    
    let bookmakers = [];
    if (bookmakerTableExists.rows[0].exists) {
      // Buscar bookmakers com nome do grupo
      const bookmakersResult = await client.query(`
        SELECT b.*, g.nome as group_name 
        FROM bookmakers b 
        LEFT JOIN groups g ON b.group_id = g.id 
        ORDER BY b.nome
      `);
      bookmakers = bookmakersResult.rows;
    }
    
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
      bookmakers: bookmakers,
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
      bookmakers: [],
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

// Rota para formulário de adicionar bookmaker
app.get('/bookmakers/adicionar-bookmaker', requireLogin, async (req, res) => {
  try {
    const client = await getDbClient();
    const groupsResult = await client.query('SELECT id, nome FROM groups WHERE status = $1 ORDER BY nome', ['active']);
    await client.end();
    
    res.render('adicionar-bookmaker', { 
      usuario: req.session.usuarioLogado,
      groups: groupsResult.rows,
      erro: null
    });
  } catch (err) {
    console.error('Erro ao carregar formulário de bookmaker:', err);
    res.render('adicionar-bookmaker', { 
      usuario: req.session.usuarioLogado,
      groups: [],
      erro: 'Erro ao carregar dados. Por favor, tente novamente.'
    });
  }
});

// Rota para processar adição de bookmaker
app.post('/bookmakers/adicionar-bookmaker', requireLogin, upload.single('bookmakerLogo'), async (req, res) => {
  const { 
    groupId,
    nome, 
    status, 
    affiliateUrl,
    selectedCountriesData
  } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.render('adicionar-bookmaker', { 
      usuario: req.session.usuarioLogado,
      erro: 'O campo Nome é obrigatório'
    });
  }
  
  try {
    const client = await getDbClient();
    
    // Buscar grupos novamente para o caso de erro e precisar renderizar o formulário
    const groupsResult = await client.query('SELECT id, nome FROM groups WHERE status = $1 ORDER BY nome', ['active']);
    
    // Processar upload de logo
    let logoUrl = '';
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
    }
    
    // Inserir novo bookmaker
    await client.query(
      `INSERT INTO bookmakers (
        group_id,
        nome, 
        status, 
        logo_url, 
        affiliate_url, 
        geographies
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        groupId,
        nome, 
        status || 'active', 
        logoUrl, 
        affiliateUrl || '',
        selectedCountriesData ? selectedCountriesData : null
      ]
    );
    
    await client.end();
    
    // Adicionar mensagem de sucesso à sessão
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Bookmaker adicionado com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao adicionar bookmaker:', err);
    
    // Buscar grupos novamente para renderizar o formulário com erro
    const client = await getDbClient();
    const groupsResult = await client.query('SELECT id, nome FROM groups WHERE status = $1 ORDER BY nome', ['active']);
    await client.end();
    
    res.render('adicionar-bookmaker', { 
      usuario: req.session.usuarioLogado,
      groups: groupsResult.rows,
      erro: 'Erro ao adicionar bookmaker: ' + err.message
    });
  }
});

// Rota para processar adição de grupo
app.post('/bookmakers/adicionar-grupo', requireLogin, upload.single('groupLogo'), async (req, res) => {
  const { 
    nome, 
    status, 
    groupUrl, 
    groupAffiliateUrl, 
    applyAccount,
    savedAccountsData,
    applyBilling,
    billingAccounts
  } = req.body;
  
  console.log('Dados do formulário:', req.body);
  
  if (!nome || nome.trim() === '') {
    return res.render('adicionar-grupo', { 
      usuario: req.session.usuarioLogado,
      erro: 'O campo Nome é obrigatório'
    });
  }
  
  try {
    const client = await getDbClient();
    
    // Processar upload de logo
    let logoUrl = '';
    if (req.file) {
      logoUrl = `/uploads/${req.file.filename}`;
      console.log('Logo URL:', logoUrl);
    }
    
    // Verificar se a tabela groups tem as colunas necessárias
    try {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'groups' AND column_name IN ('logo_url', 'group_url', 'affiliate_url')
      `);
      
      // Se alguma coluna estiver faltando, adicioná-la
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('logo_url')) {
        await client.query(`ALTER TABLE groups ADD COLUMN logo_url TEXT`);
      }
      
      if (!existingColumns.includes('group_url')) {
        await client.query(`ALTER TABLE groups ADD COLUMN group_url TEXT`);
      }
      
      if (!existingColumns.includes('affiliate_url')) {
        await client.query(`ALTER TABLE groups ADD COLUMN affiliate_url TEXT`);
      }
    } catch (err) {
      console.error('Erro ao verificar/adicionar colunas à tabela groups:', err);
    }
    
    // Inserir novo grupo
    const groupResult = await client.query(
      `INSERT INTO groups (nome, status, logo_url, group_url, affiliate_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nome, status || 'active', logoUrl, groupUrl || '', groupAffiliateUrl || '']
    );
    
    const groupId = groupResult.rows[0].id;
    
    // Verificar se o usuário selecionou "yes" para Apply Account
    if (applyAccount === 'yes' && savedAccountsData) {
      try {
        // Verificar se a tabela group_accounts existe
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'group_accounts'
          );
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        
        // Criar tabela de contas de grupo se não existir
        if (!tableExists) {
          await client.query(`
            CREATE TABLE group_accounts (
              id SERIAL PRIMARY KEY,
              group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
              owner_id INTEGER REFERENCES owners(id),
              status VARCHAR(20) DEFAULT 'active',
              username VARCHAR(100) NOT NULL,
              password VARCHAR(100) NOT NULL,
              data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('Tabela group_accounts criada.');
        }
        
        console.log('Processando contas do grupo:', savedAccountsData);
        const accounts = JSON.parse(savedAccountsData);
        
        // Inserir contas na tabela group_accounts
        for (const account of accounts) {
          await client.query(
            `INSERT INTO group_accounts (
              group_id, owner_id, status, username, password
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              groupId,
              account.ownerId,
              account.status,
              account.username,
              account.password
            ]
          );
          console.log('Conta do grupo inserida com sucesso');
        }
      } catch (e) {
        console.error('Erro ao processar contas do grupo:', e, e.stack);
      }
    }
    
    // Verificar se o usuário selecionou "yes" para Apply Billing
    if (applyBilling === 'yes' && billingAccounts) {
      try {
        // Verificar se a tabela group_billing_accounts existe
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'group_billing_accounts'
          );
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        
        // Criar tabela de contas de faturamento de grupo se não existir
        if (!tableExists) {
          await client.query(`
            CREATE TABLE group_billing_accounts (
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
          console.log('Tabela group_billing_accounts criada.');
        }
        
        console.log('Processando contas de faturamento do grupo:', billingAccounts);
        const accounts = JSON.parse(billingAccounts);
        
        // Inserir contas na tabela group_billing_accounts
        for (const account of accounts) {
          await client.query(
            `INSERT INTO group_billing_accounts (
              group_id, billing_name, billing_vat, billing_address1, billing_address2, 
              billing_city, billing_state, billing_zipcode, billing_country, billing_country_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              groupId,
              account.name,
              account.vat,
              account.address1,
              account.address2,
              account.city,
              account.state,
              account.zipCode,
              account.country,
              account.countryCode
            ]
          );
          console.log('Conta de faturamento do grupo inserida com sucesso');
        }
      } catch (e) {
        console.error('Erro ao processar contas de faturamento do grupo:', e, e.stack);
      }
    }
    
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

// Rota para excluir bookmaker
app.get('/bookmakers/excluir-bookmaker/:id', requireLogin, async (req, res) => {
  const bookmakerId = req.params.id;
  
  try {
    const client = await getDbClient();
    
    // Excluir o bookmaker
    await client.query('DELETE FROM bookmakers WHERE id = $1', [bookmakerId]);
    
    await client.end();
    
    req.session.mensagem = {
      tipo: 'sucesso',
      texto: 'Bookmaker excluído com sucesso!'
    };
    
    res.redirect('/bookmakers');
  } catch (err) {
    console.error('Erro ao excluir bookmaker:', err);
    req.session.mensagem = {
      tipo: 'erro',
      texto: 'Erro ao excluir bookmaker: ' + err.message
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

// Rota API para obter owners
app.get('/api/owners', requireLogin, async (req, res) => {
  try {
    const client = await getDbClient();
    const result = await client.query('SELECT id, nome FROM owners ORDER BY nome');
    await client.end();
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao obter owners:', err);
    res.status(500).json({ erro: 'Erro ao obter owners' });
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
