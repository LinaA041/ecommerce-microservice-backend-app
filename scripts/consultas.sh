#!/bin/bash

# Lista de endpoints usando ecommerce.local
endpoints=(
  "https://ecommerce.local/product-service/api/products"
  "https://ecommerce.local/shipping-service/api/shippings"
  "https://ecommerce.local/user-service/api/users"
  "https://ecommerce.local/favourite-service/api/favourites"
  "https://ecommerce.local/payment-service/api/payments"
  "https://ecommerce.local/order-service/api/orders"
  "https://ecommerce.local/app/api/products"
)

echo "Iniciando consultas a los endpoints..."

for url in "${endpoints[@]}"; do
  echo "============================"
  echo "Consultando 10 veces: $url"
  echo "============================"

  for i in {1..10}; do
    # Ejecuta curl y obtiene solo el código HTTP
    status_code=$(curl -sk -o /dev/null -w "%{http_code}" "$url")

    echo "Intento $i -> Código HTTP: $status_code"
    sleep 1
  done

  echo ""
done

echo "Consultas finalizadas."
