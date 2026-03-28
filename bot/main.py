import logging
import json
import os
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
 ADD_REPAIR_IMEI, ADD_REPAIR_FAULTS, ADD_REPAIR_DETAIL, ADD_REPAIR_PRICE) = range(8)
 
 # Agregar nuevos estados para repuestos
(ADD_REPAIR_CLIENT, ADD_REPAIR_PHONE, ADD_REPAIR_DEVICE, ADD_REPAIR_MODEL, 
 ADD_REPAIR_IMEI, ADD_REPAIR_FAULTS, ADD_REPAIR_DETAIL, ADD_REPAIR_PRICE,
 ADD_REPAIR_SPARE_PARTS) = range(9)

# Estado para entrega
(ADD_DELIVERY_REPAIR_ID, ADD_DELIVERY_CONFIRM) = range(2)

# Configurar logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ============ BASE DE DATOS ============
DB_PATH = os.getenv('DB_PATH', '/app/data/inventory.db')

def safe_int_convert(text):
    """Convierte texto a entero de forma segura"""
    if not text:
        return None
    text = text.strip()
    if text.isdigit():
        return int(text)
    return None

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

# ============ COMANDOS DE AUTENTICACIÓN ============
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando de inicio"""
    user = update.effective_user
    user_id = user.id
    
    # Verificar si está registrado
    is_registered = api_client.verify_user(user_id)
    
    if is_registered:
        await update.message.reply_text(
            f"👋 ¡Bienvenido, {user.first_name}!\n\n"
            "✅ Ya estás autorizado en el sistema.\n\n"
            "Usa /ayuda para ver los comandos disponibles."
        )
    else:
        await update.message.reply_text(
            f"👋 ¡Hola, {user.first_name}!\n\n"
            "❌ No estás registrado en el sistema.\n\n"
            "Para acceder, solicita al administrador que te agregue al sistema.\n"
            "El admin puede usar:\n"
            "`/agregar_usuario " + str(user_id) + "`"
        )

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

# ============ FUNCIONES AUXILIARES ============
def format_currency(amount):
    """Formatea un número como moneda"""
    try:
        # Convertir a float si viene como string
        if isinstance(amount, str):
            amount = float(amount)
        return f"${amount:,.2f}"
    except (ValueError, TypeError):
        return "$0.00"

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

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
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
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_productos")]]
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
    
    context.user_data['action'] = 'view_spare_parts'
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")]]
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
        repair = api_client.get_device_by_id(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        # Validar que repair sea un diccionario
        if not isinstance(repair, dict):
            logger.error(f"repair no es un diccionario: {type(repair)} - {repair}")
            await update.message.reply_text("❌ Error al obtener datos de la reparación")
            return
        
        # Obtener repuestos (si el backend lo soporta)
        spare_parts = api_client.get_repair_spare_parts(repair_id)
        
        if not spare_parts:
            text = f"🔧 *Reparación #{repair_id}*\n\n"
            text += f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            text += f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            text += f"📊 *Estado:* {repair.get('repair_status', 'N/A')}\n\n"
            text += "🔩 *No se han registrado repuestos para esta reparación*"
        else:
            # Validar que spare_parts sea una lista
            if not isinstance(spare_parts, list):
                logger.error(f"spare_parts no es una lista: {type(spare_parts)} - {spare_parts}")
                await update.message.reply_text("❌ Error al obtener repuestos")
                return
            
            total_repuestos = 0
            for part in spare_parts:
                if isinstance(part, dict):
                    total_repuestos += part.get('total_price', 0)
            
            text = f"🔧 *Reparación #{repair_id}*\n\n"
            text += f"👤 *Cliente:* {repair.get('client_name', 'N/A')}\n"
            text += f"📱 *Dispositivo:* {repair.get('device', 'N/A')}\n"
            text += f"📊 *Estado:* {repair.get('repair_status', 'N/A')}\n\n"
            text += "🔩 *Repuestos utilizados:*\n"
            
            for part in spare_parts:
                if not isinstance(part, dict):
                    logger.warning(f"Repuesto no es diccionario: {type(part)} - {part}")
                    continue
                    
                quantity = part.get('quantity', 0)
                product_name = part.get('product_name', 'Sin nombre')
                total_price = part.get('total_price', 0)
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
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")]]
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
        repair = api_client.get_device_by_id(repair_id)
        
        if not repair:
            await update.message.reply_text(f"❌ Reparación con ID {repair_id} no encontrada")
            return
        
        # Definir opciones de estado con emojis
        status_options = {
            "Reparado": "✅",
            "Sin Solución": "❌",
            "En Revisión": "🔍"
        }
        
        # Crear teclado dinámico
        keyboard = []
        for status, emoji in status_options.items():
            current_status = repair.get('repair_status', '')
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
        
        keyboard.append([InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")])
        
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
        
        logger.info(f"Actualizando reparación {repair_id} a estado: {new_status}")
        
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
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")]]
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
        repair = api_client.get_device_by_id(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        repair_data = {
            'id': repair['id'],
            'client_name': repair.get('client_name', 'N/A'),
            'number_phone': repair.get('number_phone', ''),
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
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")]]
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
        repair = api_client.get_device_by_id(repair_id)
        
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
        
        if repair.get('price', 0) <= 0:
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
    """Inicia el registro de un producto con preguntas"""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "➕ *Registrar nuevo producto*\n\n"
        "Por favor, responde las siguientes preguntas.\n\n"
        "📝 *¿Cuál es el nombre del producto?*\n\n"
        "Ejemplo: *Smartphone Samsung Galaxy A52*\n\n"
        "Para cancelar, usa /cancelar",
        parse_mode='Markdown'
    )
    return ADD_PRODUCT_NAME

async def add_product_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el nombre del producto y muestra opciones de categorías"""
    context.user_data['product_name'] = update.message.text
    
    # Obtener categorías de la base de datos
    categories = api_client.get_categories()
    
    if not categories:
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
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "📁 *¿Cuál es la categoría del producto?*\n\n"
        "Selecciona una de las opciones disponibles:",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )
    return ADD_PRODUCT_SELECT_CATEGORY

async def category_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la selección de categoría desde los botones"""
    query = update.callback_query
    await query.answer()
    
    # Extraer la categoría del callback_data
    # El callback_data tiene formato: category_nombredelacategoria
    category_name = query.data.replace("category_", "")
    context.user_data['product_category'] = category_name
    
    await query.edit_message_text(
        f"✅ Categoría seleccionada: *{category_name.title()}*\n\n"
        "📊 *¿Cuál es el stock inicial?*\n\n"
        "Ingresa solo el número (ejemplo: *10*)",
        parse_mode='Markdown'
    )
    return ADD_PRODUCT_STOCK

async def add_product_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe la categoría del producto (fallback si no se selecciona desde botones)"""
    context.user_data['product_category'] = update.message.text
    
    await update.message.reply_text(
        "📊 *¿Cuál es el stock inicial?*\n\n"
        "Ingresa solo el número (ejemplo: *10*)",
        parse_mode='Markdown'
    )
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
        await update.message.reply_text("❌ Por favor, ingresa un número válido para el stock:")
        return ADD_PRODUCT_STOCK

async def add_product_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el precio y guarda el producto"""
    try:
        price = float(update.message.text)
        if price < 0:
            await update.message.reply_text("❌ El precio no puede ser negativo. Intenta de nuevo:")
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
    context.user_data['repair_client'] = update.message.text
    
    await update.message.reply_text(
        "📞 *¿Teléfono del cliente?* (opcional)\n\n"
        "Puedes enviar 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_PHONE

async def add_repair_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el teléfono del cliente"""
    phone = update.message.text
    if phone.lower() == 'ninguno':
        context.user_data['repair_phone'] = None
    else:
        context.user_data['repair_phone'] = phone
    
    await update.message.reply_text(
        "📱 *¿Qué dispositivo trae a reparar?*\n\n"
        "Ejemplo: *Smartphone*, *Tablet*, *Laptop*",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_DEVICE

async def add_repair_device(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el tipo de dispositivo"""
    context.user_data['repair_device'] = update.message.text
    
    await update.message.reply_text(
        "🏷️ *¿Modelo del dispositivo?* (opcional)\n\n"
        "Ejemplo: *Samsung A52*, *iPhone 12*\n"
        "Envía 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_MODEL

async def add_repair_model(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el modelo del dispositivo"""
    model = update.message.text
    if model.lower() == 'ninguno':
        context.user_data['repair_model'] = None
    else:
        context.user_data['repair_model'] = model
    
    await update.message.reply_text(
        "🔢 *¿IMEI del dispositivo?* (opcional, 15 dígitos)\n\n"
        "Ejemplo: *123456789012345*\n"
        "Envía 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_IMEI

async def add_repair_imei(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el IMEI del dispositivo y muestra las fallas disponibles"""
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
    
    # Obtener fallas disponibles del backend
    faults = api_client.get_faults()
    
    if not faults:
        text = "⚠️ *No hay fallas/repuestos disponibles en este momento*\n\n"
        text += "Para continuar, escribe los IDs de las fallas manualmete"
    else:
        text = "⚠️ *Selecciona las fallas del dispositivo*\n\n"
        text += "Fallas/Repuestos disponibles:\n\n"
        for fault in faults[:15]:  # Mostrar máximo 15 opciones
            # Validar que fault es diccionario
            if not isinstance(fault, dict):
                logger.warning(f"Fault no es diccionario: {type(fault)} - {fault}")
                continue
                
            fault_id = fault.get('id', 'N/A')
            name = fault.get('name', 'Sin nombre')
            stock = fault.get('stock', 0)
            price = fault.get('price', 0)
            text += f"🔧 *ID {fault_id}*: {name} (Stock: {stock}, Precio: {format_currency(price)})\n"
    
    text += "\n📝 *¿Qué fallas aplican?*\n"
    text += "Ingresa los IDs separados por comas (ejemplo: *1,3,5*)"
    
    await update.message.reply_text(text, parse_mode='Markdown')
    return ADD_REPAIR_FAULTS

async def add_repair_faults(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe las fallas del dispositivo como IDs de productos"""
    try:
        faults_text = update.message.text.strip()
        
        # Validar que no esté vacío
        if not faults_text:
            await update.message.reply_text("❌ Por favor, ingresa al menos una falla (ID de producto).")
            return ADD_REPAIR_FAULTS
        
        # Parsear IDs: pueden ser "1" o "1,2,3"
        fault_ids = []
        if ',' in faults_text:
            parts = [p.strip() for p in faults_text.split(',')]
            fault_ids = []
            for part in parts:
                try:
                    fault_ids.append(int(part))
                except ValueError:
                    await update.message.reply_text(f"❌ '{part}' no es un ID válido. Debe ser un número.")
                    return ADD_REPAIR_FAULTS
        else:
            try:
                fault_ids = [int(faults_text)]
            except ValueError:
                await update.message.reply_text(f"❌ '{faults_text}' no es un ID válido. Debe ser un número.")
                return ADD_REPAIR_FAULTS
        
        # Convertir a objetos con id (formato que espera el backend)
        faults = [{'id': fault_id} for fault_id in fault_ids]
        context.user_data['repair_faults'] = faults
        
        # Confirmar las fallas seleccionadas
        faults_str = ', '.join([f"ID {f['id']}" for f in faults])
        await update.message.reply_text(
            f"✅ Fallas seleccionadas: {faults_str}\n\n"
            "📝 *¿Detalles adicionales?* (opcional)\n\n"
            "Información extra sobre el equipo o el problema.\n"
            "Envía 'ninguno' para omitir:",
            parse_mode='Markdown'
        )
        return ADD_REPAIR_DETAIL
    except Exception as e:
        logger.error(f"Error en add_repair_faults: {e}")
        await update.message.reply_text(f"❌ Error: {e}")
        return ADD_REPAIR_FAULTS
    
    await update.message.reply_text(
        "📝 *¿Detalles adicionales?* (opcional)\n\n"
        "Información extra sobre el equipo o el problema.\n"
        "Envía 'ninguno' para omitir:",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_DETAIL

async def add_repair_detail(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe detalles adicionales"""
    detail = update.message.text
    if detail.lower() == 'ninguno':
        context.user_data['repair_detail'] = None
    else:
        context.user_data['repair_detail'] = detail
    
    await update.message.reply_text(
        "💰 *¿Precio de la reparación?*\n\n"
        "Ingresa solo el número (ejemplo: *50000* para $50,000)",
        parse_mode='Markdown'
    )
    return ADD_REPAIR_PRICE

async def add_repair_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Recibe el precio y guarda la reparación"""
    try:
        price = float(update.message.text)
        if price < 0:
            await update.message.reply_text("❌ El precio no puede ser negativo. Intenta de nuevo:")
            return ADD_REPAIR_PRICE
        
        # Crear reparación a través del API
        device = api_client.create_device(
            client_name=context.user_data['repair_client'],
            number_phone=context.user_data.get('repair_phone', ''),
            device=context.user_data['repair_device'],
            model=context.user_data.get('repair_model', ''),
            faults=context.user_data.get('repair_faults', []),
            detail=context.user_data.get('repair_detail', ''),
            price=price,
            price_pay=0,  # Inicialmente sin pago
            imei=context.user_data.get('repair_imei', '')
        )
        
        if device:
            device_id = device.get('id', 'N/A')
            context.user_data['current_repair_id'] = device_id
            
            # Preguntar si quiere agregar repuestos
            keyboard = [
                [InlineKeyboardButton("✅ Sí, agregar repuestos", callback_data="add_spare_parts")],
                [InlineKeyboardButton("❌ No, continuar sin repuestos", callback_data="skip_spare_parts")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                f"✅ *Reparación registrada parcialmente!*\n\n"
                f"🆔 *ID:* {device_id}\n"
                f"👤 *Cliente:* {context.user_data['repair_client']}\n"
                f"📱 *Dispositivo:* {context.user_data['repair_device']}\n"
                f"💰 *Precio:* {format_currency(price)}\n\n"
                "¿Deseas agregar repuestos usados en esta reparación?\n"
                "Los repuestos se descontarán automáticamente del inventario.",
                parse_mode='Markdown',
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_text("❌ Error al guardar la reparación. Intenta de nuevo.")
            return ADD_REPAIR_PRICE
        
        return ConversationHandler.END
        
    except ValueError:
        await update.message.reply_text("❌ Por favor, ingresa un número válido para el precio:")
        return ADD_REPAIR_PRICE
    except Exception as e:
        logger.error(f"Error en add_repair_price: {e}")
        await update.message.reply_text(f"❌ Error al guardar: {e}")
        return ConversationHandler.END
# add repair 
async def add_spare_parts_to_repair(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Permite agregar repuestos a una reparación"""
    query = update.callback_query
    await query.answer()
    
    repair_id = context.user_data.get('current_repair_id')
    if not repair_id:
        await query.edit_message_text("❌ Error: No se encontró la reparación")
        return
    
    context.user_data['adding_spare_parts'] = True
    context.user_data['spare_parts_list'] = []
    
    keyboard = [
        [InlineKeyboardButton("➕ Agregar repuesto", callback_data="add_spare_part")],
        [InlineKeyboardButton("✅ Finalizar y continuar", callback_data="finish_spare_parts")],
        [InlineKeyboardButton("❌ Saltar (sin repuestos)", callback_data="skip_spare_parts")]
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
    
    context.user_data['adding_spare_part'] = True
    
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="add_spare_parts")]]
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
        
        keyboard = [
            [InlineKeyboardButton("➕ Agregar otro repuesto", callback_data="add_spare_part")],
            [InlineKeyboardButton("✅ Finalizar", callback_data="finish_spare_parts")],
            [InlineKeyboardButton("❌ Cancelar", callback_data="add_spare_parts")]
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
            return
        
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
        context.user_data.pop('adding_spare_parts', None)
        context.user_data.pop('spare_parts_list', None)
        context.user_data.pop('adding_spare_part', None)
        
        # Volver al menú de reparaciones
        keyboard = [[InlineKeyboardButton("◀️ Volver al menú", callback_data="menu_reparaciones")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.message.reply_text(
            "¿Qué deseas hacer ahora?",
            reply_markup=reply_markup
        )
        
    except Exception as e:
        logger.error(f"Error en finish_spare_parts: {e}")
        await query.edit_message_text(f"❌ Error al guardar repuestos: {e}")

async def skip_spare_parts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Omite la adición de repuestos"""
    query = update.callback_query
    await query.answer()
    
    context.user_data.pop('adding_spare_parts', None)
    context.user_data.pop('spare_parts_list', None)
    
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
    monthly_sales = api_client.get_monthly_sales()
    
    if not monthly_sales or not monthly_sales.get('top_products'):
        text = "📊 <b>Top 10 productos más vendidos (este mes)</b>\n\n"
        text += "📭 No hay datos de ventas disponibles."
    else:
        top_products = monthly_sales.get('top_products', [])[:10]
        text = "📊 <b>Top 10 productos más vendidos (este mes)</b>\n\n"
        
        for idx, product in enumerate(top_products, 1):
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

async def daily_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
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

async def monthly_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
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
    keyboard = [[InlineKeyboardButton("◀️ Cancelar", callback_data="menu_reparaciones")]]
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
        repair = api_client.get_device_by_id(repair_id)
        
        if not repair:
            await update.message.reply_text("❌ Reparación no encontrada")
            return
        
        # Verificar condiciones para entrega
        if not repair.get('pay', False):
            await update.message.reply_text(
                f"⚠️ *No se puede entregar el dispositivo*\n\n"
                f"El pago aún no ha sido registrado.\n"
                f"💰 Monto pendiente: {format_currency(repair.get('price', 0))}\n\n"
                f"Primero registra el pago usando la opción correspondiente.",
                parse_mode='Markdown'
            )
            return
        
        if repair.get('repair_status') != 'Reparado':
            await update.message.reply_text(
                f"⚠️ *No se puede entregar el dispositivo*\n\n"
                f"El equipo está en estado: {repair.get('repair_status', 'N/A')}\n"
                f"Para poder entregar, el estado debe ser 'Reparado'",
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
            [InlineKeyboardButton("❌ Cancelar", callback_data="menu_reparaciones")]
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

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancela cualquier operación o conversación activa"""
    # Limpiar todas las acciones y datos temporales
    context.user_data.clear()
    
    keyboard = [[InlineKeyboardButton("🏠 Menú Principal", callback_data="back_to_main")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🚫 Operación cancelada. Puedes volver al menú principal:",
        reply_markup=reply_markup
    )
    return ConversationHandler.END

# ============ AGREGAR CATEGORÍAS ============
async def add_category_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia el registro de una nueva categoría"""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "➕ *Agregar nueva categoría*\n\n"
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
        result = api_client.create_category(category_name)
        
        if result:
            await update.message.reply_text(
                f"✅ *Categoría creada exitosamente*\n\n"
                f"📌 Nombre: *{result.get('name', category_name)}*",
                parse_mode='Markdown'
            )
            
            keyboard = [[InlineKeyboardButton("📦 Volver a productos", callback_data="menu_productos")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "¿Qué deseas hacer ahora?",
                reply_markup=reply_markup
            )
            return ConversationHandler.END
        else:
            await update.message.reply_text(
                f"❌ No se pudo crear la categoría.\n\n"
                f"Posibles razones:\n"
                f"• La categoría ya existe\n"
                f"• Error de conexión con el servidor\n\n"
                f"Por favor, intenta nuevamente:"
            )
            return ADD_CATEGORY_NAME
            
    except Exception as e:
        logger.error(f"Error al crear categoría: {e}")
        await update.message.reply_text(
            f"❌ Error al crear la categoría: {str(e)}\n\n"
            f"Por favor, intenta nuevamente:"
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
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("ayuda", ayuda))
        application.add_handler(CommandHandler("cancelar", cancel))
        application.add_handler(CommandHandler("help", help_command))
        
        # Admin commands
        application.add_handler(CommandHandler("agregar_usuario", agregar_usuario_admin))
        application.add_handler(CommandHandler("usuarios", lista_usuarios_admin))
        application.add_handler(CommandHandler("eliminar_usuario", eliminar_usuario_admin))

        # ============ 2. CONVERSACIONES ============
        # Conversación para agregar productos
        add_product_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_product_start, pattern="^add_product$")],
            states={
                ADD_PRODUCT_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_name)],
                ADD_PRODUCT_SELECT_CATEGORY: [CallbackQueryHandler(category_selected, pattern="^category_")],
                ADD_PRODUCT_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_category)],
                ADD_PRODUCT_STOCK: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_stock)],
                ADD_PRODUCT_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_product_price)],
            },
            fallbacks=[CommandHandler("cancelar", cancel)],
            per_message=False,
            per_chat=True,
        )
        
        # Conversación para agregar reparaciones
        add_repair_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_repair_start, pattern="^add_repair$")],
            states={
                ADD_REPAIR_CLIENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_client)],
                ADD_REPAIR_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_phone)],
                ADD_REPAIR_DEVICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_device)],
                ADD_REPAIR_MODEL: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_model)],
                ADD_REPAIR_IMEI: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_imei)],
                ADD_REPAIR_FAULTS: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_faults)],
                ADD_REPAIR_DETAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_detail)],
                ADD_REPAIR_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_repair_price)],
            },
            fallbacks=[CommandHandler("cancelar", cancel)],
            per_message=False,
            per_chat=True,
        )
        
        # Conversación para agregar categorías
        add_category_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(add_category_start, pattern="^add_category$")],
            states={
                ADD_CATEGORY_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_category_name)],
            },
            fallbacks=[CommandHandler("cancelar", cancel)],
            per_message=False,
            per_chat=True,
        )
        
        application.add_handler(add_product_conv)
        application.add_handler(add_repair_conv)
        application.add_handler(add_category_conv)

        # ============ 3. CALLBACKS / BOTONES ============
        # Menús principales
        application.add_handler(CallbackQueryHandler(register_delivery_start, pattern="^register_delivery$"))
        application.add_handler(CallbackQueryHandler(confirm_delivery, pattern="^confirm_delivery$"))
        application.add_handler(CallbackQueryHandler(view_spare_parts, pattern="^view_spare_parts$"))
        application.add_handler(CallbackQueryHandler(add_spare_parts_to_repair, pattern="^add_spare_parts$"))
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
        application.add_handler(CallbackQueryHandler(daily_sales, pattern="^daily_sales$"))
        application.add_handler(CallbackQueryHandler(monthly_sales, pattern="^monthly_sales$"))
        
        # Estadísticas
        application.add_handler(CallbackQueryHandler(top_products, pattern="^top_products$"))
        application.add_handler(CallbackQueryHandler(total_income, pattern="^total_income$"))
        application.add_handler(CallbackQueryHandler(repairs_stats, pattern="^repairs_stats$"))
        
        # Utilidades
        application.add_handler(CallbackQueryHandler(test_printer, pattern="^test_printer$"))
        application.add_handler(CallbackQueryHandler(back_to_main, pattern="^disabled$"))  # Botón deshabilitado

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