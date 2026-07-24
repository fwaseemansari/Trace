from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth.utils import get_current_user
from database.db import get_connection, release_connection
from rag.vector_store import get_collection
from rag.rag import ask, ask_stream, ask_with_diagnostics

router = APIRouter(prefix="/chat", tags=["chat"])

class AskRequest(BaseModel):
    question: str
    documentId: str | None = None

class ClearRequest(BaseModel):
    documentId: str | None = None

@router.post("/ask")
def ask_question(req: AskRequest, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if req.documentId:
            cursor.execute(
                "SELECT file_path, summary FROM documents WHERE user_id = %s AND id = %s",
                (user_id, int(req.documentId))
            )
        else:
            cursor.execute(
                """SELECT u.selected_document, d.summary 
                   FROM users u 
                   LEFT JOIN documents d ON d.file_path = u.selected_document AND d.user_id = u.id
                   WHERE u.id = %s""",
                (user_id,)
            )
        row = cursor.fetchone()
        cursor.close()
    finally:
        release_connection(conn)
    
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="No document selected")
    
    file_path = row[0]
    summary = row[1]
    user_collection = get_collection(user_id)
    
    return StreamingResponse(
        ask_stream(
            user_collection, req.question, user_id=user_id, file_path=file_path, summary=summary
        ),
        media_type="text/event-stream"
    )

@router.post("/ask/sync")
def ask_question_sync(req: AskRequest, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if req.documentId:
            cursor.execute(
                "SELECT file_path, summary FROM documents WHERE user_id = %s AND id = %s",
                (user_id, int(req.documentId))
            )
        else:
            cursor.execute(
                """SELECT u.selected_document, d.summary 
                   FROM users u 
                   LEFT JOIN documents d ON d.file_path = u.selected_document AND d.user_id = u.id
                   WHERE u.id = %s""",
                (user_id,)
            )
        row = cursor.fetchone()
        cursor.close()
    finally:
        release_connection(conn)
    
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="No document selected")
    
    file_path = row[0]
    summary = row[1]
    user_collection = get_collection(user_id)
    
    result = ask(
        user_collection, req.question, user_id=user_id, file_path=file_path, summary=summary
    )
    return result

@router.post("/clear")
def clear_history(req: ClearRequest, user_id: int = Depends(get_current_user)):
    from rag.rag import conversation_store, save_history
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if req.documentId:
            cursor.execute(
                "SELECT file_path FROM documents WHERE user_id = %s AND id = %s",
                (user_id, int(req.documentId))
            )
            row = cursor.fetchone()
            file_path = row[0] if row else None
        else:
            cursor.execute("SELECT selected_document FROM users WHERE id = %s", (user_id,))
            row = cursor.fetchone()
            file_path = row[0] if row else None
        cursor.close()
    finally:
        release_connection(conn)
    
    if file_path:
        history_key = f"{user_id}_{file_path}"
        if history_key in conversation_store:
            del conversation_store[history_key]
            save_history()
    
    return {"message": "Conversation history cleared"}

@router.post("/ask/diagnostics")
def ask_with_diagnostics_endpoint(req: AskRequest, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if req.documentId:
            cursor.execute(
                "SELECT file_path, summary FROM documents WHERE user_id = %s AND id = %s",
                (user_id, int(req.documentId))
            )
        else:
            cursor.execute(
                """SELECT u.selected_document, d.summary 
                   FROM users u 
                   LEFT JOIN documents d ON d.file_path = u.selected_document AND d.user_id = u.id
                   WHERE u.id = %s""",
                (user_id,)
            )
        row = cursor.fetchone()
        cursor.close()
    finally:
        release_connection(conn)
    
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="No document selected")
    
    file_path = row[0]
    summary = row[1]
    user_collection = get_collection(user_id)
    
    return ask_with_diagnostics(
        user_collection, req.question,
        user_id=user_id,
        file_path=file_path,
        summary=summary
    )

