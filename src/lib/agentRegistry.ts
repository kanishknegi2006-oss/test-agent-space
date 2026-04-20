export interface AgentRegistryEntry {
  id: string;
  name: string;
  type: string;
  description: string;
  input_type: string;
  output_type: string;
}

export const AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  // --- NLP Agents ---
  tokenizer: { id: 'tokenizer', name: 'Tokenizer', type: 'nlp', description: 'Splits text into words', input_type: 'text', output_type: 'text_array' },
  lowercase: { id: 'lowercase', name: 'Lowercase Normalizer', type: 'nlp', description: 'Converts text to lowercase', input_type: 'text', output_type: 'text' },
  stopword_remover: { id: 'stopword_remover', name: 'Stopword Remover', type: 'nlp', description: 'Removes common words', input_type: 'text_array', output_type: 'text_array' },
  keyword_extractor: { id: 'keyword_extractor', name: 'Keyword Extractor', type: 'nlp', description: 'extract top keywords', input_type: 'text', output_type: 'text_array' },
  sentence_splitter: { id: 'sentence_splitter', name: 'Sentence Splitter', type: 'nlp', description: 'Splits text into sentences', input_type: 'text', output_type: 'text_array' },
  word_counter: { id: 'word_counter', name: 'Word Counter', type: 'nlp', description: 'Returns total word count', input_type: 'text', output_type: 'number' },

  // --- AI Agents ---
  resume_analyzer: { id: 'resume_analyzer', name: 'Resume Analyzer', type: 'ai', description: 'ATS score & feedback', input_type: 'text', output_type: 'text' },
  resume_rewriter: { id: 'resume_rewriter', name: 'Resume Rewriter', type: 'ai', description: 'rewrite resume professionally', input_type: 'text', output_type: 'text' },
  improvement_generator: { id: 'improvement_generator', name: 'Improvement Generator', type: 'ai', description: 'generate improvement suggestions', input_type: 'text', output_type: 'text' },
  research_agent: { id: 'research_agent', name: 'Research Agent', type: 'ai', description: 'Perform deep research', input_type: 'text', output_type: 'text' },

  // --- Web Dev Agents ---
  html_generator: { id: 'html_generator', name: 'HTML Generator', type: 'dev', description: 'Generate structural HTML', input_type: 'text', output_type: 'code' },
  react_component_builder: { id: 'react_component_builder', name: 'React Builder', type: 'dev', description: 'Generate React components', input_type: 'text', output_type: 'code' },
  backend_api_generator: { id: 'backend_api_generator', name: 'API Generator', type: 'dev', description: 'Generate backend endpoints', input_type: 'text', output_type: 'code' },
  ui_designer: { id: 'ui_designer', name: 'UI Designer', type: 'dev', description: 'Design UI layout ideas', input_type: 'text', output_type: 'code' },

  // --- Testing Agents ---
  unit_test_generator: { id: 'unit_test_generator', name: 'Test Generator', type: 'testing', description: 'Generate unit tests', input_type: 'code', output_type: 'code' },
  code_debugger: { id: 'code_debugger', name: 'Code Debugger', type: 'testing', description: 'Find and fix bugs', input_type: 'code', output_type: 'code' },
  performance_analyzer: { id: 'performance_analyzer', name: 'Perf Analyzer', type: 'testing', description: 'Analyze code performance', input_type: 'code', output_type: 'text' },

  // --- Data Science Agents ---
  data_cleaner: { id: 'data_cleaner', name: 'Data Cleaner', type: 'ds', description: 'Sanitize and clean raw data', input_type: 'text', output_type: 'text' },
  statistical_analyzer: { id: 'statistical_analyzer', name: 'Stat Analyzer', type: 'ds', description: 'Analyze dataset statistics', input_type: 'text', output_type: 'text' },
  data_visualizer: { id: 'data_visualizer', name: 'Data Visualizer', type: 'ds', description: 'Generate charts and graphs', input_type: 'text', output_type: 'code' },

  // --- Research Agents ---
  hypothesis_generator: { id: 'hypothesis_generator', name: 'Hypothesis Gen', type: 'research', description: 'Generate scientific hypothesis', input_type: 'text', output_type: 'text' },
  a_b_testing: { id: 'a_b_testing', name: 'A/B Tester', type: 'research', description: 'Simulate A/B test analysis', input_type: 'text', output_type: 'text' },
  evaluation_metric: { id: 'evaluation_metric', name: 'Eval Metric', type: 'research', description: 'Calculate evaluation metrics', input_type: 'text', output_type: 'text' },
  plagiarism_checker: { id: 'plagiarism_checker', name: 'Plagiarism Checker', type: 'research', description: 'Detect copied content', input_type: 'text', output_type: 'text' },
  citation_generator: { id: 'citation_generator', name: 'Citation Generator', type: 'research', description: 'Generate accurate citations', input_type: 'text', output_type: 'text' },

  // --- RAG (Retrieval-Augmented Generation) Agents ---
  document_loader: { id: 'document_loader', name: 'Document Loader', type: 'rag', description: 'Extracts raw text from PDFs and files for RAG pipelines', input_type: 'file', output_type: 'text' },
  text_chunker: { id: 'text_chunker', name: 'Text Chunker', type: 'rag', description: 'Splits large documents into semantically coherent overlapping chunks', input_type: 'text', output_type: 'text_array' },
  embedding_generator: { id: 'embedding_generator', name: 'Vector Embedder', type: 'rag', description: 'Converts text chunks into mathematical vector embeddings', input_type: 'text_array', output_type: 'vector_array' },
  vector_db_upsert: { id: 'vector_db_upsert', name: 'Vector DB Upsert', type: 'rag', description: 'Stores chunks and their embeddings into a vector database', input_type: 'vector_array', output_type: 'database_status' },
  vector_search: { id: 'vector_search', name: 'Vector Search', type: 'rag', description: 'Queries the vector DB for the most semantically relevant text chunks based on the prompt', input_type: 'text', output_type: 'text_array' },
  rag_synthesizer: { id: 'rag_synthesizer', name: 'RAG Synthesizer', type: 'rag', description: 'Takes retrieved context chunks and the original prompt to generate an accurate, grounded answer', input_type: 'text_array', output_type: 'text' },
};
