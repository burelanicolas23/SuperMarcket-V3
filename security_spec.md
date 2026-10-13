# Especificación de Seguridad y Matriz de Roles (RBAC / ABAC) — SuperMarcket

## Arquitectura Multi-Tenant y Seguridad Centralizada

### 1. Aislamiento Jerárquico de Tenants
- Ruta base aislada: `/tenants/{tenantId}`
- Colecciones dependientes:
  - `/tenants/{tenantId}/products`
  - `/tenants/{tenantId}/sales`
  - `/tenants/{tenantId}/suppliers`
  - `/tenants/{tenantId}/inventory_movements`
  - `/tenants/{tenantId}/audit_logs`
  - `/tenants/{tenantId}/cash_closures`
  - `/tenants/{tenantId}/users`
  - `/tenants/{tenantId}/fiscal_sequences`
- `tenantId` proviene de una asignación autorizada por el backend y claims de sesión, impidiendo que el cliente elija un tenant ajeno.

### 2. Ciclo de Vida de Autenticación y Autorización
```
currentUser === null
        ↓
Pantalla de Login (Firebase Auth / Credenciales Verificadas)
        ↓
Perfil / Rol Autorizado (ADMINISTRADOR | ENCARGADO | CAJERO | REPOSITOR)
        ↓
Aplicación SuperMarcket
```
- **Registro de usuarios**: Exclusivamente `ADMIN → backend → Firebase Admin SDK → usuario/rol`. Se prohíbe la autoasignación de roles desde el cliente.
- **PIN de Terminal**: Utilizado únicamente como conmutador rápido de operador en caja dentro de una sesión ya autenticada. Se valida mediante el backend (`/api/auth/verify-pin`) con rate limiting (máximo 5 intentos) y bloqueo automático temporal de 15 minutos.

### 3. Matriz RBAC de Roles Operativos
- **ADMINISTRADOR**: Acceso total a todas las colecciones, configuración comercial, exportación e importación de respaldos, altas de usuarios y auditoría.
- **ENCARGADO**: Supervisión de turnos de caja, inventario, transferencias de stock, cierres de terminal y reportes operativos. Bloqueado de reseteo de base de datos y altas de administradores.
- **CAJERO**: Operación del TPV/Caja, cobro de ventas, lectura de catálogo de productos y cierre de su propio turno. Bloqueado de modificación directa de stock físico, proveedores o configuración global.
- **REPOSITOR**: Gestión de recepción de pedidos, conteos físicos y ajustes de stock en depósito. Bloqueado de caja, ventas fiscales y finanzas.

### 4. Integridad Transaccional y Fiscal ARCA
- **Secuencia Fiscal Centralizada**: No se generan números aleatorios ni con `Date.now()`. Cada comprobante obtiene su número correlativo desde el contador centralizado por punto de venta y tipo de comprobante (`/api/fiscal/next-sequence` y `/api/sales/checkout`).
- **Venta Atómica**: La transacción del backend descuenta el stock, genera el número correlativo fiscal, calcula el CAE y código QR oficial (RG 4291/RG 5003), registra la venta y sienta el movimiento en el Kardex y bitácora de auditoría.
- **Transición de Cajas y Cierres**: Vinculación estricta de `cashierId` + `terminalId` + `shiftId` con control de estados (`abierta` → `cerrando` → `cerrada`).

### 5. Copias de Seguridad y Respaldo
- Solo el rol **ADMINISTRADOR** puede exportar o importar backups y restablecer datos.
- Todo archivo de importación es validado estrictamente por `BackupValidationService` verificando esquema, límites de tamaño, tipos numéricos y consistencia de relaciones antes de ser procesado.
