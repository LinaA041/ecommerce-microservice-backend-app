#!/bin/bash

NAMESPACE="dev"
DOMAIN="ecommerce.local"

# --- Resolver ruta absoluta del proyecto ---
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TLS_DIR="$BASE_DIR/infrastructure/tls"
SECRET_DIR="$BASE_DIR/infrastructure/secrets"

CERT_FILE="$TLS_DIR/tls.crt"
KEY_FILE="$TLS_DIR/tls.key"
SEALED_FILE="$SECRET_DIR/ecommerce-tls-sealed.yaml"
PUB_CERT="$BASE_DIR/infrastructure/secrets/pub-cert.pem"

echo "============================================"
echo "Rotación manual de certificado TLS"
echo "============================================"
echo "Fecha: $(date)"
echo ""
echo "Base del proyecto: $BASE_DIR"
echo "TLS_DIR: $TLS_DIR"
echo "SECRET_DIR: $SECRET_DIR"
echo ""

mkdir -p "$TLS_DIR"
mkdir -p "$SECRET_DIR"

# --- Generar nuevo certificado ---
echo "Generando nuevo certificado TLS..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/CN=$DOMAIN/O=Ecommerce Platform/C=CO/ST=Valle/L=Cali"

if [ $? -ne 0 ]; then
    echo "Error generando certificado"
    exit 1
fi

echo "Certificado generado:"
echo " - $CERT_FILE"
echo " - $KEY_FILE"
echo ""

# --- Mostrar info ---
echo "Información del nuevo certificado:"
openssl x509 -in "$CERT_FILE" -noout -subject -dates
echo ""

# --- Secret temporal ---
echo "Creando Secret temporal..."
kubectl create secret tls ecommerce-tls \
  --cert="$CERT_FILE" \
  --key="$KEY_FILE" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml > "$TLS_DIR/temp-tls-secret.yaml"

if [ $? -ne 0 ]; then
    echo "Error creando secret temporal"
    rm -f "$TLS_DIR/temp-tls-secret.yaml"
    exit 1
fi

echo "Secret temporal creado"
echo ""

# --- Verificar kubeseal ---
if ! command -v kubeseal &> /dev/null; then
    echo "ERROR: kubeseal no está instalado"
    rm -f "$TLS_DIR/temp-tls-secret.yaml"
    exit 1
fi

# --- Crear Sealed Secret ---

kubeseal \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  --format yaml \
  -f "$TLS_DIR/temp-tls-secret.yaml" > "$SEALED_FILE"

if [ $? -ne 0 ]; then
    echo "Error generando Sealed Secret"
    rm -f "$TLS_DIR/temp-tls-secret.yaml"
    exit 1
fi

echo "Sealed Secret generado:"
echo " - $SEALED_FILE"
echo ""

# --- Aplicar ---
echo "Aplicando Sealed Secret en Kubernetes..."
kubectl apply -f "$SEALED_FILE"

if [ $? -ne 0 ]; then
    echo "Error aplicando SealedSecret"
    rm -f "$TLS_DIR/temp-tls-secret.yaml"
    exit 1
fi

echo "SealedSecret aplicado"
echo ""

# --- Verificaciones ---
echo "Verificando..."
sleep 3

kubectl get sealedsecret ecommerce-tls -n "$NAMESPACE" &>/dev/null \
  && echo "SealedSecret existe" \
  || echo "WARNING: SealedSecret NO encontrado"

if kubectl get secret ecommerce-tls -n "$NAMESPACE" &>/dev/null; then
    TS=$(kubectl get secret ecommerce-tls -n "$NAMESPACE" -o jsonpath='{.metadata.creationTimestamp}')
    echo "Secret creado por el controller"
    echo "   Timestamp: $TS"
else
    echo "ERROR: Secret no fue creado"
fi

echo ""

# --- Limpieza ---
echo "Limpiando archivos temporales..."
rm -f "$TLS_DIR/temp-tls-secret.yaml"
echo "Listo."
echo ""

# --- Resumen ---
echo "============================================"
echo "ROTACIÓN COMPLETADA EXITOSAMENTE"
echo "============================================"
echo "Sealed Secret listo en:"
echo "   $SEALED_FILE"
echo ""
echo "Puedes hacer commit así:"
echo "   git add $SEALED_FILE"
echo "   git commit -m 'Rotar certificado TLS - $(date +%Y-%m-%d)'"
echo "   git push"
echo ""
echo "Próxima rotación recomendada: $(date -d '+365 days' '+%Y-%m-%d')"
echo "============================================"

