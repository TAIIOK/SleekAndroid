const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

/** PEM `.crt` files in android-certs/ → res/raw (resource name without extension). */
const CERT_RESOURCES = ['isrg_root_ye.crt', 'isrg_root_yr.crt'];

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!--
      Cleartext for LAN media servers / Metro.
      Gen-Y roots are also trusted via GenYTrustOkHttp (OkHttp TrustManager).
      Keep system + Gen-Y here as a platform-level fallback.
    -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="@raw/isrg_root_ye" />
            <certificates src="@raw/isrg_root_yr" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

function genYTrustKotlinSource(packageName) {
  return `package ${packageName}

import android.content.Context
import android.util.Log
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.security.KeyStore
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

/**
 * Let's Encrypt Gen-Y roots (YE/YR) are not in older Android trust stores.
 * Merge them into OkHttp's TrustManager so https://api.taiiok.ru validates.
 */
object GenYTrustOkHttp {
  private const val TAG = "GenYTrustOkHttp"

  private val RAW_CERTS =
    intArrayOf(
      R.raw.isrg_root_ye,
      R.raw.isrg_root_yr,
    )

  fun install(context: Context) {
    val appContext = context.applicationContext
    OkHttpClientProvider.setOkHttpClientFactory(
      OkHttpClientFactory {
        val builder = OkHttpClientProvider.createClientBuilder(appContext)
        applyTrust(appContext, builder)
        builder.build()
      },
    )
  }

  private fun applyTrust(context: Context, builder: OkHttpClient.Builder) {
    try {
      val trustManager = createMergedTrustManager(context)
      val sslContext = SSLContext.getInstance("TLS")
      sslContext.init(null, arrayOf(trustManager), null)
      builder.sslSocketFactory(sslContext.socketFactory, trustManager)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to install Gen-Y trust anchors; using platform defaults", error)
    }
  }

  private fun createMergedTrustManager(context: Context): X509TrustManager {
    val defaultTmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
    defaultTmf.init(null as KeyStore?)
    val defaultTm =
      defaultTmf.trustManagers.filterIsInstance<X509TrustManager>().firstOrNull()
        ?: throw IllegalStateException("No default X509TrustManager")

    val certificateFactory = CertificateFactory.getInstance("X.509")
    val customStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply { load(null, null) }
    for (resId in RAW_CERTS) {
      context.resources.openRawResource(resId).use { stream ->
        val certificates = certificateFactory.generateCertificates(stream)
        certificates.forEachIndexed { index, certificate ->
          customStore.setCertificateEntry("geny_\${resId}_\$index", certificate as X509Certificate)
        }
      }
    }

    val customTmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
    customTmf.init(customStore)
    val customTm =
      customTmf.trustManagers.filterIsInstance<X509TrustManager>().firstOrNull()
        ?: throw IllegalStateException("No custom X509TrustManager")

    return object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
        defaultTm.checkClientTrusted(chain, authType)
      }

      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
        try {
          // Prefer Gen-Y anchors (short YE2 → Root YE path).
          customTm.checkServerTrusted(chain, authType)
        } catch (_: CertificateException) {
          defaultTm.checkServerTrusted(chain, authType)
        }
      }

      override fun getAcceptedIssuers(): Array<X509Certificate> {
        return defaultTm.acceptedIssuers + customTm.acceptedIssuers
      }
    }
  }
}
`;
}

function patchMainApplication(contents) {
  if (contents.includes('GenYTrustOkHttp.install')) {
    return contents;
  }
  if (!contents.includes('override fun onCreate()')) {
    throw new Error('MainApplication.kt: could not find onCreate() to install GenYTrustOkHttp');
  }
  return contents.replace(
    /override fun onCreate\(\) \{\n(\s*)super\.onCreate\(\)\n/,
    (match, indent) =>
      `${match}${indent}// Before RN networking init — trust Let's Encrypt Gen-Y roots (YE/YR).\n${indent}GenYTrustOkHttp.install(this)\n`,
  );
}

/**
 * Trust Let's Encrypt Gen-Y roots on Android (NSC + OkHttp TrustManager).
 */
function withLetsEncryptGenYTrust(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const packageName =
        AndroidConfig.Package.getPackage(config) ||
        config.android?.package ||
        'ru.taiiok.aniverse.app';
      const packagePath = packageName.replace(/\./g, '/');

      const rawDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'raw');
      const xmlDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'xml');
      const javaDir = path.join(platformRoot, 'app', 'src', 'main', 'java', packagePath);
      fs.mkdirSync(rawDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });

      const certsDir = path.join(projectRoot, 'android-certs');
      for (const fileName of CERT_RESOURCES) {
        const src = path.join(certsDir, fileName);
        if (!fs.existsSync(src)) {
          throw new Error(
            `Missing ${src}. Copy Gen-Y PEM roots as .crt into android-certs/ (letsencrypt.org/certs/gen-y/).`,
          );
        }
        fs.copyFileSync(src, path.join(rawDir, fileName));
      }

      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG);
      fs.writeFileSync(path.join(javaDir, 'GenYTrustOkHttp.kt'), genYTrustKotlinSource(packageName));

      const mainAppPath = path.join(javaDir, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        const next = patchMainApplication(fs.readFileSync(mainAppPath, 'utf8'));
        fs.writeFileSync(mainAppPath, next);
      }

      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });

  return config;
}

module.exports = withLetsEncryptGenYTrust;
