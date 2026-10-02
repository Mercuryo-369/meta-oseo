"""Configuración: valores por defecto, .env de ejemplo, protección de producción y motor SQLite."""

import pytest
from pydantic import ValidationError

from app.core.db import build_engine, ensure_schema, resolve_database_url
from app.core.settings import API_DIR, DEFAULT_SECRET_KEY, REPO_ROOT, Settings

STRONG_SECRET = "una-clave-de-produccion-larga-y-aleatoria-1234567890"
PUBLIC_URL = "https://ova.midominio.edu"


def make_settings(**kwargs) -> Settings:
    return Settings(_env_file=None, **kwargs)


def test_valores_por_defecto():
    settings = make_settings()
    assert settings.env == "dev"
    assert settings.secret_key == DEFAULT_SECRET_KEY
    assert settings.database_url == "sqlite:///./data/ova.db"
    assert settings.trust_proxy is False
    assert settings.anthropic_configured is False
    assert settings.anthropic_model == "claude-opus-5"
    assert settings.allowed_origins == ["http://localhost:5173"]


def test_produccion_rechaza_la_clave_por_defecto():
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        make_settings(env="prod")
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        make_settings(env="prod", secret_key="cambiar-en-produccion")


def test_produccion_rechaza_clave_corta():
    with pytest.raises(ValidationError, match="al menos"):
        make_settings(env="prod", secret_key="corta")


def test_produccion_acepta_clave_propia():
    assert make_settings(env="prod", secret_key=STRONG_SECRET, public_base_url=PUBLIC_URL).is_prod


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:5173",
        "http://localhost:8080/",
        "https://LOCALHOST",
        "http://127.0.0.1:8080",
        "http://127.1.2.3",
        "http://[::1]:8080",
        "http://0.0.0.0:8080",
        "http://ova.localhost",
        "localhost:8080",
    ],
)
def test_produccion_rechaza_public_base_url_local(url):
    with pytest.raises(ValidationError, match="PUBLIC_BASE_URL"):
        make_settings(env="prod", secret_key=STRONG_SECRET, public_base_url=url)


def test_produccion_rechaza_el_public_base_url_por_defecto():
    # Copiar el .env.example sin editarlo deja localhost: la API no debe arrancar así.
    with pytest.raises(ValidationError, match="PUBLIC_BASE_URL"):
        make_settings(env="prod", secret_key=STRONG_SECRET)


@pytest.mark.parametrize(
    "url",
    [
        "https://ova.midominio.edu",
        "https://ova.midominio.edu/",
        "http://192.168.1.20:8080",
        "http://ova.local:8080",
        "https://localhost.midominio.edu",
    ],
)
def test_produccion_acepta_public_base_url_publica(url):
    assert make_settings(env="prod", secret_key=STRONG_SECRET, public_base_url=url).is_prod


def test_desarrollo_permite_public_base_url_local():
    assert make_settings(public_base_url="http://localhost:5173").public_base_url == (
        "http://localhost:5173"
    )


def test_la_clave_no_se_filtra_en_repr():
    assert STRONG_SECRET not in repr(make_settings(secret_key=STRONG_SECRET))


def test_lee_variables_de_entorno(monkeypatch):
    monkeypatch.setenv("ENV", "prod")
    monkeypatch.setenv("SECRET_KEY", STRONG_SECRET)
    monkeypatch.setenv("PUBLIC_BASE_URL", PUBLIC_URL)
    monkeypatch.setenv("TRUST_PROXY", "true")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example, https://b.example/")
    settings = make_settings()
    assert settings.is_prod
    assert settings.trust_proxy is True
    assert settings.access_token_expire_minutes == 30
    assert settings.allowed_origins == ["https://a.example", "https://b.example"]


def test_origenes_como_lista_json(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", '["https://a.example","https://b.example"]')
    assert make_settings().allowed_origins == ["https://a.example", "https://b.example"]


def test_la_entrada_directa_gana_al_entorno(monkeypatch):
    monkeypatch.setenv("MENTOR_EFFORT", "low")
    assert make_settings(mentor_effort="high").mentor_effort == "high"


@pytest.mark.parametrize("prefix", ["postgresql://", "postgres://"])
def test_postgres_usa_el_driver_psycopg(prefix):
    settings = make_settings(database_url=f"{prefix}u:p@localhost:5432/ova_x")
    assert settings.database_url == "postgresql+psycopg://u:p@localhost:5432/ova_x"


def test_env_example_de_la_raiz_es_valido():
    """El .env.example se puede copiar tal cual a .env: sus comentarios en línea no rompen nada."""
    settings = Settings(_env_file=REPO_ROOT / ".env.example")
    assert settings.env == "dev"
    assert settings.access_token_expire_minutes == 10080
    assert settings.database_url == "sqlite:///./data/ova.db"
    assert settings.allowed_origins == ["http://localhost:5173"]
    assert settings.mentor_max_tokens == 16000
    assert settings.trust_proxy is False
    assert not settings.anthropic_configured


def test_env_example_documenta_todas_las_variables():
    ejemplo = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    for nombre in Settings.model_fields:
        assert nombre.upper() in ejemplo, f"{nombre.upper()} falta en .env.example"


def test_sqlite_relativo_se_resuelve_desde_services_api():
    url = resolve_database_url("sqlite:///./data/ova.db")
    assert url.database is not None
    assert url.database.replace("\\", "/") == (API_DIR / "data" / "ova.db").as_posix()


def test_sqlite_en_memoria_y_postgres_no_se_reescriben():
    assert resolve_database_url("sqlite://").database in (None, "")
    assert resolve_database_url("sqlite:///:memory:").database == ":memory:"
    assert resolve_database_url("postgresql+psycopg://u@h/db").database == "db"


def test_sqlite_activa_claves_foraneas_y_crea_el_directorio(tmp_path):
    destino = tmp_path / "nivel1" / "nivel2" / "ova.db"
    engine = build_engine(f"sqlite:///{destino.as_posix()}")
    try:
        with engine.connect() as connection:
            assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
        assert destino.exists()
    finally:
        engine.dispose()


def test_ensure_schema_falla_con_base_vacia(tmp_path):
    engine = build_engine(f"sqlite:///{(tmp_path / 'vacia.db').as_posix()}")
    try:
        with pytest.raises(RuntimeError, match="alembic upgrade head"):
            ensure_schema(engine)
    finally:
        engine.dispose()


def test_ensure_schema_acepta_base_migrada(engine):
    ensure_schema(engine)


def test_certificado_valores_por_defecto_y_limites():
    settings = Settings(_env_file=None)
    assert settings.cert_min_porcentaje == 70
    assert settings.public_base_url == "http://localhost:5173"
    for invalido in (-1, 101):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, cert_min_porcentaje=invalido)
    assert Settings(_env_file=None, cert_min_porcentaje=0).cert_min_porcentaje == 0
    assert Settings(_env_file=None, cert_min_porcentaje=100).cert_min_porcentaje == 100


def test_public_base_url_se_limpia():
    assert (
        Settings(_env_file=None, public_base_url=" https://x.co/ ").public_base_url
        == "https://x.co"
    )


def test_el_manifiesto_por_defecto_es_app_data():
    settings = Settings(_env_file=None)
    assert (
        settings.activities_manifest_path == API_DIR / "app" / "data" / "actividades_manifest.json"
    )
    assert settings.manifest_is_explicit is False
