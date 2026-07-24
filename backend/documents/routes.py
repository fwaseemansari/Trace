from fastapi import APIRouter, UploadFile, Depends, HTTPException
import os
from datetime import datetime
from pydantic import BaseModel
from auth.utils import get_current_user
from rag.vector_store import build_vector_store, get_collection
from database.db import get_connection, release_connection
from rag.rag import generate_summary
import re 

ALLOWED_EXTENSIONS = (".pdf", ".txt", ".docx", ".md", ".csv", ".pptx", ".xlsx")

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB

router = APIRouter(prefix="/documents", tags=["documents"])

class SelectRequest(BaseModel):
    id: str

class DeleteRequest(BaseModel):
    id: str

class RenameRequest(BaseModel):
    id: str
    filename: str

@router.post("/upload")
async def upload_document(file: UploadFile, user_id: int = Depends(get_current_user)):
    allowed = (".pdf", ".txt", ".docx", ".md", ".csv", ".pptx", ".xlsx")
    if not file.filename.endswith(allowed):
        return {"error": "Unsupported file type"}
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        return {"error": "File too large. Maximum size is 10MB."}
    
    os.makedirs(f"uploads/{user_id}", exist_ok=True)
    file_path = f"uploads/{user_id}/{file.filename}"
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    build_vector_store(file_path, user_id)
    collection = get_collection(user_id)
    summary = generate_summary(file_path, collection, user_id)
    
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM documents WHERE user_id = %s AND filename = %s",
            (user_id, file.filename)
        )
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute(
                "UPDATE documents SET uploaded_at = CURRENT_TIMESTAMP, file_path = %s, summary = %s WHERE user_id = %s AND filename = %s RETURNING id, uploaded_at",
                (file_path, summary, user_id, file.filename)
            )
            doc_id, uploaded_at = cursor.fetchone()
        else:
            cursor.execute(
                "INSERT INTO documents (user_id, filename, file_path, summary) VALUES (%s, %s, %s, %s) RETURNING id, uploaded_at",
                (user_id, file.filename, file_path, summary)
            )
            doc_id, uploaded_at = cursor.fetchone()
        
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)
    
    return {
        "id": str(doc_id),
        "filename": file.filename,
        "uploadedAt": str(uploaded_at),
        "status": "ready",
        "summary": summary
    }

@router.get("/list")
def list_documents(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, uploaded_at, summary FROM documents WHERE user_id = %s", (user_id,))
        docs = cursor.fetchall()
        cursor.close()
    finally:
        release_connection(conn)
    return {
        "documents": [
            {
                "id": str(d[0]),
                "filename": d[1],
                "uploadedAt": str(d[2]),
                "status": "ready",
                "summary": d[3]
            }
            for d in docs
        ]
    }

@router.post("/select")
def select_document(req: SelectRequest, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT file_path, filename FROM documents WHERE user_id = %s AND id = %s",
            (user_id, int(req.id))
        )
        doc = cursor.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path, filename = doc
        cursor.execute(
            "UPDATE users SET selected_document = %s WHERE id = %s",
            (file_path, user_id)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)
    
    return {"message": f"Selected {filename}"}

@router.delete("/delete")
def delete_document(req: DeleteRequest, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT file_path, filename FROM documents WHERE user_id = %s AND id = %s",
            (user_id, int(req.id))
        )
        doc = cursor.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path, filename = doc
        
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing file: {e}")
        
        cursor.execute(
            "DELETE FROM documents WHERE user_id = %s AND id = %s",
            (user_id, int(req.id))
        )
        cursor.execute(
            "UPDATE users SET selected_document = NULL WHERE id = %s AND selected_document = %s",
            (user_id, file_path)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)
    
    try:
        collection = get_collection(user_id)
        collection.delete(where={"source": file_path})
    except Exception as e:
        print(f"Chroma delete error: {e}")
    
    return {"message": f"Deleted {filename}"}

@router.put("/rename")
def rename_document(req: RenameRequest, user_id: int = Depends(get_current_user)):
    new_filename = req.filename.strip()

    # Reject path-unsafe characters
    if "/" in new_filename or "\\" in new_filename or ".." in new_filename:
        raise HTTPException(status_code=400, detail="Filename contains invalid characters")

    # Require a supported extension to be preserved
    new_ext = os.path.splitext(new_filename)[1].lower()
    if new_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="New filename must keep a supported file extension")

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT file_path, filename FROM documents WHERE user_id = %s AND id = %s",
            (user_id, int(req.id))
        )
        doc = cursor.fetchone()

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        old_path, old_filename = doc
        new_path = f"uploads/{user_id}/{new_filename}"

        if os.path.exists(old_path):
            try:
                os.rename(old_path, new_path)
            except Exception as e:
                print(f"Error renaming file: {e}")

        cursor.execute(
            "UPDATE documents SET filename = %s, file_path = %s WHERE user_id = %s AND id = %s RETURNING uploaded_at, summary",
            (new_filename, new_path, user_id, int(req.id))
        )
        row = cursor.fetchone()
        uploaded_at, summary = row if row else (datetime.utcnow(), "")

        cursor.execute(
            "UPDATE users SET selected_document = %s WHERE id = %s AND selected_document = %s",
            (new_path, user_id, old_path)
        )
        conn.commit()
        cursor.close()
    finally:
        release_connection(conn)

    # Keep ChromaDB's stored "source" metadata in sync with the renamed path
    try:
        collection = get_collection(user_id)
        existing = collection.get(where={"source": old_path})
        if existing and existing.get("ids"):
            collection.delete(where={"source": old_path})
            updated_metadatas = [
                {**(meta or {}), "source": new_path}
                for meta in existing["metadatas"]
            ]
            collection.add(
                documents=existing["documents"],
                ids=existing["ids"],
                metadatas=updated_metadatas
            )
    except Exception as e:
        print(f"Chroma rename sync error: {e}")

    return {
        "id": str(req.id),
        "filename": new_filename,
        "uploadedAt": str(uploaded_at),
        "status": "ready",
        "summary": summary
    }