from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from .vector_store import hybrid_search, get_collection
from .retrieval_grader import grade_and_filter_retrieval, agrade_and_filter_retrieval
from dotenv import load_dotenv
import os
import json
from typing import AsyncGenerator

load_dotenv()

NO_RELEVANT_INFO_MSG = "No relevant information found in your documents."

MODEL = "llama-3.3-70b-versatile"
TEMPERATURE = 0.3
TOP_K = 5
SEARCH_TYPE = "hybrid"

llm = ChatGroq(model=MODEL, api_key=os.getenv("GROQ_API_KEY"))

# stores conversation history per user per document
# key: (user_id, file_path), value: list of messages
conversation_store = {}

HISTORY_FILE = "conversation_history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            data = json.load(f)
            for key, messages in data.items():
                conversation_store[key] = [
                    HumanMessage(content=m["content"]) if m["type"] == "human"
                    else AIMessage(content=m["content"])
                    for m in messages
                ]

def save_history():
    data = {}
    for key, messages in conversation_store.items():
        data[key] = [
            {"type": "human" if isinstance(m, HumanMessage) else "ai",
             "content": m.content}
            for m in messages
        ]
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f)

load_history()

# Query rewriting prompt
# Query rewriting prompt
rewrite_prompt = ChatPromptTemplate.from_messages([
    ("system", """Given the conversation history and a follow-up question, rewrite the follow-up as a single standalone question that captures full context.
If the question is already standalone, return it unchanged.
Output ONLY the rewritten question itself — no explanations, no commentary, no acknowledgment of the conversation, no meta-text of any kind.
Do not address the user directly. Do not say things like "you are correct" or "to answer that" or "I would need more context" — output the question and nothing else."""),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}")
])

BAD_REWRITE_MARKERS = (
    "i would need", "you are correct", "to answer", "context does not",
    "i didn't ask", "please let me know", "i don't have"
)

def safe_rewrite(rewrite_chain_fn, history, question):
    """Runs the rewrite chain but falls back to the original question
    if the output looks like meta-commentary instead of a clean rewrite."""
    rewritten = rewrite_chain_fn.invoke({"history": history, "question": question}).strip()
    lowered = rewritten.lower()
    if len(rewritten) > 200 or any(marker in lowered for marker in BAD_REWRITE_MARKERS):
        return question
    return rewritten

# Answer generation prompt
answer_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a document assistant. Answer using ONLY the information present in
the context below. You may reasonably paraphrase, summarize, or connect
information across the context even if the wording differs from the
question — do not require an exact literal phrase match. However, do not
introduce any fact, number, or claim that is not explicitly present in the
context.

If the answer truly isn't present in the context, say exactly:
"No relevant information found in your documents."

Context:
{context}"""),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{question}")
])

rewrite_chain = rewrite_prompt | llm | StrOutputParser()
answer_chain = answer_prompt | llm | StrOutputParser()

def ask(
    collection,
    question,
    user_id=None,
    file_path=None,
    summary=None,
):
    history_key = f"{user_id}_{file_path}" if user_id and file_path else "default"
    history = conversation_store.get(history_key, [])
    
    dynamic_llm = ChatGroq(model=MODEL, temperature=TEMPERATURE, api_key=os.getenv("GROQ_API_KEY"))
    dynamic_rewrite_chain = rewrite_prompt | dynamic_llm | StrOutputParser()
    dynamic_answer_chain = answer_prompt | dynamic_llm | StrOutputParser()
    
    if history:
        rewritten = safe_rewrite(dynamic_rewrite_chain, history, question)
    else:
        rewritten = question
    
    crag_res = grade_and_filter_retrieval(
        collection=collection,
        query=rewritten,
        file_path=file_path,
        top_k=TOP_K,
        search_type=SEARCH_TYPE
    )

    if not crag_res["has_relevant_info"]:
        answer = NO_RELEVANT_INFO_MSG
        history.append(HumanMessage(content=question))
        history.append(AIMessage(content=answer))
        conversation_store[history_key] = history
        save_history()
        return {"answer": answer, "sources": []}

    docs = crag_res["docs"]
    metas = crag_res["metadatas"]
    query_used = crag_res["query_used"]
    context = "\n".join(docs)
    
    if summary:
        context = f"Document Summary: {summary}\n\n{context}"
    
    sources = []
    for m in metas:
        m_dict = m or {}
        src = m_dict.get("source", "document.pdf")
        page = m_dict.get("page_label", m_dict.get("page", "1"))
        sources.append(f"{os.path.basename(src)} (page {page})")
    sources = list(set(sources))
    
    answer = dynamic_answer_chain.invoke({
        "context": context,
        "history": history,
        "question": query_used
    })
    
    history.append(HumanMessage(content=question))
    history.append(AIMessage(content=answer))
    conversation_store[history_key] = history
    save_history()
    
    return {"answer": answer, "sources": sources}

def generate_summary(file_path: str, collection, user_id: int) -> str:
    retrieved = hybrid_search(collection, "what is this document about", file_path=file_path, n_results=3)
    docs = retrieved.get("documents", [[]])[0] if retrieved.get("documents") else []
    context = "\n".join(docs)
    
    summary_prompt = ChatPromptTemplate.from_messages([
        ("system", "Generate a concise 3-4 sentence summary of this document based on the context. Be specific about the topic, purpose, and key content."),
        ("human", "Context: {context}\n\nSummarize this document:")
    ])
    
    summary_chain = summary_prompt | llm | StrOutputParser()
    return summary_chain.invoke({"context": context})

async def ask_stream(
    collection,
    question,
    user_id=None,
    file_path=None,
    summary=None,
) -> AsyncGenerator[str, None]:
    history_key = f"{user_id}_{file_path}" if user_id and file_path else "default"
    history = conversation_store.get(history_key, [])
    
    dynamic_llm = ChatGroq(model=MODEL, temperature=TEMPERATURE, api_key=os.getenv("GROQ_API_KEY"))
    dynamic_rewrite_chain = rewrite_prompt | dynamic_llm | StrOutputParser()
    dynamic_answer_chain = answer_prompt | dynamic_llm | StrOutputParser()
    
    if history:
        rewritten = safe_rewrite(dynamic_rewrite_chain, history, question)
    else:
        rewritten = question
    
    crag_res = await agrade_and_filter_retrieval(
        collection=collection,
        query=rewritten,
        file_path=file_path,
        top_k=TOP_K,
        search_type=SEARCH_TYPE
    )

    if not crag_res["has_relevant_info"]:
        full_reply = NO_RELEVANT_INFO_MSG
        yield f"data: {json.dumps({'token': full_reply})}\n\n"
        
        history.append(HumanMessage(content=question))
        history.append(AIMessage(content=full_reply))
        conversation_store[history_key] = history
        save_history()
        
        diagnostics = {
            "originalQuery": question,
            "rewrittenQuery": crag_res["query_used"],
            "chunks": [],
            "context": "",
            "answer": full_reply,
            "crag": crag_res
        }
        yield f"data: {json.dumps({'citations': [], 'diagnostics': diagnostics})}\n\n"
        yield "data: [DONE]\n\n"
        return

    docs = crag_res["docs"]
    metas = crag_res["metadatas"]
    query_used = crag_res["query_used"]
    context = "\n".join(docs)
    
    citations = []
    chunks = []
    for i, (doc, meta) in enumerate(zip(docs, metas)):
        meta_dict = meta or {}
        page = meta_dict.get("page_label", meta_dict.get("page", 1))
        source = meta_dict.get("source", "document.pdf")
        filename = os.path.basename(source)
        score = 0.95 - (i * 0.05)
        chunk_id = f"chunk_{i}"
        
        citations.append({
            "id": chunk_id,
            "filename": filename,
            "page": page,
            "score": score,
            "snippet": doc
        })
        chunks.append({
            "id": chunk_id,
            "source": filename,
            "page": page,
            "score": score,
            "text": doc
        })
    
    if summary:
        context = f"Document Summary: {summary}\n\n{context}"
    
    full_reply = ""
    async for chunk in dynamic_answer_chain.astream({
        "context": context,
        "history": history,
        "question": query_used
    }):
        full_reply += chunk
        yield f"data: {json.dumps({'token': chunk})}\n\n"
    
    history.append(HumanMessage(content=question))
    history.append(AIMessage(content=full_reply))
    conversation_store[history_key] = history
    save_history()
    
    diagnostics = {
        "originalQuery": question,
        "rewrittenQuery": query_used,
        "chunks": chunks,
        "context": context,
        "answer": full_reply,
        "crag": crag_res
    }
    
    yield f"data: {json.dumps({'citations': citations, 'diagnostics': diagnostics})}\n\n"
    yield "data: [DONE]\n\n"

def ask_with_diagnostics(
    collection,
    question,
    user_id=None,
    file_path=None,
    summary=None,
):
    history_key = f"{user_id}_{file_path}" if user_id and file_path else "default"
    history = conversation_store.get(history_key, [])
    
    dynamic_llm = ChatGroq(model=MODEL, temperature=TEMPERATURE, api_key=os.getenv("GROQ_API_KEY"))
    dynamic_rewrite_chain = rewrite_prompt | dynamic_llm | StrOutputParser()
    dynamic_answer_chain = answer_prompt | dynamic_llm | StrOutputParser()

    if history:
        rewritten = safe_rewrite(dynamic_rewrite_chain, history, question)
    else:
        rewritten = question

    crag_res = grade_and_filter_retrieval(
        collection=collection,
        query=rewritten,
        file_path=file_path,
        top_k=TOP_K,
        search_type=SEARCH_TYPE
    )

    if not crag_res["has_relevant_info"]:
        answer = NO_RELEVANT_INFO_MSG
        history.append(HumanMessage(content=question))
        history.append(AIMessage(content=answer))
        conversation_store[history_key] = history
        save_history()
        
        diagnostics = {
            "originalQuery": question,
            "rewrittenQuery": crag_res["query_used"],
            "chunks": [],
            "context": "",
            "answer": answer,
            "crag": crag_res
        }
        return {
            "answer": answer,
            "citations": [],
            "diagnostics": diagnostics
        }
        
    docs = crag_res["docs"]
    metas = crag_res["metadatas"]
    query_used = crag_res["query_used"]
    context = "\n".join(docs)
    
    if summary:
        context = f"Document Summary: {summary}\n\n{context}"
        
    citations = []
    chunks = []
    for i, (doc, meta) in enumerate(zip(docs, metas)):
        meta_dict = meta or {}
        page = meta_dict.get("page_label", meta_dict.get("page", 1))
        source = meta_dict.get("source", "document.pdf")
        filename = os.path.basename(source)
        score = 0.95 - (i * 0.05)
        chunk_id = f"chunk_{i}"
        
        citations.append({
            "id": chunk_id,
            "filename": filename,
            "page": page,
            "score": score,
            "snippet": doc
        })
        chunks.append({
            "id": chunk_id,
            "source": filename,
            "page": page,
            "score": score,
            "text": doc
        })
        
    answer = dynamic_answer_chain.invoke({
        "context": context,
        "history": history,
        "question": query_used
    })
    
    history.append(HumanMessage(content=question))
    history.append(AIMessage(content=answer))
    conversation_store[history_key] = history
    save_history()
    
    diagnostics = {
        "originalQuery": question,
        "rewrittenQuery": query_used,
        "chunks": chunks,
        "context": context,
        "answer": answer,
        "crag": crag_res
    }
    
    return {
        "answer": answer,
        "citations": citations,
        "diagnostics": diagnostics
    }