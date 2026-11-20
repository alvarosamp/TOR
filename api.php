<?php
/**
 * Backend PHP da TOR para a hospedagem Locaweb (site estático via FTP).
 * Espelha as rotas do server.js necessárias para o formulário de suporte e o painel admin:
 *   GET  ?r=/api/me                      POST ?r=/api/login            POST ?r=/api/logout
 *   POST ?r=/api/quote                   GET  ?r=/api/leads
 *   GET  ?r=/api/admin/tickets           POST ?r=/api/admin/tickets/{id}/reply
 *   GET  ?r=/api/admin/catalog|settings|users|catalog/versions (somente leitura)
 *
 * Credenciais de admin ficam em tor-config.php (gerado no deploy a partir dos secrets do GitHub).
 * Dados ficam em tor-dados/*.php, com um cabeçalho que impede leitura direta pelo navegador.
 */

declare(strict_types=1);

const SUPPORT_EMAIL = 'governo@tor.tec.br';
const DATA_GUARD = "<?php exit; ?>\n";

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
ini_set('display_errors', '0');
set_exception_handler(function (Throwable $error): void {
    error_log('[TOR API] ' . $error->getMessage());
    respond(500, ['error' => 'Não foi possível concluir a operação. Tente novamente ou ligue 0800 000 5978.']);
});

$config = [];
if (is_file(__DIR__ . '/tor-config.php')) {
    $config = (array) (include __DIR__ . '/tor-config.php');
}

session_name('tor_php_sid');
session_set_cookie_params(['lifetime' => 30 * 24 * 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
session_start();

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function data_dir(): string
{
    $dir = __DIR__ . '/tor-dados';
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
        file_put_contents($dir . '/index.html', '');
        file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
        file_put_contents($dir . '/web.config', '<?xml version="1.0"?><configuration><system.webServer><authorization><deny users="*" /></authorization></system.webServer></configuration>');
    }
    return $dir;
}

function read_store(string $name): array
{
    $file = data_dir() . "/$name.php";
    if (!is_file($file)) return [];
    $fp = fopen($file, 'r');
    if (!$fp || !flock($fp, LOCK_SH)) throw new RuntimeException('Falha ao ler dados.');
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode(substr($raw, strlen(DATA_GUARD)), true, 512, JSON_THROW_ON_ERROR);
    return $data;
}

function update_store(string $name, callable $update): void
{
    $fp = fopen(data_dir() . "/$name.php", 'c+');
    if (!$fp || !flock($fp, LOCK_EX)) throw new RuntimeException('Falha ao bloquear dados.');
    try {
        $raw = stream_get_contents($fp);
        $items = $raw === '' ? [] : json_decode(substr($raw, strlen(DATA_GUARD)), true, 512, JSON_THROW_ON_ERROR);
        $encoded = DATA_GUARD . json_encode($update($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        rewind($fp);
        if (fwrite($fp, $encoded) !== strlen($encoded) || !ftruncate($fp, strlen($encoded)) || !fflush($fp)) {
            throw new RuntimeException('Falha ao gravar dados.');
        }
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function append_store(string $name, array $item): void
{
    update_store($name, function (array $items) use ($item): array {
        $items[] = $item;
        return $items;
    });
}

function body(): array
{
    $json = json_decode((string) file_get_contents('php://input'), true);
    return is_array($json) ? $json : $_POST;
}

function clean($value, int $max = 2000): string
{
    return mb_substr(trim(is_string($value) ? $value : (is_scalar($value) ? (string) $value : '')), 0, $max);
}

function one_line(string $value, int $max): string
{
    return mb_substr(trim(preg_replace('/[\r\n]+/', ' ', $value)), 0, $max);
}

function now_iso(): string
{
    return gmdate('Y-m-d\TH:i:s.v\Z');
}

function new_id(string $prefix): string
{
    return $prefix . '_' . (int) round(microtime(true) * 1000) . bin2hex(random_bytes(2));
}

function admin_user(): ?array
{
    return !empty($_SESSION['tor_admin']) ? $_SESSION['tor_admin'] : null;
}

function require_admin(): void
{
    if (!admin_user()) respond(401, ['error' => 'É necessário estar logado como administrador.']);
}

function send_via_relay(string $to, string $subject, string $replyTo, string $text, string $html): bool
{
    $url = (string) ($GLOBALS['config']['relay_url'] ?? '');
    $token = (string) ($GLOBALS['config']['relay_token'] ?? '');
    if ($url === '' || $token === '' || !function_exists('curl_init')) return false;
    $ch = curl_init(rtrim($url, '/') . '/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_POSTFIELDS => json_encode([
            'to' => $to,
            'subject' => $subject,
            'replyTo' => filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : '',
            'text' => $text,
            'html' => $html,
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $out = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = is_string($out) ? json_decode($out, true) : null;
    return $status === 200 && is_array($data) && !empty($data['ok']);
}

function send_support_mail(string $subject, string $replyTo, array $fields, string $message, string $recipient = SUPPORT_EMAIL): bool
{
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) return false;
    $rows = '';
    $text = '';
    foreach ($fields as $label => $value) {
        if ($value === '' || $value === null) continue;
        $rows .= '<tr><td style="background:#f2f4f8;font-weight:bold;width:180px;border:1px solid #dde2ea">' . htmlspecialchars($label) . '</td><td style="border:1px solid #dde2ea">' . htmlspecialchars((string) $value) . '</td></tr>';
        $text .= "$label: $value\n";
    }
    $html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;max-width:640px">'
        . '<table cellpadding="6" style="border-collapse:collapse;width:100%">' . $rows . '</table>'
        . '<h3 style="margin:18px 0 6px">Mensagem</h3><div style="white-space:pre-wrap;border:1px solid #dde2ea;padding:12px;background:#fafbfc">' . htmlspecialchars($message) . '</div>'
        . '<p style="color:#666;font-size:12px;margin-top:18px">Enviado automaticamente pelo site TOR Tecnologia. Use o botão Responder para continuar o atendimento.</p></div>';

    $boundary = 'tor_' . bin2hex(random_bytes(8));
    $from = SUPPORT_EMAIL;
    $newline = PHP_OS_FAMILY === 'Windows' ? "\r\n" : "\n";
    $headers = implode($newline, [
        'MIME-Version: 1.0',
        'From: ' . $from,
        'Return-Path: ' . $from,
        'Reply-To: ' . (filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : $from),
        "Content-Type: multipart/alternative; boundary=\"$boundary\""
    ]);
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n$text\nMensagem:\n$message\r\n"
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n$html\r\n--$boundary--";
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    // 1) Relay SMTP (Docker na Hostinger): envio autenticado, melhor entrega que mail().
    if (send_via_relay($recipient, $subject, $replyTo, $text . "\nMensagem:\n" . $message, $html)) return true;

    // 2) Reserva: mail() da hospedagem.
    try {
        if (PHP_OS_FAMILY === 'Windows') return mail($recipient, $encodedSubject, $body, $headers);
        return mail($recipient, $encodedSubject, $body, $headers, '-r' . $from);
    } catch (Throwable $e) {
        return false;
    }
}

// ---------------------------------------------------------------- roteamento
$route = '/' . trim((string) ($_GET['r'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($route === '/api/health') {
    respond(200, ['status' => 'ok', 'service' => 'tor-site-php', 'timestamp' => now_iso()]);
}

if ($route === '/api/me' && $method === 'GET') {
    respond(200, ['user' => admin_user()]);
}

if ($route === '/api/login' && $method === 'POST') {
    $in = body();
    $email = strtolower(clean($in['email'] ?? '', 200));
    $password = (string) ($in['password'] ?? '');
    $admins = $config['admins'] ?? [];
    if (!$admins) respond(503, ['error' => 'Login de administrador não configurado no servidor.']);
    foreach ($admins as $admin) {
        if (strtolower($admin['email']) === $email && password_verify($password, str_replace('$2b$', '$2y$', $admin['hash']))) {
            session_regenerate_id(true);
            $_SESSION['tor_admin'] = ['id' => 'admin_' . md5($email), 'name' => $admin['name'] ?? 'Administrador TOR', 'email' => $email, 'organization' => 'TOR Tecnologia', 'phone' => '', 'isAdmin' => true, 'createdAt' => ''];
            respond(200, ['ok' => true, 'user' => $_SESSION['tor_admin']]);
        }
    }
    usleep(400000);
    respond(401, ['error' => 'E-mail ou senha incorretos.']);
}

if ($route === '/api/logout' && $method === 'POST') {
    $_SESSION = [];
    session_destroy();
    respond(200, ['ok' => true]);
}

if ($route === '/api/quote' && $method === 'POST') {
    $in = body();
    $fields = ['name', 'organization', 'email', 'phone', 'requestType', 'product', 'quantity', 'segment', 'deadline', 'subject', 'message', 'lgpdConsent', 'source'];
    $lead = [];
    foreach ($fields as $f) $lead[$f] = clean($in[$f] ?? '');
    $missing = array_values(array_filter(['name', 'email', 'requestType', 'subject', 'message', 'lgpdConsent'], fn($f) => $lead[$f] === ''));
    if ($missing) respond(400, ['error' => 'Campos obrigatórios ausentes: ' . implode(', ', $missing)]);
    if (!in_array(strtolower($lead['lgpdConsent']), ['sim', 'on', 'true', '1'], true)) respond(400, ['error' => 'É necessário aceitar a Política de Privacidade.']);
    if (!filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) respond(400, ['error' => 'E-mail inválido.']);

    $record = ['id' => new_id('lead'), 'createdAt' => now_iso(), 'status' => 'novo'] + $lead;
    append_store('leads', $record);

    $subject = '[Site TOR] ' . one_line($lead['requestType'], 40) . ' — ' . one_line($lead['subject'], 90) . ' — ' . one_line($lead['organization'] ?: $lead['name'], 60);
    $mailFields = [
        'Protocolo' => $record['id'],
        'Recebido em' => (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i'),
        'Tipo de solicitação' => $lead['requestType'],
        'Assunto' => $lead['subject'],
        'Nome' => $lead['name'],
        'Organização' => $lead['organization'],
        'E-mail' => $lead['email'],
        'Telefone' => $lead['phone'],
        'Produto de interesse' => $lead['product'],
        'Quantidade' => $lead['quantity'],
        'Segmento' => $lead['segment'],
        'Prazo' => $lead['deadline'],
        'Origem' => $lead['source'],
        'Consentimento LGPD' => $lead['lgpdConsent'] ? 'Sim' : 'Não',
    ];
    $sent = send_support_mail($subject, $lead['email'], $mailFields, $lead['message']);

    // Sempre salva no painel: aceitação de e-mail não confirma entrega na caixa.
    $extra = array_filter([
        $lead['product'] ? 'Produto: ' . $lead['product'] : '',
        $lead['quantity'] ? 'Quantidade: ' . $lead['quantity'] : '',
        $lead['segment'] ? 'Segmento: ' . $lead['segment'] : '',
        $lead['deadline'] ? 'Prazo: ' . $lead['deadline'] : '',
    ]);
    append_store('tickets', [
        'id' => new_id('ticket'),
        'createdAt' => $record['createdAt'],
        'status' => 'novo',
        'origem' => 'formulario-site',
        'leadId' => $record['id'],
        'emailFalhou' => !$sent,
        'emailStatus' => $sent ? 'aceito-pelo-servidor' : 'falha-no-envio',
        'name' => $lead['name'],
        'organization' => $lead['organization'],
        'email' => $lead['email'],
        'phone' => $lead['phone'],
        'subject' => '[' . $lead['requestType'] . '] ' . $lead['subject'],
        'message' => mb_substr(implode("\n", array_merge([$lead['message']], $extra, [$sent ? '(E-mail aceito pelo servidor para envio; entrega na caixa não confirmada.)' : '(Não foi possível enviar o e-mail para ' . SUPPORT_EMAIL . ' — solicitação salva no painel.)'])), 0, 4000),
    ]);

    $copySent = send_support_mail('[TOR] Cópia da sua solicitação — ' . one_line($lead['subject'], 90), SUPPORT_EMAIL, $mailFields, $lead['message'], $lead['email']);

    respond(201, ['ok' => true, 'id' => $record['id'], 'emailSent' => $sent, 'emailCopySent' => $copySent, 'message' => 'Solicitação recebida. A equipe TOR entrará em contato.']);
}

// ------------------------------------------------------------- rotas de admin
if ($route === '/api/leads' && $method === 'GET') {
    require_admin();
    $leads = read_store('leads');
    respond(200, ['total' => count($leads), 'leads' => $leads]);
}

if ($route === '/api/admin/tickets' && $method === 'GET') {
    require_admin();
    $tickets = read_store('tickets');
    respond(200, ['total' => count($tickets), 'tickets' => $tickets]);
}

if (preg_match('#^/api/admin/tickets/([^/]+)/reply$#', $route, $m) && $method === 'POST') {
    require_admin();
    $in = body();
    $reply = clean($in['reply'] ?? '', 4000);
    $applyToOthers = !empty($in['applyToOthers']);
    if ($reply === '') respond(400, ['error' => 'Informe a resposta ao chamado.']);

    $tickets = read_store('tickets');
    $targetIndex = null;
    foreach ($tickets as $i => $t) if (($t['id'] ?? '') === urldecode($m[1])) $targetIndex = $i;
    if ($targetIndex === null) respond(404, ['error' => 'Chamado não encontrado.']);

    $now = now_iso();
    $updated = [];
    $targetEmail = $tickets[$targetIndex]['email'] ?? '';
    foreach ($tickets as $i => &$t) {
        $isTarget = $i === $targetIndex;
        $isSibling = $applyToOthers && ($t['email'] ?? '') === $targetEmail && ($t['status'] ?? '') !== 'respondido';
        if ($isTarget || $isSibling) {
            $t['reply'] = $reply;
            $t['repliedAt'] = $now;
            $t['status'] = 'respondido';
            $updated[] = $t['id'];
        }
    }
    unset($t);
    update_store('tickets', function (array $current) use ($tickets, $updated): array {
        $changes = array_column($tickets, null, 'id');
        return array_map(fn($item) => in_array($item['id'], $updated, true) ? $changes[$item['id']] : $item, $current);
    });
    respond(200, ['ok' => true, 'updatedIds' => $updated]);
}

// Somente leitura: o catálogo e as configurações da hospedagem estática vêm dos arquivos publicados.
if ($route === '/api/admin/catalog' && $method === 'GET') { require_admin(); respond(200, ['total' => 0, 'products' => [], 'readOnly' => true]); }
if ($route === '/api/admin/catalog/versions' && $method === 'GET') { require_admin(); respond(200, ['versions' => []]); }
if ($route === '/api/admin/users' && $method === 'GET') { require_admin(); respond(200, ['total' => 0, 'users' => []]); }
if ($route === '/api/admin/settings' && $method === 'GET') {
    require_admin();
    respond(200, ['email' => SUPPORT_EMAIL, 'phone' => '0800 000 5978', 'linkedin' => 'https://www.linkedin.com/company/tor-tecnologia-e-industria/', 'instagram' => 'https://www.instagram.com/tor.tec/']);
}
if (str_starts_with($route, '/api/admin/')) {
    require_admin();
    respond(501, ['error' => 'Edição de catálogo e configurações não está disponível nesta hospedagem. Altere pelo repositório.']);
}

respond(404, ['error' => 'Rota não encontrada.']);
