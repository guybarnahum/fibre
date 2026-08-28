# Model runtime

`packages/model-runtime` contains provider-adjacent runtime helpers that are not Fibre semantic authorities.

## Prompt assets

LLM prompts are editable text assets rather than embedded runtime source code.

The minimal convention is:

```text
services/<service>/prompts/<prompt-id>.md
tools/<tool-area>/prompts/<prompt-id>.md

# optional model adaptation
<owner>/prompts/profiles/<profile>/<prompt-id>.md
```

`resolvePromptAsset()` reads the base prompt exactly as stored. If an explicit profile is selected, its text is appended after one blank line. The resolver returns the resolved text plus SHA-256 digests for the base, profile and final prompt.

A base prompt is the semantic authority for that cognition task. A model profile may adapt wording or mechanical guidance for a model family, but it must not redefine Fibre concepts, evidence rules, permissions or domain semantics. Profile selection is explicit; the registry does not guess from model names and does not accept arbitrary prompt bodies from environment variables.

Prompt files are read-only packaged application assets, not durable Fibre state. Historical/model-invocation evidence should retain the resolved prompt digest where reproducibility matters.

Supported LLM worker/evaluator prompt prose belongs in prompt assets. Schemas, deterministic policy, structured runtime inputs, scenario fixtures, image-generation instructions and model transport remain in their owning code/data surfaces.

Keep this mechanism small: no prompt database, management service, templating language or generated version filenames. Git versions the assets; stable prompt IDs name their semantic role.
