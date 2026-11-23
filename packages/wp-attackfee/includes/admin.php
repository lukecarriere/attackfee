<?php
// Settings → Attackfee (design/HANDOFF.md §3, design/proto/wp-settings.html). Core WordPress markup;
// the only plugin CSS is the balance box, the Advanced panel and the show/hide rules.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

use Attackfee\Settlement;

function attackfee_wp_admin_init(): void
{
    add_action('admin_menu', fn () => add_options_page(attackfee_wp_s('title'), attackfee_wp_s('menu'), 'manage_options', 'attackfee', 'attackfee_wp_render_settings'));
    add_action('admin_enqueue_scripts', 'attackfee_wp_admin_assets');
    add_action('admin_post_attackfee_wp_save', 'attackfee_wp_handle_save');
    add_action('admin_post_attackfee_wp_export', 'attackfee_wp_handle_export');
    add_filter('plugin_action_links_' . plugin_basename(ATTACKFEE_WP_FILE), fn ($links) => array_merge(['<a href="' . esc_url(admin_url('options-general.php?page=attackfee')) . '">Settings</a>'], $links));
}

function attackfee_wp_admin_assets(string $hook): void
{
    if ($hook !== 'settings_page_attackfee') return;
    wp_enqueue_style('attackfee-admin', plugins_url('assets/admin.css', ATTACKFEE_WP_FILE), [], ATTACKFEE_WP_VERSION);
    wp_enqueue_script('attackfee-admin', plugins_url('assets/admin.js', ATTACKFEE_WP_FILE), [], ATTACKFEE_WP_VERSION, ['in_footer' => true]);
}

function attackfee_wp_page_url(array $args = []): string
{
    return add_query_arg($args, admin_url('options-general.php?page=attackfee'));
}

function attackfee_wp_set_notice(string $kind, string $text): void
{
    set_transient('attackfee_wp_notice_' . get_current_user_id(), ['kind' => $kind, 'text' => $text], 60);
}

function attackfee_wp_take_notice(): ?array
{
    $key = 'attackfee_wp_notice_' . get_current_user_id();
    $n = get_transient($key);
    if ($n) delete_transient($key);
    return is_array($n) ? $n : null;
}

function attackfee_wp_handle_save(): void
{
    if (!current_user_can('manage_options')) wp_die('', '', ['response' => 403]);
    check_admin_referer('attackfee_wp_save');
    $do = sanitize_key((string) ($_POST['attackfee_wp_do'] ?? 'save'));
    if ($do === 'new_secret') {
        attackfee_wp_new_secret();
        attackfee_wp_set_notice('success', attackfee_wp_s('n_saved'));
    } elseif ($do === 'withdraw') {
        $r = attackfee_wp_withdraw(sanitize_textarea_field(wp_unslash((string) ($_POST['attackfee_wp_invoice'] ?? ''))));
        if ($r['ok']) attackfee_wp_set_notice('success', sprintf(attackfee_wp_s('n_withdrawn'), $r['usd']));
        elseif ($r['error'] === 'too_much') attackfee_wp_set_notice('error', attackfee_wp_s('n_wd_too_much'));
        elseif ($r['error'] === 'down') attackfee_wp_set_notice('warning', attackfee_wp_s('n_down'));
        else attackfee_wp_set_notice('error', attackfee_wp_s('n_wd_failed'));
    } else {
        $in = isset($_POST['attackfee_wp']) && is_array($_POST['attackfee_wp']) ? map_deep(wp_unslash($_POST['attackfee_wp']), 'sanitize_text_field') : [];
        $in = is_array($in) ? $in : [];
        $s = attackfee_wp_settings();
        foreach (array_keys(ATTACKFEE_WP_DEFAULTS['forms']) as $f) $s['forms'][$f] = empty($in['forms'][$f]) ? 0 : 1;
        $s['visible_check'] = empty($in['visible_check']) ? 0 : 1;
        $s['longest_s'] = in_array((int) ($in['longest_s'] ?? 8), [4, 8, 12], true) ? (int) $in['longest_s'] : 8;
        $s['payouts'] = empty($in['payouts']) ? 0 : 1;
        $s['connection'] = ($in['connection'] ?? 'test') === 'server' ? 'server' : 'test';
        // esc_url_raw only, after the scheme check. sanitize_text_field deletes %xx, so /owner%2Fapi would be stored wrong.
        // esc_url_raw itself would prepend http:// to a schemeless string, which this field has always rejected.
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- wp_unslash here; attackfee_wp_clean_server_url() runs esc_url_raw
        $posted_url = isset($_POST['attackfee_wp']['server_url']) && is_string($_POST['attackfee_wp']['server_url']) ? wp_unslash($_POST['attackfee_wp']['server_url']) : '';
        $s['server_url'] = attackfee_wp_clean_server_url($posted_url);
        attackfee_wp_update_settings($s);
        $key = trim((string) ($in['server_key'] ?? ''));
        if ($key !== '') update_option('attackfee_wp_server_key', sanitize_text_field($key), false);
        attackfee_wp_server_down_reset(); // a new address or key gets a fresh try from agents
        attackfee_wp_set_notice('success', attackfee_wp_s('n_saved'));
    }
    wp_safe_redirect(attackfee_wp_page_url());
    exit;
}

/**
 * Payment server address from the settings form. Empty unless it is an http(s) URL.
 * esc_url_raw keeps percent-encoded octets; sanitize_text_field would remove them.
 */
function attackfee_wp_clean_server_url(string $raw): string
{
    $url = trim($raw);
    if ($url === '' || !preg_match('#^https?://#i', $url)) return '';
    $clean = esc_url_raw($url, ['http', 'https']);
    return is_string($clean) && preg_match('#^https?://#i', $clean) ? $clean : '';
}

/** Owner-initiated download of the counters. Nothing is sent anywhere. */
function attackfee_wp_handle_export(): void
{
    if (!current_user_can('manage_options')) wp_die('', '', ['response' => 403]);
    check_admin_referer('attackfee_wp_export');
    nocache_headers();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="attackfee-counters.csv"');
    // A CSV file download, not HTML: dates, integers, ISO times and fixed column names only, so there
    // is nothing to escape and HTML escaping would be the wrong encoding for this file.
    echo attackfee_wp_counters_csv(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    exit;
}

function attackfee_wp_render_settings(): void
{
    if (!current_user_can('manage_options')) return;
    $s = attackfee_wp_settings();
    $p = attackfee_wp_payouts_view($s);
    $c = attackfee_wp_counters_today();
    $server = $s['connection'] === 'server';
    // Test mode is work-only: like Payment server with no address, it has no balance to show.
    $noaddr = !$server || trim((string) $s['server_url']) === '';
    $down = $p['state'] === 'down';
    $classes = array_filter(['attackfee-root', $s['payouts'] ? 'payouts' : '', $server ? 'server' : '', $noaddr ? 'noaddr' : '', $down ? 'down' : '']);
    $fee = Settlement::feePercent((int) $p['fee_bps']);
    $usd = $p['usd'];
    $wd_off = $noaddr || $down;
    $notice = attackfee_wp_take_notice();
    $export = wp_nonce_url(admin_url('admin-post.php?action=attackfee_wp_export'), 'attackfee_wp_export');
    ?>
<div class="wrap">
<div class="<?php echo esc_attr(implode(' ', $classes)); ?>" id="attackfee-settings">
<h1><?php echo esc_html(attackfee_wp_s('title')); ?></h1>
<p class="attackfee-lede"><?php echo esc_html(attackfee_wp_s('install_line')); ?></p>
<?php if ($notice) : ?>
<div class="notice notice-<?php echo esc_attr($notice['kind']); ?>" role="status"><p><?php echo esc_html($notice['text']); ?></p></div>
<?php endif; ?>
<div class="notice notice-warning attackfee-top needs-down" role="status"><p><?php echo esc_html(attackfee_wp_s('n_down')); ?></p></div>
<?php if ($p['state'] === 'ok' && $p['paused']) : ?>
<div class="notice notice-warning attackfee-top" role="status"><p><?php echo esc_html(attackfee_wp_s('n_paused')); ?></p></div>
<?php endif; ?>
<p class="attackfee-stat"><?php echo esc_html(sprintf(attackfee_wp_s('issued_today'), number_format_i18n($c['challenges_minted']))); ?> · <a href="<?php echo esc_url($export); ?>" id="attackfee-export"><?php echo esc_html(attackfee_wp_s('export')); ?></a></p>
<p class="description attackfee-export-help"><?php echo esc_html(attackfee_wp_s('export_help')); ?></p>

<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
<input type="hidden" name="action" value="attackfee_wp_save">
<?php wp_nonce_field('attackfee_wp_save'); ?>

<h2 class="title"><?php echo esc_html(attackfee_wp_s('protect_h')); ?></h2>
<p class="description"><?php echo esc_html(attackfee_wp_s('protect_desc')); ?></p>
<table class="form-table" role="presentation"><tbody>
<tr><th scope="row"><?php echo esc_html(attackfee_wp_s('forms')); ?></th><td><fieldset><legend class="screen-reader-text"><?php echo esc_html(attackfee_wp_s('forms')); ?></legend>
<?php foreach (['comments', 'login', 'register', 'lostpassword'] as $f) : ?>
<label><input type="checkbox" name="attackfee_wp[forms][<?php echo esc_attr($f); ?>]" value="1"<?php echo $s['forms'][$f] ? ' checked' : ''; ?>> <?php echo esc_html(attackfee_wp_s($f)); ?></label><br>
<?php endforeach; ?>
<?php if (attackfee_wp_woo_active()) : ?>
<label><input type="checkbox" name="attackfee_wp[forms][woo]" value="1"<?php echo $s['forms']['woo'] ? ' checked' : ''; ?>> <?php echo esc_html(attackfee_wp_s('woo')); ?> <span class="attackfee-muted"><?php echo esc_html(attackfee_wp_s('woo_active')); ?></span></label><br>
<p class="description attackfee-woo-help"><?php echo esc_html(attackfee_wp_s('woo_help')); ?></p>
<?php endif; ?>
<?php if (attackfee_wp_cf7_active()) : ?>
<label><input type="checkbox" name="attackfee_wp[forms][cf7]" value="1"<?php echo $s['forms']['cf7'] ? ' checked' : ''; ?>> <?php echo esc_html(attackfee_wp_s('cf7')); ?> <span class="attackfee-muted"><?php echo esc_html(attackfee_wp_s('cf7_active')); ?></span></label><br>
<?php endif; ?>
<label><input type="checkbox" checked disabled> <?php echo wp_kses(attackfee_wp_s('any_form'), ['code' => []]); ?></label><br>
<p class="description"><?php echo wp_kses(attackfee_wp_s('any_form_help'), ['code' => []]); ?></p>
</fieldset></td></tr>
<tr><th scope="row"><?php echo esc_html(attackfee_wp_s('visible_h')); ?></th><td><label><input type="checkbox" name="attackfee_wp[visible_check]" value="1"<?php echo $s['visible_check'] ? ' checked' : ''; ?>> <?php echo esc_html(attackfee_wp_s('visible_label')); ?></label>
<p class="description"><?php echo esc_html(attackfee_wp_s('visible_help')); ?></p></td></tr>
<tr><th scope="row"><label for="attackfee-longest"><?php echo esc_html(attackfee_wp_s('longest_h')); ?></label></th><td><select id="attackfee-longest" name="attackfee_wp[longest_s]">
<?php foreach ([4, 8, 12] as $n) : ?><option value="<?php echo (int) $n; ?>"<?php selected($s['longest_s'], $n); ?>><?php echo esc_html(sprintf(attackfee_wp_s('seconds'), $n)); ?></option><?php endforeach; ?>
</select>
<p class="description"><?php echo esc_html(attackfee_wp_s('longest_help')); ?></p></td></tr>
</tbody></table>

<h2 class="title"><?php echo esc_html(attackfee_wp_s('keys_h')); ?></h2>
<table class="form-table" role="presentation"><tbody>
<tr><th scope="row"><label for="attackfee-site-key"><?php echo esc_html(attackfee_wp_s('site_key')); ?></label></th><td><input id="attackfee-site-key" type="text" class="regular-text code" value="<?php echo esc_attr(attackfee_wp_site_key()); ?>" readonly>
<p class="description"><?php echo esc_html(attackfee_wp_s('site_key_help')); ?></p></td></tr>
<tr><th scope="row"><label for="attackfee-secret"><?php echo esc_html(attackfee_wp_s('secret')); ?></label></th><td><input id="attackfee-secret" type="password" class="regular-text code" value="<?php echo esc_attr(attackfee_wp_secret()); ?>" readonly autocomplete="off"> <button class="button" type="button" id="attackfee-show" data-show="<?php echo esc_attr(attackfee_wp_s('show')); ?>" data-hide="<?php echo esc_attr(attackfee_wp_s('hide')); ?>"><?php echo esc_html(attackfee_wp_s('show')); ?></button> <button class="button" type="submit" name="attackfee_wp_do" value="new_secret"><?php echo esc_html(attackfee_wp_s('new_secret')); ?></button>
<p class="description"><?php echo esc_html(attackfee_wp_s('secret_help')); ?></p></td></tr>
</tbody></table>

<h2 class="title"><?php echo esc_html(attackfee_wp_s('payouts_h')); ?></h2>
<table class="form-table" role="presentation"><tbody>
<tr><th scope="row"><?php echo esc_html(attackfee_wp_s('payouts')); ?></th><td><label><input type="checkbox" class="pay-toggle" id="attackfee-payouts" name="attackfee_wp[payouts]" value="1"<?php echo $s['payouts'] ? ' checked' : ''; ?>> <?php echo esc_html(attackfee_wp_s('collect')); ?></label>
<p class="description"><?php echo esc_html(attackfee_wp_s('collect_help')); ?></p></td></tr>
<tr class="needs-payouts needs-noaddr"><th scope="row"><?php echo esc_html(attackfee_wp_s('balance')); ?></th><td><div class="notice notice-warning inline"><p><?php echo esc_html(attackfee_wp_s('no_addr')); ?></p></div></td></tr>
<tr class="needs-payouts has-addr"><th scope="row"><?php echo esc_html(attackfee_wp_s('balance')); ?></th><td><?php if ($usd !== null) : ?><div class="attackfee-bal not-down"><strong><?php echo esc_html($usd); ?></strong><span><?php echo esc_html(Settlement::fillFee(attackfee_wp_s('balance_line'), (int) $p['fee_bps'])); ?></span></div><?php else : ?><div class="attackfee-bal not-down"><strong>—</strong><span><?php echo esc_html(attackfee_wp_s('balance_later')); ?></span></div><?php endif; ?><div class="attackfee-bal needs-down"><strong>—</strong><span><?php echo esc_html(attackfee_wp_s('balance_later')); ?></span></div>
<p class="description"><?php echo esc_html(attackfee_wp_s('to_withdraw')); ?></p></td></tr>
</tbody></table>

<details class="attackfee-adv"><summary><?php echo esc_html(attackfee_wp_s('adv')); ?> <span class="attackfee-muted"><?php echo esc_html(attackfee_wp_s('adv_note')); ?></span></summary><div class="attackfee-in">
<table class="form-table" role="presentation"><tbody>
<tr><th scope="row"><label for="attackfee-connection"><?php echo esc_html(attackfee_wp_s('connection')); ?></label></th><td><select id="attackfee-connection" name="attackfee_wp[connection]"><option value="test"<?php selected(!$server); ?>><?php echo esc_html(attackfee_wp_s('conn_test')); ?></option><option value="server"<?php selected($server); ?>><?php echo esc_html(attackfee_wp_s('conn_server')); ?></option></select>
<p class="description test-only"><?php echo esc_html(attackfee_wp_s('test_help')); ?></p></td></tr>
<tr class="needs-server"><th scope="row"><label for="attackfee-server-url"><?php echo esc_html(attackfee_wp_s('server_addr')); ?></label></th><td><input id="attackfee-server-url" name="attackfee_wp[server_url]" type="url" class="regular-text code" placeholder="<?php echo esc_attr(attackfee_wp_s('server_addr_ph')); ?>" inputmode="url" autocomplete="off" value="<?php echo esc_attr((string) $s['server_url']); ?>">
<p class="description"><?php echo esc_html(attackfee_wp_s('server_addr_help')); ?></p></td></tr>
<tr class="needs-server"><th scope="row"><label for="attackfee-server-key"><?php echo esc_html(attackfee_wp_s('server_key')); ?></label></th><td><input id="attackfee-server-key" name="attackfee_wp[server_key]" type="password" class="regular-text code" autocomplete="off" value=""<?php echo attackfee_wp_server_key() !== '' ? ' placeholder="••••••••••••••••"' : ''; ?>>
<p class="description"><?php echo esc_html(attackfee_wp_s('server_key_help')); ?></p></td></tr>
<tr><th scope="row"><?php echo esc_html(attackfee_wp_s('fee_h')); ?></th><td><?php echo esc_html(Settlement::fillFee(attackfee_wp_s('fee_line'), (int) $p['fee_bps'])); ?> <span class="attackfee-muted"><?php echo esc_html(attackfee_wp_s('fee_note')); ?></span></td></tr>
<tr><th scope="row"><label for="attackfee-invoice"><?php echo esc_html(attackfee_wp_s('withdraw')); ?></label></th><td><textarea id="attackfee-invoice" name="attackfee_wp_invoice" class="large-text code" rows="3"<?php echo $usd !== null && !$wd_off ? ' placeholder="' . esc_attr(sprintf(attackfee_wp_s('withdraw_ph'), $usd)) . '"' : ''; ?><?php echo $wd_off ? ' disabled' : ''; ?>></textarea><br>
<button id="attackfee-withdraw" class="button" type="submit" name="attackfee_wp_do" value="withdraw"<?php echo $wd_off ? ' disabled' : ''; ?>><?php echo esc_html(attackfee_wp_s('withdraw')); ?></button>
<p class="description"><?php echo esc_html(attackfee_wp_s('withdraw_help')); ?></p></td></tr>
</tbody></table></div></details>

<p class="submit"><button class="button button-primary" type="submit" name="attackfee_wp_do" value="save"><?php echo esc_html(attackfee_wp_s('save')); ?></button></p>
</form>
</div>
</div>
    <?php
}
