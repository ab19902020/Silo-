# Silo 18 for Android

The Android app is the web game in a full-screen WebView. The files in `dist/`
are packed into the APK and served to the WebView from a made-up https address
(`appassets.androidplatform.net`) that never touches the network, because the
game is built from ES modules and a browser will not run those from `file://`.
Everything works offline.

## Build

```sh
android/build.sh
```

The result is `android/build/silo18.apk`. It needs a JDK 11+, Python 3 and curl;
the Android SDK is not used. See the top of `build.sh` for what it downloads and
how signing works.

## Install

Copy the APK to the phone and open it. Android asks once to allow installs from
whichever app opened it (Files, Chrome, Drive…). It needs Android 7.0 or later
and runs in landscape.

On a phone the game starts on the **Low** graphics preset; Balanced and High are
in Settings. Back opens and closes the pause menu and closes any open panel.

## What is here

- `src/com/silo18/game/MainActivity.java` — the WebView, the file server, full
  screen, and the Back button.
- `tools/pack.py` — writes the binary manifest and resource table by hand and
  zips the APK with uncompressed media aligned for Android.
- `tools/Sign.java` — signs with APK Signature Scheme v2 and verifies the result.
- `res/icon.png` — the launcher icon, the same "18" as the web page's favicon.
