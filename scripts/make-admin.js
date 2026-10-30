// Promove um usuário já cadastrado (data/users.json) a administrador do painel.
// Uso: node scripts/make-admin.js email@exemplo.com.br
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
    console.error('Uso: node scripts/make-admin.js email@exemplo.com.br');
    process.exit(1);
}

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const user = users.find((item) => item.email === email);

if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail ${email}. Cadastre a conta em /cadastro.html primeiro.`);
    process.exit(1);
}

user.isAdmin = true;
fs.writeFileSync(USERS_FILE, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
console.log(`Usuário ${email} agora é administrador do painel.`);
