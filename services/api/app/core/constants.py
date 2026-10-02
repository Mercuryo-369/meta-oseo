"""Constantes de dominio compartidas entre modelos, esquemas y servicios."""

# Cantidad de módulos temáticos del OVA (docs/api-contract.md: siempre 6, numerados 1..6).
MODULE_COUNT = 6

# Límites de los cuerpos de progreso y actividades (docs/api-contract.md).
MAX_SECTION_LENGTH = 64
MAX_TIME_DELTA_SECONDS = 3600
MAX_ACTIVITY_SCORE = 1000
MAX_ACTIVITY_ATTEMPTS = 100
MAX_ACTIVITY_DETAIL_BYTES = 4 * 1024

# Formato del identificador de actividad, p. ej. `m1_capas_hueso`.
ACTIVITY_ID_PATTERN = r"^[a-z0-9_-]{1,64}$"

# Límite de intentos de acceso (register + login) por IP y ventana.
AUTH_RATE_LIMIT_ATTEMPTS = 10
AUTH_RATE_LIMIT_WINDOW_SECONDS = 60

# Límite del mentor (`POST /api/chat`, F1-07): peticiones por minuto y por usuario.
CHAT_RATE_LIMIT_REQUESTS = 20
CHAT_RATE_LIMIT_WINDOW_SECONDS = 60

# Mentor (F3-09/F3-10): cuántos mensajes recientes devuelve el historial (por defecto y máximo).
CHAT_HISTORY_DEFAULT_LIMIT = 50
CHAT_HISTORY_MAX_LIMIT = 100
# El «día» del límite diario es el calendario de Colombia (UTC-5), como el certificado.
CHAT_DAY_UTC_OFFSET_HOURS = -5

# Límite de la verificación pública de certificados (`GET /api/verify/{codigo}`): por IP.
VERIFY_RATE_LIMIT_ATTEMPTS = 20
VERIFY_RATE_LIMIT_WINDOW_SECONDS = 60

# Límite de la descarga del PDF (generarlo cuesta CPU): por usuario.
PDF_RATE_LIMIT_REQUESTS = 10
PDF_RATE_LIMIT_WINDOW_SECONDS = 60

# Títulos de los módulos, para el certificado. Deben coincidir con `apps/web/src/data/modulos.ts`
# (igual que la lista de tipos de identificación: una copia por lado, este es el lado del servidor).
MODULE_TITLES: dict[int, str] = {
    1: "Conociendo el hueso",
    2: "Descubriendo sus células",
    3: "Construyendo hueso",
    4: "Transformando la matriz",
    5: "Renovando el hueso",
    6: "El paso del tiempo",
}

# Nombre del OVA impreso en el certificado.
OVA_TITLE = "Metabolismo óseo: un viaje interactivo desde la célula hasta el hueso"

# Hora local que se imprime en el certificado: Colombia (UTC-5, sin horario de verano). Supuesto de
# contexto colombiano, igual que la lista de identificaciones; la API siempre devuelve UTC.
CERT_UTC_OFFSET_HOURS = -5
