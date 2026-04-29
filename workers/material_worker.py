import logging

logger = logging.getLogger(__name__)


def process_material_worker(material_id: str) -> None:
    """
    Background task triggered after admin approves a study material.
    Downloads the PDF from Supabase Storage, chunks + embeds it,
    and updates processing_status on the study_materials row.
    """
    from database import get_supabase
    from services.material_processor import process_material

    supabase = get_supabase()

    res = (
        supabase.table("study_materials")
        .select("id, subject_id, file_url")
        .eq("id", material_id)
        .maybe_single()
        .execute()
    )
    material = res.data
    if not material:
        logger.error(f"Material {material_id} not found in DB")
        return

    subject_id = material["subject_id"]
    file_path = material["file_url"]

    try:
        file_bytes = supabase.storage.from_("study-materials").download(file_path)
    except Exception as e:
        logger.error(f"Failed to download material {material_id} from storage: {e}")
        supabase.table("study_materials").update(
            {"processing_status": "failed"}
        ).eq("id", material_id).execute()
        return

    try:
        chunk_count = process_material(supabase, material_id, subject_id, file_bytes)
        supabase.table("study_materials").update({
            "processing_status": "processed",
            "chunk_count": chunk_count,
        }).eq("id", material_id).execute()
        logger.info(f"Material {material_id} fully processed: {chunk_count} chunks")
    except Exception as e:
        logger.error(f"Material processing failed for {material_id}: {e}", exc_info=True)
        supabase.table("study_materials").update(
            {"processing_status": "failed"}
        ).eq("id", material_id).execute()
