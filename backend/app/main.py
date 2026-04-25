from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import install_exception_handlers

settings = get_settings()

if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)
    except Exception:
        pass

app = FastAPI(
    title=settings.app_name,
    version='0.1.0',
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

install_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get('/')
def root() -> dict:
    return {
        'service': settings.app_name,
        'version': '0.1.0',
        'docs': '/docs',
    }
