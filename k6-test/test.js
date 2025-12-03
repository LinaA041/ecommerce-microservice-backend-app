// Script de pruebas de carga K6 para E-commerce Microservices

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');

// Configuración de la prueba
export const options = {
 insecureSkipTLSVerify: true,
 stages: [
    { duration: '2m', target: 10 },   // Calentamiento: 10 usuarios
    { duration: '5m', target: 50 },   // Carga normal: 50 usuarios
    { duration: '3m', target: 100 },  // Pico (Black Friday): 100 usuarios
    { duration: '2m', target: 50 },   // Bajada: 50 usuarios
    { duration: '2m', target: 0 },    // Enfriamiento
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de requests < 500ms
    http_req_failed: ['rate<0.1'],    // Error rate < 10%
    errors: ['rate<0.1'],
  },
};


const BASE_URL = 'http://ecommerce.local'; 

// Endpoints
const ENDPOINTS = {
  products: `${BASE_URL}/product-service/api/products`,
  users: `${BASE_URL}/user-service/api/users`,
  favourites: `${BASE_URL}/favourite-service/api/favourites`,
  orders: `${BASE_URL}/order-service/api/orders`,
  shipping: `${BASE_URL}/shipping-service/api/shippings`,
  payment: `${BASE_URL}/payments-service/api/payments`,
};

/ Función principal que ejecuta cada usuario virtual
export default function () {
  // Escenario 1: Usuario navega productos (60% de usuarios)
  if (Math.random() < 0.6) {
    browseProducts();
  }
  
  // Escenario 2: Usuario compra (30% de usuarios)
  else if (Math.random() < 0.9) {
    completePurchase();
  }
  
  // Escenario 3: Usuario gestiona favoritos (10% de usuarios)
  else {
    manageFavourites();
  }
}

// ESCENARIO 1: Navegación de productos
function browseProducts() {
  const scenario = 'Browse Products';
  
  // 1. Listar todos los productos
  let res = http.get(ENDPOINTS.products, {
    tags: { name: 'GET_products_list', scenario: scenario },
  });
  
  let success = check(res, {
    'products list loaded': (r) => r.status === 200,
    'products response time OK': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!success);
  
  sleep(1); // Usuario lee la lista
  
  // 2. Ver detalle de un producto aleatorio
  if (res.status === 200) {
    const productId = Math.floor(Math.random() * 100) + 1;
    res = http.get(`${ENDPOINTS.products}/${productId}`, {
      tags: { name: 'GET_product_detail', scenario: scenario },
    });
    
    success = check(res, {
      'product detail loaded': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!success);
    
    sleep(2); // Usuario lee el producto
  }
  
  // 3. Buscar productos por categoría
  const categories = ['electronics', 'clothing', 'books', 'home'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  res = http.get(`${ENDPOINTS.products}?category=${category}`, {
    tags: { name: 'GET_products_by_category', scenario: scenario },
  });
  
  success = check(res, {
    'category search successful': (r) => r.status === 200,
  });
  errorRate.add(!success);
  
  sleep(1);
}

// ESCENARIO 2: Compra completa (flujo crítico)
function completePurchase() {
  const scenario = 'Complete Purchase';
  
  // 1. Login/Get user
  const userId = Math.floor(Math.random() * 1000) + 1;
  let res = http.get(`${ENDPOINTS.users}/${userId}`, {
    tags: { name: 'GET_user', scenario: scenario },
  });
  
  let success = check(res, {
    'user retrieved': (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(!success);
  
  sleep(0.5);
  
  // 2. Ver productos
  res = http.get(ENDPOINTS.products, {
    tags: { name: 'GET_products', scenario: scenario },
  });
  
  success = check(res, {
    'products loaded': (r) => r.status === 200,
  });
  errorRate.add(!success);
  
  sleep(2);
  
  // 3. Agregar al carrito (simular)
  const productId = Math.floor(Math.random() * 100) + 1;
  const cartPayload = JSON.stringify({
    userId: userId,
    productId: productId,
    quantity: Math.floor(Math.random() * 3) + 1,
  });
  
  res = http.post(ENDPOINTS.cart, cartPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_add_to_cart', scenario: scenario },
  });
  
  success = check(res, {
    'product added to cart': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!success);
  
  sleep(1);
  
  // 4. Crear orden
  const orderPayload = JSON.stringify({
    userId: userId,
    products: [{ productId: productId, quantity: 1 }],
  });
  
  res = http.post(ENDPOINTS.orders, orderPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_create_order', scenario: scenario },
  });
  
  success = check(res, {
    'order created': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!success);
  
  if (!success) return; // Si falla la orden, no continuar
  
  sleep(0.5);
  
  // 5. Procesar pago
  const paymentPayload = JSON.stringify({
    orderId: Math.floor(Math.random() * 10000),
    amount: Math.floor(Math.random() * 500) + 50,
    method: 'credit_card',
  });
  
  res = http.post(ENDPOINTS.payment, paymentPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_process_payment', scenario: scenario },
  });
  
  success = check(res, {
    'payment processed': (r) => r.status === 200 || r.status === 201,
    'payment time acceptable': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!success);
  
  sleep(1);
  
  // 6. Crear envío
  const shippingPayload = JSON.stringify({
    orderId: Math.floor(Math.random() * 10000),
    address: 'Test Address 123',
  });
  
  res = http.post(ENDPOINTS.shipping, shippingPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_create_shipping', scenario: scenario },
  });
  
  success = check(res, {
    'shipping created': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!success);
  
  sleep(0.5);
}

// ESCENARIO 3: Gestión de favoritos (alta carga en favourite service)
function manageFavourites() {
  const scenario = 'Manage Favourites';
  const userId = Math.floor(Math.random() * 1000) + 1;
  
  // 1. Listar favoritos del usuario
  let res = http.get(`${ENDPOINTS.favourites}?userId=${userId}`, {
    tags: { name: 'GET_user_favourites', scenario: scenario },
  });
  
  let success = check(res, {
    'favourites loaded': (r) => r.status === 200,
    'favourites response time': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  
  sleep(1);
  
  // 2. Agregar producto a favoritos
  const productId = Math.floor(Math.random() * 100) + 1;
  const favPayload = JSON.stringify({
    userId: userId,
    productId: productId,
  });
  
  res = http.post(ENDPOINTS.favourites, favPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST_add_favourite', scenario: scenario },
  });
  
  success = check(res, {
    'favourite added': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!success);
  
  sleep(0.5);
  
  // 3. Volver a listar favoritos (simula navegación)
  res = http.get(`${ENDPOINTS.favourites}?userId=${userId}`, {
    tags: { name: 'GET_favourites_refresh', scenario: scenario },
  });
  
  success = check(res, {
    'favourites refreshed': (r) => r.status === 200,
  });
  errorRate.add(!success);
  
  sleep(0.5);
  
  // 4. Eliminar un favorito
  const favouriteId = Math.floor(Math.random() * 100) + 1;
  res = http.del(`${ENDPOINTS.favourites}/${favouriteId}`, {
    tags: { name: 'DELETE_favourite', scenario: scenario },
  });
  
  success = check(res, {
    'favourite deleted': (r) => r.status === 200 || r.status === 204 || r.status === 404,
  });
  errorRate.add(!success);
  
  sleep(0.5);
}

// Función de setup (se ejecuta una vez al inicio)
export function setup() {
  console.log('Iniciando pruebas de carga para E-commerce Microservices');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Escenarios:');
  console.log('   - 60% Navegación de productos');
  console.log('   - 30% Compras completas');
  console.log('   - 10% Gestión de favoritos');
}

// Función de teardown (se ejecuta una vez al final)
export function teardown(data) {
  console.log('Pruebas completadas');
}
