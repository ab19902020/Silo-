#!/usr/bin/env bash
# Build Silo 18 as an Android app: android/build/silo18.apk
#
# Needs a JDK (11 or later), Python 3 and curl — not the Android SDK. The three
# Android tools it uses are fetched once from Maven Central and checked against
# pinned SHA-256 sums:
#   android.jar   the Android 4.1 API stubs, to compile the activity against
#   dx            turns the compiled activity into Dalvik bytecode
#   apksig        signs the APK the way Android 7+ checks it (scheme v2)
#
# The APK is signed with a key kept in android/.keys/, which is made on the
# first build and never committed. A phone only accepts an update signed with
# the same key as the copy already installed, so keep that folder if you want
# new builds to install over old ones (and keep their saved games). Point
# SILO_KEYSTORE at another .p12, with SILO_KEYSTORE_PASSWORD, to use your own.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$here")"
tools="$here/.tools"
build="$here/build"
keystore="${SILO_KEYSTORE:-$here/.keys/silo18.p12}"
password="${SILO_KEYSTORE_PASSWORD:-silo18-sideload}"
mkdir -p "$tools" "$build"

fetch() {
  local name=$1 url=$2 sum=$3
  if [ -f "$tools/$name" ] && echo "$sum  $tools/$name" | sha256sum -c --quiet 2>/dev/null; then return; fi
  echo "fetching $name"
  curl -fsSL --retry 4 --retry-delay 3 -o "$tools/$name" "$url"
  echo "$sum  $tools/$name" | sha256sum -c --quiet
}
maven=https://repo1.maven.org/maven2
fetch android.jar "$maven/com/google/android/android/4.1.1.4/android-4.1.1.4.jar" \
  84072541cbb711eff89f7277100ff854929a446dba7ceb1b195c340e0b4fd3cb
fetch dx.jar "$maven/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar" \
  1e4b645628e3bdb097b5331d669e177ef235a551582a8c646dbe36865e541907
fetch apksig.jar "$maven/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar" \
  9637078c0016244e4be0941836295365a7e2e5b164c59cb7885783c40460bfee

classes="$(mktemp -d)"
trap 'rm -rf -- "$classes"' EXIT

echo "compiling the activity"
javac --release 8 -Xlint:-options -cp "$tools/android.jar" -d "$classes" "$here"/src/com/silo18/game/*.java
java -cp "$tools/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=24 \
  --output="$build/classes.dex" "$classes"

# Every commit is a newer version, so an update installs over the old copy.
code="$(git -C "$root" rev-list --count HEAD 2>/dev/null || echo 1)"
name="1.0.$code ($(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo local))"
echo "packing version $name"
python3 -I "$here/tools/pack.py" --dex "$build/classes.dex" --icon "$here/res/icon.png" \
  --www "$root/dist" --out "$build/unsigned.apk" --version-code "$code" --version-name "$name"

if [ ! -f "$keystore" ]; then
  echo "making a signing key in $(dirname "$keystore")"
  mkdir -p "$(dirname "$keystore")"
  keytool -genkeypair -keystore "$keystore" -storetype PKCS12 -storepass "$password" -keypass "$password" \
    -alias silo18 -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Silo 18, O=Silo 18 sideload build"
fi

echo "signing"
javac -Xlint:-options -cp "$tools/apksig.jar" -d "$classes" "$here/tools/Sign.java"
# apksig 2.3.0 reaches into these JDK internals even when it only signs v2.
java --add-exports java.base/sun.security.x509=ALL-UNNAMED \
     --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
     --add-exports java.base/sun.security.util=ALL-UNNAMED \
  -cp "$tools/apksig.jar:$classes" Sign "$keystore" "$password" silo18 "$build/unsigned.apk" "$build/silo18.apk"
rm -f "$build/unsigned.apk"
ls -l "$build/silo18.apk"
