// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

use deno_core::include_js_files;
use deno_core::Extension;

/// Load and execute the javascript code.
pub fn init() -> Extension {
  Extension::builder()
    .js(include_js_files!(
      prefix "deno:extensions/webidl",
      "00_webidl.js",
    ))
    .build()
}
