<?php
// Counters with the same names as the Node issuer (docs/protocol.md §7), plus challenges_minted.
// One row per UTC day and counter in the options table (attackfee_wp_n_<YYYYMMDD>_<name>). Counts are
// batched per request: attackfee_wp_count() only adds to an in-memory buffer, and the buffer is written at
// shutdown in ONE statement (multi-row INSERT ... ON DUPLICATE KEY UPDATE value = value + n, which also
// sets attackfee_wp_counting_since the first time). The add happens in the database, so concurrent requests
// never lose a count. A request that counts nothing (every read) makes no counter write at all. Shown in
// admin and exported only when the owner clicks "Export counters". Nothing is sent anywhere.
declare(strict_types=1);

if (!defined('ABSPATH')) exit;

// page_view_gate_confirmed: owners who confirmed the page-view warning (Amendment 2 §A), same name as
// the Node issuer. WordPress has no page-view switch (PM, Oct 1), so it stays 0 here.
const ATTACKFEE_WP_COUNTERS = ['pass_accept', 'pass_reject', 'pass_absent', 'turned_away', 'offer_shown', 'paid', 'work_after_402', 'challenges_minted', 'page_view_gate_confirmed', 'manifest_fetch', 'agents_json_fetch'];
const ATTACKFEE_WP_COUNTER_DAYS = 30;   // rows in the export
const ATTACKFEE_WP_COUNTER_KEEP = 90;   // days kept before the hourly cleanup drops them

function attackfee_wp_counter_day(?int $t = null): string
{
    return gmdate('Ymd', $t ?? time());
}

/**
 * When counting started on this site (ISO 8601, UTC). Set on activation or on the first count.
 * Stored as a Unix time so no database layer reformats it.
 */
function attackfee_wp_counting_since(): string
{
    $v = get_option('attackfee_wp_counting_since');
    if (!is_numeric($v)) {
        if ($v !== false) delete_option('attackfee_wp_counting_since');
        add_option('attackfee_wp_counting_since', (string) time(), '', false);
        $v = get_option('attackfee_wp_counting_since');
    }
    return gmdate('Y-m-d\TH:i:s\Z', (int) $v);
}

/** Adds to this request's buffer. No database access; the buffer is written once at shutdown. */
function attackfee_wp_count(string $name, int $by = 1): void
{
    if (!in_array($name, ATTACKFEE_WP_COUNTERS, true) || $by < 1) return;
    $buf = &attackfee_wp_counter_buffer();
    if ($buf === [] && function_exists('add_action') && !has_action('shutdown', 'attackfee_wp_counters_flush')) {
        add_action('shutdown', 'attackfee_wp_counters_flush', 0);
    }
    $row = 'attackfee_wp_n_' . attackfee_wp_counter_day() . '_' . $name; // day taken when counted, not when flushed
    $buf[$row] = ($buf[$row] ?? 0) + $by;
}

/** This request's pending counts: [option_name => int]. */
function &attackfee_wp_counter_buffer(): array
{
    static $buf = [];
    return $buf;
}

/**
 * Writes the buffer in one statement and empties it. Returns the number of statements written: 1, or 0
 * when there was nothing to write or the write failed. A failed write logs one line to the PHP error
 * log and its counts are dropped (never retried, so a count is never added twice).
 * Each row is added to the stored value inside the database, so two requests flushing the same row
 * both land. attackfee_wp_counting_since is inserted alongside and kept if it already exists.
 */
function attackfee_wp_counters_flush(): int
{
    global $wpdb;
    $buf = &attackfee_wp_counter_buffer();
    if ($buf === [] || !isset($wpdb)) return 0;
    $rows = $buf;
    $buf = [];
    $since = 'attackfee_wp_counting_since';
    $values = [$wpdb->prepare("(%s, %s, 'off')", $since, (string) time())];
    foreach ($rows as $name => $n) $values[] = $wpdb->prepare("(%s, %s, 'off')", $name, (string) (int) $n);
    $sql = "INSERT INTO {$wpdb->options} (option_name, option_value, autoload) VALUES " . implode(', ', $values)
        . $wpdb->prepare(" ON DUPLICATE KEY UPDATE option_value = CASE WHEN option_name = %s THEN option_value ELSE option_value + VALUES(option_value) END", $since);
    // CASE, not IF(): the SQLite driver used by local and Playground sites mistranslates IF() here.
    $wpdb->suppress_errors(true);
    // Direct query on purpose: one atomic upsert for the whole request. Every value is escaped by
    // $wpdb->prepare above; the table name is $wpdb->options. Counters are read with SQL too, never
    // through the options cache, so there is nothing cached to invalidate except notoptions below.
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
    $ok = $wpdb->query($sql);
    $err = (string) $wpdb->last_error;
    $wpdb->suppress_errors(false);
    if ($ok === false || $err !== '') {
        // One line per failed flush, so an owner can find lost counts in the PHP error log. The SQLite
        // driver reports errors as an HTML block (query, backtrace); keep only its SQLSTATE cause.
        $msg = $err !== '' ? $err : 'query returned false';
        if (preg_match('/SQLSTATE\[\w+\][^<\r\n]*/', $msg, $m)) $msg = $m[0];
        $msg = mb_substr(trim((string) preg_replace('/\s+/', ' ', wp_strip_all_tags($msg))), 0, 300);
        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
        error_log('Attackfee: counter flush failed: ' . $msg);
        return 0;
    }
    // The row may have been cached as missing earlier in this request (or in a persistent cache).
    $no = wp_cache_get('notoptions', 'options');
    if (is_array($no) && isset($no[$since])) { unset($no[$since]); wp_cache_set('notoptions', $no, 'options'); }
    return 1;
}

/**
 * Counts per UTC day for the last $days days, oldest first: ['YYYY-MM-DD' => [name => int]].
 * Days with no rows are present with zeros.
 */
function attackfee_wp_counters_by_day(int $days = ATTACKFEE_WP_COUNTER_DAYS, ?int $now = null): array
{
    global $wpdb;
    $now ??= time();
    $out = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $out[gmdate('Y-m-d', $now - $i * 86400)] = array_fill_keys(ATTACKFEE_WP_COUNTERS, 0);
    }
    $first = 'attackfee_wp_n_' . gmdate('Ymd', $now - ($days - 1) * 86400) . '_';
    $rows = $wpdb->get_results($wpdb->prepare("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name >= %s AND option_name < %s", $first, 'attackfee_wp_n_99999999'), ARRAY_A); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- range read over per-day counter rows; counts must be current
    foreach ((array) $rows as $r) {
        if (!preg_match('/^attackfee_wp_n_(\d{4})(\d{2})(\d{2})_([a-z_0-9]+)$/', (string) $r['option_name'], $m)) continue;
        $d = "$m[1]-$m[2]-$m[3]";
        if (isset($out[$d]) && in_array($m[4], ATTACKFEE_WP_COUNTERS, true)) $out[$d][$m[4]] = (int) $r['option_value'];
    }
    return $out;
}

/** Today's counts (UTC day), for the settings page. */
function attackfee_wp_counters_today(): array
{
    $d = attackfee_wp_counters_by_day(1);
    return reset($d);
}

/**
 * CSV for the owner: one row per UTC day for the last 30 days, oldest first. Columns: date,
 * timezone (always UTC), the Node counter names, challenges_minted, page_view_gate_confirmed, since (when counting started)
 * and exported_at, both ISO 8601 in UTC.
 */
function attackfee_wp_counters_csv(?int $now = null): string
{
    $now ??= time();
    $since = attackfee_wp_counting_since();
    $at = gmdate('Y-m-d\TH:i:s\Z', $now);
    $lines = [implode(',', array_merge(['date', 'timezone'], ATTACKFEE_WP_COUNTERS, ['since', 'exported_at']))];
    foreach (attackfee_wp_counters_by_day(ATTACKFEE_WP_COUNTER_DAYS, $now) as $day => $c) {
        $lines[] = implode(',', array_merge([$day, 'UTC'], array_map('strval', array_values($c)), [$since, $at]));
    }
    return implode("\r\n", $lines) . "\r\n";
}

/** Hourly: drop day rows older than the keep window. */
function attackfee_wp_counters_cleanup(): void
{
    global $wpdb;
    $cut = 'attackfee_wp_n_' . gmdate('Ymd', time() - ATTACKFEE_WP_COUNTER_KEEP * 86400) . '_';
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s AND option_name < %s", 'attackfee\\_wp\\_n\\_%', $cut)); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- hourly delete of expired counter rows by name range
}
