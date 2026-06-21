# 🚀 Guia de Deployment - GitHub Pages

Este guia vai te ajudar a publicar o site da TOR no GitHub Pages.

## Pré-requisitos

1. Conta no GitHub ([https://github.com](https://github.com))
2. Git instalado no seu computador
3. Os arquivos do site (já estão prontos!)

## Passo 1: Criar um Repositório no GitHub

1. Acesse [https://github.com/new](https://github.com/new)
2. Preencha os dados:
   - **Repository name**: `tor-website` (ou qualquer nome que quiser)
   - **Description**: "Site institucional da TOR - Telecomunicações & Tecnologia"
   - Marque **Public** (necessário para GitHub Pages grátis)
   - Deixe desmarcado "Add a README file" (já temos um)
3. Clique em **Create repository**

## Passo 2: Fazer Upload dos Arquivos

### Opção A: Via Git (Recomendado)

```bash
# Na pasta C:\Users\vish8\OneDrive\Documentos\TOR, execute:

# 1. Adicionar origem remota
git remote add origin https://github.com/seu-usuario/tor-website.git

# 2. Renomear branch (se necessário)
git branch -M main

# 3. Fazer push para GitHub
git push -u origin main
```

### Opção B: Upload Direto

1. No GitHub, clique em "Upload files"
2. Arraste todos os arquivos da pasta para a área de upload
3. Clique em "Commit changes"

## Passo 3: Ativar GitHub Pages

1. No repositório do GitHub, vá em **Settings** (engrenagem no topo)
2. Na barra lateral, clique em **Pages**
3. Em "Source", selecione **Deploy from a branch**
4. Em "Branch", selecione **main** e **/root**
5. Clique em **Save**

## Passo 4: Aguardar o Deployment

1. O GitHub Pages vai processar automaticamente
2. Uma mensagem aparecerá: "Your site is published at..."
3. O URL será: `https://seu-usuario.github.io/tor-website`

## ✅ Pronto!

Seu site está publicado! Acesse a URL fornecida para visualizar.

---

## 🔄 Atualizações Futuras

Para fazer atualizações no site:

```bash
# 1. Edite os arquivos localmente
# 2. Faça commit das mudanças
git add .
git commit -m "Descrição das mudanças"

# 3. Faça push para GitHub
git push origin main
```

As alterações serão atualizadas automaticamente no site em alguns minutos.

---

## 🌍 Usar Domínio Personalizado

Se quiser usar `www.tor.com.br`:

1. Vá em **Settings → Pages**
2. Em "Custom domain", digite seu domínio
3. Configure os DNS records no seu provedor de domínio (siga as instruções do GitHub)

### DNS Records (exemplo para Namecheap):

```
A Record: 185.199.108.153
A Record: 185.199.109.153
A Record: 185.199.110.153
A Record: 185.199.111.153
CNAME Record (www): seu-usuario.github.io
```

---

## 📋 Checklist de Deploy

- [ ] Repositório criado no GitHub
- [ ] Arquivos enviados para GitHub
- [ ] GitHub Pages ativado nas configurações
- [ ] Site acessível via URL do GitHub Pages
- [ ] Todos os links funcionando
- [ ] Imagens carregando corretamente
- [ ] Layout responsivo em mobile
- [ ] Formulário de contato testado

---

## 🆘 Troubleshooting

### Site não aparece
- Aguarde 5-10 minutos após o upload
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Verifique se o repositório é público

### Imagens não aparecem
- Verifique se a pasta `assets/images/` foi enviada
- Certifique-se que os caminhos estão relativos (ex: `assets/images/tor.jpg`)

### CSS/JS não carregam
- Mesma verificação das imagens
- Certifique-se que os nomes dos arquivos estão corretos

---

## 📚 Recursos Úteis

- [GitHub Pages Docs](https://docs.github.com/pt/pages)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**Desenvolvido com ❤️ para TOR**
