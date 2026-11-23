<?php
// Settings, keys and defaults (design/HANDOFF.md §3.2).
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

const ATTACKFEE_WP_DEFAULTS = [
    'forms' => ['comments' => 1, 'login' => 1, 'register' => 0, 'lostpassword' => 0, 'woo' => 0, 'cf7' => 0],
    'visible_check' => 0,
    'longest_s' => 8,
    'payouts' => 0,
    'connection' => 'test',
    'server_url' => '',
];

/**
 * Routes (Amendment 2 §C). Page views are `read`, cost 0, and there is no setting to gate one: the
 * plugin only checks form posts (comments, wp-login.php, and the opt-in forms). Search on
 * WordPress is a page load (/?s=), so it is free too.
 */
const ATTACKFEE_WP_ROUTES = [
    ['prefix' => '/', 'class' => 'read'],
    ['prefix' => '/wp-comments-post.php', 'class' => 'write'],
    ['prefix' => '/wp-login.php', 'class' => 'account'],
];

function attackfee_wp_settings(): array
{
    $s = get_option('attackfee_wp_settings', []);
    $s = is_array($s) ? $s : [];
    $out = array_merge(ATTACKFEE_WP_DEFAULTS, $s);
    $out['forms'] = array_merge(ATTACKFEE_WP_DEFAULTS['forms'], is_array($s['forms'] ?? null) ? $s['forms'] : []);
    return $out;
}

function attackfee_wp_update_settings(array $s): void
{
    update_option('attackfee_wp_settings', $s, true);
}

function attackfee_wp_ensure_keys(): void
{
    if (!get_option('attackfee_wp_site_key')) update_option('attackfee_wp_site_key', 'site_' . bin2hex(random_bytes(4)), true);
    if (!get_option('attackfee_wp_secret')) update_option('attackfee_wp_secret', bin2hex(random_bytes(24)), true);
}

function attackfee_wp_site_key(): string
{
    attackfee_wp_ensure_keys();
    return (string) get_option('attackfee_wp_site_key');
}

function attackfee_wp_secret(): string
{
    attackfee_wp_ensure_keys();
    return (string) get_option('attackfee_wp_secret');
}

function attackfee_wp_new_secret(): void
{
    update_option('attackfee_wp_secret', bin2hex(random_bytes(24)), true);
}

/** The payment server key is kept out of autoloaded options and never printed into a page. */
function attackfee_wp_server_key(): string
{
    return (string) get_option('attackfee_wp_server_key', '');
}

function attackfee_wp_woo_active(): bool
{
    return class_exists('WooCommerce');
}

function attackfee_wp_cf7_active(): bool
{
    return defined('WPCF7_VERSION');
}
