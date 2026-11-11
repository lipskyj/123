#!/usr/bin/env bash
# Builds and signs the WA Forwarder APK WITHOUT Android Studio or the Android SDK.
# Works on Linux, macOS and Windows (Git Bash). Needs: JDK 17+ (java, javac, keytool), Python 3, curl.
#
#   bash android/build.sh
#
# Everything it needs is downloaded once from Maven Central into android/.build-tools/:
#   aapt2 + framework  -> org.apktool:apktool-cli:3.0.3 (prebuilt/)
#   android API stubs  -> org.robolectric:android-all:14-robolectric-10818077
#   dexer              -> com.jakewharton.android.repackaged:dalvik-dx:16.0.1
#   signer             -> com.android.tools.build:apksig:2.3.0
#
# Signing: on the first run a NEW private key is generated in android/signing/ (git-ignored).
# Keep that folder: Android only installs updates signed with the same key.
# The finished APK is copied to public/wa-forwarder.apk so the Worker serves it at /wa-forwarder.apk.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
TOOLS="${TOOLS:-$HERE/.build-tools}"
OUT="${OUT:-$HERE/build}"
KS="${KS:-$HERE/signing/wa-forwarder.p12}"
KSPASS_FILE="$(dirname "$KS")/keystore-password.txt"
VERSION_CODE="${VERSION_CODE:-3}"
VERSION_NAME="${VERSION_NAME:-3.0}"
MAVEN="https://repo1.maven.org/maven2"

# ---- platform detection -------------------------------------------------------------
case "$(uname -s)" in
  Linux*)               OS=linux;   SEP=":"; AAPT2_NAME=aapt2 ;;
  Darwin*)              OS=macosx;  SEP=":"; AAPT2_NAME=aapt2 ;;
  MINGW*|MSYS*|CYGWIN*) OS=windows; SEP=";"; AAPT2_NAME=aapt2.exe ;;
  *) echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac
PY="$(command -v python3 || command -v python || true)"
[ -n "$PY" ] || { echo "Python 3 is required"; exit 1; }
for t in java javac keytool curl; do command -v "$t" >/dev/null || { echo "$t is required (install a JDK 17+ / curl)"; exit 1; }; done

# Convert paths for Windows-native tools (java, aapt2) when running under Git Bash.
p() { if [ "$OS" = windows ] && command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }

# ---- 0. fetch build tools (first run only) --------------------------------------------
fetch() { # fetch <maven path> <file>
  [ -f "$TOOLS/$2" ] || { echo "downloading $2"; curl -fsSL "$MAVEN/$1" -o "$TOOLS/$2.part" && mv "$TOOLS/$2.part" "$TOOLS/$2"; }
}
mkdir -p "$TOOLS"
fetch org/apktool/apktool-cli/3.0.3/apktool-cli-3.0.3.jar apktool-cli-3.0.3.jar
fetch org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar android-all-14.jar
fetch com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar dalvik-dx-16.0.1.jar
fetch com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar apksig-2.3.0.jar
AAPT2="$TOOLS/prebuilt/$OS/$AAPT2_NAME"
if [ ! -f "$AAPT2" ] || [ ! -f "$TOOLS/prebuilt/android-framework.jar" ]; then
  "$PY" - "$(p "$TOOLS/apktool-cli-3.0.3.jar")" "$(p "$TOOLS")" "$OS" "$AAPT2_NAME" <<'PY'
import sys, zipfile, os
jar, dest, osname, aapt = sys.argv[1:]
with zipfile.ZipFile(jar) as z:
    for name in ("prebuilt/android-framework.jar", f"prebuilt/{osname}/{aapt}"):
        z.extract(name, dest)
os.chmod(os.path.join(dest, "prebuilt", osname, aapt), 0o755)
PY
fi

rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/signer"

# ---- 1. resources + manifest -> binary APK skeleton -----------------------------------
"$AAPT2" compile --dir "$(p "$HERE/res")" -o "$(p "$OUT/res.zip")"
"$AAPT2" link -o "$(p "$OUT/base.apk")" \
  --manifest "$(p "$HERE/AndroidManifest.xml")" -R "$(p "$OUT/res.zip")" --auto-add-overlay \
  -I "$(p "$TOOLS/prebuilt/android-framework.jar")" \
  --min-sdk-version 26 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME"

# ---- 2. Java -> class files (Java 8 bytecode, no lambdas, so plain dx can dex it) ------
SRCS=()
while IFS= read -r f; do SRCS+=("$(p "$f")"); done < <(find "$HERE/src" -name '*.java')
javac -nowarn --release 8 -cp "$(p "$TOOLS/android-all-14.jar")" -encoding UTF-8 \
  -d "$(p "$OUT/classes")" "${SRCS[@]}" 2>&1 | grep -v 'warning' || true
test -f "$OUT/classes/com/waforwarder/WaListenerService.class"

# ---- 3. class files -> classes.dex, added to the APK ----------------------------------
java -cp "$(p "$TOOLS/dalvik-dx-16.0.1.jar")" com.android.dx.command.Main --dex \
  --min-sdk-version=26 --output="$(p "$OUT/classes.dex")" "$(p "$OUT/classes")"
"$PY" - "$(p "$OUT/base.apk")" "$(p "$OUT/classes.dex")" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "a", zipfile.ZIP_DEFLATED) as z:
    z.write(sys.argv[2], "classes.dex")
PY

# ---- 4. signing key: generated once, with a random password, never committed ---------
if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"
  "$PY" -c "import secrets; print(secrets.token_urlsafe(24))" > "$KSPASS_FILE"
  keytool -genkeypair -keystore "$(p "$KS")" -storetype PKCS12 \
    -storepass "$(cat "$KSPASS_FILE")" -keypass "$(cat "$KSPASS_FILE")" \
    -alias wa -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=WA Forwarder"
  echo "New signing key: $KS (back up android/signing/, never commit it)"
fi
KSPASS="${KSPASS:-$(cat "$KSPASS_FILE")}"

# ---- 5. align stored entries (resources.arsc must be 4-byte aligned for targetSdk 30+)
"$PY" "$(p "$HERE/build-tools-src/zipalign.py")" "$(p "$OUT/base.apk")" "$(p "$OUT/aligned.apk")"

# ---- 6. sign (APK Signature Scheme v2; minSdk 26 needs no v1) and verify --------------
javac -nowarn -cp "$(p "$TOOLS/apksig-2.3.0.jar")" -d "$(p "$OUT/signer")" "$(p "$HERE/build-tools-src/Sign.java")"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  --add-exports java.base/sun.security.util=ALL-UNNAMED \
  -cp "$(p "$TOOLS/apksig-2.3.0.jar")$SEP$(p "$OUT/signer")" \
  Sign "$(p "$KS")" "$KSPASS" wa "$(p "$OUT/aligned.apk")" "$(p "$OUT/wa-forwarder.apk")"
"$PY" - "$(p "$OUT/wa-forwarder.apk")" <<'PY'
import sys, zipfile
for i in zipfile.ZipFile(sys.argv[1]).infolist():
    if i.compress_type == 0:
        off = i.header_offset + 30 + len(i.filename.encode()) + len(i.extra)
        assert off % 4 == 0, ("misaligned after signing", i.filename)
print("alignment ok")
PY

cp "$OUT/wa-forwarder.apk" "$ROOT/public/wa-forwarder.apk"
echo "APK: $ROOT/public/wa-forwarder.apk ($(wc -c < "$ROOT/public/wa-forwarder.apk") bytes)"
