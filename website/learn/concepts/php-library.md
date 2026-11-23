---
title: How to check passes in PHP
description: The Attackfee PHP library is shipped inside the WordPress plugin, not as a separate package on a public PHP registry. You can verify a pass with Protocol::verifyPass, or use the plugin's request helper on a theme form.
hub: concepts
slug: php-library
type: how-to
order: 130
related:
  - /learn
  - /docs/server
  - /docs/wordpress
  - /learn/concepts/how-to-check-writes-on-your-server
  - /learn/wordpress/how-to-install-the-wordpress-plugin
audience: owners
status: published
schema: WebPage
faq:
  - q: "Is the PHP library on Packagist?"
    a: "No. It is not a separate package on a public PHP registry. From a checkout, run composer install in packages/server-php. Inside the plugin zip the same library is lib/server-php."
  - q: "What licence is it under?"
    a: "GPL-2.0-or-later, the same as the WordPress plugin."
  - q: "What happens if the pass is bad?"
    a: "Protocol::verifyPass throws Attackfee\AttackfeeError."
  - q: "Should I use this on WordPress instead of the plugin helper?"
    a: "On a theme form, call attackfee_wp_verify_request before handling the post. The plugin is already the issuer."
  - q: "What PHP version is required?"
    a: "PHP 8.1 or newer, as in the plugin header and the library."
---

# How to check passes in PHP

PHP support is the `Attackfee\Protocol` library shipped inside the WordPress plugin, under `lib/server-php`. The licence is GPL-2.0-or-later. The library is not a separate package on a public PHP registry.

From a checkout, run `composer install` in `packages/server-php`, then load `vendor/autoload.php`. You need PHP 8.1 or newer.

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use Attackfee\Protocol;

$claims = Protocol::verifyPass($secret, $pass, time(), $siteId, 'write');
```

A bad pass throws `Attackfee\AttackfeeError`. The WordPress plugin is the PHP issuer: the same routes live under `/wp-json/attackfee/v1/`. On a theme form, call `attackfee_wp_verify_request('write')` before handling the post.

The [server docs](/docs/server) have this example, and the [WordPress docs](/docs/wordpress) cover the plugin helper.

## Where Attackfee fits

Use the library when you are checking a pass in PHP outside the plugin helpers, or when you are reading how the plugin verifies. For Node, see [How to run the Node server and Express middleware](/learn/concepts/node-server-and-express).
