<?php
// The gate: puts <attackfee-check> in protected forms, loads the widget, and verifies the pass on the
// server before WordPress handles the form (spec §13). Fails closed: no valid pass, no write.
// Opt-in forms: the WooCommerce classic checkout and Contact Form 7 (REST and no-JS submits). The
// WooCommerce block checkout (Store API) isn't covered yet: nothing here is registered for it, so
// people and agents get stock behavior there.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

function attackfee_wp_init_gate(): void
{
    $s = attackfee_wp_settings();
    $f = $s['forms'];
    add_action('wp_enqueue_scripts', 'attackfee_wp_enqueue');
    add_filter('script_loader_tag', 'attackfee_wp_script_tag', 10, 2);
    if ($f['comments']) {
        add_filter('comment_form_submit_field', fn ($html) => $html . attackfee_wp_element('write'));
        add_filter('preprocess_comment', 'attackfee_wp_check_comment', 1);
    }
    if ($f['login']) {
        add_action('login_form', fn () => attackfee_wp_print_element('account'));
        // Before the password is checked (known user), and as a catch-all after the core checks.
        add_filter('wp_authenticate_user', 'attackfee_wp_check_login', 1, 1);
        add_filter('authenticate', 'attackfee_wp_check_login', 30, 1);
    }
    if ($f['register']) {
        add_action('register_form', fn () => attackfee_wp_print_element('account'));
        add_filter('registration_errors', 'attackfee_wp_check_wp_error', 10, 1);
    }
    if ($f['lostpassword']) {
        add_action('lostpassword_form', fn () => attackfee_wp_print_element('account'));
        add_action('lostpassword_post', 'attackfee_wp_check_wp_error', 10, 1);
    }
    if ($f['login'] || $f['register'] || $f['lostpassword']) add_action('login_enqueue_scripts', 'attackfee_wp_enqueue');
    if ($f['woo'] && attackfee_wp_woo_active()) {
        add_action('woocommerce_review_order_before_submit', fn () => attackfee_wp_print_element('write'));
        add_action('woocommerce_after_checkout_validation', 'attackfee_wp_check_woo', 10, 2);
    }
    if ($f['cf7'] && attackfee_wp_cf7_active()) {
        add_filter('wpcf7_form_elements', fn ($html) => $html . attackfee_wp_element('write'));
        add_filter('wpcf7_spam', 'attackfee_wp_check_cf7', 10, 1);
    }
    if (attackfee_wp_rest_gated_routes() !== []) add_filter('rest_dispatch_request', 'attackfee_wp_rest_gate', 10, 2);
}

function attackfee_wp_widget_url(): string
{
    return plugins_url('assets/widget/attackfee.js', ATTACKFEE_WP_FILE);
}

function attackfee_wp_enqueue(): void
{
    wp_enqueue_script('attackfee', attackfee_wp_widget_url(), [], ATTACKFEE_WP_VERSION, ['strategy' => 'defer', 'in_footer' => false]);
}

/** The widget reads its issuer, site key and time limit from data attributes on its own tag. */
function attackfee_wp_script_tag(string $tag, string $handle): string
{
    if ($handle !== 'attackfee') return $tag;
    $s = attackfee_wp_settings();
    $attrs = sprintf(' data-issuer="%s" data-site="%s" data-max-solve-ms="%d"', esc_attr(untrailingslashit(rest_url('attackfee'))), esc_attr(attackfee_wp_site_key()), (int) $s['longest_s'] * 1000);
    return preg_replace('/<script /', '<script' . $attrs . ' ', $tag, 1) ?? $tag;
}

function attackfee_wp_element(string $action): string
{
    $box = attackfee_wp_settings()['visible_check'] ? ' data-attackfee-checkbox="true"' : '';
    return sprintf('<attackfee-check action="%s"%s></attackfee-check><noscript><p>%s</p></noscript>', esc_attr($action), $box, esc_html(attackfee_wp_s('no_js')));
}

/** The only markup attackfee_wp_element() makes, for printing it through wp_kses. */
const ATTACKFEE_WP_ELEMENT_HTML = ['attackfee-check' => ['action' => true, 'data-attackfee-checkbox' => true], 'noscript' => [], 'p' => []];

/** Prints the element in action hooks (login, registration, lost password, checkout). */
function attackfee_wp_print_element(string $action): void
{
    echo wp_kses(attackfee_wp_element($action), ATTACKFEE_WP_ELEMENT_HTML);
}

/**
 * Verify the pass on this request for an action. Returns [ok, reason]. A request with no pass logs
 * pass_absent (first contact), not a rejection; a bad pass logs pass_reject with its reason. The
 * refusal itself is counted where it is sent (turned_away for a 403, offer_shown for a 402).
 * Themes can call this for their own data-attackfee forms.
 */
function attackfee_wp_verify_request(string $action): array
{
    // One check per request and action: several hooks may ask, but only one pass use is spent.
    static $done = [];
    if (isset($done[$action])) return $done[$action];
    return $done[$action] = attackfee_wp_verify_request_once($action);
}

function attackfee_wp_verify_request_once(string $action): array
{
    if (!attackfee_wp_lib_ok()) return [false, 'unavailable'];
    $token = attackfee_wp_token_from_request();
    if ($token === null) {
        attackfee_wp_count('pass_absent');
        return [false, 'missing'];
    }
    [$ok, $r] = attackfee_wp_check_pass($token, $action);
    return [$ok, $ok ? 'ok' : (string) $r];
}

/** Count one turned_away per refused request and action, however many hooks refuse it. */
function attackfee_wp_turned_away(string $action): void
{
    static $done = [];
    if (isset($done[$action])) return;
    $done[$action] = true;
    attackfee_wp_count('turned_away');
}

/** An automated client (docs/settlement.md Q2): client=agent in the query or an Attackfee-Client: agent header. */
function attackfee_wp_is_agent(?string $query = null, ?string $header = null): bool
{
    // A read-only client flag on any request; it changes no state, so there is no nonce to check.
    $query ??= isset($_GET['client']) && is_string($_GET['client']) ? sanitize_text_field(wp_unslash($_GET['client'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    $header ??= isset($_SERVER['HTTP_ATTACKFEE_CLIENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_ATTACKFEE_CLIENT'])) : '';
    return $query === 'agent' || strtolower(trim($header)) === 'agent';
}

/** The work fallback link in a 402: this site's challenge endpoint with offers=0 (same query as Node). */
function attackfee_wp_challenge_url(string $action, string $path): string
{
    $u = rest_url('attackfee/v1/challenge');
    $rel = (string) wp_parse_url($u, PHP_URL_PATH);
    $q = (string) wp_parse_url($u, PHP_URL_QUERY);
    if ($q !== '') $rel .= '?' . $q;
    $query = http_build_query(['site' => attackfee_wp_site_key(), 'action' => $action, 'path' => $path, 'client' => 'agent', 'offers' => '0'], '', '&', PHP_QUERY_RFC3986);
    return $rel . (str_contains($rel, '?') ? '&' : '?') . $query;
}

/**
 * How to refuse an agent the way the Node issuer does (docs/settlement.md §4): a 402 with the offers
 * the payment server minted, the WWW-Authenticate value it gave, and a challenge_url for the work
 * instead; or, with no offers (payouts off, Test mode, no address, server down or slow), the
 * work-only 403 with an inline challenge. Over the per-IP challenge limit: 403 with no challenge.
 * Returns [status, body, headers] and counts offer_shown or turned_away; sending is up to the caller.
 */
function attackfee_wp_agent_refusal(string $action, string $path): array
{
    $presented = attackfee_wp_presented_response($action);
    if ($presented !== null) return $presented;
    $ok = attackfee_wp_lib_ok() && attackfee_wp_allow_challenge();
    $relay = $ok ? attackfee_wp_relay_offers($action) : null;
    if ($relay !== null) {
        attackfee_wp_count('offer_shown');
        $headers = [$relay['header'] => $relay['value'], 'Access-Control-Expose-Headers' => $relay['header']];
        return [402, ['error' => 'payment_required', 'challenge_url' => attackfee_wp_challenge_url($action, $path), 'offers' => $relay['offers']], $headers];
    }
    attackfee_wp_turned_away($action);
    $body = ['error' => 'attackfee_required'];
    if ($ok) {
        try {
            $body['challenge'] = attackfee_wp_mint($action, $path, isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : null);
        } catch (\Throwable $e) {
            // No challenge in the 403 rather than an error page.
        }
    }
    return [403, $body, []];
}

/**
 * An agent retry that already carries X-Cashu. Null when this request is not that retry.
 * A V3 or V4 string is forwarded. The pass is minted here after the payment server books it.
 * @return array{0: int, 1: array<string, mixed>, 2: array<string, string>}|null
 */
function attackfee_wp_presented_response(string $action): ?array
{
    $raw = isset($_SERVER['HTTP_X_CASHU']) && is_string($_SERVER['HTTP_X_CASHU']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_CASHU'])) : '';
    if ($raw === '') return null;
    $p = \Attackfee\Settlement::presentedCashu($raw);
    if ($p === null) return null;
    [$status, $body] = attackfee_wp_relay_presented($p['token'], $action);
    if ($status !== 200) return [$status, $body, []];
    $claims = \Attackfee\Protocol::newPassClaims(attackfee_wp_site_key(), $body['cls'], ATTACKFEE_WP_PAID_PASS_USES, ATTACKFEE_WP_PAID_PASS_TTL, time());
    attackfee_wp_count('paid');
    return [200, ['pass' => \Attackfee\Protocol::signPass(attackfee_wp_secret(), $claims), 'exp' => $claims['exp'], 'cls' => $claims['cls'], 'rail' => 'settle'], []];
}

/** Send attackfee_wp_agent_refusal() and stop: nothing after this runs (no comment, order or mail). */
function attackfee_wp_refuse_agent(string $action, string $path): never
{
    nocache_headers();
    [$status, $body, $headers] = attackfee_wp_agent_refusal($action, $path);
    foreach ($headers as $name => $value) header($name . ': ' . $value);
    wp_send_json($body, $status);
}

/** Path of this request, for the challenge a refusal carries ("/" when it can't be read). */
function attackfee_wp_request_path(): string
{
    $p = wp_parse_url(isset($_SERVER['REQUEST_URI']) ? esc_url_raw(wp_unslash($_SERVER['REQUEST_URI'])) : '/', PHP_URL_PATH);
    return is_string($p) && $p !== '' ? $p : '/';
}

/**
 * Look at the pass on this request without spending a use: true when it is valid for $action now
 * and has a use left. Used where a refusal must come before the form's own checks, and the use is
 * spent after them (attackfee_wp_verify_request(), atomic), so a form that fails its own validation
 * costs nothing. A missing pass counts pass_absent, a bad or used-up one pass_reject (the request is
 * refused right after); nothing counts pass_accept until the use is actually spent.
 */
function attackfee_wp_peek_request(string $action, ?WP_REST_Request $req = null): bool
{
    if (!attackfee_wp_lib_ok()) return false;
    $token = attackfee_wp_token_from_request($req);
    if ($token === null) {
        attackfee_wp_count('pass_absent');
        return false;
    }
    [$ok, $claims] = attackfee_wp_check_pass($token, $action, false);
    $ok = $ok && attackfee_wp_uses_left((string) $claims['jti'], (int) $claims['n'], (int) $claims['exp']) > 0;
    if (!$ok) attackfee_wp_count('pass_reject');
    return $ok;
}

/** REST routes (patterns on the request route) of opt-in forms whose agents are checked before the route runs. */
function attackfee_wp_rest_gated_routes(): array
{
    $f = attackfee_wp_settings()['forms'];
    $routes = [];
    if ($f['cf7'] && attackfee_wp_cf7_active()) $routes[] = '#^/contact-form-7/v1/contact-forms/\d+/feedback$#';
    return $routes;
}

/**
 * rest_dispatch_request: an agent POST to a gated route without a valid pass gets the 402 (or the
 * 403 work check) instead of the route, with nothing spent; a valid pass goes through and its use is
 * spent later, after the form's own validation. rest_request_before_callbacks can't do this: WordPress
 * still runs the route after it unless it returns a WP_Error, which has a different body. Humans go
 * through untouched (their check stays where it was, in the form's own hook).
 */
function attackfee_wp_rest_gate($result, $request)
{
    if ($result !== null || !($request instanceof WP_REST_Request) || $request->get_method() !== 'POST' || !attackfee_wp_is_agent()) return $result;
    $route = (string) $request->get_route();
    foreach (attackfee_wp_rest_gated_routes() as $re) {
        if (!preg_match($re, $route)) continue;
        if (attackfee_wp_peek_request('write', $request)) return $result;
        [$status, $body, $headers] = attackfee_wp_agent_refusal('write', attackfee_wp_request_path());
        $res = new WP_REST_Response($body, $status);
        foreach ($headers + wp_get_nocache_headers() as $name => $value) $res->header($name, (string) $value);
        return $res;
    }
    return $result;
}

function attackfee_wp_refuse(): never
{
    attackfee_wp_turned_away('write');
    wp_die(esc_html(attackfee_wp_s('no_js')), esc_html(get_bloginfo('name')), ['response' => 403, 'back_link' => true]);
}

function attackfee_wp_check_comment(array $data): array
{
    // Staff replying from the dashboard are already signed in with moderation rights.
    if (current_user_can('moderate_comments')) return $data;
    if (attackfee_wp_verify_request('write')[0]) return $data;
    if (attackfee_wp_is_agent()) attackfee_wp_refuse_agent('write', '/wp-comments-post.php');
    attackfee_wp_refuse();
}

/** Only the wp-login.php form is gated, not application passwords or XML-RPC. */
function attackfee_wp_check_login($user)
{
    if ($user instanceof WP_Error && $user->get_error_code() === 'attackfee_required') return $user;
    // wp-login.php has no nonce: the Attackfee pass checked below is this form's proof.
    $method = isset($_SERVER['REQUEST_METHOD']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_METHOD'])) : '';
    if (($GLOBALS['pagenow'] ?? '') !== 'wp-login.php' || $method !== 'POST' || !isset($_POST['log'])) return $user; // phpcs:ignore WordPress.Security.NonceVerification.Missing
    if (attackfee_wp_verify_request('account')[0]) return $user;
    if (attackfee_wp_is_agent()) attackfee_wp_refuse_agent('account', '/wp-login.php');
    attackfee_wp_turned_away('account');
    return new WP_Error('attackfee_required', esc_html(attackfee_wp_s('no_js')));
}

/** Registration and lost password on wp-login.php. */
function attackfee_wp_check_wp_error($errors)
{
    if (attackfee_wp_verify_request('account')[0]) return $errors;
    if (attackfee_wp_is_agent()) attackfee_wp_refuse_agent('account', '/wp-login.php');
    attackfee_wp_turned_away('account');
    if ($errors instanceof WP_Error) $errors->add('attackfee_required', esc_html(attackfee_wp_s('no_js')));
    return $errors;
}

/**
 * WooCommerce classic checkout (?wc-ajax=checkout; woocommerce_after_checkout_validation runs after
 * the field and cart checks and before the order is created, stock is reserved or payment is tried).
 * Agents: nothing is spent or refused while WooCommerce has its own errors (fields, or cart notices
 * such as an item out of stock) or the post only updates totals; once there are none the use is spent
 * (atomic), and an agent without a usable pass, including one whose last use another request just
 * spent, gets the 402 or the 403 work check and the checkout stops there: no order, no stock held, no
 * payment. Humans: the form error, as before. A use spent here stays spent if the payment gateway then
 * declines the order. The block checkout (Store API) is not covered: nothing here runs for it.
 */
function attackfee_wp_check_woo($data, $errors): void
{
    $agent = attackfee_wp_is_agent();
    if ($agent && attackfee_wp_woo_not_ready($data, $errors)) return;
    if (attackfee_wp_verify_request('write')[0]) return;
    if ($agent) attackfee_wp_refuse_agent('write', attackfee_wp_request_path());
    attackfee_wp_turned_away('write');
    if ($errors instanceof WP_Error) $errors->add('attackfee_required', esc_html(attackfee_wp_s('no_js')));
}

/** WooCommerce will not create an order from this post anyway: its own errors, or a totals refresh. */
function attackfee_wp_woo_not_ready($data, $errors): bool
{
    if ($errors instanceof WP_Error && $errors->has_errors()) return true;
    if (function_exists('wc_notice_count') && wc_notice_count('error') > 0) return true;
    return is_array($data) && !empty($data['woocommerce_checkout_update_totals']);
}

/**
 * Contact Form 7 (wpcf7_spam runs after CF7's own validation and before any mail is sent). The use
 * is spent here (atomic). Agents without a usable pass get the 402 or the 403 work check and the
 * submission stops, so no mail goes out; on the REST route they were already refused before CF7 ran
 * (attackfee_wp_rest_gate), so this only catches a pass spent by another request meanwhile and non-JS
 * posts. Humans without a pass: CF7 flags the submission and sends no mail, as before. A submission
 * already flagged by another filter stays flagged.
 */
function attackfee_wp_check_cf7($flagged): bool
{
    if ($flagged) return true;
    if (attackfee_wp_verify_request('write')[0]) return false;
    if (attackfee_wp_is_agent()) attackfee_wp_refuse_agent('write', attackfee_wp_request_path());
    attackfee_wp_turned_away('write');
    return true;
}
