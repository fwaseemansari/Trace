import os
import sys
import logging
from unittest.mock import patch, MagicMock
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_core.messages import AIMessage

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import rag.retrieval_grader as rg
from rag.retrieval_grader import (
    Grade,
    parse_grade,
    grade_chunks_parallel,
    rewrite_query_for_crag,
    grade_and_filter_retrieval
)

def test_parse_grade():
    print("--- 1. Testing parse_grade ---")
    assert parse_grade("relevant") == Grade.RELEVANT
    assert parse_grade("  AMBIGUOUS \n") == Grade.AMBIGUOUS
    assert parse_grade("'irrelevant'") == Grade.IRRELEVANT
    assert parse_grade("This chunk is relevant to the question.") == Grade.RELEVANT
    assert parse_grade("Random unstructured response 123") == Grade.AMBIGUOUS  # Fallback to ambiguous
    print("[PASS] parse_grade unit tests passed successfully!\n")


def test_grade_chunks_parallel():
    print("--- 2. Testing grade_chunks_parallel ---")
    query = "What is the capital of France?"
    chunks = [
        "Paris is the capital and largest city of France.",
        "Quantum computing relies on qubits instead of classical bits.",
        "The Eiffel Tower is located in France."
    ]
    chunk_ids = ["chunk_0", "chunk_1", "chunk_2"]
    
    mock_res_1 = ChatResult(generations=[ChatGeneration(message=AIMessage(content="relevant"))])
    mock_res_2 = ChatResult(generations=[ChatGeneration(message=AIMessage(content="irrelevant"))])
    mock_res_3 = ChatResult(generations=[ChatGeneration(message=AIMessage(content="ambiguous"))])

    with patch.object(rg.grader_llm, "_generate", side_effect=[mock_res_1, mock_res_2, mock_res_3]):
        grades = grade_chunks_parallel(query, chunks, chunk_ids)
        print(f"Query: {query}")
        for idx, (c, g) in enumerate(zip(chunks, grades)):
            print(f"  Chunk {idx}: Grade = {g.value} | Text = '{c[:50]}...'")
        
        assert grades[0] == Grade.RELEVANT, f"Expected chunk 0 to be relevant, got {grades[0]}"
        assert grades[1] == Grade.IRRELEVANT, f"Expected chunk 1 to be irrelevant, got {grades[1]}"
        assert grades[2] == Grade.AMBIGUOUS, f"Expected chunk 2 to be ambiguous, got {grades[2]}"
    print("[PASS] grade_chunks_parallel passed successfully!\n")


def test_query_rewriting():
    print("--- 3. Testing CRAG Query Rewriting ---")
    bad_query = "who is dat CEO guy?"
    mock_res = ChatResult(generations=[ChatGeneration(message=AIMessage(content="What is the name of the Chief Executive Officer?"))])
    with patch.object(rg.grader_llm, "_generate", return_value=mock_res):
        rewritten = rewrite_query_for_crag(bad_query)
        print(f"Original: '{bad_query}' -> Rewritten: '{rewritten}'")
        assert rewritten == "What is the name of the Chief Executive Officer?"
    print("[PASS] Query rewriting passed successfully!\n")


def test_mock_branching_logic():
    print("--- 4. Testing Branching Logic ---")
    
    with patch("rag.retrieval_grader._retrieve_docs") as mock_retrieve, \
         patch("rag.retrieval_grader.grade_chunks_parallel") as mock_grade, \
         patch("rag.retrieval_grader.rewrite_query_for_crag") as mock_rewrite:

        # Test Attempt 1 success: 1 relevant chunk, 1 irrelevant chunk
        mock_retrieve.return_value = (
            ["Paris is the capital of France.", "Quantum computing relies on qubits."],
            [{"source": "france.pdf", "page": 1}, {"source": "physics.pdf", "page": 1}]
        )
        mock_grade.return_value = [Grade.RELEVANT, Grade.IRRELEVANT]
        
        query1 = "What is the capital of France?"
        res1 = grade_and_filter_retrieval(
            collection=MagicMock(),
            query=query1,
            top_k=2,
            search_type="hybrid"
        )
        print(f"Test 1 Result: has_relevant_info={res1['has_relevant_info']}, attempt={res1['attempt']}, docs_count={len(res1['docs'])}")
        assert res1['has_relevant_info'] is True
        assert res1['attempt'] == 1
        assert len(res1['docs']) == 1  # Only the 1 relevant chunk kept!

        # Test Attempt 2 retry & failure fallback when initial docs are irrelevant
        mock_retrieve.return_value = (
            ["Quantum entanglement is a physical phenomenon.", "Qubits exist in superposition."],
            [{"source": "physics.pdf", "page": 1}, {"source": "physics.pdf", "page": 2}]
        )
        # Attempt 1 returns all irrelevant; Attempt 2 retry also returns all irrelevant
        mock_grade.side_effect = [
            [Grade.IRRELEVANT, Grade.IRRELEVANT],  # Attempt 1
            [Grade.AMBIGUOUS, Grade.IRRELEVANT]    # Attempt 2
        ]
        mock_rewrite.return_value = "Optimized query for chocolate cake"

        query2 = "What is recipe for chocolate cake?"
        res2 = grade_and_filter_retrieval(
            collection=MagicMock(),
            query=query2,
            top_k=2,
            search_type="hybrid"
        )
        print(f"Test 2 Result: has_relevant_info={res2['has_relevant_info']}, attempt={res2['attempt']}, crag_rewritten={res2['crag_rewritten']}")
        assert res2['has_relevant_info'] is False
        assert res2['attempt'] == 2
        assert res2['crag_rewritten'] is True
        assert len(res2['docs']) == 0
        print("[PASS] Branching logic test completed!\n")


if __name__ == "__main__":
    print("=== STARTING CRAG TEST SUITE ===\n")
    test_parse_grade()
    test_grade_chunks_parallel()
    test_query_rewriting()
    test_mock_branching_logic()
    print("=== ALL CRAG TESTS PASSED SUCCESSFULLY! ===")
