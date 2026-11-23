<?php
/**
 * Plugin Name: Attackfee
 * Description: Attackfee puts a cost on logins and form posts, so scripted abuse gets slow and expensive. Visitors read free and post without solving anything.
 * Version: 0.1.1
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: attackfee
 */
// attackfee (spec §13). Protects comments, login and any form with data-attackfee using an invisible
// background check, verified on this server. The default issuer is this site
// (/wp-json/attackfee/v1/*): no calls to any outside service unless the owner sets a payment server
// address for usage payouts. Fails closed: a protected form without a valid pass is rejected.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

define('ATTACKFEE_WP_VERSION', '0.1.1');
define('ATTACKFEE_WP_FILE', __FILE__);
define('ATTACKFEE_WP_DIR', __DIR__);

require_once __DIR__ . '/includes/lib.php';
require_once __DIR__ . '/includes/strings.php';
require_once __DIR__ . '/includes/options.php';
require_once __DIR__ . '/includes/counters.php';
require_once __DIR__ . '/includes/store.php';
require_once __DIR__ . '/includes/issuer.php';
require_once __DIR__ . '/includes/network.php';
require_once __DIR__ . '/includes/gate.php';
require_once __DIR__ . '/includes/payouts.php';
require_once __DIR__ . '/includes/discovery.php';
require_once __DIR__ . '/includes/admin.php';

register_activation_hook(__FILE__, 'attackfee_wp_activate');
register_deactivation_hook(__FILE__, 'attackfee_wp_deactivate');

function attackfee_wp_activate(): void
{
    attackfee_wp_ensure_keys();
    attackfee_wp_counting_since();
    if (!wp_next_scheduled('attackfee_wp_cleanup')) wp_schedule_event(time() + 3600, 'hourly', 'attackfee_wp_cleanup');
}

function attackfee_wp_deactivate(): void
{
    wp_clear_scheduled_hook('attackfee_wp_cleanup');
}

add_action('attackfee_wp_cleanup', 'attackfee_wp_store_cleanup');
add_action('attackfee_wp_cleanup', 'attackfee_wp_counters_cleanup');
add_action('rest_api_init', 'attackfee_wp_register_routes');
add_action('init', 'attackfee_wp_init_gate');
add_action('init', 'attackfee_wp_discovery_serve', 0);
if (is_admin()) attackfee_wp_admin_init();
