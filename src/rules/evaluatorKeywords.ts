// Keyword lists for rule-based evaluation
//
// Add new keywords to these arrays to handle additional out-of-bounds
// scenarios or to catch incoherent declarations. This central module
// allows the evaluator to be extended without modifying core logic.

export const OOB_KEYWORDS = [
  'million',
  'billion',
  'dollar',
  'funding',
  'investment',
  'acquisition',
  'merger',
  'recession',
  'crisis'
]

export const NONSENSE_KEYWORDS = [
  'blah',
  'random',
  'nonsense',
  'gibberish',
  'test',
  'placeholder'
]
