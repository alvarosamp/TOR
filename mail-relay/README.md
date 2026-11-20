# TOR Mail Relay (Docker / Hostinger)

Serviço pequeno que recebe `POST /send` do `api.php` (Locaweb) e entrega por **SMTP autenticado da Hostinger**.
O destino das solicitações continua sendo `governo@tor.tec.br` (Gmail); o relay só melhora a entrega.

```
Site (Locaweb) → api.php → HTTPS + token → relay (Docker, VPS Hostinger) → SMTP Hostinger → Gmail
```

## 1. Pré-requisitos na Hostinger
1. VPS com Docker + Docker Compose.
2. Uma **caixa de e-mail** criada no hPanel para ser o remetente (ex.: `site@tor.tec.br`).
3. Um subdomínio (ex.: `relay.tor.tec.br`) com registro **A** apontando para o IP do VPS.
4. Portas 80 e 443 abertas (HTTPS automático via Caddy).

## 2. Subir o relay
```bash
git clone https://github.com/alvarosamp/TOR.git && cd TOR/mail-relay
cp .env.example .env      # preencha RELAY_DOMAIN, RELAY_TOKEN (openssl rand -hex 32), SMTP_USER, SMTP_PASS, MAIL_FROM
docker compose up -d --build
curl https://relay.tor.tec.br/health
```

## 3. Ligar o site ao relay
No GitHub: *Settings > Secrets and variables > Actions*, criar:
- `MAIL_RELAY_URL` = `https://relay.tor.tec.br`
- `MAIL_RELAY_TOKEN` = mesmo valor de `RELAY_TOKEN`

Faça um push (ou *Run workflow*): o deploy gera o `tor-config.php` com esses dados. Sem os secrets, o PHP usa `mail()` como antes.

## 4. Entrega no Gmail (importante)
Se o remetente for `@tor.tec.br`, o SPF do domínio precisa autorizar a Hostinger **além** do Google, num único registro TXT:
`v=spf1 include:_spf.google.com include:_spf.mail.hostinger.com ~all`
Ative também o DKIM da Hostinger no hPanel. Sem isso o Gmail pode mandar para spam.

## Segurança
- Só aceita requisições com `Authorization: Bearer <RELAY_TOKEN>`; limite de 30 envios/min.
- O token fica nos Secrets do GitHub e no `tor-config.php` do servidor (não vai para o repositório).
- Teste: `node tests/mail-relay.test.cjs` (na raiz do projeto).
