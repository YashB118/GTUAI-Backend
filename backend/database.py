from supabase import create_client, Client
from config import settings

_client: Client | None = None
_storage_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def get_storage_client() -> Client:
    """
    Separate client for storage ops — guarantees service key in Authorization header.
    supabase-py v2 singleton can lose the service key after auth state changes.
    """
    global _storage_client
    if _storage_client is None:
        _storage_client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _storage_client
