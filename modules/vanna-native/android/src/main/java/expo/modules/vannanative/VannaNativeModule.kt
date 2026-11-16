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

