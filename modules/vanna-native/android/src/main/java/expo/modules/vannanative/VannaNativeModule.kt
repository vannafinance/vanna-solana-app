package expo.modules.vannanative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Small Android helpers the app needs on its own: open or launch a wallet app, and share or save an image. (Split out of the Dynamic
// module so the app builds without the Dynamic SDK.)
class VannaNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VannaNative")

    // Opens a link in one named app, so Android doesn't show its "Open with" list. False when that app can't take it.
    AsyncFunction("openInApp") { uri: String, packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(uri))
        .setPackage(packageName)
        .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
        true
      } catch (_: android.content.ActivityNotFoundException) {
        false
      }
    }

    // Every app on the phone that answers Mobile Wallet Adapter's association link (what Android's own wallet list is built from):
    // its name, its icon as a PNG data URI (about 96 px, null when it cannot be drawn) and its package name. One entry per app; Vanna itself
    // is left out. Needs the <queries> entry for the solana-wallet scheme in this module's manifest.
    AsyncFunction("installedWallets") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      val pm = context.packageManager
      val probe = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("solana-wallet:/v1/associate/local"))
      val found = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        pm.queryIntentActivities(probe, android.content.pm.PackageManager.ResolveInfoFlags.of(0L))
      } else {
        @Suppress("DEPRECATION") pm.queryIntentActivities(probe, 0)
      }
      found
        .filter { it.activityInfo.packageName != context.packageName }
        .distinctBy { it.activityInfo.packageName }
        .map { info ->
          val icon = try {
            val drawable = info.loadIcon(pm)
            val bitmap = android.graphics.Bitmap.createBitmap(96, 96, android.graphics.Bitmap.Config.ARGB_8888)
            drawable.setBounds(0, 0, 96, 96)
            drawable.draw(android.graphics.Canvas(bitmap))
            val out = java.io.ByteArrayOutputStream()
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
            "data:image/png;base64," + android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP)
          } catch (_: Exception) {
            null
          }
          mapOf<String, Any?>("packageName" to info.activityInfo.packageName, "label" to info.loadLabel(pm).toString(), "icon" to icon)
        }
    }

    AsyncFunction("appInstalled") { packageName: String ->
      appContext.reactContext?.packageManager?.getLaunchIntentForPackage(packageName) != null
    }

    AsyncFunction("launchApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return@AsyncFunction false
      context.startActivity(intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    // Image and post together in the phone's own share menu. expo-sharing can only send the file.
    AsyncFunction("shareImage") { uri: String, text: String, name: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val path = android.net.Uri.parse(uri).path ?: return@AsyncFunction false
      // Apps show the file's own name, and a captured view is called something like ReactNative-snapshot-image123.png.
      val dir = java.io.File(context.cacheDir, "vanna-share").apply { mkdirs() }
      val named = java.io.File(path).copyTo(java.io.File(dir, java.io.File(name).name), overwrite = true)
      val content = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.SharingFileProvider", named)
      val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(android.content.Intent.EXTRA_STREAM, content)
        putExtra(android.content.Intent.EXTRA_TEXT, text)
        // The clip is what lets the system menu show the image as a preview.
        clipData = android.content.ClipData.newRawUri("Vanna", content)
        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val menu = android.content.Intent.createChooser(send, null)
      menu.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
      context.startActivity(menu)
      true
    }

    // Saves to Pictures/Vanna. No storage permission on Android 10 and later; older phones get false.
    AsyncFunction("saveImage") { uri: String, name: String ->
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q) return@AsyncFunction false
      val context = appContext.reactContext ?: return@AsyncFunction false
      val path = android.net.Uri.parse(uri).path ?: return@AsyncFunction false
      val resolver = context.contentResolver
      val values = android.content.ContentValues().apply {
        put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, java.io.File(name).name)
        put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png")
        put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/Vanna")
        put(android.provider.MediaStore.Images.Media.IS_PENDING, 1)
      }
      val item = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return@AsyncFunction false
      val out = resolver.openOutputStream(item) ?: return@AsyncFunction false
      out.use { sink -> java.io.File(path).inputStream().use { it.copyTo(sink) } }
      values.clear()
      values.put(android.provider.MediaStore.Images.Media.IS_PENDING, 0)
      resolver.update(item, values, null, null)
      true
    }
  }
}

