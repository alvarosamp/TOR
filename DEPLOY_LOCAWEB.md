# Deploy na Locaweb via FTP

Este projeto possui um workflow do GitHub Actions em:

`.github/workflows/deploy-locaweb.yml`

Ele roda em todo push para `main` ou `master`, gera a pasta `dist` e envia o conteúdo por FTP para a Locaweb.

## Secrets Necessários no GitHub

No repositório, acesse:

`Settings > Secrets and variables > Actions > New repository secret`

Cadastre:

- `HOST`: host FTP informado pela Locaweb
- `USER`: usuário FTP
- `PASS`: senha FTP

## Build Publicado

O comando usado no deploy é:

```bash
npm run build:ftp
```

Ele copia para `dist` os arquivos estáticos do site, incluindo HTML, CSS, JS, imagens, PDFs e versão em inglês.

O workflow usa `localDir: dist`, seguindo o exemplo padrão da Locaweb. Se a hospedagem exigir uma pasta remota específica, adicione `remoteDir` conforme o painel da Locaweb indicar.

## DNS do domínio tor.tec.br

Para apontar o domínio para a Locaweb, configure os nameservers no provedor onde o domínio está registrado:

- `ns1.locaweb.com.br`
- `ns2.locaweb.com.br`
- `ns3.locaweb.com.br`

A propagação pode levar até 24 horas.

## Observação Importante

Deploy por FTP publica a parte estática do site. Recursos que dependem de backend Node, como `/api/admin/*`, chatbot com API e gravação de leads, precisam de hospedagem com Node.js ativo ou outro backend separado.
