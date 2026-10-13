# Configuración Firebase Authentication

Proyecto configurado en `firebase-applet-config.json`:

- Project ID: `quantum-computer-q53bd`
- Auth domain: `quantum-computer-q53bd.firebaseapp.com`

## `auth/operation-not-allowed`

Este error no se puede corregir desde el frontend: Firebase lo devuelve cuando el proveedor usado por la aplicación está deshabilitado en el proyecto.

Se detectó inicialmente `PASSWORD_LOGIN_DISABLED`. Después de corregir la configuración del proyecto, se verificó que el endpoint de Firebase responde `INVALID_LOGIN_CREDENTIALS` para credenciales de prueba, lo que confirma que **Email/Password está habilitado** y que el dominio local ya es aceptado.

En Firebase Console, dentro de **Authentication > Sign-in method**, habilitar:

1. **Email/Password**, para el formulario de correo y contraseña.
2. **Google**, con el correo de soporte del proyecto configurado.

En **Authentication > Settings > Authorized domains**, agregar los dominios reales de despliegue y, para desarrollo local:

- `localhost`
- `127.0.0.1`

El frontend ahora muestra un diagnóstico explícito si alguno de esos proveedores está deshabilitado.

## Usuarios nuevos

Las altas se realizan mediante el backend con Firebase Admin SDK. En producción configurar `FIREBASE_SERVICE_ACCOUNT_JSON` mediante un gestor de secretos o Application Default Credentials. El backend crea la cuenta, asigna `role` y `tenantId` como custom claims y el cliente guarda el perfil del tenant.

No colocar credenciales de Firebase Admin en variables `VITE_*`, en el frontend ni en el repositorio.
