from .text_loader import load_document
from langchain_text_splitters import RecursiveCharacterTextSplitter

def get_chunks(file_path, chunk_size=1000, overlap=200):
    documents = load_document(file_path)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap
    )
    return splitter.split_documents(documents)