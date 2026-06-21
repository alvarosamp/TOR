# 🏠 Setup Local - Testar o Site da TOR

Siga este guia para visualizar e testar o site localmente antes de fazer deploy.

## Opção 1: Abrir Diretamente no Navegador (Mais Simples)

1. Abra a pasta `C:\Users\vish8\OneDrive\Documentos\TOR`
2. Clique com botão direito em `index.html`
3. Selecione "Abrir com" → seu navegador favorito
4. Pronto! O site estará visível

**Nota**: Alguns recursos como formulários podem não funcionar 100%, mas a maioria funcionará.

---

## Opção 2: Usar um Servidor Local (Recomendado)

### Windows - Com Python

**Python 3.x** (recomendado):
```cmd
cd C:\Users\vish8\OneDrive\Documentos\TOR
python -m http.server 8000
```

Depois, abra o navegador e acesse: `http://localhost:8000`

**Python 2.x** (se tiver):
```cmd
cd C:\Users\vish8\OneDrive\Documentos\TOR
python -m SimpleHTTPServer 8000
```

### Windows - Com Node.js

Se você tem Node.js instalado:

```cmd
# Instale o http-server globalmente (primeira vez apenas)
npm install -g http-server

# Inicie o servidor
cd C:\Users\vish8\OneDrive\Documentos\TOR
http-server
```

Acesse: `http://localhost:8080`

### Windows - Com Visual Studio Code

1. Abra a pasta em VS Code
2. Instale a extensão "Live Server" (por Ritwick Dey)
3. Clique com botão direito em `index.html`
4. Selecione "Open with Live Server"
5. Seu navegador abrirá automaticamente

---

## 🧪 Testes Recomendados

Após abrir o site, verifique:

### Funcionalidades
- [ ] Menu de navegação está visível
- [ ] Links do menu funcionam (smooth scroll)
- [ ] Menu hambúrguer funciona em mobile (redimensione o navegador)
- [ ] Botões CTA funcionam e levam às seções corretas
- [ ] Formulário de contato responde ao envio
- [ ] Imagens carregam corretamente

### Design
- [ ] Logo "TOR" aparece com gradiente azul
- [ ] Cores estão corretas (azul e ciano)
- [ ] Fontes estão legíveis
- [ ] Espaçamento está consistente

### Responsividade
1. Abra o DevTools (F12 ou Ctrl+Shift+I)
2. Clique em "Toggle device toolbar" (ou Ctrl+Shift+M)
3. Teste em diferentes resoluções:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

Verifique:
- [ ] Texto legível em todos os tamanhos
- [ ] Imagens se adaptam corretamente
- [ ] Menu hambúrguer aparece em mobile
- [ ] Botões são clicáveis em touch

### Performance
1. Abra a aba "Network" do DevTools
2. Recarregue a página
3. Verifique:
   - [ ] Carregamento rápido (< 2 segundos)
   - [ ] Sem erros 404
   - [ ] Tamanho total < 500KB

---

## 🔧 Modificações Úteis

### Editar o Conteúdo

1. Abra `index.html` com um editor de texto (Notepad++, VS Code, etc)
2. Encontre a seção que quer editar
3. Altere o texto
4. Salve o arquivo
5. Recarregue o navegador (F5)

Exemplo - Mudar o número de telefone:
```html
<!-- Antes -->
<p>+55 (11) 3000-0000</p>

<!-- Depois -->
<p>+55 (11) 9999-9999</p>
```

### Mudar Cores

Edite `styles.css` e procure por `:root`:

```css
:root {
    --primary-color: #0066ff;      /* Azul principal */
    --secondary-color: #00d4ff;    /* Ciano */
    --dark-color: #0a0e27;         /* Azul escuro */
}
```

### Adicionar Novas Imagens

1. Coloque a imagem na pasta `assets/images/`
2. No HTML, adicione:
```html
<img src="assets/images/sua-imagem.jpg" alt="Descrição">
```

---

## 🐛 Troubleshooting

### "Não consigo abrir o arquivo"
- Certifique-se que está no diretório correto
- Tente abrir com um navegador diferente (Chrome, Firefox, Edge)

### "As imagens não aparecem"
- Verifique se a imagem está em `assets/images/tor.jpg`
- Recarregue a página (Ctrl+F5 para limpar cache)

### "O CSS não está funcionando"
- Verifique se `styles.css` está na mesma pasta que `index.html`
- Recarregue o navegador completamente (Ctrl+Shift+F5)

### "O menu não funciona"
- Abra o Console (F12 → Console)
- Procure por erros em vermelho
- Certifique-se que `script.js` está na pasta correta

---

## 📝 Atalhos Úteis do Navegador

- **F12**: Abrir DevTools
- **Ctrl+Shift+I**: Abrir DevTools (alternativa)
- **Ctrl+Shift+M**: Toggle modo responsivo
- **Ctrl+Shift+Delete**: Limpar cache
- **F5**: Recarregar página
- **Ctrl+F5**: Recarregar ignorando cache

---

## ✅ Próximos Passos

Após testar localmente com sucesso:

1. Siga o **DEPLOYMENT_GUIDE.md** para publicar no GitHub Pages
2. Teste o site online
3. Compartilhe com a equipe/clientes
4. Solicite feedback
5. Faça ajustes conforme necessário

---

**Desenvolvido com ❤️ para TOR**
