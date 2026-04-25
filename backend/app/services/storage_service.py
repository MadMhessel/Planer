from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.config import get_settings


@dataclass
class StoredObject:
    key: str
    local_path: Path
    public_url: str | None = None


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def save_bytes(self, *, namespace: str, filename: str, data: bytes, content_type: str | None = None) -> StoredObject:
        root = self._storage_root()
        directory = root / namespace
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / filename
        path.write_bytes(data)

        key = str(path.relative_to(root))
        self._try_upload_s3(key=key, data=data, content_type=content_type)
        return StoredObject(key=key, local_path=path, public_url=None)

    def read_bytes(self, key: str) -> bytes | None:
        path = self.local_path(key)
        if path.exists():
            return path.read_bytes()
        return self._try_download_s3(key)

    def local_path(self, key: str) -> Path:
        return self._storage_root() / key

    def delete(self, key: str | None) -> None:
        if not key:
            return
        path = self.local_path(key)
        if path.exists():
            path.unlink(missing_ok=True)
        self._try_delete_s3(key)

    def _storage_root(self) -> Path:
        root = Path(self.settings.storage_root)
        if not root.is_absolute():
            root = Path.cwd() / root
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _s3_enabled(self) -> bool:
        return bool(self.settings.s3_endpoint_url and self.settings.s3_access_key_id and self.settings.s3_secret_access_key)

    def _client(self):
        if not self._s3_enabled():
            return None
        try:
            import boto3  # type: ignore
        except Exception:
            return None
        return boto3.client(
            's3',
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key_id,
            aws_secret_access_key=self.settings.s3_secret_access_key,
            region_name=self.settings.s3_region,
        )

    def _try_upload_s3(self, *, key: str, data: bytes, content_type: str | None) -> None:
        client = self._client()
        if client is None:
            return
        try:
            extra = {'ContentType': content_type} if content_type else {}
            client.put_object(Bucket=self.settings.s3_bucket_name, Key=key, Body=data, **extra)
        except Exception:
            return

    def _try_download_s3(self, key: str) -> bytes | None:
        client = self._client()
        if client is None:
            return None
        try:
            response = client.get_object(Bucket=self.settings.s3_bucket_name, Key=key)
            data = response['Body'].read()
            path = self.local_path(key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return data
        except Exception:
            return None

    def _try_delete_s3(self, key: str) -> None:
        client = self._client()
        if client is None:
            return
        try:
            client.delete_object(Bucket=self.settings.s3_bucket_name, Key=key)
        except Exception:
            return
