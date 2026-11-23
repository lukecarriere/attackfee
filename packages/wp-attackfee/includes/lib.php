<?php
// Loads the Attackfee PHP library (packages/server-php): the plugin zip bundles it under lib/server-php;
// in the repo it is read from ../server-php. Its pinned work engine verifies solutions locally.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

(function (): void {
    foreach ([ATTACKFEE_WP_DIR . '/lib/server-php', dirname(ATTACKFEE_WP_DIR) . '/server-php'] as $dir) {
        if (is_file($dir . '/vendor/autoload.php')) {
            require_once $dir . '/vendor/autoload.php';
            return;
        }
    }
})();

function attackfee_wp_lib_ok(): bool
{
    return class_exists('\\Attackfee\\Protocol') && class_exists('\\Attackfee\\Policy') && class_exists('\\Attackfee\\Settlement');
}
