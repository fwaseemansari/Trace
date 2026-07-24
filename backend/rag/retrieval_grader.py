from enum import Enum
from typing import List, Dict, Any, Tuple, Optional
import os
import logging
import asyncio
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from .vector_store import hybrid_search, query_store

load_dotenv()

# Setup module logger
logger = logging.getLogger("retrieval_grader")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class Grade(str, Enum):
    RELEVANT = "relevant"
    AMBIGUOUS = "ambiguous"
    IRRELEVANT = "irrelevant"


# Initialize cheap/fast model for grading & CRAG query rewriting (llama-3.1-8b-instant)
grader_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    api_key=os.getenv("GROQ_API_KEY")
)

# Strict grading prompt forcing exactly one word output
grading_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a strict relevance grader evaluating whether a retrieved text chunk contains information relevant to answering a user query.
Output EXACTLY ONE word: "relevant", "ambiguous", or "irrelevant".
Do NOT provide any explanation, header, punctuation, or additional text."""),
    ("human", "User Query: {query}\n\nRetrieved Chunk:\n{chunk}")
])

grading_chain = grading_prompt | grader_llm | StrOutputParser()

# CRAG query rewriting prompt using llama-3.1-8b-instant
crag_rewrite_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a search query optimizer. The current search query failed to retrieve relevant documents.
Rewrite the query to make it clearer, more descriptive, and better suited for document retrieval.
Output ONLY the rewritten query with no quotes or extra text."""),
    ("human", "Failed Query: {query}")
])

crag_rewrite_chain = crag_rewrite_prompt | grader_llm | StrOutputParser()


def parse_grade(raw_output: str) -> Grade:
    """Parses raw LLM output into a constrained Grade enum.
    Defaults to Grade.AMBIGUOUS if output is unrecognized.
    """
    cleaned = raw_output.strip().lower().replace('"', '').replace("'", "")
    # Check for direct match
    if cleaned in (Grade.RELEVANT.value, Grade.AMBIGUOUS.value, Grade.IRRELEVANT.value):
        return Grade(cleaned)
    
    # Check substring if model returned punctuation
    if "relevant" in cleaned and "irrelevant" not in cleaned:
        return Grade.RELEVANT
    elif "irrelevant" in cleaned:
        return Grade.IRRELEVANT
    elif "ambiguous" in cleaned:
        return Grade.AMBIGUOUS

    logger.warning(f"Unrecognized grader output '{raw_output.strip()}', defaulting to 'ambiguous'")
    return Grade.AMBIGUOUS


def grade_chunks_parallel(query: str, chunks: List[str], chunk_ids: Optional[List[str]] = None) -> List[Grade]:
    """Grades a list of text chunks in parallel using LangChain batch execution."""
    if not chunks:
        return []
    
    try:
        inputs = [{"query": query, "chunk": chunk} for chunk in chunks]
        raw_results = grading_chain.batch(inputs)
        grades = [parse_grade(res) for res in raw_results]
    except Exception as e:
        logger.error(f"Error during CRAG grading batch call: {e}. Defaulting all chunks to 'ambiguous'.")
        grades = [Grade.AMBIGUOUS] * len(chunks)

    # Log each grading decision
    for idx, grade in enumerate(grades):
        c_id = chunk_ids[idx] if chunk_ids and idx < len(chunk_ids) else f"chunk_{idx}"
        logger.info(f"CRAG Decision | Query: '{query}' | Chunk ID: '{c_id}' | Grade: '{grade.value}'")

    return grades


async def agrade_chunks_parallel(query: str, chunks: List[str], chunk_ids: Optional[List[str]] = None) -> List[Grade]:
    """Asynchronously grades a list of text chunks in parallel using LangChain abatch."""
    if not chunks:
        return []
    
    try:
        inputs = [{"query": query, "chunk": chunk} for chunk in chunks]
        raw_results = await grading_chain.abatch(inputs)
        grades = [parse_grade(res) for res in raw_results]
    except Exception as e:
        logger.error(f"Error during CRAG async grading abatch call: {e}. Defaulting all chunks to 'ambiguous'.")
        grades = [Grade.AMBIGUOUS] * len(chunks)

    for idx, grade in enumerate(grades):
        c_id = chunk_ids[idx] if chunk_ids and idx < len(chunk_ids) else f"chunk_{idx}"
        logger.info(f"CRAG Decision (async) | Query: '{query}' | Chunk ID: '{c_id}' | Grade: '{grade.value}'")

    return grades


def rewrite_query_for_crag(query: str) -> str:
    """Rewrites query using llama-3.1-8b-instant when retrieval fails to return relevant chunks."""
    try:
        rewritten = crag_rewrite_chain.invoke({"query": query}).strip()
        logger.info(f"CRAG Query Rewrite | Original: '{query}' | Rewritten: '{rewritten}'")
        return rewritten
    except Exception as e:
        logger.error(f"Failed to rewrite query for CRAG: {e}")
        return query


async def arewrite_query_for_crag(query: str) -> str:
    """Asynchronously rewrites query using llama-3.1-8b-instant."""
    try:
        rewritten = (await crag_rewrite_chain.ainvoke({"query": query})).strip()
        logger.info(f"CRAG Query Rewrite (async) | Original: '{query}' | Rewritten: '{rewritten}'")
        return rewritten
    except Exception as e:
        logger.error(f"Failed to rewrite query for CRAG: {e}")
        return query


def _retrieve_docs(collection, query: str, file_path: Optional[str], top_k: int, search_type: str) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Helper to perform retrieval from collection."""
    if search_type == "semantic":
        retrieved_raw = query_store(collection, query, file_path=file_path, n_results=top_k)
        docs = retrieved_raw.get("documents", [[]])[0] if retrieved_raw.get("documents") else []
        metas = retrieved_raw.get("metadatas", [[]])[0] if retrieved_raw.get("metadatas") else []
    else:
        retrieved = hybrid_search(collection, query, file_path=file_path, n_results=top_k)
        docs = retrieved.get("documents", [[]])[0] if retrieved.get("documents") else []
        metas = retrieved.get("metadatas", [[]])[0] if retrieved.get("metadatas") else []
    
    return docs, metas


def grade_and_filter_retrieval(
    collection,
    query: str,
    file_path: Optional[str] = None,
    top_k: int = 5,
    search_type: str = "hybrid"
) -> Dict[str, Any]:
    """Orchestrates CRAG retrieval grading and branching logic (synchronous).
    
    Returns a dict:
    {
        "has_relevant_info": bool,
        "query_used": str,
        "docs": List[str],
        "metadatas": List[dict],
        "all_graded_chunks": List[dict],
        "attempt": int,
        "crag_rewritten": bool
    }
    """
    # Attempt 1: Initial search
    docs, metas = _retrieve_docs(collection, query, file_path, top_k, search_type)
    chunk_ids = [f"chunk_att1_{i}" for i in range(len(docs))]
    grades = grade_chunks_parallel(query, docs, chunk_ids)

    relevant_docs = []
    relevant_metas = []
    all_graded_chunks = []

    for idx, (doc, meta, grade) in enumerate(zip(docs, metas, grades)):
        item = {
            "id": chunk_ids[idx],
            "text": doc,
            "metadata": meta,
            "grade": grade.value
        }
        all_graded_chunks.append(item)
        if grade == Grade.RELEVANT:
            relevant_docs.append(doc)
            relevant_metas.append(meta)

    if relevant_docs:
        return {
            "has_relevant_info": True,
            "query_used": query,
            "docs": relevant_docs,
            "metadatas": relevant_metas,
            "all_graded_chunks": all_graded_chunks,
            "attempt": 1,
            "crag_rewritten": False
        }

    # Attempt 2: All chunks were ambiguous or irrelevant -> Rewrite query ONCE
    logger.info(f"CRAG Branching | No relevant chunks in Attempt 1 for query '{query}'. Triggering query rewrite.")
    rewritten_query = rewrite_query_for_crag(query)

    docs2, metas2 = _retrieve_docs(collection, rewritten_query, file_path, top_k, search_type)
    chunk_ids2 = [f"chunk_att2_{i}" for i in range(len(docs2))]
    grades2 = grade_chunks_parallel(rewritten_query, docs2, chunk_ids2)

    relevant_docs2 = []
    relevant_metas2 = []
    all_graded_chunks2 = []

    for idx, (doc, meta, grade) in enumerate(zip(docs2, metas2, grades2)):
        item = {
            "id": chunk_ids2[idx],
            "text": doc,
            "metadata": meta,
            "grade": grade.value
        }
        all_graded_chunks2.append(item)
        if grade == Grade.RELEVANT:
            relevant_docs2.append(doc)
            relevant_metas2.append(meta)

    if relevant_docs2:
        return {
            "has_relevant_info": True,
            "query_used": rewritten_query,
            "docs": relevant_docs2,
            "metadatas": relevant_metas2,
            "all_graded_chunks": all_graded_chunks2,
            "attempt": 2,
            "crag_rewritten": True
        }

    # Second attempt also yielded no relevant chunks -> signal fallback response
    logger.info(f"CRAG Branching | No relevant chunks after Attempt 2 retry. Returning no_relevant_info.")
    return {
        "has_relevant_info": False,
        "query_used": rewritten_query,
        "docs": [],
        "metadatas": [],
        "all_graded_chunks": all_graded_chunks2,
        "attempt": 2,
        "crag_rewritten": True
    }


async def agrade_and_filter_retrieval(
    collection,
    query: str,
    file_path: Optional[str] = None,
    top_k: int = 5,
    search_type: str = "hybrid"
) -> Dict[str, Any]:
    """Orchestrates CRAG retrieval grading and branching logic (asynchronous)."""
    # Attempt 1: Initial search
    docs, metas = _retrieve_docs(collection, query, file_path, top_k, search_type)
    chunk_ids = [f"chunk_att1_{i}" for i in range(len(docs))]
    grades = await agrade_chunks_parallel(query, docs, chunk_ids)

    relevant_docs = []
    relevant_metas = []
    all_graded_chunks = []

    for idx, (doc, meta, grade) in enumerate(zip(docs, metas, grades)):
        item = {
            "id": chunk_ids[idx],
            "text": doc,
            "metadata": meta,
            "grade": grade.value
        }
        all_graded_chunks.append(item)
        if grade == Grade.RELEVANT:
            relevant_docs.append(doc)
            relevant_metas.append(meta)

    if relevant_docs:
        return {
            "has_relevant_info": True,
            "query_used": query,
            "docs": relevant_docs,
            "metadatas": relevant_metas,
            "all_graded_chunks": all_graded_chunks,
            "attempt": 1,
            "crag_rewritten": False
        }

    # Attempt 2: All chunks were ambiguous or irrelevant -> Rewrite query ONCE
    logger.info(f"CRAG Branching (async) | No relevant chunks in Attempt 1 for query '{query}'. Triggering query rewrite.")
    rewritten_query = await arewrite_query_for_crag(query)

    docs2, metas2 = _retrieve_docs(collection, rewritten_query, file_path, top_k, search_type)
    chunk_ids2 = [f"chunk_att2_{i}" for i in range(len(docs2))]
    grades2 = await agrade_chunks_parallel(rewritten_query, docs2, chunk_ids2)

    relevant_docs2 = []
    relevant_metas2 = []
    all_graded_chunks2 = []

    for idx, (doc, meta, grade) in enumerate(zip(docs2, metas2, grades2)):
        item = {
            "id": chunk_ids2[idx],
            "text": doc,
            "metadata": meta,
            "grade": grade.value
        }
        all_graded_chunks2.append(item)
        if grade == Grade.RELEVANT:
            relevant_docs2.append(doc)
            relevant_metas2.append(meta)

    if relevant_docs2:
        return {
            "has_relevant_info": True,
            "query_used": rewritten_query,
            "docs": relevant_docs2,
            "metadatas": relevant_metas2,
            "all_graded_chunks": all_graded_chunks2,
            "attempt": 2,
            "crag_rewritten": True
        }

    # Second attempt also yielded no relevant chunks -> signal fallback response
    logger.info(f"CRAG Branching (async) | No relevant chunks after Attempt 2 retry. Returning no_relevant_info.")
    return {
        "has_relevant_info": False,
        "query_used": rewritten_query,
        "docs": [],
        "metadatas": [],
        "all_graded_chunks": all_graded_chunks2,
        "attempt": 2,
        "crag_rewritten": True
    }
