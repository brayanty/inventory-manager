import logging
import json
import os
import inspect
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
import pytz
from dotenv import load_dotenv
from api_client import api_client

# Cargar variables de entorno
load_dotenv()

# ============ CONFIGURACIÓN ============
TOKEN = os.getenv('TOKEN')
CHANNEL_ID = os.getenv('CHANNEL_ID')
ZONA_HORARIA_STR = os.getenv('ZONA_HORARIA', 'America/Bogota')
PRINTER_URL = os.getenv('PRINTER_URL', 'http://localhost:8000/imprimir')
ZONA_HORARIA = pytz.timezone(ZONA_HORARIA_STR)

# Estados para conversación de productos
(ADD_PRODUCT_NAME, ADD_PRODUCT_SELECT_CATEGORY, ADD_PRODUCT_CATEGORY, ADD_PRODUCT_STOCK, ADD_PRODUCT_PRICE) = range(5)

# Estados para conversación de agregar categoría
(ADD_CATEGORY_NAME,) = range(5, 6)

# Estados para conversación de reparaciones
(ADD_REPAIR_CLIENT, ADD_REPAIR_PHONE, ADD_REPAIR_DEVICE, ADD_REPAIR_MODEL, 
 ADD_REPAIR_IMEI, ADD_REPAIR_FAULTS, ADD_REPAIR_DETAIL, ADD_REPAIR_PRICE, ADD_REPAIR_PAY, ADD_REPAIR_PAY_AMOUNT) = range(10)

BRANDS_DEVICES = [
    {"id": 1, "name": "Apple"},
    {"id": 2, "name": "Samsung"},
    {"id": 3, "name": "Microsoft"},
    {"id": 4, "name": "Google"},
    {"id": 5, "name": "Amazon"},
    {"id": 6, "name": "Sony"},
    {"id": 7, "name": "Intel"},
    {"id": 8, "name": "Huawei"},
    {"id": 9, "name": "Dell"},
    {"id": 10, "name": "Lenovo"},
    {"id": 11, "name": "LG Electronics"},
    {"id": 12, "name": "Xiaomi"},
    {"id": 13, "name": "HP (Hewlett-Packard)"},
    {"id": 14, "name": "NVIDIA"},
    {"id": 15, "name": "Canon"},
]

# Estados para entrega
(ADD_DELIVERY_REPAIR_ID, ADD_DELIVERY_CONFIRM) = range(2)

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

def safe_int_convert(text):
    """Convierte texto a entero de forma segura"""
    if not text:
        return None
    text = text.strip()
    if text.isdigit():
        return int(text)
    return None

def format_currency(amount):
    """Formatea un número como moneda"""
    try:
        if isinstance(amount, str):
            amount = float(amount)
        return f"${amount:,.2f}"
    except (ValueError, TypeError):
        return "$0.00"

async def fetch_device(device_id: int) -> Optional[Dict[str, Any]]:
    """Obtiene un dispositivo/reparación y espera solo si es awaitable"""
    device = api_client.get_device_by_id(device_id)
    if inspect.isawaitable(device):
        device = await device
    return device

# Validar usuario
def require_auth(func):
    """Decorador para verificar si el usuario está autorizado/registrado"""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id
        admin_id = int(os.getenv('ADMIN_USER_ID', 0))
        
        # El admin siempre tiene acceso
        if user_id == admin_id:
            return await func(update, context, *args, **kwargs)
        
        # Verificar si el usuario está registrado en el backend
        is_authorized = api_client.verify_user(user_id)
        
        if not is_authorized:
            # Determinar si es un message o callback_query
            reply_text = (
                "❌ No estás registrado en el sistema.\n\n"
                "Usa /registro para registrarte y acceder a todas las funciones."
            )
            if hasattr(update, 'callback_query') and update.callback_query:
                await update.callback_query.answer(text=reply_text, show_alert=True)
            else:
                await update.message.reply_text(reply_text)
            return
        
        return await func(update, context, *args, **kwargs)
    
    return wrapper

def require_auth_callback(func):
    """Decorador específico para callbacks que verifican autenticación"""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        admin_id = int(os.getenv('ADMIN_USER_ID', 0))
        query = update.callback_query
        
        # El admin siempre tiene acceso
        if user_id == admin_id:
            return await func(update, context)
        
        # Verificar si el usuario está registrado en el backend
        is_authorized = api_client.verify_user(user_id)
        
        if not is_authorized:
            await query.answer()
            await query.edit_message_text(
                "❌ No estás registrado en el sistema.\n\n"
                "Usa /registro para registrarte y acceder a todas las funciones."
            )
            return
        
        return await func(update, context)
    
    return wrapper

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra información de ayuda y comandos disponibles"""
    user_id = update.effective_user.id
    admin_id = int(os.getenv('ADMIN_USER_ID', 0))
    
    ayuda_texto = (
        "📋 **COMANDOS DISPONIBLES**\n\n"
        "🛍️ **PRODUCTOS**\n"
        "/productos - Ver lista de productos\n"
        "/agregar_producto - Agregar nuevo producto\n\n"
        "🔧 **REPARACIONES**\n"
        "/reparaciones - Ver reparaciones pendientes\n"
        "/crear_reparacion - Registrar nueva reparación\n"
        "/entregar - Entregar reparación\n\n"
        "📂 **CATEGORÍAS**\n"
        "/categorias - Ver categorías\n"
        "/agregar_categoria - Crear categoría\n\n"
    )
    
    if user_id == admin_id:
        ayuda_texto += (
            "👥 **ADMINISTRACIÓN (solo admin)**\n"
            "/usuarios - Ver usuarios registrados\n"
            "/eliminar_usuario - Remover un usuario\n"
        )
    
    await update.message.reply_text(ayuda_texto)

# ============ FUNCIONES DE IMPRESIÓN ============
def enviar_a_impresora(operaciones, reintentos=2):
    """Envía operaciones al servicio de impresión con reintentos"""
    for intento in range(reintentos):
        try:
            response = requests.post(PRINTER_URL, json={"operaciones": operaciones}, timeout=10)
            if response.status_code == 200:
                return True, "✅ Ticket enviado a impresora"
            else:
                if intento == reintentos - 1:
                    return False, f"❌ Error en impresora: {response.status_code}"
        except Exception as e:
            logger.error(f"Error al imprimir (intento {intento + 1}): {e}")
            if intento == reintentos - 1:
                return False, f"❌ Error de conexión: {e}"
    return False, "❌ Error al enviar ticket"

def generar_ticket_venta(venta_data):
    """Genera las operaciones para un ticket de venta"""
    operaciones = []
    
    # Encabezado
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "TextoGrande", "argumentos": []})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["TICKET DE VENTA"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "TextoNormal", "argumentos": []})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Fecha y hora
    ahora = datetime.now(ZONA_HORARIA)
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [0]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Fecha: {ahora.strftime('%d/%m/%Y %H:%M')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Línea separadora
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Datos del cliente
    if venta_data.get('client_name'):
        operaciones.append({"nombre": "Negrita", "argumentos": [True]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": ["Cliente:"]})
        operaciones.append({"nombre": "Negrita", "argumentos": [False]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [venta_data['client_name']]})
        operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Productos
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["Productos:"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    for item in venta_data['items']:
        texto = f"{item['cantidad']}x {item['nombre']}"
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [texto]})
        operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [2]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [format_currency(item['subtotal'])]})
        operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [0]})
        operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Total
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [2]})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"TOTAL: {format_currency(venta_data['total'])}"]})  
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    # Pie de página
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["¡Gracias por su compra!"]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    return operaciones

def generar_ticket_reparacion(repair_data):
    """Genera las operaciones para un ticket de reparación"""
    operaciones = []
    
    # Encabezado
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "TextoGrande", "argumentos": []})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["ORDEN DE REPARACIÓN"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "TextoNormal", "argumentos": []})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Número de orden
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [0]})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"N° ORDEN: {repair_data['id']}"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Fecha
    ahora = datetime.now(ZONA_HORARIA)
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Fecha: {ahora.strftime('%d/%m/%Y %H:%M')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Línea separadora
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Datos del cliente
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["DATOS DEL CLIENTE:"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Nombre: {repair_data['client_name']}"]})
    if repair_data.get('number_phone'):
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Teléfono: {repair_data['number_phone']}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Datos del equipo
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["DATOS DEL EQUIPO:"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Dispositivo: {repair_data['device']}"]})
    if repair_data.get('model'):
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Modelo: {repair_data['model']}"]})
    if repair_data.get('imei'):
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"IMEI: {repair_data['imei']}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Fallas reportadas
    if repair_data.get('faults'):
        operaciones.append({"nombre": "Negrita", "argumentos": [True]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": ["FALLAS REPORTADAS:"]})
        operaciones.append({"nombre": "Negrita", "argumentos": [False]})
        if isinstance(repair_data['faults'], list):
            for fault in repair_data['faults']:
                operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"- {fault}"]})
        else:
            operaciones.append({"nombre": "EscribirTexto", "argumentos": [repair_data['faults']]})
        operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Detalles adicionales
    if repair_data.get('detail'):
        operaciones.append({"nombre": "Negrita", "argumentos": [True]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": ["DETALLES ADICIONALES:"]})
        operaciones.append({"nombre": "Negrita", "argumentos": [False]})
        operaciones.append({"nombre": "EscribirTexto", "argumentos": [repair_data['detail']]})
        operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Información de pago
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"PRESUPUESTO: {format_currency(repair_data['price'])}"]}) 
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    # Pie de página
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["Presente este ticket para reclamar su equipo"]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    return operaciones

def generar_ticket_pago(repair_data):
    """Genera las operaciones para un ticket de pago de reparación"""
    operaciones = []
    
    # Encabezado
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "TextoGrande", "argumentos": []})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["COMPROBANTE DE PAGO"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "TextoNormal", "argumentos": []})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Fecha y orden
    ahora = datetime.now(ZONA_HORARIA)
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [0]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Orden N°: {repair_data['id']}"]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Fecha: {ahora.strftime('%d/%m/%Y %H:%M')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Datos
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Cliente: {repair_data['client_name']}"]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Equipo: {repair_data['device']} {repair_data.get('model', '')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Monto
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [2]})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "TextoGrande", "argumentos": []})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"TOTAL: {format_currency(repair_data['price'])}"]})  
    operaciones.append({"nombre": "TextoNormal", "argumentos": []})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    # Mensaje
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["¡Gracias por su pago!"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["Su equipo está listo para ser entregado"]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    return operaciones

def generar_ticket_entrega(entrega_data):
    """Genera las operaciones para un ticket de entrega"""
    operaciones = []
    
    # Encabezado
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "TextoGrande", "argumentos": []})
    operaciones.append({"nombre": "Negrita", "argumentos": [True]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["COMPROBANTE DE ENTREGA"]})
    operaciones.append({"nombre": "Negrita", "argumentos": [False]})
    operaciones.append({"nombre": "TextoNormal", "argumentos": []})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Fecha y orden
    ahora = datetime.now(ZONA_HORARIA)
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [0]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Orden N°: {entrega_data['id']}"]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Fecha: {ahora.strftime('%d/%m/%Y %H:%M')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Datos
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Cliente: {entrega_data['client_name']}"]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": [f"Equipo: {entrega_data['device']} {entrega_data.get('model', '')}"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["-" * 32]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    
    # Mensaje
    operaciones.append({"nombre": "EstablecerAlineacion", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["¡Equipo entregado!"]})
    operaciones.append({"nombre": "Feed", "argumentos": [1]})
    operaciones.append({"nombre": "EscribirTexto", "argumentos": ["Gracias por confiar en nosotros"]})
    operaciones.append({"nombre": "Feed", "argumentos": [2]})
    
    return operaciones

# ============ MANEJADORES DE COMANDOS ============
async def agregar_usuario_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Agrega un usuario autorizado (solo admin)"""
    user_id = update.effective_user.id
    admin_id = int(os.getenv('ADMIN_USER_ID', 0))
    
    if user_id != admin_id:
        await update.message.reply_text("❌ Solo el administrador puede agregar usuarios.")
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("Uso: /agregar_usuario <ID_usuario>")
        return
    
    try:
        target_user_id = int(context.args[0])
        success = api_client.register_user(target_user_id)
        
        if success:
            await update.message.reply_text(f"✅ Usuario {target_user_id} registrado exitosamente")
        else:
            await update.message.reply_text(f"❌ Error al registrar usuario {target_user_id}")
    except ValueError:
        await update.message.reply_text("❌ ID de usuario inválido")

async def lista_usuarios_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lista los usuarios autorizados (solo admin)"""
    user_id = update.effective_user.id
    admin_id = int(os.getenv('ADMIN_USER_ID', 0))
    
    if user_id != admin_id:
        await update.message.reply_text("❌ Solo el administrador puede ver la lista de usuarios.")
        return
    
    users = api_client.list_registered_users()
    
    if not users:
        await update.message.reply_text("📋 No hay usuarios registrados aún.")
        return
    
    mensaje = "👥 **USUARIOS REGISTRADOS**\n\n"
    for i, user in enumerate(users, 1):
        mensaje += f"{i}. {user}\n"
    
    await update.message.reply_text(mensaje)

async def eliminar_usuario_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Elimina un usuario autorizado (solo admin)"""
    user_id = update.effective_user.id
    admin_id = int(os.getenv('ADMIN_USER_ID', 0))
    
    if user_id != admin_id:
        await update.message.reply_text("❌ Solo el administrador puede eliminar usuarios.")
        return
    
    # Nota: La gestión de usuarios se realiza solo a través del backend
    await update.message.reply_text("ℹ️ Los usuarios autorizados se gestionan a través del sistema principal. Esto será implementado en futuras versiones.")

async def start_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /start - Menú principal"""
    keyboard = [
        [InlineKeyboardButton("📦 Productos", callback_data="menu_productos")],
        [InlineKeyboardButton("🔧 Reparaciones", callback_data="menu_reparaciones")],
        [InlineKeyboardButton("💰 Ventas", callback_data="menu_ventas")],
        [InlineKeyboardButton("📈 Estadísticas", callback_data="menu_estadisticas")],
        [InlineKeyboardButton("🖨️ Probar impresora", callback_data="test_printer")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🏪 *Sistema de Gestión de Inventario y Reparaciones* 🏪\n\n"
        "Bienvenido al sistema. Selecciona una opción para comenzar:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

# ============ PRODUCTOS ============
@require_auth_callback
async def menu_productos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.pop('action', None)
    """Menú de gestión de productos"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("➕ Agregar producto", callback_data="add_product")],
        [InlineKeyboardButton("➕ Agregar categoría", callback_data="add_category")],
        [InlineKeyboardButton("📋 Listar productos", callback_data="list_products")],
        [InlineKeyboardButton("📦 Actualizar stock", callback_data="update_stock")],
        [InlineKeyboardButton("◀️ Volver", callback_data="back_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "📦 *Gestión de Productos*\n\n"
        "Selecciona una opción:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

@require_auth_callback
async def list_products(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lista todos los productos activos"""
    query = update.callback_query
    await query.answer()
    
    products = api_client.get_products()
    
    if not products:
        text = "📦 *No hay productos registrados*"
    else:
        text = "📦 *Lista de Productos*\n\n"
        current_category = None
        for product in products:
            # Validar que product sea un diccionario
            if not isinstance(product, dict):
                logger.warning(f"Producto no es un diccionario: {type(product)} - {product}")
                continue
            
            category = product.get('category', 'Sin categoría')
            if category != current_category:
                current_category = category
                text += f"\n*📁 {current_category}:*\n"
            
            name = product.get('name', 'Sin nombre')
            stock = product.get('stock', 0)
            price = product.get('price', 0)
            product_id = product.get('id', 'N/A')
            
            text += f"• *{name}* - Stock: {stock} - {format_currency(price)} (ID: {product_id})\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_productos")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def update_stock_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el proceso de actualizar stock"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['action'] = 'update_stock'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "📦 *Actualizar stock*\n\n"
        "Envía el ID del producto y el nuevo stock:\n"
        "`ID | Nuevo Stock`\n\n"
        "Ejemplo:\n"
        "`1 | 25`\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_update_stock(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la actualización de stock"""
    if context.user_data.get('action') != 'update_stock':
        return
    
    try:
        text = update.message.text.strip()
        parts = text.split('|')
        
        if len(parts) != 2:
            await update.message.reply_text("❌ Formato incorrecto. Usa: ID | Nuevo Stock")
            return
        
        product_id = int(parts[0].strip())
        new_stock = int(parts[1].strip())
        
        if new_stock < 0:
            await update.message.reply_text("❌ El stock no puede ser negativo")
            return
        
        # Actualizar stock a través del API
        result = api_client.update_product_stock(product_id, new_stock)
        
        if result:
            product_name = result.get('name', f'Producto {product_id}')
            await update.message.reply_text(
                f"✅ *Stock actualizado!*\n\n"
                f"📦 *Producto:* {product_name}\n"
                f"📊 *Nuevo stock:* {new_stock}",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Producto no encontrado o error al actualizar stock")
        
    except ValueError:
        await update.message.reply_text("❌ ID o stock inválido. Deben ser números.")
    except Exception as e:
        logger.error(f"Error en handle_update_stock: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        context.user_data.pop('action', None)

# funciones para ver repuestos usados
async def view_spare_parts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra los repuestos usados en una reparación"""
    query = update.callback_query
    await query.answer()
    
    # Limpiar acciones previas para evitar conflictos
    context.user_data.pop('adding_spare_part', None)
    context.user_data.pop('adding_spare_parts', None)
    context.user_data.pop('current_repair_id', None)
    
    context.user_data['action'] = 'view_spare_parts'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🔩 *Ver repuestos usados*\n\n"
        "Envía el ID de la reparación para ver los repuestos utilizados:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_view_spare_parts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la visualización de repuestos"""
    if context.user_data.get('action') != 'view_spare_parts':
        return
    
    try:
        repair_id = safe_int_convert(update.message.text)
        if repair_id is None:
            await update.message.reply_text("❌ ID inválido. Envía un número válido")
            return
        
        # Obtener información de la reparación del API
        repair = await fetch_device(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        # Validar que repair sea un diccionario
        if not isinstance(repair, dict):
            logger.error(f"repair no es un diccionario: {type(repair)} - {repair}")
            await update.message.reply_text("❌ Error al obtener datos de la reparación")
            return
        
        # Obtener repuestos (si el backend lo soporta)
        faults = repair.get("faults")
        
        if not faults:
            text = f"🔧 *Reparación #{repair.get('id', 'N/A')}*\n\n"
            text += f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            text += f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            text += f"📊 *Estado:* {repair.get('repair_status', 'N/A')}\n\n"
            text += f" *Esta entregado:* {'✅ Sí' if repair.get('output_status', False) else '❌ No'}\n\n"
            text += "🔩 *No se han registrado repuestos para esta reparación*"
        else:
            # Validar que spare_parts sea una lista
            if not isinstance(faults, list):
                logger.error(f"fauls no es una lista: {type(faults)} - {faults}")
                await update.message.reply_text("❌ Error al obtener repuestos")
                return
            
            total_repuestos = 0
            for fault in faults:
                if isinstance(fault, dict):
                    price = fault.get('price', 0)
                    # Convert string price to float
                    if isinstance(price, str):
                        try:
                            price = float(price)
                        except (ValueError, TypeError):
                            price = 0
                    total_repuestos += price
            
            text = f"🔧 *Reparación #{repair_id}*\n\n"
            text += f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            text += f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            text += f"📊 *Estado:* {repair.get('repair_status', 'N/A')}\n\n"
            text += f" *Esta entregado:* {'✅ Sí' if repair.get('output_status', False) else '❌ No'}\n\n"
            text += "🔩 *Repuestos utilizados:*\n"
            
            for fault in faults:
                if not isinstance(fault, dict):
                    logger.warning(f"Repuesto no es diccionario: {type(fault)} - {fault}")
                    continue
                    
                quantity = fault.get('quantity', 1)
                product_name = fault.get('name', 'Sin nombre')
                total_price = fault.get('price', 0)
                text += f"• {quantity}x {product_name}\n"
                text += f"  💰 {format_currency(total_price)}\n\n"
            
            text += f"*Total repuestos: {format_currency(total_repuestos)}*"
        
        keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_reparaciones")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            text,
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
        context.user_data.pop('action', None)
        
    except Exception as e:
        logger.error(f"Error en handle_view_spare_parts: {e}")
        await update.message.reply_text(f"❌ Error: {e}")

# ============ REPARACIONES ============
@require_auth_callback
async def menu_reparaciones(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.pop('action', None)
    """Menú de gestión de reparaciones"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("➕ Registrar reparación", callback_data="add_repair")],
        [InlineKeyboardButton("📋 Listar reparaciones", callback_data="list_repairs")],
        [InlineKeyboardButton("🔧 Actualizar estado", callback_data="update_repair_status")],
        [InlineKeyboardButton("💰 Registrar pago", callback_data="register_payment")],
        [InlineKeyboardButton("📦 Registrar entrega", callback_data="register_delivery")],
        [InlineKeyboardButton("🔩 Ver repuestos usados", callback_data="view_spare_parts")],
        [InlineKeyboardButton("🖨️ Imprimir ticket", callback_data="print_repair_ticket")],
        [InlineKeyboardButton("◀️ Volver", callback_data="back_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🔧 *Gestión de Reparaciones*\n\n"
        "Selecciona una opción:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

@require_auth_callback
async def list_repairs(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lista todas las reparaciones activas"""
    query = update.callback_query
    await query.answer()
    
    # Obtener reparaciones del API
    repairs = api_client.get_devices()
    
    if not repairs:
        text = "🔧 *No hay reparaciones registradas*"
    else:
        text = "🔧 *Reparaciones recientes*\n\n"
        # Limitar a 20 reparaciones recientes
        repairs = repairs[:20]
        
        for repair in repairs:
            status_emoji = {
                'En Revisión': '🔍',
                'En Reparación': '⚙️',
                'Reparado': '✅',
                'Sin Solución': '❌'
            }.get(repair.get('repair_status', ''), '⚙️')
            
            pay_status = "💸 Pendiente" if not repair.get('pay', False) else "💰 Pagado"
            delivered_status = "📦 No entregado" if not repair.get('delivered', False) else "✅ Entregado"
            
            repair_id = repair.get('id', 'N/A')
            client_name = repair.get('client_name', 'Sin nombre')
            device = repair.get('device', 'N/A')
            model = repair.get('model', '')
            price = repair.get('price', 0)
            repair_status = repair.get('repair_status', 'N/A')
            entry_date = repair.get('entry_date', '')[:16]
            
            text += f"{status_emoji} *ID {repair_id}*\n"
            text += f"👤 {client_name} - {device} {model}\n"
            text += f"💰 {format_currency(price)} - {pay_status}\n"
            text += f"📊 {repair_status} | {delivered_status}\n"
            text += f"📅 {entry_date}\n\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_reparaciones")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def update_repair_status_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la actualización de estado de reparación"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['action'] = 'update_repair_status'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🔧 *Actualizar estado de reparación*\n\n"
        "Envía el ID de la reparación:\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_update_repair_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la actualización de estado"""
    if context.user_data.get('action') != 'update_repair_status':
        return
    
    try:
        if not update.message:
            return
            
        message_text = update.message.text.strip()
        
        if not message_text:
            await update.message.reply_text("❌ Por favor, envía un ID de reparación válido.")
            return
        
        if not message_text.isdigit():
            await update.message.reply_text("❌ ID inválido. Debe ser un número.")
            return
        
        repair_id = int(message_text)
        
        # Obtener reparación del API
        repair = await fetch_device(repair_id)
        
        if not repair:
            await update.message.reply_text(f"❌ Reparación con ID {repair_id} no encontrada")
            return
        
        current_status = repair.get('repair_status', '')
        
        # Definir opciones de estado con emojis
        status_options = {
            "Reparado": "✅",
            "Sin Solución": "❌",
            "En Revisión": "🔍"
        }
        
        # Crear teclado dinámico
        keyboard = []
        for status, emoji in status_options.items():
            if status == current_status:
                keyboard.append([InlineKeyboardButton(
                    f"{emoji} ✓ {status} (Actual)", 
                    callback_data="disabled"
                )])
            else:
                status_for_callback = status.replace(' ', '_')
                keyboard.append([InlineKeyboardButton(
                    f"{emoji} {status}", 
                    callback_data=f"set_status_{repair_id}_{status_for_callback}"
                )])
        
        keyboard.append([InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"🔧 *Reparación ID: {repair_id}*\n"
            f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            f"📊 *Estado actual:* {current_status}\n\n"
            "🔄 Selecciona el nuevo estado:",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
    except Exception as e:
        logger.error(f"Error en handle_update_repair_status: {e}", exc_info=True)
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        context.user_data.pop('action', None)

async def handle_set_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la selección de estado de reparación"""
    query = update.callback_query
    
    # Verificar que el callback_data tenga el formato correcto
    if not query.data.startswith('set_status_'):
        await query.answer("Opción no válida")
        return
    
    await query.answer()
    
    try:
        # Dividir el callback_data: "set_status_123_Reparado"
        parts = query.data.split('_')
        
        # Verificar que tengamos al menos 4 partes
        if len(parts) < 4:
            logger.error(f"Formato inválido en callback_data: {query.data}")
            await query.edit_message_text("❌ Formato de datos inválido")
            return
        
        repair_id = int(parts[2])
        new_status = '_'.join(parts[3:]).replace('_', ' ')  # Convertir back a estado con espacios
        
        # Actualizar estado a través del API
        result = api_client.update_device_status(repair_id, new_status)
        
        if result:
            await query.edit_message_text(
                f"✅ *Estado actualizado!*\n\n"
                f"🆔 *ID:* {repair_id}\n"
                f"👤 *Cliente:* {result.get('client_name', 'N/A')}\n"
                f"📱 *Dispositivo:* {result.get('device', 'N/A')}\n"
                f"🔧 *Nuevo estado:* {new_status}",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(f"❌ Error al actualizar el estado")
        
    except ValueError as e:
        logger.error(f"Error de conversión en handle_set_status: {e}")
        await query.edit_message_text("❌ Error: ID de reparación inválido")
    except Exception as e:
        logger.error(f"Error en handle_set_status: {e}", exc_info=True)
        await query.edit_message_text(f"❌ Error al actualizar estado: {str(e)}")

async def print_repair_ticket_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la impresión de ticket de reparación"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['action'] = 'print_repair_ticket'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🖨️ *Imprimir ticket de reparación*\n\n"
        "Envía el ID de la reparación:\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_print_repair_ticket(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la impresión de ticket de reparación"""
    if context.user_data.get('action') != 'print_repair_ticket':
        return
    
    try:
        if not update.message or not update.message.text:
            return
            
        raw_id = update.message.text.strip()
        repair_id = safe_int_convert(raw_id)
        
        if repair_id is None:
            await update.message.reply_text("⚠️ Por favor, envía solo el número de la orden (ej: 105).")
            return
        
        # Obtener reparación del API
        repair = await fetch_device(repair_id)
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        repair_data = {
            'id': repair['id'],
            'client_name': repair.get('client_name', 'N/A'),
            'number_phone': repair.get('number_phone'),
            'device': repair.get('device', 'N/A'),
            'model': repair.get('model', ''),
            'price': repair.get('price', 0),
            'detail': repair.get('detail', ''),
            'faults': repair.get('faults', []) or [],
            'imei': repair.get('imei', ''),
            'repair_status': repair.get('repair_status', 'N/A')
        }
        
        operaciones = generar_ticket_reparacion(repair_data)
        success, message = enviar_a_impresora(operaciones)
        
        await update.message.reply_text(
            f"🖨️ *Ticket de reparación*\n\n"
            f"🆔 *ID:* {repair_id}\n"
            f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            f"{message}",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"Error en handle_print_repair_ticket: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        context.user_data.pop('action', None)

async def register_payment_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de pago"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['action'] = 'register_payment'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "💰 *Registrar pago de reparación*\n\n"
        "Envía el ID de la reparación:\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_register_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja el registro de pago"""
    if context.user_data.get('action') != 'register_payment':
        return
    
    try:
        repair_id = safe_int_convert(update.message.text)
        if repair_id is None:
            await update.message.reply_text("❌ ID inválido. Envía un número válido")
            return
        
        # Obtener reparación del API
        repair = await fetch_device(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        # Verificar si ya está pagado
        if repair.get('pay', False):
            await update.message.reply_text(
                f"⚠️ *Pago ya registrado*\n\n"
                f"Esta reparación ya fue pagada anteriormente.\n"
                f"💰 Monto: {format_currency(repair.get('price', 0))}",
                parse_mode='Markdown'
            )
            return
        
        if repair.get('repair_status') != 'Reparado':
            await update.message.reply_text(
                f"⚠️ *No se puede registrar el pago*\n\n"
                f"El equipo está en estado: {repair.get('repair_status', 'N/A')}\n"
                f"Para poder pagar, el estado debe ser 'Reparado'",
                parse_mode='Markdown'
            )
            return
        
        if float(repair.get('price', 0)) <= 0:
            await update.message.reply_text("❌ El precio de la reparación no es válido")
            return
        
        # Registrar pago a través del API
        result = api_client.register_payment(repair_id)
        
        if result:
            # Preparar datos para ticket de pago
            payment_data = {
                'id': result.get('id'),
                'client_name': result.get('client_name'),
                'device': result.get('device'),
                'model': result.get('model'),
                'price': result.get('price')
            }
            
            # Imprimir ticket de pago
            operaciones = generar_ticket_pago(payment_data)
            success, message = enviar_a_impresora(operaciones)
            
            await update.message.reply_text(
                f"✅ *Pago registrado exitosamente!*\n\n"
                f"🆔 Orden N°: {result.get('id')}\n"
                f"👤 Cliente: {result.get('client_name')}\n"
                f"💰 Monto: {format_currency(result.get('price', 0))}\n"
                f"{message}",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Error al registrar el pago")
        
    except ValueError:
        await update.message.reply_text("❌ ID inválido. Envía un número válido")
    except Exception as e:
        logger.error(f"Error en handle_register_payment: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        context.user_data.pop('action', None)

# ============ REGISTRO DE PRODUCTOS CON CONVERSACIÓN ============
@require_auth_callback
async def add_product_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de un producto con preguntas (para callback y comando)"""
    is_callback = hasattr(update, 'callback_query') and update.callback_query is not None
    
    text = "➕ *Registrar nuevo producto*\n\n"
    
    if is_callback:
        text += "Por favor, **responde a este mensaje** con el nombre del producto.\n\n"
    
    text += "📝 *¿Cuál es el nombre del producto?*\n\n"
    text += "Ejemplo: *Smartphone Samsung Galaxy A52*\n\n"
    
    if is_callback:
        text += "💡 **Importante:** Envía un mensaje de texto con el nombre, no presiones botones.\n\n"
    
    text += "Para cancelar, usa /cancelar"
    
    if is_callback:
        query = update.callback_query
        await query.answer()
        await query.edit_message_text(text, parse_mode='Markdown')
    else:
        await update.message.reply_text(text, parse_mode='Markdown')
    
    return ADD_PRODUCT_NAME

@require_auth_callback
async def add_product_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el nombre del producto y muestra opciones de categorías"""
    context.user_data['product_name'] = update.message.text
    # Obtener categorías de la base de datos
    categories = api_client.get_categories()
    if not categories:
        logger.warning("No hay categorías disponibles") 
        await update.message.reply_text(
            "❌ No hay categorías disponibles en la base de datos.\n"
            "Por favor, ingresa la categoría manualmente:\n\n"
            "Ejemplo: *Electrónica*, *Repuestos*, *Accesorios*",
            parse_mode='Markdown'
        )
        return ADD_PRODUCT_CATEGORY
    
    # Crear botones para cada categoría
    keyboard = []
    for category in categories:
        category_name = category.get('name', category) if isinstance(category, dict) else str(category)
        keyboard.append([
            InlineKeyboardButton(category_name, callback_data=f"category_{category_name.lower()}")
        ])
    
    # Agregar botón para nueva categoría
    keyboard.append([InlineKeyboardButton("➕ Agregar nueva categoría", callback_data="add_new_category")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "📁 *¿Cuál es la categoría del producto?*\n\n"
        "Selecciona una de las opciones disponibles:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )
    return ADD_PRODUCT_SELECT_CATEGORY

@require_auth_callback
async def add_new_category_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la adición de una nueva categoría para el producto"""
    query = update.callback_query
    await query.answer()
    
    try:
        await query.edit_message_text(
            "➕ *Agregar nueva categoría para el producto*\n\n"
            "Ingresa el nombre de la nueva categoría:\n\n"
            "Ejemplo: *Accesorios de Telefonía*, *Repuestos*\n\n"
            "Para cancelar, usa /cancelar",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error en add_new_category_start: {e}")
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text="➕ *Agregar nueva categoría*\n\nIngresa el nombre de la nueva categoría:\n\nEjemplo: *Accesorios de Telefonía*, *Repuestos*\n\nPara cancelar, usa /cancelar",
            parse_mode='Markdown'
        )
    return ADD_PRODUCT_CATEGORY

@require_auth_callback
async def category_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la selección de categoría desde los botones"""
    query = update.callback_query
    await query.answer()
    
    try:
        # Extraer la categoría del callback_data
        # El callback_data tiene formato: category_nombredelacategoria
        category_name = query.data.replace("category_", "")
        # Asegurar que no tenga espacios al inicio/final
        category_name = category_name.strip()
        context.user_data['product_category'] = category_name
        
        await query.edit_message_text(
            f"✅ Categoría seleccionada: *{category_name.title()}*\n\n"
            "📊 *¿Cuál es el stock inicial?*\n\n"
            "Ingresa SOLO números enteros positivos (ejemplo: 10)",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error en category_selected: {e}")
        await query.edit_message_text(
            "❌ Error al seleccionar categoría. Intenta de nuevo.\n\n"
            "Por favor, escribe el nombre de la categoría manualmente:"
        )
        return ADD_PRODUCT_CATEGORY
    return ADD_PRODUCT_STOCK
@require_auth_callback
async def add_product_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe la categoría del producto (fallback si no se selecciona desde botones)"""

    try:
        context.user_data['product_category'] = update.message.text
        
        await update.message.reply_text(
            "📊 *¿Cuál es el stock inicial?*\n\n"
            "Ingresa SOLO números enteros positivos (ejemplo: 10)",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error en add_product_category: {e}")
        await update.message.reply_text("❌ Error al procesar la categoría.")
        return ConversationHandler.END
    return ADD_PRODUCT_STOCK

async def add_product_stock(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el stock del producto"""
  
    try:
        stock = int(update.message.text)
        if stock < 0:
            await update.message.reply_text("❌ El stock no puede ser negativo. Intenta de nuevo:")
            return ADD_PRODUCT_STOCK
        
        context.user_data['product_stock'] = stock
        
        await update.message.reply_text(
            "💰 *¿Cuál es el precio del producto?*\n\n"
            "Ingresa solo el número (ejemplo: *50000* para $50,000)",
            parse_mode='Markdown'
        )
        return ADD_PRODUCT_PRICE
    except ValueError:
        await update.message.reply_text("❌ El stock debe ser un número entero positivo. Ejemplo: 10")
        return ADD_PRODUCT_STOCK

async def add_product_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el precio y guarda el producto"""
 
    try:
        price = float(update.message.text)
        if price <= 0:
            await update.message.reply_text("❌ El precio debe ser mayor a cero. Intenta de nuevo:")
            return ADD_PRODUCT_PRICE
        
        # Crear producto a través del API
        product = api_client.create_product(
            name=context.user_data['product_name'],
            category=context.user_data['product_category'].lower(),
            stock=context.user_data['product_stock'],
            price=price
        )
        
        if product:
            product_id = product.get('id', 'N/A')
            await update.message.reply_text(
                f"✅ *Producto agregado exitosamente!*\n\n"
                f"📦 *Nombre:* {context.user_data['product_name']}\n"
                f"📁 *Categoría:* {context.user_data['product_category']}\n"
                f"📊 *Stock:* {context.user_data['product_stock']}\n"
                f"💰 *Precio:* {format_currency(price)}\n"
                f"🆔 *ID:* {product_id}",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("❌ Error al guardar el producto. Intenta de nuevo.")
            return ADD_PRODUCT_PRICE
        
        # Limpiar datos de usuario
        context.user_data.clear()
        
        # Volver al menú de productos
        keyboard = [[InlineKeyboardButton("◀️ Volver al menú", callback_data="menu_productos")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "¿Qué deseas hacer ahora?",
            reply_markup=reply_markup
        )
        
        return ConversationHandler.END
        
    except ValueError:
        await update.message.reply_text("❌ Por favor, ingresa un número válido para el precio:")
        return ADD_PRODUCT_PRICE
    except Exception as e:
        logger.error(f"Error en add_product_price: {e}")
        await update.message.reply_text(f"❌ Error al guardar: {e}")
        return ConversationHandler.END

# ============ REGISTRO DE REPARACIONES CON CONVERSACIÓN ============
@require_auth_callback
async def add_repair_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de una reparación con preguntas"""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "🔧 *Registrar nueva reparación*\n\n"
        "Por favor, responde las siguientes preguntas.\n\n"
        "👤 *¿Nombre del cliente?*\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_CLIENT

async def add_repair_client(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el nombre del cliente"""
    
    client_name = update.message.text.strip()

    if not client_name:
        await update.message.reply_text(
            "❌ El nombre del cliente no puede quedar vacío.\n\n"
            "Por favor, ingresa el nombre completo del cliente:"
        )
        return ADD_REPAIR_CLIENT

    if len(client_name) < 3:
        await update.message.reply_text(
            "❌ El nombre del cliente debe tener al menos 3 caracteres.\n\n"
            "Por favor, ingresa un nombre más completo:"
        )
        return ADD_REPAIR_CLIENT

    context.user_data['repair_client'] = client_name

    await update.message.reply_text(
        "📞 *¿Teléfono del cliente?* (opcional)\n\n"
        "Puedes enviar 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_PHONE

async def add_repair_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe el teléfono del cliente"""
    phone = update.message.text.strip()
    
    if phone.lower() == 'ninguno':
        context.user_data['repair_phone'] = ""
    else:
        # Validar teléfono: debe tener al menos 7 dígitos y máximo 15
        phone_digits = ''.join(c for c in phone if c.isdigit())
        
        if len(phone_digits) == 10:
            context.user_data['repair_phone'] = phone_digits
        else:
            await update.message.reply_text(
                "❌ El número de teléfono debe tener 10 dígitos.\n\n"
                "Ejemplos válidos:\n"
                "• 3001234567 (10 dígitos)\n"
                "Intenta de nuevo o envía 'ninguno' para omitir:"
            )
            return ADD_REPAIR_PHONE
        
        if len(phone_digits) > 10:
            await update.message.reply_text(
                "❌ El número de teléfono es muy largo (máximo 10 dígitos).\n\n"
                "Ejemplos válidos:\n"
                "• 3001234567 (10 dígitos)\n"
                "Intenta de nuevo o envía 'ninguno' para omitir:"
            )
            return ADD_REPAIR_PHONE
        
        # Si tiene exactamente 10 dígitos, guardarlo tal cual
        if len(phone_digits) == 10:
            context.user_data['repair_phone'] = phone_digits
    
    await update.message.reply_text(
        "📱 *¿Qué dispositivo trae a reparar?*\n\n"
        "Ejemplo: *Redmi Note 11*, *iPhone 12*, *Galaxy S23*",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_DEVICE

async def add_repair_device(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe el modelo del dispositivo"""
    context.user_data['repair_device'] = update.message.text
    
    buttons = []
    for brand in BRANDS_DEVICES:
        buttons.append([InlineKeyboardButton(brand['name'], callback_data=f"brand_{brand['id']}")])

    buttons.append([InlineKeyboardButton("📝 Ingresar marca manualmente", callback_data="brand_manual")])

    await update.message.reply_text(
        "🏷️ *¿Marca del dispositivo?*\n\n"
        "Selecciona una opción de la lista o ingresa el nombre manualmente",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup(buttons)
    )
    return ADD_REPAIR_MODEL

async def add_repair_model(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe el nombre de marca/manual si el usuario escribe texto"""
    model = update.message.text.strip()

    if model.lower() == 'ninguno':
        context.user_data['repair_model'] = None
    elif model:
        context.user_data['repair_model'] = model
    else:
        # Si el usuario no escribe texto (por algún motivo), se mantiene el valor previo y sigue
        context.user_data['repair_model'] = context.user_data.get('repair_model')

    await update.message.reply_text(
        "🔢 *¿IMEI del dispositivo?* (opcional, 15 dígitos)\n\n"
        "Ejemplo: *123456789012345*\n"
        "Envía 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_IMEI

async def add_repair_imei(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe el IMEI del dispositivo y pide buscar fallas/repuestos."""
    imei = update.message.text
    if imei.lower() == 'ninguno':
        context.user_data['repair_imei'] = None
    else:
        if len(imei) != 15 or not imei.isdigit():
            await update.message.reply_text(
                "❌ IMEI inválido. Debe tener 15 dígitos numéricos.\n"
                "Intenta de nuevo o envía 'ninguno' para omitir:"
            )
            return ADD_REPAIR_IMEI
        context.user_data['repair_imei'] = imei

    context.user_data['repair_faults'] = []

    await update.message.reply_text(
        "🔧 *Buscar fallas o repuestos*\n\n"
        "Escribe un término para buscar (ejemplo: display, botón, cámara).\n"
        "También puedes escribir 'ninguno' para continuar sin fallas/repuestos.",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_FAULTS


async def add_repair_faults(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe las fallas/repuestos y permite selección interactiva con búsqueda."""
    try:
        faults_text = update.message.text.strip()

        if not faults_text:
            await update.message.reply_text("❌ Por favor, ingresa un término de búsqueda o escribe 'ninguno'.")
            return ADD_REPAIR_FAULTS

        # Omitir fallas/repuestos y continuar
        if faults_text.lower() in ['ninguno', 'sin', 'none', 'no']:
            context.user_data['repair_faults'] = context.user_data.get('repair_faults', [])
            await update.message.reply_text(
                "📝 Se omiten fallas/repuestos.\n\n"
                "💬 *¿Detalles adicionales?* (opcional)\n"
                "Envía 'ninguno' para omitir.",
                parse_mode='Markdown'
            )
            return ADD_REPAIR_DETAIL

        # Terminar selección de fallas si ya hay algunas añadidas
        if faults_text.lower() in ['finalizar', 'terminar', 'listo']:
            if not context.user_data.get('repair_faults'):
                await update.message.reply_text("❌ No has seleccionado ninguna falla/repuesto aún.")
                return ADD_REPAIR_FAULTS
            return await finish_faults_handler(update, context)

        # Búsqueda por texto
        results = api_client.get_faults(faults_text)
        if not results:
            await update.message.reply_text(
                f"❌ No se encontraron repuestos para '{faults_text}'. Prueba con otra palabra clave o ingresa IDs separados por coma." )
            return ADD_REPAIR_FAULTS

        buttons = []
        for fault in results[:8]:
            fault_id = fault.get('id')
            fault_name = fault.get('name', 'Sin nombre')
            fault_price = fault.get('price', 0)
            buttons.append([
                InlineKeyboardButton(
                    f"{fault_name} ({format_currency(fault_price)})",
                    callback_data=f"select_fault_{fault_id}"
                )
            ])

        buttons.append([InlineKeyboardButton("🔎 Buscar otra vez", callback_data="search_faults")])
        buttons.append([InlineKeyboardButton("✅ Terminar selección", callback_data="finish_faults")])

        await update.message.reply_text(
            f"🔎 Se encontraron {len(results)} repuestos.",
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup(buttons)
        )
        return ADD_REPAIR_FAULTS

    except Exception as e:
        logger.error(f"Error en add_repair_faults: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
        return ADD_REPAIR_FAULTS


async def select_repair_fault(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback para seleccionar una falla/repuesto del botón."""
    query = update.callback_query
    
    try:
        await query.answer()
        
        # Extraer ID de callback_data: "select_fault_123"
        callback_data = query.data
        fault_id = int(callback_data.split('_')[-1])
        
        # Obtener producto completo
        item = api_client.get_product_by_id(fault_id)
        if not item:
            await query.answer("❌ No se encontró el repuesto.", show_alert=True)
            return ADD_REPAIR_FAULTS
        
        # Agregar a la lista si no existe
        selected = context.user_data.get('repair_faults', [])
        existing = next((f for f in selected if f.get('id') == fault_id), None)
        
        if existing:
            await query.answer("⚠️ Este repuesto ya está seleccionado.", show_alert=True)
            return ADD_REPAIR_FAULTS
        
        # Convertir precio a float para evitar issues con sumas
        price = item.get('price', 0)
        if isinstance(price, str):
            try:
                price = float(price)
            except (ValueError, TypeError):
                price = 0
        
        selected.append({
            'id': fault_id,
            'name': item.get('name', 'Sin nombre'),
            'price': price
        })
        context.user_data['repair_faults'] = selected
        
        # Mostrar lista actualizada
        selected_names = '\n'.join([f"✅ {f.get('name', 'N/A')} ({format_currency(f.get('price', 0))}) - ID {f.get('id')}" for f in selected]) or 'Ninguno'
        
        buttons = [
            [InlineKeyboardButton("🔎 Buscar más", callback_data="search_faults")],
            [InlineKeyboardButton("✅ Finalizar", callback_data="finish_faults")],
            [InlineKeyboardButton("📝 Ingresar IDs manualmente", callback_data="manual_faults")]
        ]
        
        message_text = (
            f"✅ *Repuesto agregado.*\n\n"
            f"📋 *Seleccionados ({len(selected)}):*\n"
            f"{selected_names}\n\n"
            "_¿Qué deseas hacer?_"
        )
        
        await query.edit_message_text(message_text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(buttons))
        
    except Exception as e:
        logger.error(f"Error en select_repair_fault: {e}")
        try:
            await query.answer(f"❌ Error: {str(e)[:50]}", show_alert=True)
        except:
            pass
    
    return ADD_REPAIR_FAULTS


async def search_repair_fault(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Solicita un término de búsqueda para fallas/repuestos."""
    query = update.callback_query
    
    try:
        await query.answer()
        await query.edit_message_text(
            "🔎 *Ingrese término de búsqueda para repuestos:*\nEjemplo: 'display', 'botón', 'cámara'\n\n"
            "Puedes escribir cuando estés listo para ver resultados:",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error en search_repair_fault: {e}")
        try:
            await query.edit_message_text(f"❌ Error: {str(e)[:100]}")
        except:
            pass
    return ADD_REPAIR_FAULTS


async def select_brand_model(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback que selecciona la marca en el paso de modelo."""
    query = update.callback_query
    
    try:
        await query.answer()

        callback_data = query.data
        if callback_data == 'brand_manual':
            await query.edit_message_text(
                "📝 Ingresa el nombre de la marca/modelo manualmente (ejemplo: Xiaomi):"
            )
            return ADD_REPAIR_MODEL

        try:
            brand_id = int(callback_data.replace('brand_', ''))
        except ValueError:
            await query.edit_message_text('❌ Marca inválida, intenta de nuevo.')
            return ADD_REPAIR_MODEL

        brand = next((b for b in BRANDS_DEVICES if b['id'] == brand_id), None)
        if not brand:
            await query.edit_message_text('❌ Marca no encontrada, intenta de nuevo.')
            return ADD_REPAIR_MODEL

        context.user_data['repair_model'] = brand['name']

        await query.edit_message_text(
            f"✅ Marca seleccionada: *{brand['name']}*\n\n"
            "🔢 *¿IMEI del dispositivo?* (opcional, 15 dígitos)\n\n"
            "Ejemplo: 123456789012345\n"
            "Envía 'ninguno' para omitir:",
            parse_mode='Markdown'
        )

        return ADD_REPAIR_IMEI

    except Exception as e:
        logger.error(f"Error en select_brand_model: {e}")
        try:
            await query.edit_message_text(f"❌ Error: {str(e)[:100]}")
        except:
            pass

        return ADD_REPAIR_MODEL


async def manual_repair_faults(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Solicita ingreso manual de IDs."""
    query = update.callback_query
    
    try:
        await query.answer()
        await query.edit_message_text(
            "✍️ *Modo manual:* Ingresa los IDs de los repuestos separados por coma (ejemplo: 1,2,3).",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error en manual_repair_faults: {e}")
        try:
            await query.edit_message_text(f"❌ Error: {str(e)[:100]}")
        except:
            pass
    
    return ADD_REPAIR_FAULTS


async def finish_faults_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Finaliza selección de fallas y pasa a detalle."""
    try:
        if hasattr(update, 'callback_query') and update.callback_query:
            query = update.callback_query
            await query.answer()
            is_callback = True
        else:
            is_callback = False

        selected = context.user_data.get('repair_faults', [])
        selected_names = ', '.join([f"{f.get('name', 'N/A')} (ID {f.get('id')})" for f in selected]) or 'Ninguno'

        message_text = (
            f"✅ Selección finalizada.\n\n"
            f"🔧 Fallas/Repuestos seleccionados: {selected_names or 'Ninguno'}\n\n"
            "📝 *¿Detalles adicionales?* (opcional)\n"
            "Envía 'ninguno' para omitir."
        )

        if is_callback:
            await update.callback_query.edit_message_text(message_text, parse_mode='Markdown')
        else:
            await update.message.reply_text(message_text, parse_mode='Markdown')
            
    except Exception as e:
        logger.error(f"Error en finish_faults_handler: {e}")
        try:
            if hasattr(update, 'callback_query') and update.callback_query:
                await update.callback_query.edit_message_text(f"❌ Error: {str(e)[:100]}")
        except:
            pass

    return ADD_REPAIR_DETAIL

async def add_repair_detail(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe detalles adicionales"""
    detail = update.message.text
    if detail.lower() == 'ninguno':
        context.user_data['repair_detail'] = None
    else:
        context.user_data['repair_detail'] = detail
    
    # Calcular monto de repuestos seleccionados
    faults = context.user_data.get('repair_faults', [])
    faults_total = sum(float(f.get('price', 0)) if isinstance(f.get('price', 0), (int, float, str)) else 0 for f in faults)
    
    message = "💰 *¿Precio de la mano de obra?*\n\n"
    
    if faults_total > 0:
        message += f"🔧 *Repuestos seleccionados:*\n"
        for fault in faults:
            message += f"• {fault.get('name', 'N/A')}: {format_currency(fault.get('price', 0))}\n"
        message += f"\n*Subtotal repuestos:* {format_currency(faults_total)}\n\n"
    
    message += "Ingresa solo el número (ejemplo: *50000* para $50,000)"
    
    context.user_data['repair_faults_total'] = faults_total
    
    await update.message.reply_text(message, parse_mode='Markdown')
    return ADD_REPAIR_PRICE


async def add_repair_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Recibe el precio de mano de obra y calcula el total con repuestos"""
    try:
        labor_price = float(update.message.text)
        if labor_price < 0:
            await update.message.reply_text("❌ El precio no puede ser negativo. Intenta de nuevo:")
            return ADD_REPAIR_PRICE
        
        # Obtener el total de repuestos y calcular el total
        faults_total = context.user_data.get('repair_faults_total', 0)
        total_price = labor_price + faults_total
        
        context.user_data['repair_labor_price'] = labor_price
        context.user_data['repair_price'] = total_price
        
        # Mostrar desglose
        message = "📊 *Desglose del precio:*\n\n"
        message += f"🔧 *Mano de obra:* {format_currency(labor_price)}\n"
        
        if faults_total > 0:
            faults = context.user_data.get('repair_faults', [])
            message += f"📦 *Repuestos:* {format_currency(faults_total)}\n"
            for fault in faults:
                message += f"  • {fault.get('name', 'N/A')}: {format_currency(fault.get('price', 0))}\n"
        
        message += f"\n{'='*40}\n"
        message += f"💰 *TOTAL:* {format_currency(total_price)}\n"
        message += f"{'='*40}\n\n"
        message += "💳 *¿El cliente pagó la reparación?*\n\n"
        message += "Responde con una opción:\n"
        message += "• *si* - Pagó el monto completo\n"
        message += "• *parcial* - Pagó solo una parte\n"
        message += "• *no* - No pagó nada"
        
        await update.message.reply_text(message, parse_mode='Markdown')
        return ADD_REPAIR_PAY

    except ValueError:
        await update.message.reply_text("❌ Por favor, ingresa un número válido para el precio:")
        return ADD_REPAIR_PRICE
    except Exception as e:
        logger.error(f"Error en add_repair_price: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
        return ConversationHandler.END


async def add_repair_pay(update: Update, context: ContextTypes.DEFAULT_TYPE):
    
    """Pregunta si hay pago (sí, parcial o no)"""
    response = update.message.text.strip().lower()
    
    if response in ['no', 'n']:
        # Sin pago
        context.user_data['repair_paid'] = False
        context.user_data['repair_price_pay'] = 0
        return await show_repair_summary(update, context)
    
    elif response in ['si', 'sí', 's', 'yes']:
        # Pago completo
        context.user_data['repair_paid'] = True
        context.user_data['repair_price_pay'] = context.user_data.get('repair_price', 0)
        return await show_repair_summary(update, context)
    
    elif response in ['parcial', 'partial', 'p']:
        # Pago parcial - solicitar monto
        context.user_data['repair_paid'] = False  # Aún no está completamente pagado
        await update.message.reply_text(
            f"💰 *¿Monto a abonar?*\n\n"
            f"Precio total: {format_currency(context.user_data['repair_price'])}\n\n"
            "Ingresa solo el número (ejemplo: 50000 para $50,000)"
        )
        return ADD_REPAIR_PAY_AMOUNT
    
    else:
        await update.message.reply_text(
            "❌ Ingresa una respuesta válida:\n"
            "• *si* - Pagó el monto completo\n"
            "• *parcial* - Pagó solo una parte\n"
            "• *no* - No pagó nada\n\n"
            "Responde nuevamente:"
        )
        return ADD_REPAIR_PAY


async def add_repair_pay_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el monto del pago parcial"""
    amount_text = update.message.text.strip()
        
    
    try:
        amount = float(amount_text)
        if amount <= 0:
            await update.message.reply_text(
                "❌ El monto debe ser mayor a 0.\n"
                f"Precio total: {format_currency(context.user_data['repair_price'])}\n\n"
                "Intenta de nuevo:"
            )
            return ADD_REPAIR_PAY_AMOUNT
        
        max_price = context.user_data.get('repair_price', 0)
        if amount > max_price:
            await update.message.reply_text(
                f"❌ El monto no puede exceder el precio total ({format_currency(max_price)}).\n\n"
                "Intenta de nuevo:"
            )
            return ADD_REPAIR_PAY_AMOUNT
        
        context.user_data['repair_price_pay'] = amount
        return await show_repair_summary(update, context)
    
    except ValueError:
        await update.message.reply_text(
            "❌ Ingresa un número válido (ejemplo: 50000)."
        )
        return ADD_REPAIR_PAY_AMOUNT


async def show_repair_summary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra el resumen final de la reparación"""
    faults_text = ", ".join([f.get('name', 'N/A') for f in context.user_data.get('repair_faults', [])]) or "Ninguna"
    price_pay = context.user_data.get('repair_price_pay', 0)
    total_price = context.user_data.get('repair_price', 0)
    labor_price = context.user_data.get('repair_labor_price', 0)
    faults_total = context.user_data.get('repair_faults_total', 0)
    remaining = total_price - price_pay

    keyboard = [
        [InlineKeyboardButton("✅ Crear reparación", callback_data="create_repair")],
        [InlineKeyboardButton("❌ Cancelar", callback_data="cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    summary_text = (
        f"📋 *Resumen de la reparación*\n\n"
        f"👤 *Cliente:* {context.user_data['repair_client']}\n"
        f"📞 *Teléfono:* {context.user_data.get('repair_phone', 'No especificado')}\n"
        f"📱 *Dispositivo:* {context.user_data['repair_device']}\n"
        f"🏷️ *Modelo:* {context.user_data.get('repair_model', 'No especificado')}\n"
        f"📱 *IMEI:* {context.user_data.get('repair_imei', 'No especificado')}\n"
        f"🔧 *Fallas:* {faults_text}\n"
        f"📝 *Detalle:* {context.user_data.get('repair_detail', 'No especificado')}\n\n"
    )
    
    # Desglose de precios
    summary_text += f"📊 *Desglose del precio:*\n"
    summary_text += f"🔧 Mano de obra: {format_currency(labor_price)}\n"
    if faults_total > 0:
        summary_text += f"📦 Repuestos: {format_currency(faults_total)}\n"
    summary_text += f"{'='*40}\n"
    summary_text += f"💰 *TOTAL:* {format_currency(total_price)}\n"
    summary_text += f"{'='*40}\n\n"
    
    if price_pay > 0:
        summary_text += f"💵 *Monto abonado:* {format_currency(price_pay)}\n"
        if remaining > 0:
            summary_text += f"⏳ *Saldo pendiente:* {format_currency(remaining)}\n"
        else:
            summary_text += f"✅ *Pago completo*\n"
    else:
        summary_text += f"⏳ *Sin abono - Saldo total:* {format_currency(total_price)}\n"
    
    
    summary_text += "\n¿Confirmas la creación de esta reparación?"

    await update.message.reply_text(
        summary_text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

    # Mantener la conversación activa esperando la confirmación del usuario
    # El fallback de cancel_callback y create_repair_callback manejaran la respuesta
    return ADD_REPAIR_PAY_AMOUNT  # Esperar response del usuario


# add repair 
async def add_spare_parts_to_repair(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Permite agregar repuestos a una reparación"""
    query = update.callback_query
    await query.answer()
    
    # Extraer el ID de la reparación del callback_data
    callback_data = query.data
    try:
        repair_id = int(callback_data.split('_')[-1])  # Extrae el número al final
    except (ValueError, IndexError):
        await query.edit_message_text("❌ Error: ID de reparación inválido")
        return
    
    # Limpiar acciones previas para evitar conflictos
    context.user_data.pop('action', None)
    context.user_data.pop('adding_spare_part', None)
    context.user_data.pop('adding_spare_parts', None)
    
    # Guardar el ID en el contexto por si se necesita después
    context.user_data['current_repair_id'] = repair_id
    context.user_data['adding_spare_part'] = True
    context.user_data['spare_parts_list'] = []

    # Opciones disponibles para agregar repuestos a la reparación
    keyboard = [
        [InlineKeyboardButton("➕ Agregar repuesto", callback_data="add_spare_part")],
        [InlineKeyboardButton("✅ Finalizar", callback_data="finish_spare_parts")],
        [InlineKeyboardButton("❌ Cancelar", callback_data="cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        f"🔧 *Agregar repuestos a reparación #{repair_id}*\n\n"
        "Puedes agregar repuestos que se descontarán del inventario.\n"
        "Los repuestos se toman de los productos registrados.\n\n"
        "Selecciona una opción:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def add_spare_part_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el proceso de agregar un repuesto"""
    query = update.callback_query
    await query.answer()
    
    # Obtener el ID de la reparación del contexto
    repair_id = context.user_data.get('current_repair_id')
    if not repair_id:
        await query.edit_message_text("❌ Error: No se encontró la reparación")
        return
    
    context.user_data['adding_spare_part'] = True
    
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data=f"add_spare_parts_{repair_id}")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🔧 *Agregar repuesto*\n\n"
        "Envía los datos en el formato:\n"
        "`ID del producto | Cantidad`\n\n"
        "Ejemplo:\n"
        "`5 | 2` (para usar 2 unidades del producto ID 5)\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_add_spare_part(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la adición de un repuesto"""
    if not context.user_data.get('adding_spare_part'):
        return
    
    try:
        text = update.message.text.strip()
        parts = text.split('|')
        
        if len(parts) != 2:
            await update.message.reply_text("❌ Formato incorrecto. Usa: ID | Cantidad")
            return
        
        product_id = int(parts[0].strip())
        quantity = int(parts[1].strip())
        
        if quantity <= 0:
            await update.message.reply_text("❌ La cantidad debe ser mayor a 0")
            return
        
        # Obtener producto del API
        product = api_client.get_product_by_id(product_id)
        
        if not product:
            await update.message.reply_text("❌ Producto no encontrado")
            return
        
        if product.get('stock', 0) < quantity:
            await update.message.reply_text(
                f"❌ Stock insuficiente. Stock disponible: {product.get('stock', 0)}"
            )
            return
        
        # Agregar a la lista temporal
        if 'spare_parts_list' not in context.user_data:
            context.user_data['spare_parts_list'] = []
        
        # Verificar si ya existe el mismo producto
        existing = None
        for item in context.user_data['spare_parts_list']:
            if item['product_id'] == product_id:
                existing = item
                break
        
        if existing:
            existing['quantity'] += quantity
            existing['total_price'] = existing['quantity'] * existing['unit_price']
        else:
            context.user_data['spare_parts_list'].append({
                'product_id': product_id,
                'product_name': product.get('name', 'Sin nombre'),
                'quantity': quantity,
                'unit_price': product.get('price', 0),
                'total_price': product.get('price', 0) * quantity
            })
        
        # Mostrar resumen
        total_repuestos = sum(item['total_price'] for item in context.user_data['spare_parts_list'])
        
        resumen = "📊 *Repuestos agregados:*\n\n"
        for item in context.user_data['spare_parts_list']:
            resumen += f"• {item['quantity']}x {item['product_name']} - {format_currency(item['total_price'])}\n"
        resumen += f"\n*Total repuestos: {format_currency(total_repuestos)}*"
        
        # Obtener el ID de la reparación del contexto
        repair_id = context.user_data.get('current_repair_id')
        
        keyboard = [
            [InlineKeyboardButton("➕ Agregar otro repuesto", callback_data="add_spare_part")],
            [InlineKeyboardButton("✅ Finalizar", callback_data="finish_spare_parts")],
            [InlineKeyboardButton("❌ Cancelar", callback_data=f"add_spare_parts_{repair_id}" if repair_id else "add_spare_parts")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"✅ *Repuesto agregado:* {quantity}x {product.get('name', 'Sin nombre')}\n\n{resumen}",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
        context.user_data.pop('adding_spare_part', None)
        
    except ValueError:
        await update.message.reply_text("❌ ID o cantidad inválidos")
    except Exception as e:
        logger.error(f"Error en handle_add_spare_part: {e}")
        await update.message.reply_text(f"❌ Error: {e}")

async def finish_spare_parts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Finaliza la adición de repuestos y los guarda en la BD"""
    query = update.callback_query
    await query.answer()
    
    try:
        repair_id = context.user_data.get('current_repair_id')
        spare_parts = context.user_data.get('spare_parts_list', [])
        
        if not repair_id:
            await query.edit_message_text("❌ Error: No se encontró la reparación")
            return ConversationHandler.END
        
        # Enviar repuestos al API (si el endpoint existe)
        if spare_parts:
            result = api_client.add_spare_parts_to_repair(repair_id, spare_parts)
            if not result:
                logger.warning(f"No se pudieron registrar los repuestos para la reparación {repair_id}")
        
        # Calcular total de repuestos
        total_repuestos = sum(part['total_price'] for part in spare_parts)
        
        await query.edit_message_text(
            f"✅ *Repuestos registrados exitosamente!*\n\n"
            f"🔧 *Reparación #{repair_id}*\n"
            f"📦 *Total repuestos:* {format_currency(total_repuestos)}\n"
            f"📊 *Items:* {len(spare_parts)}",
            parse_mode='Markdown'
        )
        
        # Limpiar datos temporales
        keys_to_remove = ['adding_spare_parts', 'spare_parts_list', 'adding_spare_part', 'current_repair_id', 'repair_client', 'repair_phone', 'repair_device', 'repair_model', 'repair_imei', 'repair_faults', 'repair_detail', 'repair_price']
        for key in keys_to_remove:
            context.user_data.pop(key, None)
        
        # Volver al menú de reparaciones
        keyboard = [[InlineKeyboardButton("◀️ Volver al menú", callback_data="menu_reparaciones")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.message.reply_text(
            "¿Qué deseas hacer ahora?",
            reply_markup=reply_markup
        )
        
        return ConversationHandler.END
        
    except Exception as e:
        logger.error(f"Error en finish_spare_parts: {e}")
        await query.edit_message_text(f"❌ Error al guardar repuestos: {e}")
        return ConversationHandler.END

async def skip_spare_parts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Omite la adición de repuestos"""
    query = update.callback_query
    await query.answer()
    
    # Limpiar datos temporales
    keys_to_remove = ['adding_spare_parts', 'spare_parts_list', 'current_repair_id', 'repair_client', 'repair_phone', 'repair_device', 'repair_model', 'repair_imei', 'repair_faults', 'repair_detail', 'repair_price']
    for key in keys_to_remove:
        context.user_data.pop(key, None)
    
    await query.edit_message_text(
        "✅ *Repuestos omitidos*\n\n"
        "La reparación ha sido registrada sin repuestos.",
        parse_mode='Markdown'
    )
    
    # Volver al menú de reparaciones
    keyboard = [[InlineKeyboardButton("◀️ Volver al menú", callback_data="menu_reparaciones")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.message.reply_text(
        "¿Qué deseas hacer ahora?",
        reply_markup=reply_markup
    )
    
    return ConversationHandler.END

# ============ VENTAS ============
async def menu_ventas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Menú de gestión de ventas"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("💰 Registrar venta", callback_data="register_sale")],
        [InlineKeyboardButton("📊 Ver ventas del día", callback_data="daily_sales")],
        [InlineKeyboardButton("📅 Ver ventas del mes", callback_data="monthly_sales")],
        [InlineKeyboardButton("◀️ Volver", callback_data="back_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "💰 *Gestión de Ventas*\n\n"
        "Selecciona una opción:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def register_sale_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de una venta"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['sale_items'] = []
    context.user_data['sale_action'] = 'registering'
    
    keyboard = [
        [InlineKeyboardButton("➕ Agregar producto", callback_data="add_sale_item")],
        [InlineKeyboardButton("✅ Finalizar venta", callback_data="finish_sale")],
        [InlineKeyboardButton("❌ Cancelar", callback_data="menu_ventas")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "💰 *Registrar nueva venta*\n\n"
        "Usa los botones para agregar productos a la venta.\n"
        "Cuando termines, presiona 'Finalizar venta'.\n\n"
        "*Productos agregados:*\n"
        "Ninguno aún.",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def add_sale_item_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la adición de un producto a la venta"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['sale_action'] = 'adding_item'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="register_sale")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "➕ *Agregar producto a la venta*\n\n"
        "Envía los datos en el formato:\n"
        "`ID del producto | Cantidad`\n\n"
        "Ejemplo:\n"
        "`1 | 2`\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_add_sale_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la adición de un producto a la venta"""
    if context.user_data.get('sale_action') != 'adding_item':
        return
    
    try:
        text = update.message.text.strip()
        parts = text.split('|')
        
        if len(parts) != 2:
            await update.message.reply_text("❌ Formato incorrecto. Usa: ID | Cantidad")
            return
        
        product_id = int(parts[0].strip())
        quantity = int(parts[1].strip())
        
        if quantity <= 0:
            await update.message.reply_text("❌ La cantidad debe ser mayor a 0")
            return
        
        # Obtener producto del API
        product = api_client.get_product_by_id(product_id)
        
        if not product:
            await update.message.reply_text("❌ Producto no encontrado")
            return
        
        # Verificar stock (nota: el servidor validará esto también)
        if product.get('stock', 0) < quantity:
            await update.message.reply_text(f"❌ Stock insuficiente. Stock disponible: {product.get('stock', 0)}")
            return
        
        # Agregar a la lista de items
        if 'sale_items' not in context.user_data:
            context.user_data['sale_items'] = []
        
        # Verificar si el producto ya está en la lista
        existing_item = None
        for item in context.user_data['sale_items']:
            if item['id'] == product_id:
                existing_item = item
                break
        
        if existing_item:
            existing_item['cantidad'] += quantity
            existing_item['subtotal'] = existing_item['cantidad'] * existing_item['precio_unitario']
        else:
            context.user_data['sale_items'].append({
                'id': product.get('id'),
                'nombre': product.get('name', 'Sin nombre'),
                'cantidad': quantity,
                'precio_unitario': product.get('price', 0),
                'subtotal': product.get('price', 0) * quantity
            })
        
        total = sum(item['subtotal'] for item in context.user_data['sale_items'])
        
        # Mostrar resumen actual
        resumen = "📊 *Resumen de venta actual:*\n\n"
        for item in context.user_data['sale_items']:
            resumen += f"• {item['cantidad']}x {item['nombre']} - {format_currency(item['subtotal'])}\n"
        resumen += f"\n*Total: {format_currency(total)}*"
        
        keyboard = [
            [InlineKeyboardButton("➕ Agregar otro producto", callback_data="add_sale_item")],
            [InlineKeyboardButton("✅ Finalizar venta", callback_data="finish_sale")],
            [InlineKeyboardButton("❌ Cancelar", callback_data="menu_ventas")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"✅ *Producto agregado:* {quantity}x {product.get('name', 'Sin nombre')}\n\n{resumen}",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
        context.user_data['sale_action'] = 'registering'
        
    except ValueError:
        await update.message.reply_text("❌ ID o cantidad inválidos")
    except Exception as e:
        logger.error(f"Error en handle_add_sale_item: {e}")
        await update.message.reply_text(f"❌ Error: {e}")

async def finish_sale_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la finalización de la venta"""
    query = update.callback_query
    await query.answer()
    
    if not context.user_data.get('sale_items'):
        await query.edit_message_text("❌ No hay productos en la venta")
        return
    
    context.user_data['sale_action'] = 'finishing'
    
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="register_sale")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "💰 *Finalizar venta*\n\n"
        "Envía el nombre del cliente (opcional, escribe /skip para omitir):",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_finish_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la finalización de la venta"""
    if context.user_data.get('sale_action') != 'finishing':
        return
    
    try:
        client_name = None
        if update.message.text != '/skip':
            client_name = update.message.text
        
        # Nota: El backend debería manejar la actualización de stock y registro de ventas
        # Por ahora solo actualizamos el stock localmente
        total = sum(item['subtotal'] for item in context.user_data.get('sale_items', []))
        
        # Preparar datos para ticket
        venta_data = {
            'client_name': client_name,
            'items': context.user_data['sale_items'],
            'total': total,
            'metodo_pago': 'Efectivo'
        }
        
        # Generar e imprimir ticket
        operaciones = generar_ticket_venta(venta_data)
        success, message = enviar_a_impresora(operaciones)
        
        await update.message.reply_text(
            f"✅ *Venta registrada exitosamente!*\n\n"
            f"💰 *Total: {format_currency(total)}*\n"
            f"{message}",
            parse_mode='Markdown'
        )
        
        # Limpiar datos de venta
        context.user_data.pop('sale_items', None)
        context.user_data.pop('sale_action', None)
        
        # Volver al menú de ventas
        keyboard = [[InlineKeyboardButton("◀️ Volver al menú", callback_data="menu_ventas")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "¿Qué deseas hacer ahora?",
            reply_markup=reply_markup
        )
        
    except Exception as e:
        logger.error(f"Error en handle_finish_sale: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        context.user_data.pop('sale_action', None)

async def daily_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra ventas del día"""
    query = update.callback_query
    await query.answer()
    
    # Nota: El servidor debería proporcionar este endpoint
    text = "💰 *Ventas del día*\n\n"
    text += "ℹ️ Esta funcionalidad será implementada cuando el backend proporcione los endpoints necesarios."
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_ventas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def monthly_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra ventas del mes"""
    query = update.callback_query
    await query.answer()
    
    # Nota: El servidor debería proporcionar este endpoint
    text = "💰 *Ventas del mes*\n\n"
    text += "ℹ️ Esta funcionalidad será implementada cuando el backend proporcione los endpoints necesarios."
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_ventas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

# ============ ESTADÍSTICAS ============
async def menu_estadisticas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Menú de estadísticas"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("📊 Productos más vendidos", callback_data="top_products")],
        [InlineKeyboardButton("💰 Ventas del día", callback_data="daily_sales")],
        [InlineKeyboardButton("📈 Ventas del mes", callback_data="monthly_sales")],
        [InlineKeyboardButton("🔧 Reparaciones completadas", callback_data="repairs_stats")],
        [InlineKeyboardButton("◀️ Volver", callback_data="back_to_main")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "📈 *Estadísticas*\n\n"
        "Selecciona una opción:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def top_products(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra los productos más vendidos"""
    query = update.callback_query
    await query.answer()
    
    # Obtener ventas del mes para mostrar top productos
    monthly_sales_data = api_client.get_monthly_sales()
    
    if not monthly_sales_data or not monthly_sales_data.get('top_products'):
        text = "📊 <b>Top 10 productos más vendidos (este mes)</b>\n\n"
        text += "📭 No hay datos de ventas disponibles."
    else:
        top_products_list = monthly_sales_data.get('top_products', [])[:10]
        text = "📊 <b>Top 10 productos más vendidos (este mes)</b>\n\n"
        
        for idx, product in enumerate(top_products_list, 1):
            product_name = product.get('product_name', 'Sin nombre')
            quantity = product.get('total_quantity', 0)
            subtotal = product.get('subtotal', 0)
            text += f"{idx}. <b>{product_name}</b>\n"
            text += f"   📦 Vendidos: {quantity}\n"
            text += f"   💰 Ingresos: {format_currency(subtotal)}\n\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_estadisticas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )

async def daily_sales_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra las ventas del día actual"""
    query = update.callback_query
    await query.answer()
    
    sales_data = api_client.get_daily_sales()
    
    if not sales_data:
        text = "💰 <b>Ventas del Día</b>\n\n"
        text += "❌ Error al obtener datos de ventas."
    else:
        summary = sales_data.get('summary', {})
        products = sales_data.get('products', [])
        date = sales_data.get('date', 'N/A')
        
        text = f"💰 <b>Ventas del {date}</b>\n\n"
        text += f"📊 <b>Resumen:</b>\n"
        text += f"• Items vendidos: {summary.get('total_items_sold', 0)}\n"
        text += f"• Productos únicos: {summary.get('unique_products_sold', 0)}\n"
        text += f"• Cantidad total: {summary.get('total_quantity', 0)}\n"
        text += f"• Ingresos: {format_currency(summary.get('total_revenue', 0))}\n"
        text += f"• Clientes: {summary.get('unique_customers', 0)}\n\n"
        
        if products:
            text += f"🏆 <b>Top Productos:</b>\n"
            for product in products[:5]:
                product_name = product.get('product_name', 'Sin nombre')
                quantity = product.get('total_quantity', 0)
                subtotal = product.get('subtotal', 0)
                text += f"• {product_name}: {quantity} unidades - {format_currency(subtotal)}\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_estadisticas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )

async def monthly_sales_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra las ventas del mes actual"""
    query = update.callback_query
    await query.answer()
    
    sales_data = api_client.get_monthly_sales()
    
    if not sales_data:
        text = "📈 <b>Ventas del Mes</b>\n\n"
        text += "❌ Error al obtener datos de ventas."
    else:
        summary = sales_data.get('summary', {})
        month = sales_data.get('month', 'N/A')
        
        text = f"📈 <b>Ventas del mes {month}</b>\n\n"
        text += f"📊 <b>Resumen:</b>\n"
        text += f"• Items vendidos: {summary.get('total_items_sold', 0)}\n"
        text += f"• Productos únicos: {summary.get('unique_products_sold', 0)}\n"
        text += f"• Cantidad total: {summary.get('total_quantity', 0)}\n"
        text += f"• Ingresos totales: {format_currency(summary.get('total_revenue', 0))}\n"
        text += f"• Clientes únicos: {summary.get('unique_customers', 0)}\n"
        
        categories = summary.get('categories', [])
        if categories:
            text += f"• Categorías: {', '.join(categories)}\n"
        
        text += f"\n💹 <b>Promedio diario:</b> {format_currency(summary.get('total_revenue', 0) / max(1, len(sales_data.get('daily_breakdown', []))))}\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_estadisticas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )

async def repairs_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra estadísticas de reparaciones"""
    query = update.callback_query
    await query.answer()
    # Obtener reparaciones del API
    devices = api_client.get_devices()
    
    if not devices:
        text = "🔧 *Estadísticas de Reparaciones*\n\n"
        text += "📊 *Total de reparaciones:* 0"
    else:
        # Contar por estado
        stats_by_status = {}
        total_paid = 0
        
        for device in devices:
            status = device.get('repair_status', 'N/A')
            if status not in stats_by_status:
                stats_by_status[status] = 0
            stats_by_status[status] += 1
            
            if status == 'Reparado' and device.get('pay', False):
                total_paid += device.get('price', 0)
        
        total = len(devices)
        
        text = "🔧 *Estadísticas de Reparaciones*\n\n"
        text += f"📊 *Total de reparaciones:* {total}\n\n"
        
        status_names = {
            'En Revisión': '🔍 En Revisión',
            'En Reparación': '⚙️ En Reparación',
            'Reparado': '✅ Reparado',
            'Sin Solución': '❌ Sin Solución'
        }
        
        for status, count in stats_by_status.items():
            display_name = status_names.get(status, status)
            percentage = (count / total * 100) if total > 0 else 0
            text += f"{display_name}: {count} ({percentage:.1f}%)\n"
        
        if 'Reparado' in stats_by_status:
            text += f"   💰 Pagado: {format_currency(total_paid)}\n"
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_estadisticas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def total_income(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra ingresos totales"""
    query = update.callback_query
    await query.answer()
    
    # Nota: El servidor debería proporcionar este endpoint
    text = "💰 *Ingresos Totales*\n\n"
    text += "ℹ️ Esta funcionalidad será implementada cuando el backend proporcione los endpoints necesarios."
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="menu_estadisticas")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def test_printer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Prueba la impresora"""
    query = update.callback_query
    await query.answer()
    
    # Crear ticket de prueba
    test_operaciones = [
        {"nombre": "EstablecerAlineacion", "argumentos": [1]},
        {"nombre": "TextoGrande", "argumentos": []},
        {"nombre": "Negrita", "argumentos": [True]},
        {"nombre": "EscribirTexto", "argumentos": ["PRUEBA DE IMPRESIÓN"]},
        {"nombre": "Negrita", "argumentos": [False]},
        {"nombre": "TextoNormal", "argumentos": []},
        {"nombre": "Feed", "argumentos": [2]},
        {"nombre": "EstablecerAlineacion", "argumentos": [0]},
        {"nombre": "EscribirTexto", "argumentos": ["Este es un ticket de prueba"]},
        {"nombre": "EscribirTexto", "argumentos": [f"Fecha: {datetime.now(ZONA_HORARIA).strftime('%d/%m/%Y %H:%M')}"]},
        {"nombre": "Feed", "argumentos": [2]},
        {"nombre": "EscribirTexto", "argumentos": ["Si ves este mensaje, la impresora funciona correctamente"]},
        {"nombre": "Feed", "argumentos": [2]}
    ]
    
    success, message = enviar_a_impresora(test_operaciones)
    
    keyboard = [[InlineKeyboardButton("◀️ Volver", callback_data="back_to_main")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        f"🖨️ *Prueba de Impresora*\n\n{message}",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

# funcionalidades de entregar de dispositivo 
async def register_delivery_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de entrega del dispositivo"""
    query = update.callback_query
    await query.answer()
    
    context.user_data['action'] = 'register_delivery'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="cancel")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "📦 *Registrar entrega de dispositivo*\n\n"
        "Envía el ID de la reparación que se va a entregar:\n\n"
        "Requisitos:\n"
        "✓ La reparación debe estar pagada\n"
        "✓ El estado debe ser 'Reparado'\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_register_delivery(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja el registro de entrega del dispositivo"""
    if context.user_data.get('action') != 'register_delivery':
        return
    
    try:
        repair_id = safe_int_convert(update.message.text)
        if repair_id is None:
            await update.message.reply_text("❌ ID inválido. Envía un número válido")
            return
        
        # Obtener reparación del API
        repair = await fetch_device(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        # Verificar condiciones para entrega
        repair_status = repair.get('repair_status')
        pay = repair.get('pay', False)
        
        if repair_status == 'Reparado' and not pay:
            await update.message.reply_text(
                f"⚠️ *No se puede entregar el dispositivo*\n\n"
                f"El pago aún no ha sido registrado.\n"
                f"💰 Monto pendiente: {format_currency(repair.get('price', 0))}\n\n"
                f"Primero registra el pago usando la opción correspondiente.",
                parse_mode='Markdown'
            )
            return
        
        if repair_status not in ['Reparado', 'Sin Solución']:
            await update.message.reply_text(
                f"⚠️ *No se puede entregar el dispositivo*\n\n"
                f"El equipo está en estado: {repair_status}\n"
                f"Para poder entregar, el estado debe ser 'Reparado' o 'Sin Solución'",
                parse_mode='Markdown'
            )
            return
        
        if repair.get('delivered', False):
            await update.message.reply_text(
                f"⚠️ *Dispositivo ya entregado*\n\n"
                f"Este dispositivo ya fue entregado anteriormente.\n"
                f"Fecha de entrega previa: {repair.get('delivery_date', 'No registrada')}",
                parse_mode='Markdown'
            )
            return
        
        # Confirmar entrega
        context.user_data['delivery_repair_id'] = repair_id
        context.user_data['delivery_repair_data'] = repair
        
        keyboard = [
            [InlineKeyboardButton("✅ Sí, entregar", callback_data="confirm_delivery")],
            [InlineKeyboardButton("❌ Cancelar", callback_data="cancel")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"📦 *Confirmar entrega*\n\n"
            f"🆔 *ID:* {repair.get('id')}\n"
            f"👤 *Cliente:* {repair.get('client_name')}\n"
            f"📱 *Dispositivo:* {repair.get('device')} {repair.get('model', '')}\n"
            f"💰 *Pagado:* {format_currency(repair.get('price', 0))}\n"
            f"✅ *Estado:* {repair.get('repair_status')}\n\n"
            "¿Confirmas la entrega del dispositivo al cliente?",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
        
        context.user_data.pop('action', None)
        
    except Exception as e:
        logger.error(f"Error en handle_register_delivery: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
    finally:
        pass

async def confirm_delivery(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Confirma la entrega del dispositivo"""
    query = update.callback_query
    await query.answer()
    
    try:
        repair_id = context.user_data.get('delivery_repair_id')
        repair_data = context.user_data.get('delivery_repair_data')
        
        if not repair_id or not repair_data:
            await query.edit_message_text("❌ Error: No se encontró la reparación")
            return
        
        # Registrar entrega a través del API
        result = api_client.register_delivery(repair_id)
        
        if result:
            # Generar ticket de entrega
            entrega_data = {
                'id': result.get('id'),
                'client_name': result.get('client_name'),
                'device': result.get('device'),
                'model': result.get('model'),
                'price': result.get('price')
            }
            
            operaciones = generar_ticket_entrega(entrega_data)
            success, message = enviar_a_impresora(operaciones)
            
            await query.edit_message_text(
                f"✅ *Dispositivo entregado exitosamente!*\n\n"
                f"🆔 *ID:* {repair_id}\n"
                f"👤 *Cliente:* {result.get('client_name')}\n"
                f"📱 *Dispositivo:* {result.get('device')}\n"
                f"📅 *Fecha entrega:* {datetime.now(ZONA_HORARIA).strftime('%d/%m/%Y %H:%M')}\n"
                f"{message}",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text("❌ Error al registrar la entrega")
        
        # Limpiar datos temporales
        context.user_data.pop('delivery_repair_id', None)
        context.user_data.pop('delivery_repair_data', None)
        
    except Exception as e:
        logger.error(f"Error en confirm_delivery: {e}")
        await query.edit_message_text(f"❌ Error al registrar entrega: {e}")

# ============ UTILIDADES ============
async def back_to_main(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Vuelve al menú principal"""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("📦 Productos", callback_data="menu_productos")],
        [InlineKeyboardButton("🔧 Reparaciones", callback_data="menu_reparaciones")],
        [InlineKeyboardButton("💰 Ventas", callback_data="menu_ventas")],
        [InlineKeyboardButton("📈 Estadísticas", callback_data="menu_estadisticas")],
        [InlineKeyboardButton("🖨️ Probar impresora", callback_data="test_printer")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "🏪 *Sistema de Gestión de Inventario y Reparaciones* 🏪\n\n"
        "Bienvenido al sistema. Selecciona una opción para comenzar:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )


async def cancel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancela desde callback query o comando, limpiando completamente el estado"""
    # Limpiar TODOS los datos de usuario - esto es crucial
    keys_to_clear = [
        'product_name', 'product_category', 'product_stock', 'product_price',
        'repair_client', 'repair_phone', 'repair_device', 'repair_model',
        'repair_imei', 'repair_faults', 'repair_detail', 'repair_price',
        'repair_labor_price', 'repair_price_pay', 'repair_faults_total',
        'repair_paid', 'sale_items', 'sale_action', 'action',
        'delivery_repair_id', 'delivery_repair_data', 'adding_spare_part',
        'adding_spare_parts', 'spare_parts_list', 'current_repair_id'
    ]
    
    for key in keys_to_clear:
        context.user_data.pop(key, None)
    
    query = getattr(update, "callback_query", None)
    
    keyboard = [[InlineKeyboardButton("🏠 Menú Principal", callback_data="back_to_main")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    cancel_message = "🚫 *Operación cancelada exitosamente*\n\nTodos los datos ingresados han sido descartados.\nPuedes volver al menú principal:"
    
    if query:
        try:
            await query.answer()
            if hasattr(query, "message") and query.message:
                await query.edit_message_text(
                    cancel_message,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
            else:
                await context.bot.send_message(
                    chat_id=query.from_user.id,
                    text=cancel_message,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
        except Exception as e:
            logger.error(f"Error al editar mensaje en cancel: {e}")
            try:
                await context.bot.send_message(
                    chat_id=query.from_user.id,
                    text=cancel_message,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
            except Exception as e2:
                logger.error(f"Error al enviar mensaje de cancelación: {e2}")
    else:
        # Si es un comando /cancelar
        chat_id = update.effective_chat.id if update.effective_chat else update.message.chat_id
        await context.bot.send_message(
            chat_id=chat_id,
            text=cancel_message,
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
    
    return ConversationHandler.END
async def create_repair_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Crea la reparación después de confirmar"""
    query = update.callback_query
    await query.answer()
    
    try:
        # Crear reparación a través del API
        price_pay = context.user_data.get('repair_price_pay', 0) or 0
        device = api_client.create_device(
            client_name=context.user_data['repair_client'],
            number_phone=context.user_data.get('repair_phone', ''),
            device=context.user_data['repair_device'],
            model=context.user_data.get('repair_model', ''),
            faults=context.user_data.get('repair_faults', []),
            detail=context.user_data.get('repair_detail', ''),
            price=context.user_data['repair_price'],
            price_pay=price_pay,
            imei=context.user_data.get('repair_imei', '')
        )
        
        if device:
            try:
                device_obj = device['device']
                device_id = device_obj['id']
            except (KeyError, TypeError) as e:
                logger.error(f"Error accediendo al ID del dispositivo: {e}. device={device}")
                await query.edit_message_text("❌ Error: No se pudo obtener el ID de la reparación creada")
                return
            
            context.user_data['current_repair_id'] = device_id
            
            # Limpiar acciones previas para evitar conflictos
            context.user_data.pop('action', None)
            context.user_data.pop('adding_spare_part', None)
            context.user_data.pop('adding_spare_parts', None)
            
            # Preguntar si quiere agregar repuestos
            keyboard = [
                [InlineKeyboardButton("✅ Sí, agregar repuestos", callback_data=f"add_spare_parts_{device_id}")],
                [InlineKeyboardButton("❌ No, continuar sin repuestos", callback_data="skip_spare_parts")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                f"✅ *Reparación creada exitosamente!*\n\n"
                f"🆔 *ID:* {device_id}\n"
                f"👤 *Cliente:* {context.user_data['repair_client']}\n"
                f"📱 *Dispositivo:* {context.user_data['repair_device']}\n"
                f"💰 *Precio:* {format_currency(context.user_data['repair_price'])}\n\n"
                "¿Deseas agregar repuestos usados en esta reparación?\n"
                "Los repuestos se descontarán automáticamente del inventario.",
                parse_mode='Markdown',
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text(
                "❌ Error al guardar la reparación. Verifica que el nombre de cliente tenga 3 o más caracteres, el teléfono sea válido y completa los datos pedidos."
            )
    
    except Exception as e:
        logger.error(f"Error en create_repair_callback: {e}")
        await query.edit_message_text(f"❌ Error: {e}")
    
    return ConversationHandler.END
# ============ AGREGAR CATEGORÍAS ============
async def add_category_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de una nueva categoría"""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "➕ *Agregar nueva categoría al sistema*\n\n"
        "Por favor, ingresa el nombre de la categoría.\n\n"
        "Ejemplo: *Accesorios de Telefonía*, *Repuestos*\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown'
    )
    return ADD_CATEGORY_NAME

async def add_category_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el nombre de la categoría y la crea"""
    category_name = update.message.text.strip()
    
    # Validaciones
    if not category_name:
        await update.message.reply_text(
            "❌ El nombre no puede estar vacío.\n\n"
            "Por favor, ingresa el nombre de la categoría:"
        )
        return ADD_CATEGORY_NAME
    
    if len(category_name) > 100:
        await update.message.reply_text(
            "❌ El nombre es muy largo (máximo 100 caracteres).\n\n"
            "Por favor, ingresa un nombre más corto:"
        )
        return ADD_CATEGORY_NAME
    
    # Intentar crear la categoría
    try:
        # Asegurar que el nombre esté en minúsculas para consistencia
        result = api_client.create_category(category_name.lower())
        
        if result:
            await update.message.reply_text(
                f"✅ *Categoría creada exitosamente*\n\n"
                f"📌 Nombre: *{category_name}*\n"
                f"🆔 ID: *{result.get('id', 'N/A')}*",
                parse_mode='Markdown'
            )
            
            # Volver al menú de productos
            keyboard = [[InlineKeyboardButton("📦 Volver a productos", callback_data="menu_productos")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "¿Qué deseas hacer ahora?",
                reply_markup=reply_markup
            )
            return ConversationHandler.END
        else:
            # Verificar si la categoría ya existe
            await update.message.reply_text(
                f"❌ No se pudo crear la categoría '{category_name}'.\n\n"
                f"Posibles razones:\n"
                f"• La categoría ya existe\n"
                f"• Error de conexión con el servidor\n\n"
                f"Por favor, intenta con otro nombre:"
            )
            return ADD_CATEGORY_NAME
            
    except Exception as e:
        logger.error(f"Error al crear categoría: {e}")
        await update.message.reply_text(
            f"❌ Error al crear la categoría: {str(e)}\n\n"
            f"Por favor, intenta nuevamente con otro nombre:"
        )
        return ADD_CATEGORY_NAME
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando de ayuda"""
    await update.message.reply_text(
        "📚 *Ayuda del Bot*\n\n"
        "Comandos disponibles:\n"
        "/start - Mostrar menú principal\n"
        "/cancelar - Cancelar la operación actual\n"
        "/help - Mostrar esta ayuda\n\n"
        "Durante una operación:\n"
        "• Sigue las instrucciones del bot\n"
        "• Usa /cancelar para salir en cualquier momento\n\n"
        "Para registrar productos o reparaciones:\n"
        "• Usa los botones del menú\n"
        "• Responde las preguntas que hace el bot\n"
        "• Puedes usar 'ninguno' para campos opcionales\n\n"
        "Para ventas:\n"
        "• Agrega productos usando ID | Cantidad\n"
        "• Ejemplo: 1 | 2",
        parse_mode='Markdown'
    )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja errores globales"""
    logger.error(f"Error: {context.error}")
    if update and update.effective_message:
        await update.effective_message.reply_text("❌ Ocurrió un error. Por favor intenta más tarde.")

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manejador central de mensajes de texto basado en el estado (action)"""

    if not update.message or not update.message.text:
        return
    
    if update.message.text.startswith('/'):
        return

    action = context.user_data.get('action')
    sale_action = context.user_data.get('sale_action')
    adding_spare_part = context.user_data.get('adding_spare_part')
    
    try:
        if action == 'update_stock':
            await handle_update_stock(update, context)
        elif action == 'print_repair_ticket':
            await handle_print_repair_ticket(update, context)
        elif action == 'register_payment':
            await handle_register_payment(update, context)
        elif action == 'update_repair_status':
            await handle_update_repair_status(update, context)
        elif action == 'register_delivery':
            await handle_register_delivery(update, context)
        elif action == 'view_spare_parts':
            await handle_view_spare_parts(update, context)
        elif adding_spare_part:
            await handle_add_spare_part(update, context)
        elif sale_action == 'adding_item':
            await handle_add_sale_item(update, context)
        elif sale_action == 'finishing':
            await handle_finish_sale(update, context)
        else:
            if context.user_data:
                await update.message.reply_text("❓ No hay ninguna operación activa. Usa /start para ver el menú.")
            else:
                context.user_data.clear()
    except Exception as e:
        logger.error(f"Error procesando texto: {e}")
        await update.message.reply_text(f"❌ Error al procesar tu mensaje.")

# ============ MAIN ============
def main():
    """Función principal con todos los handlers registrados"""
    print("🏪 Iniciando Sistema de Gestión...")
    print(f"🌐 Conectando al backend: {api_client.base_url}")
    
    try:
        application = Application.builder().token(TOKEN).build()

        # ============ 1. COMANDOS ============
        application.add_handler(CommandHandler("start", start_menu))
        application.add_handler(CommandHandler("ayuda", ayuda))
        application.add_handler(CommandHandler("cancelar", cancel_callback))
        application.add_handler(CommandHandler("help", help_command))
        
        # Admin commands
        application.add_handler(CommandHandler("agregar_usuario", agregar_usuario_admin))
        application.add_handler(CommandHandler("usuarios", lista_usuarios_admin))
        application.add_handler(CommandHandler("eliminar_usuario", eliminar_usuario_admin))

        # ============ 2. CONVERSACIONES ============
        # Conversación para agregar productos
        add_product_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_product_start, pattern="^add_product$"), CommandHandler("agregar_producto", add_product_start)],
            states={
                ADD_PRODUCT_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_name)],
                ADD_PRODUCT_SELECT_CATEGORY: [CallbackQueryHandler(category_selected, pattern="^category_"), CallbackQueryHandler(add_new_category_start, pattern="^add_new_category$")],
                ADD_PRODUCT_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_category)],
                ADD_PRODUCT_STOCK: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_stock)],
                ADD_PRODUCT_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_price)],
            },
            fallbacks=[CommandHandler("cancelar", cancel_callback), CallbackQueryHandler(cancel_callback, pattern="^cancel$")],
            per_message=False,
            per_chat=True,
            allow_reentry=True,
        )
        # Conversación para agregar reparaciones
        add_repair_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_repair_start, pattern="^add_repair$")],
            states={
                ADD_REPAIR_CLIENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_client)],
                ADD_REPAIR_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_phone)],
                ADD_REPAIR_DEVICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_device)],
                ADD_REPAIR_MODEL: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_model),
                    CallbackQueryHandler(select_brand_model, pattern="^brand_")
                ],
                ADD_REPAIR_IMEI: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_imei)],
                ADD_REPAIR_FAULTS: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_faults),
                    CallbackQueryHandler(select_repair_fault, pattern="^select_fault_"),
                    CallbackQueryHandler(search_repair_fault, pattern="^search_faults$"),
                    CallbackQueryHandler(manual_repair_faults, pattern="^manual_faults$"),
                    CallbackQueryHandler(finish_faults_handler, pattern="^finish_faults$"),
                ],
                ADD_REPAIR_DETAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_detail)],
                ADD_REPAIR_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_price)],
                ADD_REPAIR_PAY: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_pay)],
                ADD_REPAIR_PAY_AMOUNT: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_pay_amount),
                    CallbackQueryHandler(create_repair_callback, pattern="^create_repair$"),
                    CallbackQueryHandler(cancel_callback, pattern="^cancel$"),
                ],
            },
            fallbacks=[CommandHandler("cancelar", cancel_callback), CallbackQueryHandler(cancel_callback, pattern="^cancel$")],
            per_message=False,
            per_chat=True,
            allow_reentry=True,
        )
        
        # Conversación para agregar categorías
        add_category_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_category_start, pattern="^add_category$")],
            states={
                ADD_CATEGORY_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_category_name)],
            },
            fallbacks=[CommandHandler("cancelar", cancel_callback), CallbackQueryHandler(cancel_callback, pattern="^cancel$")],
            per_message=False,
            per_chat=True,
            allow_reentry=True,
        )
        
        application.add_handler(add_product_conv)
        application.add_handler(add_repair_conv)
        application.add_handler(add_category_conv)

        # ============ 3. CALLBACKS / BOTONES ============
        # Menús principales
        application.add_handler(CallbackQueryHandler(register_delivery_start, pattern="^register_delivery$"))
        application.add_handler(CallbackQueryHandler(confirm_delivery, pattern="^confirm_delivery$"))
        application.add_handler(CallbackQueryHandler(create_repair_callback, pattern="^create_repair$"))
        application.add_handler(CallbackQueryHandler(view_spare_parts, pattern="^view_spare_parts$"))
        application.add_handler(CallbackQueryHandler(add_spare_parts_to_repair, pattern=r"^add_spare_parts_(\d+)$"))
        application.add_handler(CallbackQueryHandler(add_spare_part_start, pattern="^add_spare_part$"))
        application.add_handler(CallbackQueryHandler(finish_spare_parts, pattern="^finish_spare_parts$"))
        application.add_handler(CallbackQueryHandler(skip_spare_parts, pattern="^skip_spare_parts$"))

        application.add_handler(CallbackQueryHandler(menu_productos, pattern="^menu_productos$"))
        application.add_handler(CallbackQueryHandler(menu_reparaciones, pattern="^menu_reparaciones$"))
        application.add_handler(CallbackQueryHandler(menu_ventas, pattern="^menu_ventas$"))
        application.add_handler(CallbackQueryHandler(menu_estadisticas, pattern="^menu_estadisticas$"))
        application.add_handler(CallbackQueryHandler(back_to_main, pattern="^back_to_main$"))
        
        # Productos
        application.add_handler(CallbackQueryHandler(list_products, pattern="^list_products$"))
        application.add_handler(CallbackQueryHandler(update_stock_start, pattern="^update_stock$"))
        
        # Reparaciones
        application.add_handler(CallbackQueryHandler(list_repairs, pattern="^list_repairs$"))
        application.add_handler(CallbackQueryHandler(update_repair_status_start, pattern="^update_repair_status$"))
        application.add_handler(CallbackQueryHandler(print_repair_ticket_start, pattern="^print_repair_ticket$"))
        application.add_handler(CallbackQueryHandler(register_payment_start, pattern="^register_payment$"))
        application.add_handler(CallbackQueryHandler(handle_set_status, pattern="^set_status_"))
        
        # Ventas
        application.add_handler(CallbackQueryHandler(register_sale_start, pattern="^register_sale$"))
        application.add_handler(CallbackQueryHandler(add_sale_item_start, pattern="^add_sale_item$"))
        application.add_handler(CallbackQueryHandler(finish_sale_start, pattern="^finish_sale$"))
        application.add_handler(CallbackQueryHandler(daily_sales_stats, pattern="^daily_sales$"))
        application.add_handler(CallbackQueryHandler(monthly_sales_stats, pattern="^monthly_sales$"))
        
        # Estadísticas
        application.add_handler(CallbackQueryHandler(top_products, pattern="^top_products$"))
        application.add_handler(CallbackQueryHandler(total_income, pattern="^total_income$"))
        application.add_handler(CallbackQueryHandler(repairs_stats, pattern="^repairs_stats$"))
        
        # Utilidades
        application.add_handler(CallbackQueryHandler(test_printer, pattern="^test_printer$"))

        # Cancelar global - para cuando se cancela fuera del ConversationHandler
        application.add_handler(CallbackQueryHandler(cancel_callback, pattern="^cancel$"))

        # ============ 4. TEXTO GENÉRICO ============
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

        # Manejo de errores
        application.add_error_handler(error_handler)
        
        print("✅ Bot en línea. Todos los handlers registrados correctamente.")
        application.run_polling(allowed_updates=Update.ALL_TYPES)
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()