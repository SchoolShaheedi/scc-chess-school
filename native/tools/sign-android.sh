#!/bin/zsh
# Signs the Play Store bundle with the charity's upload key. YOU type the passwords; nothing is saved or printed.
set -e
J="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin"
IN="$(dirname $0)/../android/app/build/outputs/bundle/release/app-release.aab"
KEY="${1:-$HOME/Documents/Keys/sikhi-calendar-upload.jks}"   # a path may be given (the Terminal panel cannot read Documents)
OUT_DIR="$HOME/Desktop/SWC-Chess-Upload"; mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/swc-chess-1.2.0.aab"
echo "Upload key: $KEY"
while true; do
  read -rs "STOREPASS?Key file password: "; echo
  export STOREPASS
  if LIST=$("$J/keytool" -list -keystore "$KEY" -storepass:env STOREPASS 2>&1); then break; fi
  echo "That password did not open the key file. Try again (Ctrl-C to stop)."
done
ALIASES=$(echo "$LIST" | grep -i "PrivateKeyEntry" | cut -d, -f1)
[ -z "$ALIASES" ] && { echo "No signing key found in the file:"; echo "$LIST" | head -5; exit 1; }
echo "Key alias(es) in the file: $ALIASES"
ALIAS=$(echo "$ALIASES" | head -1)
read -rs "KEYPASS?Key password (press Return if it is the same): "; echo
[ -z "$KEYPASS" ] && KEYPASS="$STOREPASS"; export KEYPASS
"$J/jarsigner" -sigalg SHA256withRSA -digestalg SHA-256 -keystore "$KEY" -storepass:env STOREPASS -keypass:env KEYPASS -signedjar "$OUT" "$IN" "$ALIAS" >/dev/null
unset STOREPASS KEYPASS
"$J/jarsigner" -verify "$OUT" | tail -1
echo "SIGNED: $OUT"
