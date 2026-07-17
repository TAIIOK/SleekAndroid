#!/usr/bin/env node
/**
 * Gradle 9 removed JvmVendorSpec.IBM_SEMERU; @react-native/gradle-plugin still
 * ships foojay-resolver-convention 0.5.0 which references it.
 * @see https://github.com/gradle/foojay-toolchains/issues/151
 */
const fs = require('node:fs');
const path = require('node:path');

const FOOJAY_OLD = 'id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")';
const FOOJAY_NEW = 'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")';

const candidates = [
  path.resolve(__dirname, '../node_modules/@react-native/gradle-plugin/settings.gradle.kts'),
  path.resolve(__dirname, '../../node_modules/@react-native/gradle-plugin/settings.gradle.kts'),
];

let patched = 0;

for (const filePath of candidates) {
  if (!fs.existsSync(filePath)) continue;

  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes(FOOJAY_NEW)) {
    console.log(`[aniverse-tv] foojay resolver already patched: ${filePath}`);
    patched += 1;
    continue;
  }

  if (!source.includes(FOOJAY_OLD)) {
    console.warn(`[aniverse-tv] unexpected foojay line in ${filePath}, skip`);
    continue;
  }

  fs.writeFileSync(filePath, source.replace(FOOJAY_OLD, FOOJAY_NEW));
  console.log(`[aniverse-tv] Patched foojay resolver to 1.0.0: ${filePath}`);
  patched += 1;
}

if (!patched) {
  console.warn('[aniverse-tv] @react-native/gradle-plugin not found; foojay patch skipped');
}
