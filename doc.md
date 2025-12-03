![Imagen de WhatsApp 2025-12-01 a las 11 52 40_0c03b2b0](https://github.com/user-attachments/assets/de84ddbe-637a-44c6-b9fd-425124fd925d)## Arquitectura e infraestructura

### 1.1 Descripción general
La arquitectura implementada sigue el patrón de microservicios con los siguientes componentes:

Servicios de Infraestructura:

- Cloud Config Server (puerto 9296): Gestión centralizada de configuración
- Service Discovery (Eureka) (puerto 8761): Registro y descubrimiento de servicios
- API Gateway (puerto 8080): Punto de entrada único con enrutamiento dinámico

Microservicios de negocio:

- Product Service (puerto 8500): Gestión de productos y categorías
- User Service (puerto 8700): Gestión de usuarios y autenticación
- Order Service (puerto 8300): Procesamiento de órdenes
- Payment Service (puerto 8400): Procesamiento de pagos
- Shipping Service (puerto 8600): Gestión de envíos
- Favourite Service (puerto 8800): Gestión de favoritos

Servicios de observabilidad:

- Zipkin (puerto 9411): Tracing distribuido
- Prometheus (puerto 9090): Recolección de métricas
- Grafana (puerto 3000): Visualización de métricas

### 1.2 Implementación en Kubernetes
Cluster: Minikube (desarrollo) / KIND (CI/CD)
Namespaces:
- dev: Ambiente de desarrollo con todos los microservicios
- monitoring: Stack de observabilidad (Prometheus, Grafana)
Helm Charts:
Todos los microservicios están empaquetados con Helm Charts organizados en:
```bash
helm-charts/
├── core/
│   ├── cloud-config/
|   ├── zipkin/
│   └── service-discovery/
├── services/
│   ├── product-service/
│   ├── user-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── shipping-service/
│   ├── favourite-service/
│   └── api-gateway/
```

### 1.3 Dependencias y orden de despliegue

El orden correcto de despliegue respeta las dependencias de la arquitectura:

Cloud Config → Provee configuración a todos los servicios.
Service Discovery (Eureka) → Registro de servicios.
PostgreSQL → Base de datos (para servicios que la requieran).
Microservicios de negocio → Registran en Eureka y obtienen config.
API Gateway → Enruta peticiones a los microservicios.
Stack de monitoreo → Observa todo el sistema.

Implementación de init containers:
Cada microservicio tiene init containers que esperan a que Cloud Config y Eureka estén disponibles antes de iniciar:
```bash
initContainers:
  - name: wait-for-cloud-config
    image: busybox:1.35
    command: ['sh', '-c', 'until nc -z cloud-config 9296; do sleep 2; done']
  
  - name: wait-for-service-discovery
    image: busybox:1.35
    command: ['sh', '-c', 'until nc -z service-discovery 8761; do sleep 2; done']
```
## 2. CONFIGURACIÓN DE RED Y SEGURIDAD
### 2.1 Servicios Kubernetes
Tipos de servicios implementados:


|Servicio         |Tipo              |Puerto    | Propósito|
|-----------------|------------------|----------|----------|
|cloud-config     |ClusterIP         |9296      |Interno   |
|service-discovery|NodePort          |8761      |Interno   |
|Microservicios   |ClusterIP/NodePort|Variable  |Interno   |
|api-gateway      |ClusterIP         |8080      |Expuesto  |

### 2.2 Ingress Controller

NGINX Ingress Controller instalado para manejar el tráfico externo:

```bash
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - ecommerce.local
      secretName: ecommerce-tls
  rules:
    - host: ecommerce.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8080
```
Configuración de TLS/HTTPS:

Certificado TLS configurado con Sealed Secrets
Redirección automática HTTP → HTTPS
Host: ecommerce.local

### 2.3 RBAC y Service Accounts
ServiceAccount para microservicios:
```bash
yamlapiVersion: v1
kind: ServiceAccount
metadata:
  name: microservice-sa
  namespace: dev
```
Role con permisos mínimos:

```bash
yamlapiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: microservice-role
rules:
  - apiGroups: [""]
    resources: ["configmaps","secrets","services","endpoints"]
    verbs: ["get","list"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get","list","watch"]
```
```bash
RoleBinding:
yamlapiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: microservice-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: microservice-role
subjects:
  - kind: ServiceAccount
    name: microservice-sa
```

### 2.4 Gestión de secretos
Sealed Secrets implementado para encriptar secretos en Git:

```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/controller.yaml
```
```bash
infrastructure/secrets/ecommerce-tls-sealed.yaml
```

**Secrets para credenciales:**
- `git-credentials`: Acceso al repositorio de configuración
- `actuator-credentials`: Autenticación para endpoints de monitoreo
- `postgres-credentials`: Credenciales de base de datos

---

## 3. GESTIÓN DE CONFIGURACIÓN Y SECRETOS

### 3.1 Cloud Config Server

**Repositorio centralizado:** https://github.com/LinaA041/cloud-config-server

**Archivos de configuración:**

```bash
cloud-config-server/
├── application.yml          # Configuración común
├── product-service-dev.yml
├── user-service-dev.yml
├── order-service-dev.yml
├── payment-service-dev.yml
├── shipping-service-dev.yml
├── favourite-service-dev.yml
└── api-gateway-dev.yml
```
Configuración común (application.yml):

```bash
yamlspring:
  jackson:
    serialization:
      indent-output: true

eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: ${EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:http://localhost:8761/eureka}
  instance:
    prefer-ip-address: true

spring.zipkin:
  base-url: ${SPRING_ZIPKIN_BASE_URL:http://zipkin:9411/}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

3.2 ConfigMaps en Kubernetes
ConfigMap común:
```bash
yamlapiVersion: v1
kind: ConfigMap
metadata:
  name: common-env
  namespace: dev
data:
  EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: "http://service-discovery:8761/eureka/"
  SPRING_ZIPKIN_BASE_URL: "http://zipkin:9411/"
  EUREKA_INSTANCE_PREFER_IP_ADDRESS: "true"
Inyección en pods:
yamlenvFrom:
  - configMapRef:
      name: common-env
```

### 3.3 Variables de Entorno y secretos

Los servicios obtienen configuración de múltiples fuentes con el siguiente orden de prioridad:

1. **Cloud Config Server** (mayor prioridad)
2. **ConfigMaps de Kubernetes**
3. **Secrets de Kubernetes**
4. **Configuración local** (`application.yml`)

---

## 4. ESTRATEGIAS DE DESPLIEGUE Y CI/CD

### 4.1 Pipeline CI/CD con GitHub Actions

**Archivo:** `.github/workflows/ci-cd-pipeline.yaml`

**Estructura del pipeline:**

```bash
Build & Test → Docker Build & Push → Deploy to KIND → Health Checks → Rollback (si falla)
Jobs implementados:
Job 1: Build & Test
yamlbuild-and-test:
  strategy:
    matrix:
      service: [product-service, user-service, payment-service, ...]
  steps:
    - Build con Maven
    - Ejecutar tests unitarios
    - Upload artifacts (JARs)
Job 2: Docker Build & Push
yamldocker-build:
  steps:
    - Build imagen Docker
    - Tag con build number, SHA y latest
    - Push a Docker Hub
    - Caché de layers para optimizar builds
Job 3: Deploy to KIND
yamldeploy-core:
  steps:
    - Crear cluster KIND
    - Cargar imágenes en KIND
    - Deploy con Helm (orden correcto)
    - Health checks automatizados
    - Rollback automático si falla
```

### 4.2 Estrategia de rollback automatizado

Mecanismo implementado:

Antes del deploy: No se guarda estado previo (KIND es efímero).
Durante el deploy: Health checks en cada fase (gates).
Si falla algún gate: El pipeline falla y no continúa.
Resultado: Se activa el rollback que restablece los servicios.

Gates de validación:

**Gate 1: Cloud Config health**
kubectl exec $POD -- wget --spider http://localhost:9296/actuator/health

**Gate 2: Eureka health**
kubectl exec $POD -- wget --spider http://localhost:8761/

**Gate 3: Business services health**
for each service:
  kubectl exec $POD -- wget --spider http://localhost:$PORT/$CONTEXT/actuator/health

**Gate 4: API Gateway E2E test**
kubectl exec $POD -- wget --spider http://localhost:8080/product-service/actuator/health

**Gate 5: System integration (Eureka registration)**
kubectl exec $EUREKA_POD -- wget -qO- http://localhost:8761/eureka/apps | grep SERVICE_NAME


**Si algún gate falla:**
- Pipeline se detiene
- Se muestran logs de diagnóstico
- Se reporta el error


### 4.3 Canary Deployment (API Gateway)

**Implementación con NGINX Ingress:**

Se crearon templates adicionales en el Helm Chart de API Gateway:

**Estructura:**
```bash
api-gateway/
├── templates/
│   ├── deployment.yaml          # Stable
│   ├── deployment-canary.yaml   # Canary
│   ├── service.yaml             # Stable
│   ├── service-canary.yaml      # Canary
│   ├── ingress.yaml             # Stable
│   └── ingress-canary.yaml      # Canary con annotations
values.yaml:
yamlcanary:
  enabled: false  # Activar para canary
  weight: 10      # Porcentaje de tráfico (10%, 50%, 100%)
  image:
    repository: linaa111/api-gateway
    tag: "build-41"  # Versión canary (diferente a stable)
```

Ingress canary con annotations:

```bash
yamlapiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "{{ .Values.canary.weight }}"
spec:
  rules:
    - host: ecommerce.local
      http:
        paths:
          - path: /
            backend:
              service:
                name: api-gateway-canary
                port:
                  number: 8080
```

Flujo de Canary Deployment:

Deploy stable (v1):

```bash
helm install api-gateway . --set canary.enabled=false
```
→ 100% del tráfico va a v1

Deploy canary (v2) con 10%:

```bash
helm upgrade api-gateway . \
     --set canary.enabled=true \
     --set canary.weight=10 \
     --set canary.image.tag=build-42
```
→ 90% v1, 10% v2

Monitorear métricas (errores, latencia, logs)
Si todo OK, incrementar a 50%:

```bash
helm upgrade api-gateway . --set canary.weight=50 --reuse-values
```

Si todo OK, promover a 100%:

```bash
helm upgrade api-gateway . --set canary.weight=100 --reuse-values
```

Finalmente, desactivar canary:

```bash
helm upgrade api-gateway . \
     --set canary.enabled=false \
     --set image.tag=build-42  # La v2 ahora es stable
```

Validación del canary:

```bash
Verificar split de tráfico
kubectl describe ingress api-gateway-canary -n dev | grep canary-weight
```
Hacer múltiples peticiones y contar

```bash
for i in {1..100}; do
  curl -s -k https://ecommerce.local/actuator/health > /dev/null
done
```

Ver logs de cada versión
```bash
kubectl logs -n dev -l version=stable
kubectl logs -n dev -l version=canary
```
![alt text](image.png)

### 4.4 Uso de Helm Charts

Ventajas de usar Helm:

Reutilización de templates
Gestión de releases y versiones
Rollback sencillo: helm rollback <release> <revision>
Configuración centralizada en values.yaml
Sobrescritura de valores en deploy: --set key=value

Comandos comunes:

Instalar
```bash
helm install <release> ./chart -n <namespace>
```
Actualizar

```bash
helm upgrade <release> ./chart --reuse-values
```
Ver historial
```bash
helm history <release> -n <namespace>
```

Rollback
```bash
helm rollback <release> <revision> -n <namespace>
```
Ver valores aplicados
```bash
helm get values <release> -n <namespace>
```

## 5. OBSERVABILIDAD Y MONITOREO
###  5.1 Prometheus + Grafana

Instalación:

**Prometheus**
```bash
helm install prometheus prometheus-community/prometheus -n monitoring
```
**Grafana**
```bash
helm install grafana grafana/grafana -n monitoring --set adminPassword=admin123
```

**Arquitectura de monitoreo:**

```bash
Microservicios (/actuator/prometheus)
        ↓
   Prometheus (scrape)
        ↓
     Grafana (visualización)
```
### 5.2 Aprovechamiento de Actuator Endpoints

Endpoints expuestos en cada microservicio:
```bash
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

**Métricas disponibles:**
```bash
- `/actuator/health` → Estado del servicio
- `/actuator/info` → Información de la aplicación
- `/actuator/metrics` → Métricas en formato JSON
- `/actuator/prometheus` → Métricas en formato Prometheus
```

**Ejemplo de métricas expuestas:**

**JVM :**
- jvm_memory_used_bytes
- jvm_memory_max_bytes
- jvm_threads_live_threads
- process_cpu_usage

**HTTP :**
- http_server_requests_seconds_count
- http_server_requests_seconds_sum
- http_server_requests_seconds_bucket

**Spring Boot**
- spring_application_started_time_seconds

### 5.3 Configuración de Alertas

Alertas configuradas en Prometheus:

Alerta 1: Service Down

```bash
- alert: ServiceDown
  expr: up{namespace="dev"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Servicio {{ $labels.service }} está caído"
    description: "El servicio no responde hace más de 1 minuto"
```

Alerta 2: High JVM Memory
yaml- alert: HighJVMMemory
  expr: (jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) * 100 > 50
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Memoria heap alta en {{ $labels.application }}"
    description: "Usando {{ $value }}% de memoria heap"

Alerta 3:HighOrLowRequestRate
```bash
- alert: HighOrLowRequestRate
        expr: sum by(application) (rate(http_server_requests_seconds_count{namespace="dev"}[48m])) * 100 > 1
        for: 2m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Actividad inusual en {{ $labels.application }}"
          description: "El servicio {{ $labels.application }} está recibiendo un número inusual de solicitudes."
```
Alerta 4:

```bash
alert: HighAverageLatency
        expr: (sum by(application) (rate(http_server_requests_seconds_sum{namespace="dev"}[30m])) / sum by(application) (rate(http_server_requests_seconds_count{namespace="dev"}[30m]))) > 1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Latencia promedio alta en {{ $labels.application }}"
          description: "La latencia promedio en {{ $labels.application }} supera 1 segundo en los últimos 30 minutos."
```

Acceso a alertas:

```bash
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
```
Y accede al navegador en: *http://localhost:9090/alerts*

### 5.4 Tracing Distribuido con Zipkin
Zipkin ya incluido en la arquitectura original.
Configuración en cada microservicio:
```bash
spring.zipkin:
  base-url: http://zipkin:9411/
```
Acceso a Zipkin UI:
```bash
kubectl port-forward -n dev svc/zipkin 9411:9411
```
Y consultar el navegador en: http://localhost:9411/zipkin/

Funcionalidad:

Tracking de requests a través de múltiples servicios
Visualización de latencia por span
Identificación de cuellos de botella
Debugging de errores en flujos complejos

![Imagen de WhatsApp 2025-12-01 a las 11 52 40_0c03b2b0](https://github.com/user-attachments/assets/aeae6cbf-c6c4-460b-8cd8-125bc20afbaa)

### 5.5 Dashboards Personalizados
Dashboard 1: Business Metrics (Stakeholders de Negocio)
Métricas incluidas:

Total de requests por servicio (actividad)
Requests exitosos vs fallidos
Latencia promedio por servicio
Servicios disponibles
Actividad por servicio (Product, Order, User, Payment ...)

Propósito: KPIs comprensibles para gerencia y stakeholders no técnicos.

Dashboard 2: Technical Metrics (Equipo Técnico)
Métricas incluidas:

JVM Heap Memory Usage
JVM Non-Heap Memory Usage
Heap Memory Usage %
Total de threads JVM
Process CPU Usage


Propósito: Monitoreo técnico para developers y SRE.

Acceso:
```bash
kubectl port-forward -n monitoring svc/grafana 3000:80
```
Y en el navegador consultar: *http://localhost:3000*

### 5.6 Logging Centralizado
Evaluación de Loki:
Se intentó implementar Loki para logging centralizado, pero se encontraron limitaciones de recursos en el ambiente de desarrollo (Minikube):

Problemas identificados:

Loki ingester failing health checks
Context timeouts en push de logs
Recursos insuficientes en ambiente local

Alternativa implementada:
Desarrollo: kubectl logs con namespaces organizados
Documentación para producción:

En un ambiente productivo se implementaría:

ELK Stack (Elasticsearch, Logstash, Kibana) para logging empresarial
O Loki con recursos adecuados (CPU/memoria) y almacenamiento persistente
Logs estructurados en JSON para facilitar búsquedas
Retención de logs de 30-90 días según compliance
Agregación de logs por servicio, namespace y nivel (ERROR, WARN, INFO)


Comandos útiles para logs en desarrollo:

Logs de un servicio
```bash
kubectl logs -n dev deployment/product-service --tail=100
```
Logs en tiempo real
```bash
kubectl logs -n dev deployment/product-service -f
```
Logs de múltiples pods
```bash
kubectl logs -n dev -l app.kubernetes.io/name=product-service --tail=50
```
Buscar errores
```bash
kubectl logs -n dev deployment/product-service | grep -i error
```

### 5.7 Monitoreo de comunicaciones entre servicios
Métricas HTTP disponibles:
Prometheus recolecta automáticamente métricas de todas las llamadas HTTP entre servicios gracias a Spring Boot Actuator:

Requests entre servicios
```bash
http_server_requests_seconds_count{namespace="dev"}
```

Latencia de comunicación
```bash
rate(http_server_requests_seconds_sum[5m]) / rate(http_server_requests_seconds_count[5m])
```
Errores en comunicación
```bash
http_server_requests_seconds_count{status=~"5.."}
```
Panel en Grafana para inter-service communication:

Query ejemplo:
promqlsum by (application, uri) (rate(http_server_requests_seconds_count{namespace="dev"}[5m]))

Muestra:

Qué servicios se llaman entre sí
Frecuencia de llamadas
Latencia de cada llamada
Errores en la comunicación








