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

## Formulário e painel PHP

A publicação inclui `api.php`. A hospedagem precisa executar PHP 8.0 ou superior com mbstring e permitir gravação na pasta do site. A API cria `tor-dados` com arquivos PHP protegidos, fora do conteúdo gerado pelo build. Preserve essa pasta em novos deploys e backups.

O formulário tenta Node primeiro, depois PHP. O PHP salva toda solicitação como chamado com status novo antes de confirmar o recebimento. Não depende da ativação do FormSubmit. FormSubmit é apenas alternativa quando nenhum backend responde; nesse caso não há gravação no painel.

O visitante recebe uma cópia separada com protocolo e os dados da solicitação. Respostas à cópia são direcionadas para governo@tor.tec.br. A falha da cópia não impede a gravação do chamado.

O envio usa `mail()` da hospedagem, com `governo@tor.tec.br` como From e Return-Path e o endereço do cliente em Reply-To. No Linux usa o parâmetro `-r`, conforme a orientação da Locaweb. Não exige secrets SMTP. A aceitação pelo servidor não confirma entrega na caixa: verifique recebimento e spam. Se a hospedagem bloquear mail(), configure envio autenticado em uma próxima etapa; os chamados continuam salvos.

Para acessar `/admin.html`, cadastre os secrets `ADMIN_EMAIL` e `ADMIN_PASSWORD` no GitHub e execute novamente o workflow. São credenciais próprias do painel, independentes da senha do e-mail. O deploy gera `tor-config.php` com hash de senha; nunca publique senhas ou arquivos de dados no Git.

Na versão PHP, Chamados, respostas e solicitações funcionam; edição de catálogo/configurações e contas de clientes ainda dependem de Node. O chatbot com API também precisa de backend próprio.
