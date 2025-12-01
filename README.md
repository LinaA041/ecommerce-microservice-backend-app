
# Proyecto Final – Plataformas II  
**Autores:** Juan Manuel Velosa – Lina María Andrade  
**Profesor:** Christian Flor  
**Universidad Icesi – Diciembre 2025**  

---

# Documentación Completa del Proyecto  
Este documento describe detalladamente la arquitectura, infraestructura, microservicios, seguridad, despliegue, CI/CD y configuración realizados para el proyecto final de la materia **Plataformas II**, integrando:

- Requerimientos oficiales del proyecto (PDF 1)  
- Documentación parcial entregada (PDF 2)  
- Revisión completa del repositorio base  
- Infraestructura, scripts, charts y estructura del proyecto  

---

# 1. Descripción General del Proyecto  

Este proyecto consiste en diseñar, desplegar, asegurar y documentar una **arquitectura completa de microservicios** usando Kubernetes.  
La aplicación corresponde a un e-commerce compuesto por múltiples microservicios independientes que cooperan entre sí usando descubrimiento de servicios, configuraciones centralizadas y API Gateway.

El proyecto abarca:  
✔ Infraestructura Kubernetes  
✔ Helm Charts para cada microservicio  
✔ Namespaces de entornos  
✔ Seguridad (TLS, RBAC, Secrets, PodSecurity, NetworkPolicies)  
✔ Gestión de configuración (ConfigMaps/Secrets)  
✔ Integración CI/CD  
✔ Rotación de secretos  
✔ Escaneo de vulnerabilidades  
✔ Observabilidad  
✔ Estructura de carpetas organizada  
✔ Arquitectura documentada  

---

# 2. Estructura del Repositorio  
A continuación se documentan **todas las carpetas principales** del repositorio y su función.

```
/
├── .github/
│   └── workflows/              # Pipelines de CI/CD (pilling)
│
├── .mvn/wrapper/               # Maven wrapper
│
├── api-gateway/                # Entrada principal al ecosistema
│
├── cloud-config/               # Config Server (Spring Cloud Config)
│
├── favourite-service/          # Gestión de favoritos del usuario
│
├── helm-charts/                # Helm Charts de todos los servicios
│   ├── core/                   # Charts esenciales
│   └── service/                # Charts secundarios
│
├── infrastructure/             # Infraestructura base requerida
│   ├── configmaps/             # Configuración de servicios
│   ├── secrets/                # Secretos, TLS, sealed secrets
│   ├── cronjobs/               # Rotación de secretos, escaneo
│   ├── pod-security/           # PodSecurity y RBAC
│   └── scripts/                # Scripts auxiliares
│
├── k8s/                        # Manifiestos Kubernetes manuales
│
├── order-service/              # Gestión de órdenes
│
├── payment-service/            # Sistema de pagos
│
├── product-service/            # Productos
│
├── proxy-client/               # Autenticación / OAuth Proxy
│
├── shipping-service/           # Envíos de productos
│
├── service-discovery/          # Eureka Server (descubrimiento)
│
├── user-service/               # Usuarios
│
├── scripts/                    # Scripts globales de despliegue y mantenimiento
│
├── compose.yml                 # Docker Compose para entorno local
│
├── app-architecture.drawio     # Diagrama de arquitectura
├── ecommerce-ERD.drawio        # Diagrama de base de datos
│
└── README.md                   # Documentación principal
```

---

# 3. Arquitectura General  

La arquitectura se basa en:

### **Microservicios Spring Boot**
Cada microservicio expone APIs REST y se comunica con otros mediante:

- Eureka (Service Discovery)  
- API Gateway  
- Config Server  
- RabbitMQ (dependiendo del diseño original)  

### **Componentes Principales**

| Servicio | Función |
|---------|---------|
| **Service Discovery (Eureka)** | Registro de microservicios |
| **Cloud Config** | Configuración centralizada |
| **API Gateway** | Entry point global |
| **Proxy Client** | Autenticación |
| **User Service** | Gestión de usuarios |
| **Product Service** | Gestión de productos |
| **Order Service** | Procesamiento de órdenes |
| **Shipping Service** | Gestión de envíos |
| **Payment Service** | Procesamiento de pagos |
| **Favourite Service** | Favoritos del usuario |

---

# 4. Kubernetes: Infraestructura y Despliegue  

El proyecto define la arquitectura completa en Kubernetes usando:

- **Namespaces:** dev, qa, prod  
- **Ingress Controller** para exponer API Gateway  
- **Deployment + Service** por microservicio  
- **NetworkPolicies**  
- **TLS/HTTPS**  
- **RBAC y ServiceAccounts**  
- **Horizontal Pod Autoscaler (HPA)**  
- **Storage y persistencia (PVC/PV)**  

---

# 5. Gestión de Configuración y Secretos  

### **ConfigMaps**
Se migraron configuraciones de Spring Boot hacia:

```
infrastructure/configmaps/
```

Incluyen:
- Base URLs  
- Credenciales no sensibles  
- Variables de entorno  
- Configuración de puertos  

### **Secrets**
Implementados en:

```
infrastructure/secrets/
```

Incluyen:

- Credenciales de BD  
- Tokens JWT  
- TLS key + cert  
- Secretos rotables vía CronJob  

### **Rotación Automática de Secretos**
CronJobs implementados para:

- Rotar secreto del actuator  
- Rotar secreto del proxy  
- Rotar secreto GitHub  
- Rotación TLS programada  

---

# 6. CronJobs en la Infraestructura  

Los CronJobs están en:

```
infrastructure/cronjobs/
```

### Funciones principales:

- **Rotación de secretos**
- **Escaneo de vulnerabilidades**
- **Verificación de imágenes**
- **Reinicios programados seguros**

---

# 7. Seguridad del Sistema  

### 7.1 Pod Security Standards

En:

```
infrastructure/pod-security/
```

Incluye:

- Restricciones de ejecución  
- Drops de capacidades Linux  
- Usuarios no root  
- Seccomp profiles  

### 7.2 RBAC y ServiceAccounts

Implementadas para:

- API Gateway  
- Config Server  
- Microservicios críticos  

### 7.3 TLS/HTTPS
Certificado gestionado vía:

```
infrastructure/secrets/tls/
```

Asegurando:

- Encriptación en tránsito  
- Comunicación segura a través del Ingress  

---

# 8. CI/CD – GitHub Actions  

Ubicado en:

```
.github/workflows/pilling.yml
```

### Orden del despliegue:

1. **Core (Service Discovery, Cloud Config, API Gateway Base)**
2. **Services secundarios (User, Product, Order, Shipping, Payment...)**
3. **API Gateway final**

---

# 9. Observabilidad y Monitoreo  

Incluye:

- **Spring Actuator**
- **Métricas expuestas para Prometheus**
- **Logs centralizados**
- **Dashboards en Grafana**
- **Tracing distribuido (Zipkin)**

---

# 10. Estrategias de Despliegue  
Se implementaron:

- **Helm Charts por microservicio**
- **Blue-Green Deployment básico**
- **Canary Deployment opcional**
- **Rollback automático en fallos**

---

# 11. Diagrama de Arquitectura (Descripción textual)  

```
                    ┌──────────────────────┐
                    │      Ingress         │
                    └───────────┬──────────┘
                                │
                          ┌─────▼─────┐
                          │ API GATEWAY│
                          └─────┬─────┘
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
 ┌──────▼──────┐        ┌───────▼──────┐         ┌───────▼───────┐
 │ USER SERVICE│        │ PRODUCT SERV │         │ ORDER SERVICE  │
 └──────────────┘        └──────────────┘         └────────────────┘
         │                         │                      │
 ┌──────▼────────┐       ┌────────▼────────┐    ┌────────▼─────────┐
 │ FAVOURITE SERV │       │ SHIPPING SERVICE │    │ PAYMENT SERVICE  │
 └───────────────┘       └─────────────────┘    └──────────────────┘

                          ┌─────────────────┐
                          │ CLOUD CONFIG    │
                          └─────────────────┘

                          ┌─────────────────┐
                          │ SERVICE DISCOVERY│
                          └─────────────────┘
```

---

# 12. Pruebas y Operación  

- Pruebas de estrés (Locust/JMeter)  
- Simulación de carga en API Gateway  
- HPA reaccionando a tráfico  
- Logs y métricas verificadas  

---

# 13. Conclusiones  

El proyecto cumple todos los requisitos exigidos:

✔ Arquitectura completa de microservicios  
✔ Kubernetes configurado con prácticas avanzadas  
✔ Seguridad aplicada (TLS, RBAC, Secrets, NetworkPolicies)  
✔ Observabilidad y monitoreo  
✔ CI/CD funcional  
✔ Rotación automática de secretos  
✔ Helm Charts para todos los servicios  
✔ Infraestructura ordenada y escalable  

---

