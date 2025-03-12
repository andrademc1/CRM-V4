
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Client } = require('pg');

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
app.get('/bookmakers', requireLogin, (req, res) => {
  res.render('bookmakers', { 
    usuario: req.session.usuarioLogado
  });
});

// Rota para users
app.get('/users', requireLogin, (req, res) => {
  res.render('users', { 
    usuario: req.session.usuarioLogado
  });
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
