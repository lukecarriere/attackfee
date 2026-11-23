<?php
// The default issuer is this site (spec §13): /wp-json/attackfee/v1/{challenge,redeem,status,health,
// siteverify}. Same wire format as docs/protocol.md. WordPress takes no payments itself: with
// "Collect usage payouts" on and a Payment server set, offers for agents are minted by that server
// and relayed here, and a paid redeem is forwarded to it for checking (payouts.php). Otherwise
// offers are [] and agents get the work check.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

use Attackfee\Policy;
use Attackfee\Protocol;
use Attackfee\AttackfeeError;

const ATTACKFEE_WP_PASS_TTL = 900;
const ATTACKFEE_WP_PASS_USES = 20;
const ATTACKFEE_WP_CHALLENGE_TTL = 120;
const ATTACKFEE_WP_CHALLENGES_PER_MIN = 60;
// Paid pass (docs/settlement.md Q6): one use, 60 seconds, for the agent's Authorization header.
const ATTACKFEE_WP_PAID_PASS_USES = 1;
const ATTACKFEE_WP_PAID_PASS_TTL = 60;

function attackfee_wp_register_routes(): void
{
    $open = fn () => true; // public endpoints, like the Node issuer; each checks its own input
    register_rest_route('attackfee/v1', '/challenge', ['methods' => 'GET', 'callback' => 'attackfee_wp_rest_challenge', 'permission_callback' => $open]);
    register_rest_route('attackfee/v1', '/redeem', ['methods' => 'POST', 'callback' => 'attackfee_wp_rest_redeem', 'permission_callback' => $open]);
    register_rest_route('attackfee/v1', '/status', ['methods' => 'GET', 'callback' => 'attackfee_wp_rest_status', 'permission_callback' => $open]);
    register_rest_route('attackfee/v1', '/health', ['methods' => 'GET', 'callback' => 'attackfee_wp_rest_health', 'permission_callback' => $open]);
    register_rest_route('attackfee/v1', '/price', ['methods' => 'GET', 'callback' => 'attackfee_wp_rest_price', 'permission_callback' => $open]);
    register_rest_route('attackfee/v1', '/siteverify', ['methods' => 'POST', 'callback' => 'attackfee_wp_rest_siteverify', 'permission_callback' => $open]);
}

function attackfee_wp_json(array $body, int $status = 200, array $headers = []): WP_REST_Response
{
    $r = new WP_REST_Response($body, $status);
    $r->header('Cache-Control', 'no-store');
    foreach ($headers as $k => $v) $r->header($k, $v);
    return $r;
}

function attackfee_wp_ip(): string
{
    return isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '?';
}

/** Per-IP challenge rate limit (spec §16), counted per minute in a transient. */
function attackfee_wp_allow_challenge(): bool
{
    $key = 'attackfee_wp_rl_' . md5(attackfee_wp_ip() . '|' . gmdate('YmdHi'));
    $n = (int) get_transient($key) + 1;
    set_transient($key, $n, 120);
    return $n <= (int) apply_filters('attackfee_wp_challenges_per_min', ATTACKFEE_WP_CHALLENGES_PER_MIN);
}

/** Route prefix the challenge is bound to (matches the gate's check): longest write route, else "/". */
function attackfee_wp_prefix(string $path): string
{
    $best = '/';
    foreach (ATTACKFEE_WP_ROUTES as $r) {
        if ($r['class'] !== 'read' && str_starts_with($path, $r['prefix']) && strlen($r['prefix']) > strlen($best)) $best = $r['prefix'];
    }
    return $best;
}

function attackfee_wp_mint(string $action, string $path, ?string $ua): array
{
    $wp = Policy::workParams($action, Policy::uaClass($ua));
    $c = Protocol::mintChallenge(attackfee_wp_secret(), attackfee_wp_site_key(), $action, attackfee_wp_prefix($path), $wp, ATTACKFEE_WP_CHALLENGE_TTL, time());
    attackfee_wp_count('challenges_minted');
    return $c;
}

function attackfee_wp_rest_challenge(WP_REST_Request $req): WP_REST_Response
{
    if (!attackfee_wp_lib_ok()) return attackfee_wp_json(['error' => 'unavailable'], 503);
    $action = (string) ($req->get_param('action') ?? 'write');
    if (!isset(Protocol::CLASS_MULT[$action]) || $action === 'read') return attackfee_wp_json(['error' => 'bad_action'], 400);
    $site = $req->get_param('site');
    if ($site !== null && $site !== '' && $site !== attackfee_wp_site_key()) return attackfee_wp_json(['error' => 'wrong_site'], 400);
    if (!attackfee_wp_allow_challenge()) return attackfee_wp_json(['error' => 'rate_limited'], 429, ['Retry-After' => '60']);
    $c = attackfee_wp_mint($action, (string) ($req->get_param('path') ?? '/'), $req->get_header('user-agent'));
    $offers = [];
    if ((string) $req->get_param('offers') === '0') {
        // The agent fetched a 402's challenge_url: it chose the work instead of paying.
        attackfee_wp_count('work_after_402');
    } elseif (attackfee_wp_is_agent((string) $req->get_param('client'), (string) $req->get_header('attackfee_client'))) {
        $offers = attackfee_wp_relay_offers($action)['offers'] ?? [];
    }
    return attackfee_wp_json(['challenge' => $c, 'offers' => $offers]);
}

function attackfee_wp_cookie(string $pass, int $exp): void
{
    if (headers_sent()) return;
    setcookie('attackfee_pass', $pass, ['expires' => $exp, 'path' => '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax']);
}

/** Verify a work solution and mint a human pass (900 s, 20 uses). Throws AttackfeeError. */
function attackfee_wp_redeem_solution(mixed $challenge, mixed $solution): array
{
    $now = time();
    $c = Protocol::checkChallenge(attackfee_wp_secret(), $challenge, $now, attackfee_wp_site_key());
    if (!attackfee_wp_first_use($c['id'], $c['exp'])) throw new AttackfeeError('replay');
    if (!Protocol::verifyWork(attackfee_wp_secret(), $c, is_array($solution) ? ($solution['work'] ?? null) : null)) throw new AttackfeeError('bad_solution');
    $claims = Protocol::newPassClaims(attackfee_wp_site_key(), $c['bound']['action'], ATTACKFEE_WP_PASS_USES, ATTACKFEE_WP_PASS_TTL, $now);
    return ['pass' => Protocol::signPass(attackfee_wp_secret(), $claims), 'exp' => $claims['exp'], 'cls' => $claims['cls'], 'rail' => 'work'];
}

function attackfee_wp_rest_redeem(WP_REST_Request $req): WP_REST_Response
{
    if (!attackfee_wp_lib_ok()) return attackfee_wp_json(['error' => 'unavailable'], 503);
    $b = $req->get_json_params() ?: $req->get_body_params();
    if (isset($b['offer_id'])) return attackfee_wp_redeem_paid(is_array($b) ? $b : []);
    if (!is_string($b['challenge_id'] ?? null) || !is_array($b['solution'] ?? null) || !is_array($b['challenge'] ?? null)) return attackfee_wp_json(['error' => 'malformed'], 400);
    if (($b['challenge']['id'] ?? null) !== $b['challenge_id']) return attackfee_wp_json(['error' => 'malformed'], 400);
    try {
        $r = attackfee_wp_redeem_solution($b['challenge'], $b['solution']);
    } catch (Attackfee_Store_Error $e) {
        return attackfee_wp_json(['error' => 'unavailable'], 503);
    } catch (AttackfeeError $e) {
        return attackfee_wp_json(['error' => $e->codeName], $e->codeName === 'replay' ? 401 : 400);
    }
    attackfee_wp_cookie($r['pass'], $r['exp']);
    return attackfee_wp_json($r);
}

/**
 * Paid redeem: the payment server checks and books the payment (single use there), then this site
 * mints its own short pass. No cookie: agents send it in the Authorization header.
 */
function attackfee_wp_redeem_paid(array $b): WP_REST_Response
{
    [$status, $body] = attackfee_wp_relay_redeem($b);
    if ($status !== 200) return attackfee_wp_json($body, $status);
    $claims = Protocol::newPassClaims(attackfee_wp_site_key(), $body['cls'], ATTACKFEE_WP_PAID_PASS_USES, ATTACKFEE_WP_PAID_PASS_TTL, time());
    attackfee_wp_count('paid');
    return attackfee_wp_json(['pass' => Protocol::signPass(attackfee_wp_secret(), $claims), 'exp' => $claims['exp'], 'cls' => $claims['cls'], 'rail' => 'settle']);
}

function attackfee_wp_token_from_request(?WP_REST_Request $req = null): ?string
{
    $auth = $req ? (string) $req->get_header('authorization') : (isset($_SERVER['HTTP_AUTHORIZATION']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_AUTHORIZATION'])) : '');
    if (preg_match('/^Attackfee\s+(\S+)$/i', $auth, $m)) return $m[1];
    // The signed pass is this request's proof (verified by signature), so there is no nonce to check.
    // phpcs:ignore WordPress.Security.NonceVerification.Missing
    $posted = isset($_POST['attackfee-pass']) && is_string($_POST['attackfee-pass']) ? sanitize_text_field(wp_unslash($_POST['attackfee-pass'])) : '';
    if ($posted !== '') return $posted;
    if (isset($_COOKIE['attackfee_pass']) && is_string($_COOKIE['attackfee_pass'])) return sanitize_text_field(wp_unslash($_COOKIE['attackfee_pass']));
    return null;
}

/**
 * Check a pass for an action and spend one use. Returns [ok, reason]. Logs pass_accept, or
 * pass_reject with a reason (expired, exhausted, bad_sig, malformed, wrong_site, class_too_low).
 */
function attackfee_wp_check_pass(string $token, string $action, bool $consume = true): array
{
    try {
        $claims = Protocol::verifyPass(attackfee_wp_secret(), $token, time(), attackfee_wp_site_key(), $action);
        if ($consume) {
            $left = attackfee_wp_consume($claims['jti'], (int) $claims['n'], (int) $claims['exp']);
            if ($left < 0) throw new AttackfeeError('exhausted');
            attackfee_wp_count('pass_accept');
        }
        return [true, $claims];
    } catch (Attackfee_Store_Error $e) {
        return [false, 'store_unavailable'];
    } catch (AttackfeeError $e) {
        if ($consume) attackfee_wp_count('pass_reject');
        return [false, $e->codeName];
    }
}

function attackfee_wp_rest_status(WP_REST_Request $req): WP_REST_Response
{
    $t = attackfee_wp_token_from_request($req);
    if (!$t || !attackfee_wp_lib_ok()) return attackfee_wp_json(['ok' => false]);
    try {
        $c = Protocol::verifyPass(attackfee_wp_secret(), $t, time(), attackfee_wp_site_key(), 'search');
        return attackfee_wp_json(['ok' => true, 'exp' => $c['exp'], 'cls' => $c['cls'], 'n' => attackfee_wp_uses_left($c['jti'], (int) $c['n'], (int) $c['exp'])]);
    } catch (\Throwable $e) {
        return attackfee_wp_json(['ok' => false]);
    }
}

function attackfee_wp_rest_health(): WP_REST_Response
{
    return attackfee_wp_json(['ok' => attackfee_wp_lib_ok(), 'v' => '1.0.0', 'settlement' => 'off']);
}

/** siteverify (spec §8.5): form or JSON secret + response (pass or redeem payload) + optional action. */
function attackfee_wp_rest_siteverify(WP_REST_Request $req): WP_REST_Response
{
    $b = $req->get_json_params() ?: $req->get_body_params();
    $secret = is_string($b['secret'] ?? null) ? $b['secret'] : '';
    if (!hash_equals(attackfee_wp_secret(), $secret)) return attackfee_wp_json(['success' => false, 'error-codes' => ['invalid-input-secret']]);
    $response = $b['response'] ?? '';
    $action = is_string($b['action'] ?? null) && isset(Protocol::CLASS_MULT[$b['action']]) ? $b['action'] : 'search';
    try {
        if (is_string($response) && str_starts_with(trim($response), '{')) {
            $p = json_decode($response, true);
            if (!is_array($p) || ($p['challenge']['id'] ?? null) !== ($p['challenge_id'] ?? '')) throw new AttackfeeError('malformed');
            $response = attackfee_wp_redeem_solution($p['challenge'], $p['solution'] ?? [])['pass'];
        }
        [$ok, $c] = attackfee_wp_check_pass((string) $response, $action);
        if (!$ok) throw new AttackfeeError(is_string($c) ? $c : 'malformed');
        return attackfee_wp_json(['success' => true, 'action' => $c['cls'], 'hostname' => (string) wp_parse_url(home_url(), PHP_URL_HOST), 'challenge_ts' => gmdate('Y-m-d\TH:i:s.000\Z', (int) $c['iat'])]);
    } catch (\Throwable $e) {
        $code = $e instanceof AttackfeeError ? $e->codeName : '';
        return attackfee_wp_json(['success' => false, 'error-codes' => [in_array($code, ['expired', 'exhausted', 'replay'], true) ? 'timeout-or-duplicate' : 'invalid-input-response']]);
    }
}
