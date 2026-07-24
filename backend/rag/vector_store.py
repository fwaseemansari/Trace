import chromadb
from rank_bm25 import BM25Okapi
from .chunker import get_chunks

# Instantiate client once at the module level to avoid SQLite db locks
client = chromadb.PersistentClient(path="./chroma_db")

def build_vector_store(file_path, user_id):
    collection = client.get_or_create_collection(name=f"user_{user_id}")
    chunks = get_chunks(file_path)
    collection.add(
        documents=[chunk.page_content for chunk in chunks],
        ids=[f"{file_path}_id{i+1}" for i, chunk in enumerate(chunks)],
        metadatas=[chunk.metadata for chunk in chunks]
    )
    return collection

def get_collection(user_id):
    return client.get_or_create_collection(name=f"user_{user_id}")

def query_store(collection, question, file_path=None, n_results=5):
    query_params = {
        "query_texts": [question],
        "n_results": n_results
    }
    if file_path:
        query_params["where"] = {"source": file_path}
    return collection.query(**query_params)

def hybrid_search(collection, question, file_path=None, n_results=5):
    dense_results = query_store(collection, question, file_path=file_path, n_results=n_results)
    dense_docs = dense_results["documents"][0] if dense_results.get("documents") else []
    dense_metas = dense_results["metadatas"][0] if dense_results.get("metadatas") else []

    all_results = collection.get(where={"source": file_path} if file_path else None)
    all_docs = all_results["documents"] if all_results.get("documents") else []
    all_metas = all_results["metadatas"] if all_results.get("metadatas") else []

    if not all_docs:
        return dense_results

    tokenized = [doc.lower().split() for doc in all_docs]
    bm25 = BM25Okapi(tokenized)
    bm25_scores = bm25.get_scores(question.lower().split())
    top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:n_results]
    bm25_docs = [all_docs[i] for i in top_bm25_indices]
    bm25_metas = [all_metas[i] for i in top_bm25_indices]

    seen = set()
    combined_docs = []
    combined_metas = []

    for doc, meta in zip(bm25_docs + dense_docs, bm25_metas + dense_metas):
        # normalize meta to dict
        meta_dict = meta or {}
        if doc not in seen:
            seen.add(doc)
            combined_docs.append(doc)
            combined_metas.append(meta_dict)

    return {
        "documents": [combined_docs[:n_results]],
        "metadatas": [combined_metas[:n_results]]
    }