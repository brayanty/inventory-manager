import requests
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class APIClient:
    """Cliente para interactuar con el backend API"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv('BACKEND_URL', 'https://localhost:3000/api')
        self.timeout = 10
        # Deshabilitar SSL para desarrollo
        self.verify_ssl = os.getenv('VERIFY_SSL', 'False').lower() == 'true'
    
    def _make_request(self, method: str, endpoint: str, data: Dict[str, Any] = None, params: Dict[str, Any] = None, files: Any = None) -> Optional[requests.Response]:
        """Realiza una solicitud HTTP al backend (Soporta JSON y Multipart)"""
        url = f"{self.base_url}{endpoint}"
    
        try:
            # 1. No fijamos el Content-Type si hay archivos. 
            # Requests lo pondrá automáticamente como 'multipart/form-data'
            headers = {}
            if not files:
                headers['Content-Type'] = 'application/json'
        
            # 2. Elegimos entre 'json=' (para texto puro) o 'data=' (para multipart)
            # Si hay archivos, los datos deben ir en 'data', no en 'json'
            kwargs = {
                'headers': headers,
                'timeout': self.timeout,
                'verify': self.verify_ssl,
                'params': params
            }

            if files:
                kwargs['data'] = data  # En multipart, los campos de texto van aquí
                kwargs['files'] = files
            else:
                kwargs['json'] = data  # En API normal, van aquí

            # 3. Realizar la petición
            if method == 'GET':
                response = requests.get(url, **kwargs)
            elif method == 'POST':
                response = requests.post(url, **kwargs)
            elif method == 'PUT':
                response = requests.put(url, **kwargs)
            elif method == 'DELETE':
                response = requests.delete(url, **kwargs)
            else:
                logger.error(f"Método HTTP no soportado: {method}")
                return None
        
            response.raise_for_status()
            return response
    
        except requests.exceptions.RequestException as e:
            # Agrupé las excepciones para no repetir tanto código, 
            # pero puedes mantener tus bloques específicos si prefieres.
            logger.error(f"Error en solicitud {method} a {url}: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Detalle del error: {e.response.text}")
            return None
        # ============ PRODUCTOS ============
    def get_products(self) -> List[Dict[str, Any]]:
        """Obtiene todos los productos"""
        response = self._make_request('GET', '/products')
        if response and response.status_code == 200:
            try:
                response_data = response.json().get('data', {})
                # El backend retorna {page, limit, totalItems, totalPages, products: [...]}
                if isinstance(response_data, dict) and 'products' in response_data:
                    products = response_data.get('products', [])
                    if not isinstance(products, list):
                        logger.error(f"get_products() esperaba lista de productos, recibió {type(products)}")
                        return []
                    return products
                elif isinstance(response_data, list):
                    # Si es directamente una lista, usarla
                    return response_data
                else:
                    logger.error(f"get_products() formato inesperado: {type(response_data)}")
                    return []
            except Exception as e:
                logger.error(f"Error parseando productos: {e}")
                return []
        return []
    
    def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene un producto por ID"""
        response = self._make_request('GET', f'/products/{product_id}')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data')
                if data is not None and not isinstance(data, dict):
                    logger.error(f"get_product_by_id() esperaba dict, recibió {type(data)}: {data}")
                    return None
                return data
            except Exception as e:
                logger.error(f"Error parseando producto: {e}")
                return None
        return None
    
    def create_product(self, name: str, category: str, stock: int, price: float) -> Optional[Dict[str, Any]]:
        """Crea un nuevo producto"""
        data = {
            'name': name,
            'category': category,
            'stock': stock,
            'price': price
        }
        response = self._make_request('POST', '/products', data=data)
        if response and response.status_code == 201:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"create_product() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando producto creado: {e}")
                return None
        return None
    
    def update_product_stock(self, product_id: int, new_stock: int) -> Optional[Dict[str, Any]]:
        """Actualiza el stock de un producto"""
        data = {'stock': new_stock}
        response = self._make_request('PUT', f'/products/{product_id}', data=data)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"update_product_stock() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando actualización: {e}")
                return None
        return None
    
    def update_product(self, product_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Actualiza un producto"""
        response = self._make_request('PUT', f'/products/{product_id}', data=kwargs)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"update_product() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando producto actualizado: {e}")
                return None
        return None
    
    def delete_product(self, product_id: int) -> bool:
        """Elimina un producto"""
        response = self._make_request('DELETE', f'/products/{product_id}')
        return response and response.status_code == 200
    
    # ============ CATEGORÍAS ============
    def get_categories(self) -> List[Dict[str, Any]]:
        """Obtiene todas las categorías"""
        response = self._make_request('GET', '/category')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data', [])
                if not isinstance(data, list):
                    logger.error(f"get_categories() esperaba lista, recibió {type(data)}: {data}")
                    return []
                return data
            except Exception as e:
                logger.error(f"Error parseando categorías: {e}")
                return []
        return []
    
    def create_category(self, name: str) -> Optional[Dict[str, Any]]:
        """Crea una nueva categoría"""
        data = {'name': name}
        response = self._make_request('POST', '/category', data=data)
        if response and response.status_code == 201:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"create_category() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando categoría creada: {e}")
                return None
        return None
    
    # ============ REPARACIONES / DISPOSITIVOS ============
    def get_faults(self, search: str = "") -> List[Dict[str, Any]]:
        """Obtiene todas las fallas/repuestos disponibles con búsqueda opcional"""
        # Buscar en el endpoint de reparaciones que filtra por categorías específicas
        response = self._make_request('GET', f'/repairs?search={search}')
        if response and response.status_code == 200:
            try:
                response_data = response.json()
                
                # Manejar diferentes formatos de respuesta
                if isinstance(response_data, dict):
                    products = response_data.get('data', [])
                elif isinstance(response_data, list):
                    # Si la respuesta es directamente una lista
                    products = response_data
                else:
                    logger.error(f"Formato de respuesta inesperado: {type(response_data)}")
                    return []
                
                # Validar que products es una lista
                if not isinstance(products, list):
                    logger.error(f"'data' no es una lista: {type(products)}")
                    return []
                
                # Filtrar solo productos con stock > 0 y que sean diccionarios válidos
                available = []
                for p in products:
                    if isinstance(p, dict) and p.get('stock', 0) > 0:
                        available.append(p)
                    elif not isinstance(p, dict):
                        logger.warning(f"Item no es diccionario: {type(p)} - {p}")
                
                logger.info(f"get_faults('{search}') retornando {len(available)} productos disponibles")
                return available
            except Exception as e:
                logger.error(f"Error parseando respuesta de productos: {e}")
                return []
        return []
    
    def get_devices(self) -> List[Dict[str, Any]]:
        """Obtiene todas las reparaciones/dispositivos"""
        response = self._make_request('GET', '/devices')
        if response and response.status_code == 200:
            try:
                response_data = response.json().get('data', {})
                # El backend retorna {page, limit, totalItems, totalPages, devices: [...]}
                if isinstance(response_data, dict) and 'devices' in response_data:
                    devices = response_data.get('devices', [])
                    if not isinstance(devices, list):
                        logger.error(f"get_devices() esperaba lista de dispositivos, recibió {type(devices)}")
                        return []
                    return devices
                elif isinstance(response_data, list):
                    # Si es directamente una lista, usarla
                    return response_data
                else:
                    logger.error(f"get_devices() formato inesperado: {type(response_data)}")
                    return []
            except Exception as e:
                logger.error(f"Error parseando dispositivos: {e}")
                return []
        return []
    
    def get_device_by_id(self, device_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene una reparación por ID"""
        response = self._make_request('GET', f'/devices/{device_id}')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data')
                logger.info(f"get_device_by_id({device_id}) data obtenida: {data}")
                if data is None:
                    return None
                # El backend retorna data como una lista, extraer el primer elemento
                if isinstance(data, list):
                    return data[0] if data else None
                elif isinstance(data, dict):
                    return data
                else:
                    logger.error(f"get_device_by_id() tipo inesperado: {type(data)}")
                    return None
            except Exception as e:
                logger.error(f"Error parseando dispositivo: {e}")
                return None
        return None

    def _normalize_phone(self, number_phone: Optional[str]) -> Optional[str]:
        if not number_phone:
            return ""

        phone_digits = ''.join(c for c in str(number_phone) if c.isdigit())
        if phone_digits and (len(phone_digits) < 7 or len(phone_digits) > 15):
            logger.error(f"Número de teléfono inválido: {number_phone}. Debe tener entre 7 y 15 dígitos")
            return None

        return phone_digits

    def _normalize_imei(self, imei: Optional[str]) -> str:
        if not imei:
            return ""

        imei_digits = ''.join(c for c in str(imei) if c.isdigit())
        if len(imei_digits) != 15:
            logger.warning(f"IMEI inválido: {imei}. Debe tener 15 dígitos. Omitiendo IMEI")
            return ""

        return imei_digits

    def _normalize_faults(self, faults: Optional[List[Any]]) -> List[Dict[str, Any]]:
        if not faults:
            return []

        return [fault if isinstance(fault, dict) else {} for fault in faults]

    def create_device(self, data_device: Dict[str, Any], images: list = [] ) -> Optional[Dict[str, Any]]:
        """Crea un nuevo registro de reparación"""
        # Validar y transformar datos
        client_name = data_device.get("client_name")
        if not client_name or len(client_name) < 3:
            logger.error("client_name debe tener al menos 3 caracteres")
            return None
        
        device = data_device.get("device")
        if not device or len(device) < 2:
            logger.error("device debe tener al menos 2 caracteres")
            return None

        model = data_device.get("model")
        if not model or len(model) < 2:
            logger.error("model debe tener al menos 2 caracteres")
            return None
        
        # Validar número de teléfono (debe ser entre 7 y 15 dígitos, pero es opcional)
        number_phone = data_device.get("number_phone")
        if number_phone:
            phone_digits = ''.join(c for c in str(number_phone) if c.isdigit())
            if phone_digits and (len(phone_digits) < 7 or len(phone_digits) > 15):
                logger.error(f"Número de teléfono inválido: {number_phone}. Debe tener entre 7 y 15 dígitos")
                return None
        else:
            phone_digits = ""  # Teléfono opcional
        
        # Validar IMEI (debe ser 15 dígitos si se proporciona)
        imei = data_device.get("imei")
        if imei:
            imei_digits = ''.join(c for c in str(imei) if c.isdigit())
            if len(imei_digits) != 15:
                logger.warning(f"IMEI inválido: {imei}. Debe tener 15 dígitos. Omitiendo IMEI")
                imei = None
        
        # Transformar faults de strings a objetos con id
        # Si son strings, creamos objetos vacíos (sin id)
        transformed_faults = []
        data_faults = data_device.get("faults", [])
        if data_faults:
            for fault in data_faults:
                if isinstance(fault, dict):
                    # Ya es un diccionario, usarlo tal cual
                    transformed_faults.append(fault)
                elif isinstance(fault, str):
                    # Es una string, crear objeto sin id (backend lo manejará)
                    transformed_faults.append({})
                else:
                    transformed_faults.append({})
        # ✅ CORREGIDO: Usar el parámetro 'images' que se pasa como argumento
        # No intentar obtenerlo de data_device
        images = images or []
        payload = {
            'client_name': client_name,
            'number_phone': phone_digits,
            'device': device,
            'model': model,
            'faults': json.dumps(transformed_faults), # Los arrays deben ir como string en multipart
            'detail': data_device.get("detail") or "",
            'price': float(data_device.get("price") or 0),
            'price_pay': float(data_device.get("price_pay") or 0),
            'imei': imei or ""
        }
        
        
        response = self._make_request('POST', '/devices', data=payload,files=images)
        if response and response.status_code == 201:
            try:
                full_response = response.json()
                result = full_response.get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"create_device() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando dispositivo creado: {e}")
                return None
        return None
    
    def update_device_status(self, device_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Actualiza el estado de una reparación"""
        data = {'repair_status': status}
        response = self._make_request('PUT', f'/devices/{device_id}', data=data)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"update_device_status() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando dispositivo actualizado: {e}")
                return None
        return None
    
    def update_device(self, device_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Actualiza un dispositivo/reparación"""
        response = self._make_request('PUT', f'/devices/{device_id}', data=kwargs)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"update_device() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando dispositivo actualizado: {e}")
                return None
        return None
    
    def register_payment(self, device_id: int) -> Optional[Dict[str, Any]]:
        """Registra el pago de una reparación"""
        data = {'pay': True, 'price_pay': None}  # El backend establecerá price_pay
        response = self._make_request('PUT', f'/devices/{device_id}', data=data)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"register_payment() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando pago registrado: {e}")
                return None
        return None
    
    def register_delivery(self, device_id: int) -> Optional[Dict[str, Any]]:
        """Registra la entrega de una reparación"""
        data = {'output_status': True}
        response = self._make_request('PUT', f'/devices/status/{device_id}', data=data)
        if response and response.status_code == 200:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"register_delivery() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando entrega registrada: {e}")
                return None
        return None
    
    def delete_device(self, device_id: int) -> bool:
        """Elimina un dispositivo (soft delete)"""
        response = self._make_request('DELETE', f'/devices/{device_id}')
        return response and response.status_code == 200
    
    def get_repairs_pending_payment(self) -> List[Dict[str, Any]]:
        """Obtiene reparaciones pendientes de pago"""
        response = self._make_request('GET', '/repairs')
        if response and response.status_code == 200:
            try:
                response_data = response.json().get('data', {})
                # Manejar tanto estructura paginada como lista directa
                if isinstance(response_data, dict) and 'devices' in response_data:
                    repairs = response_data.get('devices', [])
                elif isinstance(response_data, list):
                    repairs = response_data
                else:
                    logger.error(f"get_repairs_pending_payment() formato inesperado: {type(response_data)}")
                    return []
                
                if not isinstance(repairs, list):
                    logger.error(f"get_repairs_pending_payment() esperaba lista, recibió {type(repairs)}")
                    return []
                # Filtrar solo las que están reparadas y no pagadas
                return [r for r in repairs if isinstance(r, dict) and r.get('repair_status') == 'Reparado' and not r.get('pay')]
            except Exception as e:
                logger.error(f"Error parseando reparaciones pendientes: {e}")
                return []
        return []
    
    # ============ REPUESTOS ============
    def add_spare_parts_to_repair(self, repair_id: int, spare_parts: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Agrega repuestos a una reparación"""
        # Este endpoint puede variar según tu backend
        data = {'spare_parts': spare_parts}
        response = self._make_request('POST', f'/devices/{repair_id}/spare-parts', data=data)
        if response and response.status_code in [200, 201]:
            try:
                result = response.json().get('data')
                if result is not None and not isinstance(result, dict):
                    logger.error(f"add_spare_parts_to_repair() esperaba dict, recibió {type(result)}: {result}")
                    return None
                return result
            except Exception as e:
                logger.error(f"Error parseando repuestos agregados: {e}")
                return None
        return None
    
    def get_repair_spare_parts(self, repair_id: int) -> List[Dict[str, Any]]:
        """Obtiene los repuestos de una reparación"""
        # Este endpoint puede variar según tu backend
        response = self._make_request('GET', f'/devices/{repair_id}/spare-parts')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data', [])
                if not isinstance(data, list):
                    logger.error(f"get_repair_spare_parts() esperaba lista, recibió {type(data)}: {data}")
                    return []
                return data
            except Exception as e:
                logger.error(f"Error parseando repuestos: {e}")
                return []
        return []
    
    # ============ AUTENTICACIÓN DE USUARIOS ============
    def register_user(self, user_id: int, username: str = None) -> bool:
        """Registra un nuevo usuario en el sistema"""
        data = {
            'userId': str(user_id),
            'username': username or f"User_{user_id}"
        }
        response = self._make_request('POST', '/users/register', data=data)
        if response and response.status_code in [200, 201]:
            try:
                result = response.json()
                logger.info(f"Usuario {user_id} registrado exitosamente")
                return True
            except Exception as e:
                logger.error(f"Error registrando usuario: {e}")
                return False
        return False
    
    def verify_user(self, user_id: int) -> bool:
        """Verifica si un usuario está registrado"""
        response = self._make_request('GET', f'/users/verify/{user_id}')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data', {})
                is_registered = data.get('isRegistered', False)
                logger.info(f"Usuario {user_id} verificado: {is_registered}")
                return is_registered
            except Exception as e:
                logger.error(f"Error verificando usuario: {e}")
                return False
        return False
    
    def list_registered_users(self) -> List[str]:
        """Obtiene la lista de usuarios registrados (solo para admin)"""
        response = self._make_request('GET', '/users/list')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data', {})
                users = data.get('users', [])
                if not isinstance(users, list):
                    logger.error(f"list_registered_users() esperaba lista, recibió {type(users)}")
                    return []
                return users
            except Exception as e:
                logger.error(f"Error listando usuarios: {e}")
                return []
        return []
    
    # ============ VENTAS ============
    def get_daily_sales(self) -> Optional[Dict[str, Any]]:
        """Obtiene las ventas del día actual"""
        response = self._make_request('GET', '/dailySales')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data')
                if data is not None and not isinstance(data, dict):
                    logger.error(f"get_daily_sales() esperaba dict, recibió {type(data)}")
                    return None
                return data
            except Exception as e:
                logger.error(f"Error obteniendo ventas del día: {e}")
                return None
        return None
    
    def get_monthly_sales(self) -> Optional[Dict[str, Any]]:
        """Obtiene las ventas del mes actual"""
        response = self._make_request('GET', '/monthlySales')
        if response and response.status_code == 200:
            try:
                data = response.json().get('data')
                if data is not None and not isinstance(data, dict):
                    logger.error(f"get_monthly_sales() esperaba dict, recibió {type(data)}")
                    return None
                return data
            except Exception as e:
                logger.error(f"Error obteniendo ventas del mes: {e}")
                return None
        return None

# Instancia global del cliente API
api_client = APIClient()
