#!/bin/bash

SERVICES=(
  "favourite-service"
  "product-service" 
  "user-service"
  "order-service"
  "payment-service"
  "shipping-service"
)

for SERVICE in "${SERVICES[@]}"; do
  APP_DEV="$SERVICE/src/main/resources/application-dev.yml"
  APP_MAIN="$SERVICE/src/main/resources/application.yml"
  
  if [ -f "$APP_DEV" ]; then
    echo "================================"
    echo "SERVICE: $SERVICE"
    echo "================================"
    echo ""
    echo "--- application.yml ---"
    cat "$APP_MAIN" 2>/dev/null || echo "Not found"
    echo ""
    echo "--- application-dev.yml ---"
    cat "$APP_DEV"
    echo ""
    echo ""
  else
    echo "$SERVICE: No application-dev.yml found"
  fi
done
