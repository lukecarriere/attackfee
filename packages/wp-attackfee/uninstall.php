<?php
// Remove everything the plugin stored: settings, keys, daily counter rows, the test ledger,
// the replay and use-count rows, and its transients.
declare(strict_types=1);

if (!defined('WP_UNINSTALL_PLUGIN')) exit;

foreach (['attackfee_wp_settings', 'attackfee_wp_site_key', 'attackfee_wp_secret', 'attackfee_wp_server_key', 'attackfee_wp_counters', 'attackfee_wp_counting_since', 'attackfee_wp_test_ledger'] as $attackfee_wp_option) delete_option($attackfee_wp_option);
global $wpdb;
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE 'attackfee\\_wp\\_c\\_%' OR option_name LIKE 'attackfee\\_wp\\_u\\_%' OR option_name LIKE 'attackfee\\_wp\\_n\\_%'"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bulk delete by name prefix on uninstall; no API lists these rows

// Transients with fixed names, by name, so a persistent object cache drops them too:
// the payment server's price cache, the server-down flag, and the once-an-hour invalid
// ATTACKFEE_SITE_URL warning (deleting one that was never set is harmless).
foreach (['attackfee_wp_price_cache', 'attackfee_wp_server_down', 'attackfee_wp_site_url_warned'] as $attackfee_wp_transient) delete_transient($attackfee_wp_transient);
// Transients with per-key names: the per-IP, per-minute challenge rate limit
// (attackfee_wp_rl_<md5>) and the per-user admin notice (attackfee_wp_notice_<user id>). Stored in
// the options table, they stay there after they expire, so their rows (and timeout rows) are
// deleted by prefix. With a persistent object cache they can't be listed, but they last at
// most 120 and 60 seconds.
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_attackfee\\_wp\\_rl\\_%' OR option_name LIKE '\\_transient\\_timeout\\_attackfee\\_wp\\_rl\\_%' OR option_name LIKE '\\_transient\\_attackfee\\_wp\\_notice\\_%' OR option_name LIKE '\\_transient\\_timeout\\_attackfee\\_wp\\_notice\\_%'"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- bulk delete by name prefix on uninstall; no API lists these rows

wp_clear_scheduled_hook('attackfee_wp_cleanup');
