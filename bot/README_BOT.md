# Bot de Gestión de Inventario

Este es el bot de Telegram para el sistema de gestión de inventario y reparaciones. El bot ahora se conecta al backend API en lugar de usar una base de datos SQLite local.

## Cambios Recientes

- ✅ **Eliminado SQLite local**: El bot ya no mantiene una base de datos local. Todos los datos se gestionan a través del backend.
- ✅ **API Client**: Nuevo módulo `api_client.py` que maneja todas las conexiones con el backend.
- ✅ **Conexión al Backend**: El bot se conecta al backend usando HTTPS con certificados SSL.

## Instalación

### 1. Requisitos

- Python 3.8+
- pip (gestor de paquetes de Python)

### 2. Instalación de dependencias

```bash
cd bot
pip install -r requirements.txt
```

### 3. Configuración

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```
TOKEN=<tu_token_de_bot_de_telegram>
CHANNEL_ID=<id_del_canal>
ADMIN_USER_ID=<tu_id_de_usuario_de_telegram>
BACKEND_URL=https://localhost:3000/api
VERIFY_SSL=False  # Para desarrollo con certificados auto-firmados
ZONA_HORARIA=America/Bogota
PRINTER_URL=http://localhost:8000/imprimir
```

### 4. Ejecutar el bot

```bash
python main.py
```

## Configuración del Backend

El bot requiere que el backend esté ejecutándose. Asegúrate de que:

1. El backend está en ejecución (típicamente en `https://localhost:3000`)
2. Los certificados SSL están configurados correctamente
3. Los endpoints esperados están disponibles (ver [api_client.py](api_client.py))

## Características

### Gestión de Productos

- ✅ Listar productos
- ✅ Agregar productos
- ✅ Actualizar stock

### Gestión de Reparaciones

- ✅ Registrar reparaciones
- ✅ Listar reparaciones
- ✅ Actualizar estado de reparaciones
- ✅ Registrar pagos
- ✅ Registrar entregas
- ✅ Imprimir tickets

### Gestión de Ventas

- ✅ Registrar ventas
- ✅ Ver ventas del día/mes

### Estadísticas

- ✅ Ver estadísticas de reparaciones
- ✅ Ver ingresos totales
- ⏳ Ver productos más vendidos (requiere endpoint en backend)
- ⏳ Ver ventas por período (requiere endpoint en backend)

## Estructura del Proyecto

```
bot/
├── main.py              # Archivo principal
├── api_client.py        # Cliente para conectarse al backend
├── requirements.txt     # Dependencias
├── .env.example         # Ejemplo de configuración
└── README.md            # Este archivo
```

## Comentarios Importantes

- **No hay SQLite local**: Todos los datos se almacenan en el backend
- **Usuarios autorizados**: En versiones futuras, se implementará la gestión de usuarios en el backend
- **Estadísticas**: Algunas funcionalidades de estadísticas están deshabilitadas en espera de endpoints en el backend

## Troubleshooting

### Error de conexión al backend

- Verifica que el backend esté en ejecución
- Asegúrate de usar la URL correcta en `BACKEND_URL`
- Si usas certificados auto-firmados, asegúrate de que `VERIFY_SSL=False`

### Error de token de Telegram

- Verifica que tu token sea válido
- Asegúrate de que el bot está habilitado en BotFather

### Stock insuficiente

- Verifica que hay stock en el backend
- El bot valida el stock antes de procesar ventas/reparaciones

## Próximas Mejoras

- [ ] Implementar endpoints de estadísticas en el backend
- [ ] Autenticación de usuarios a través del backend
- [ ] Soporte para múltiples almacenes
- [ ] Reportes avanzados
- [ ] Notificaciones en tiempo real
