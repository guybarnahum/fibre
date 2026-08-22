#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
OUT="${FIBRE_C2PA_DEV_DIR:-$ROOT/.fibre/p3-c2pa}"
mkdir -p "$OUT"

KEY="$OUT/key.pem"
CERT="$OUT/cert.pem"
CONFIG="$OUT/openssl-p3.cnf"

if [ -e "$KEY" ] || [ -e "$CERT" ]; then
  echo "Refusing to overwrite existing C2PA development credentials in $OUT" >&2
  exit 1
fi

cat > "$CONFIG" <<'EOF'
[req]
distinguished_name = fibre_dn
x509_extensions = fibre_c2pa
prompt = no

[fibre_dn]
CN = Fibre P3 Local C2PA
O = Fibre Development

[fibre_c2pa]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = 1.3.6.1.5.5.7.3.36
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
EOF

openssl ecparam -name prime256v1 -genkey -noout -out "$KEY"
openssl req -new -x509 \
  -key "$KEY" \
  -out "$CERT" \
  -days 30 \
  -config "$CONFIG"
rm -f "$CONFIG"
chmod 600 "$KEY"

echo "Created local-only C2PA development credentials:"
echo "  $CERT"
echo "  $KEY"
echo "These files live under .fibre/ and must never be committed or used as production trust credentials."
