#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
OUT="${FIBRE_C2PA_DEV_DIR:-$ROOT/.fibre/p3-c2pa}"
mkdir -p "$OUT"

KEY="$OUT/key.pem"
CERT="$OUT/cert.pem"
CA_CERT="$OUT/ca-cert.pem"
CA_KEY="$OUT/ca-key.pem"
SIGNING_CERT="$OUT/signing-cert.pem"
CSR="$OUT/signing.csr"
CONFIG="$OUT/openssl-c2pa.cnf"
SERIAL="$OUT/ca-cert.srl"

for path in "$KEY" "$CERT" "$CA_CERT" "$CA_KEY" "$SIGNING_CERT" "$CSR" "$SERIAL"; do
  if [ -e "$path" ]; then
    echo "Refusing to overwrite existing C2PA development credentials in $OUT" >&2
    exit 1
  fi
done

cat > "$CONFIG" <<'EOF'
[req]
distinguished_name = fibre_ca_dn
x509_extensions = fibre_ca
prompt = no

[fibre_ca_dn]
CN = Fibre Local C2PA Development Root
O = Fibre Development

[fibre_ca]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
extendedKeyUsage = 1.3.6.1.5.5.7.3.36
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer

[fibre_c2pa]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = 1.3.6.1.5.5.7.3.36
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
EOF

# Local-only development CA. The private CA key is deleted after issuing the
# short-lived signing certificate; only the public CA certificate is retained.
openssl genpkey \
  -algorithm EC \
  -pkeyopt ec_paramgen_curve:P-256 \
  -out "$CA_KEY"
openssl req -new -x509 \
  -key "$CA_KEY" \
  -out "$CA_CERT" \
  -days 30 \
  -sha256 \
  -config "$CONFIG"

# c2pa-node's ES256 LocalSigner expects an unencrypted PKCS#8 private key
# (PEM label "PRIVATE KEY"). The signing certificate is an end entity issued
# by the local CA rather than a self-signed leaf.
openssl genpkey \
  -algorithm EC \
  -pkeyopt ec_paramgen_curve:P-256 \
  -out "$KEY"
openssl req -new \
  -key "$KEY" \
  -out "$CSR" \
  -subj "/CN=Fibre Local C2PA Signer/O=Fibre Development"
openssl x509 -req \
  -in "$CSR" \
  -CA "$CA_CERT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "$SIGNING_CERT" \
  -days 30 \
  -sha256 \
  -extfile "$CONFIG" \
  -extensions fibre_c2pa

# C2PA signer chains are ordered end-entity first, then issuer certificates.
cat "$SIGNING_CERT" "$CA_CERT" > "$CERT"
rm -f "$CONFIG" "$CSR" "$SIGNING_CERT" "$CA_KEY" "$SERIAL"
chmod 600 "$KEY"

echo "Created local-only C2PA development credentials:"
echo "  $CERT  (end-entity + local CA chain)"
echo "  $KEY"
echo "  $CA_CERT"
echo "These files live under .fibre/ and must never be committed or used as production trust credentials."
