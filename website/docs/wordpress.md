# WordPress plugin

The Attackfee WordPress plugin is named Attackfee in the Plugins list. The slug is `attackfee`. The licence is GPL-2.0-or-later.

Attackfee checks writes, not page views. Leave public pages open so people and answer engines can read you. Turn Attackfee on for comments, forms, logins, and APIs.

## Download

The zip is built from this project. The [download page](/download) has the file and the sha256 file beside it.

- [attackfee-{{VERSION}}.zip](/download/attackfee-{{VERSION}}.zip)
- [attackfee-{{VERSION}}.zip.sha256](/download/attackfee-{{VERSION}}.zip.sha256)

In WordPress, upload the zip from Plugins, then open Settings → Attackfee.

## What it protects

Comments and login are on by default. Registration, lost password, WooCommerce checkout, and Contact Form 7 are options on that screen. The checkout help is: Covers the classic checkout. The newer block checkout isn't covered yet.

A form in a theme can use `data-attackfee="write"`. The attribute is always on: add it to protect that form. Check the post with `attackfee_wp_verify_request('write')` before handling it. The first value is true when the pass is good.

Visitors get an invisible check. Forms that skip it are rejected. The visible check, a "Verify before sending" button, is off by default.

## Routes

The plugin is the issuer. The same API as the [server page](/docs/server) is under `/wp-json/attackfee/v1/`: challenge, redeem, status, health, and siteverify. Page views stay free. Nothing in the plugin can gate a page view.

`GET /.well-known/attackfee.json` and `GET /.well-known/agents.json` are served with no check.

The plugin takes no payments itself. No real money moves in the WordPress plugin's test mode. The background check runs instead. A payment server is optional and, when used for tests, local.
