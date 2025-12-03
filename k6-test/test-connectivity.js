// Script de prueba de conectividad antes de ejecutar pruebas de carga
// Verifica que todos los endpoints estén accesibles

import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
	insecureSkipTLSVerify: true,
  vus: 1,
  iterations: 1,
};

const BASE_URL = 'https://ecommerce.local';

// Todos los endpoints a verificar
const ENDPOINTS = {
  'Product Service': `${BASE_URL}/product-service/api/products`,
  'User Service': `${BASE_URL}/user-service/api/users`,
  'Favourite Service': `${BASE_URL}/favourite-service/api/favourites`,
  'Order Service': `${BASE_URL}/order-service/api/orders`,
  'Shipping Service': `${BASE_URL}/shipping-service/api/shipping`,
  'Payment Service': `${BASE_URL}/payment-service/api/payments`,
};

export default function () {
  console.log('Verificando conectividad a todos los servicios...\n');
  
  let allSuccess = true;
  
  Object.entries(ENDPOINTS).forEach(([serviceName, url]) => {
    group(serviceName, () => {
      console.log(`Testing ${serviceName}: ${url}`);
      
      const res = http.get(url, {
        timeout: '10s',
      });
      
      const success = check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'not connection refused': (r) => !r.error.includes('connection refused'),
        'not timeout': (r) => !r.error.includes('timeout'),
      });
      
      if (success) {
        console.log(` ${serviceName}: OK (status ${res.status})`);
      } else {
        console.log(` ${serviceName}: FAILED`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Error: ${res.error || 'No error message'}`);
        if (res.body) {
          console.log(`   Body: ${res.body.substring(0, 200)}`);
        }
        allSuccess = false;
      }
      console.log('');
    });
  });
  
  console.log('\n' + '='.repeat(50));
  if (allSuccess) {
    console.log('Todos los servicios están accesibles');
    console.log(' Puedes ejecutar las pruebas de carga');
  } else {
    console.log(' Algunos servicios tienen problemas');
    console.log(' Revisa los endpoints antes de continuar');
  }
  console.log('='.repeat(50));
}

export function setup() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST DE CONECTIVIDAD - E-commerce Microservices');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`TLS Verify: Deshabilitado (certificado autofirmado)`);
  console.log('='.repeat(50) + '\n');
}
