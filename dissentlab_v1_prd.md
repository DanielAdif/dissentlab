# DissentLab V1 Product Requirements Document

## 1. Document Overview

**Product Name:** DissentLab  
**Version:** V1 MVP  
**Product Type:** Local-first desktop/web AI research and debate application  
**Primary User:** Non-technical single user  
**Core Experience:** Watch multiple AI personas research, discuss, argue, challenge each other, and produce a final recommendation.  
**Orchestration Stack:** LangGraph + LangChain  
**UI Direction:** Minimal, text-first, live debate interface  

---

# 2. Executive Summary

DissentLab is a local-first AI research and debate application where users submit a question and watch a council of AI personas investigate, discuss, disagree, and converge toward a final answer.

Unlike a normal chatbot, DissentLab does not immediately produce a single answer. Instead, it creates a live panel discussion among multiple AI personas.

The default council consists of:

1. **Optimist** — argues for upside, opportunity, and possibility.
2. **Pessimist** — argues for risk, failure modes, and constraints.
3. **Contrarian** — challenges both sides and creates productive tension.
4. **Observer** — neutral evaluator that summarizes, tracks consensus, and produces the final synthesis.

The debate itself is part of the product experience. Users should feel like they are watching a live AI research team think through the problem in real time.

The system supports:

- Local-first usage
- Single-user storage
- Local models through Ollama
- API models through OpenAI, Anthropic, Gemini, Moonshot/Kimi, and optionally OpenRouter
- Independent web research per persona
- Dynamic debate stopping
- Maximum 15 debate rounds
- Minimalistic UI
- Editable council personas

---

# 3. Product Vision

DissentLab helps users make better decisions by showing them how multiple AI perspectives investigate and challenge a problem.

The product is not just about the final answer.

The product is about the thinking process.

The user should be able to ask:

> "Should I start this business?"

and watch:

- Optimist identify the upside.
- Pessimist expose the risks.
- Contrarian attack weak assumptions.
- Observer track where the debate is converging.
- The council produce a final recommendation with citations, confidence, and unresolved disagreements.

The product should feel like:

> "A live AI panel discussion for serious thinking."

Not:

> "Another chatbot with tools."

---

# 4. Core Product Positioning

## 4.1 What DissentLab Is

DissentLab is:

- A live AI research council
- A debate-based reasoning interface
- A local-first decision-support tool
- A multi-persona research system
- A lightweight desktop/web app for non-technical users

## 4.2 What DissentLab Is Not

DissentLab is not:

- A generic chatbot
- A roleplay toy
- A Slack clone
- A team collaboration app
- A fully autonomous research agent that runs forever
- A complex enterprise workflow tool
- A replacement for expert professional judgment

---

# 5. Strategic Product Bet

The central bet is:

> Users will value watching AI personas argue through a problem because the debate exposes assumptions, tradeoffs, uncertainty, and blind spots better than a single chatbot answer.

This means the debate should not be hidden as a debug panel.

The debate is the main experience.

The final answer is the conclusion of the experience.

---

# 6. Target Users

## 6.1 Primary Users

### Solo Founders

Need help with:

- Business validation
- Market research
- Product strategy
- Risk assessment
- Go/no-go decisions

### Product Managers

Need help with:

- Feature prioritization
- Competitive analysis
- Product tradeoff decisions
- Roadmap reasoning

### Researchers and Analysts

Need help with:

- Synthesizing multiple sources
- Comparing arguments
- Finding weak evidence
- Understanding opposing views

### AI Power Users

Need help with:

- More reliable answers than single-chatbot output
- Transparent reasoning
- Alternative viewpoints
- Source-backed analysis

---

# 7. User Problems

Current chatbot products have several weaknesses:

1. They usually produce one answer from one perspective.
2. They often sound confident even when uncertainty is high.
3. They do not naturally expose disagreement.
4. They hide the reasoning process.
5. They do not make tradeoffs emotionally or visually obvious.
6. They are not fun to watch.
7. They do not make the user feel like they are consulting a team.

DissentLab solves this by creating a visible debate among multiple AI personas.

---

# 8. Product Goals

## 8.1 Primary Goals

1. Let users submit a question and watch AI personas debate it live.
2. Produce better decisions through structured disagreement.
3. Support independent web research by each persona.
4. Produce a neutral final synthesis from an Observer agent.
5. Allow local-first usage for privacy and ownership.
6. Support local and API-based AI models.
7. Keep the interface minimal enough for non-technical users.

## 8.2 Secondary Goals

1. Let users edit, add, disable, and remove personas.
2. Let users control debate intensity.
3. Let users inspect sources used by each persona.
4. Let users save and revisit debate sessions.
5. Let users configure model providers without technical setup.

---

# 9. Non-Goals for V1

The following are out of scope for V1:

- Multi-user collaboration
- Team workspaces
- Cloud accounts
- Persona marketplace
- Mobile apps
- Browser extension
- Long-running background research
- Agent memory across sessions
- File upload and PDF analysis
- Voice mode
- Real-time multiplayer viewing
- Payment system
- Enterprise admin panel
- Plugin marketplace
- Complex workflow automation
- Full MCP marketplace integration

These may be considered in later versions.

---

# 10. V1 Scope

## 10.1 Included in V1

V1 includes:

- Local-first desktop/web app
- Single-user mode
- Default 3 debating personas
- Neutral Observer agent
- Persona add/edit/remove/disable
- Independent web research per persona
- Live debate stream
- Dynamic debate stopping
- Maximum 15 debate rounds
- Final synthesized report
- Source citations
- Session history
- Local settings
- Local API key storage
- Ollama support
- API provider support
- Minimal settings interface

## 10.2 Excluded from V1

V1 excludes:

- User authentication
- Cloud sync
- Collaboration
- Memory
- PDF ingestion
- Team sharing
- Advanced analytics dashboard
- Fine-tuning
- Agent marketplace
- Custom tool marketplace

---

# 11. Core User Experience

## 11.1 Basic Flow

1. User opens the app.
2. User enters a question.
3. User selects debate intensity.
4. User selects model provider.
5. User starts council session.
6. Personas independently research the topic.
7. Personas present initial findings.
8. Personas debate each other.
9. Observer periodically summarizes debate state.
10. Debate stops when consensus is reached or max rounds are hit.
11. Observer produces final report.
12. User can review transcript, sources, and final synthesis.

---

# 12. Main User Story

As a user, I want to ask a difficult question and watch multiple AI personas research and debate it, so that I can see the strongest arguments, risks, disagreements, and final recommendation.

Example question:

> Should I build a local-first AI research app for founders?

Expected experience:

1. Optimist researches opportunity and market upside.
2. Pessimist researches risks, competition, and failure modes.
3. Contrarian challenges both interpretations.
4. The debate unfolds live.
5. Observer summarizes where the council agrees and disagrees.
6. Final answer gives recommendation, confidence, sources, and open questions.

---

# 13. Default Council

## 13.1 Visible Personas

The default visible council has three debating personas.

### 13.1.1 Optimist

Purpose:

The Optimist identifies opportunity, upside, leverage, growth potential, and reasons the idea may succeed.

Primary responsibilities:

- Look for positive signals.
- Identify overlooked opportunities.
- Argue the strongest case for action.
- Find market, strategic, technical, or creative upside.
- Challenge excessive caution.

Behavior rules:

- Must support claims with evidence when possible.
- Must not blindly agree with the user.
- Must acknowledge uncertainty.
- Must not ignore major risks.

Example tone:

> "The opportunity is real, but only if the product sharply differentiates on user experience and decision quality."

---

### 13.1.2 Pessimist

Purpose:

The Pessimist identifies risks, constraints, hidden costs, weaknesses, and reasons the idea may fail.

Primary responsibilities:

- Identify downside.
- Surface execution risks.
- Challenge unrealistic assumptions.
- Highlight market, technical, financial, or behavioral obstacles.
- Argue the strongest case against action.

Behavior rules:

- Must not be negative for entertainment only.
- Must provide specific failure modes.
- Must distinguish fatal risks from manageable risks.
- Must not dismiss valid opportunities without evidence.

Example tone:

> "The idea sounds compelling, but the latency, cost, and model reliability problems could destroy the user experience."

---

### 13.1.3 Contrarian

Purpose:

The Contrarian challenges both Optimist and Pessimist.

This persona exists to create intellectual tension and prevent lazy agreement.

Primary responsibilities:

- Disagree with weak reasoning.
- Expose assumptions.
- Challenge both positive and negative claims.
- Identify false binaries.
- Find third interpretations.
- Point out where both sides may be missing the actual issue.

Behavior rules:

- Must not disagree randomly.
- Must not create fake drama.
- Must attack reasoning, not personality.
- Must provide alternative framing.
- Must identify blind spots in both sides.

Example tone:

> "Both of you are debating market demand, but the real bottleneck may be trust. Users may enjoy the debate but still not rely on it for serious decisions."

---

## 13.2 System Persona

### 13.2.1 Observer

Purpose:

The Observer is neutral.

The Observer does not debate.

The Observer monitors the debate, evaluates convergence, and produces the final synthesis.

Primary responsibilities:

- Track debate progress.
- Summarize agreements.
- Summarize disagreements.
- Estimate consensus.
- Detect repetition.
- Decide whether to continue or stop.
- Generate final report.

Behavior rules:

- Must not take a persona stance.
- Must not invent consensus.
- Must preserve disagreement when disagreement remains.
- Must clearly separate evidence, interpretation, and recommendation.

Example tone:

> "The council agrees that user experience is the key differentiator. The unresolved disagreement is whether the product can provide enough value to justify the waiting time and model cost."

---

# 14. Persona Management

## 14.1 V1 Persona Customization

Users can:

- Rename a persona.
- Edit persona description.
- Edit persona system prompt.
- Enable or disable a persona.
- Add a new persona.
- Delete a custom persona.
- Restore default personas.

## 14.2 Persona Limits

To keep V1 stable:

- Minimum active debating personas: 2
- Default active debating personas: 3
- Maximum active debating personas: 6
- Observer is required and cannot be deleted
- Observer prompt can only be lightly customized in V1

## 14.3 Persona Configuration Fields

Each persona has:

- Name
- Role description
- System prompt
- Debate behavior
- Research behavior
- Tool permissions
- Model assignment
- Enabled/disabled status

## 14.4 Persona Tool Permissions

Each persona can be granted access to:

- Web search
- URL reader
- Source summarizer
- Citation extractor

V1 should not expose overly technical tool configuration to non-technical users.

Recommended simple options:

- Research access: On / Off
- Source limit: Low / Medium / High
- Debate aggression: Calm / Balanced / Intense

---

# 15. Debate Experience

## 15.1 Debate as First-Class UI

The debate is visible by default.

The user should see the AI council working live.

The UI should not feel like a hidden debug log.

It should feel like a clean panel discussion.

## 15.2 Debate Timeline

Each session has a visible timeline:

1. Researching
2. Initial Positions
3. Debate Round 1
4. Observer Checkpoint
5. Debate Round 2
6. Observer Checkpoint
7. Final Synthesis

## 15.3 Debate Messages

Each debate message should show:

- Persona name
- Persona role
- Message content
- Referenced sources
- Round number
- Timestamp
- Optional confidence value

Example:

```text
Round 2 — Contrarian

Both Optimist and Pessimist are assuming users want "better answers."
That may be wrong. The actual emotional hook is watching the reasoning unfold.
The product may succeed as an experience before it succeeds as a productivity tool.
```

## 15.4 What Should Be Hidden

The app should not show low-level technical logs by default.

Hide:

- Raw tool calls
- HTTP requests
- Token counts
- Embedding operations
- Internal LangGraph state
- Raw JSON outputs
- Stack traces

These may be available in a developer/debug mode later.

## 15.5 What Should Be Shown

Show meaningful progress:

```text
Optimist found 4 sources supporting market demand.
Pessimist is checking competing products.
Contrarian is reviewing assumptions from both sides.
Observer sees no consensus yet.
```

---

# 16. Debate Intensity

Users can choose debate intensity before starting.

## 16.1 Quick Mode

Purpose:

Fast answer with light debate.

Behavior:

- Research phase
- Initial persona positions
- 1 debate round
- Final Observer summary

Recommended for:

- Simple questions
- Fast brainstorming
- Low-stakes decisions

Target duration:

- 20–45 seconds depending on model and provider

## 16.2 Standard Mode

Purpose:

Balanced research and debate.

Behavior:

- Research phase
- Initial positions
- 3–5 debate rounds
- Observer checkpoints
- Final synthesis

Recommended for:

- Product decisions
- Strategy questions
- Business validation
- Research synthesis

Target duration:

- 1–3 minutes depending on model and provider

## 16.3 Deep Dive Mode

Purpose:

More intense debate.

Behavior:

- Expanded research phase
- More source analysis
- Up to 15 debate rounds
- Observer stops early if convergence occurs
- Final synthesis includes unresolved disagreements

Recommended for:

- High-stakes decisions
- Serious research questions
- Strategic planning

Target duration:

- Longer sessions
- User should be clearly warned that this mode takes more time and may cost more when using API models

---

# 17. Dynamic Debate Stopping

## 17.1 Stopping Principle

The debate should not always run for a fixed number of rounds.

It should stop when continuing no longer adds value.

## 17.2 Observer Stopping Criteria

After each debate round, Observer evaluates:

- Consensus level
- New information added
- Repetition level
- Remaining unresolved disagreements
- Evidence quality
- Confidence level

## 17.3 Consensus Threshold

Default consensus threshold:

```text
0.75
```

If consensus score is greater than or equal to 0.75, the Observer may stop the debate and produce final synthesis.

## 17.4 Repetition Stop

If two consecutive rounds introduce no meaningfully new arguments, Observer should stop the debate even if consensus is below threshold.

## 17.5 Hard Stop

Maximum debate rounds:

```text
15
```

If consensus is not reached after 15 rounds:

- Debate stops automatically.
- Observer summarizes the unresolved disagreement.
- Final answer must not pretend that consensus exists.

---

# 18. Research System

## 18.1 Independent Research Per Persona

Each debating persona can conduct its own research.

This is important because each persona should search from its own perspective.

Example:

- Optimist searches for opportunity, demand, successful examples.
- Pessimist searches for failures, risks, costs, competition.
- Contrarian searches for assumptions, counterexamples, missing frames.

## 18.2 Shared Evidence Pool

Although personas research independently, all discovered sources are added to a shared evidence pool.

The system should:

- Deduplicate sources.
- Track which persona found each source.
- Summarize source relevance.
- Preserve citation metadata.
- Allow personas to cite sources found by others.

## 18.3 Research Limits

V1 must enforce research limits.

Default limits per persona:

```text
Quick Mode:
- Max searches per persona: 2
- Max URLs read per persona: 3

Standard Mode:
- Max searches per persona: 4
- Max URLs read per persona: 6

Deep Dive Mode:
- Max searches per persona: 8
- Max URLs read per persona: 12
```

Global hard limits:

```text
Max total searches per session: 30
Max total URLs read per session: 50
Max debate rounds: 15
```

These limits are necessary.

Without them, cost, latency, and context size will explode.

## 18.4 Source Requirements

Each final answer should include sources when web research is enabled.

Minimum target:

```text
At least 3 useful sources per final report.
```

## 18.5 Source Metadata

Each source should store:

- Title
- URL
- Publisher/domain
- Date retrieved
- Summary
- Persona that discovered it
- Claims supported
- Relevance score

## 18.6 Source Quality

The system should prefer:

- Primary sources
- Official documentation
- Research papers
- Government or institutional sources
- Reputable journalism
- Direct company/product pages

The system should flag weaker sources such as:

- Random blogs
- SEO content farms
- Unsourced claims
- Forum posts
- Outdated pages

---

# 19. Final Report

## 19.1 Final Report Owner

The final report is generated by the Observer.

## 19.2 Final Report Structure

The final report should contain:

1. Direct Answer
2. Executive Summary
3. Council Recommendation
4. Confidence Level
5. Key Agreements
6. Key Disagreements
7. Optimist’s Strongest Argument
8. Pessimist’s Strongest Argument
9. Contrarian’s Strongest Objection
10. Key Risks
11. Key Opportunities
12. Evidence Summary
13. Sources
14. Open Questions
15. Suggested Next Step

## 19.3 Confidence Levels

Use simple confidence levels:

```text
Low
Medium
High
```

Do not overuse fake precision like:

```text
83.7% confidence
```

Unless the score is clearly explained.

## 19.4 Final Recommendation Format

The final recommendation should be direct.

Bad:

```text
There are many factors to consider.
```

Good:

```text
Recommendation: Proceed with a small validation prototype, but do not build the full product yet.
```

## 19.5 No Fake Consensus

If the council disagrees, the final report must say so clearly.

Example:

```text
The council did not reach consensus.

Agreement:
- The idea has a clear emotional hook.
- The live debate experience is differentiated.

Disagreement:
- Optimist believes this can become a serious productivity tool.
- Pessimist believes latency and cost may prevent regular use.
- Contrarian believes the product may be more entertainment than utility.
```

---

# 20. Model Provider Support

## 20.1 Local Models

V1 should support local models through:

```text
Ollama
```

Recommended local model support:

- Llama
- Qwen
- DeepSeek
- Mistral
- Gemma

## 20.2 Hugging Face Models

Hugging Face local model support is desirable but risky for V1 because non-technical users may struggle with:

- Model size
- GPU requirements
- Quantization
- Download time
- Runtime compatibility

Recommended V1 approach:

```text
Support Hugging Face model import only if it can be wrapped behind a simple non-technical flow.
Otherwise defer full Hugging Face support to V1.1 or V2.
```

Minimum acceptable V1 implementation:

- Let users import a compatible local model through a guided setup.
- Clearly show whether their machine can run it.
- Do not expose raw technical configuration unless advanced mode is enabled.

## 20.3 API Models

V1 should support API keys for:

- OpenAI
- Anthropic Claude
- Google Gemini
- Moonshot/Kimi

Optional but strongly recommended:

- OpenRouter

OpenRouter can simplify multi-provider access, but users should still be able to configure direct provider keys where supported.

## 20.4 Model Assignment

V1 should support two levels of model assignment:

### Simple Mode

One model for the entire council.

Example:

```text
All personas use GPT-5
```

### Advanced Mode

Different model per persona.

Example:

```text
Optimist: Gemini
Pessimist: Claude
Contrarian: DeepSeek via Ollama
Observer: GPT-5
```

Advanced mode is useful because different models may produce genuinely different reasoning styles.

## 20.5 Model Provider Abstraction

All model providers must use a common internal interface.

Example:

```text
ModelProvider.generate()
ModelProvider.stream()
ModelProvider.supports_tools()
ModelProvider.get_context_window()
```

No persona should call a provider directly.

Personas call the internal model gateway.

---

# 21. Tool System

## 21.1 Tool Philosophy

DissentLab should not feel like a normal chatbot with tools.

Tools should be invisible infrastructure that help personas research.

The user should see the result of tool usage, not the raw mechanics.

## 21.2 V1 Tools

V1 tools:

- Web search
- URL reader
- Webpage summarizer
- Source deduplicator
- Citation extractor

## 21.3 Tool Access Per Persona

Each persona may have different tool access.

Example:

```text
Optimist:
- Web search: enabled
- URL reader: enabled

Pessimist:
- Web search: enabled
- URL reader: enabled

Contrarian:
- Web search: enabled
- URL reader: enabled

Observer:
- Web search: disabled by default
- Reads evidence pool only
```

## 21.4 Tool Safety

The crawler must:

- Respect robots.txt where applicable.
- Avoid login-required content.
- Avoid bypassing paywalls.
- Avoid scraping private or restricted content.
- Rate-limit requests.
- Store retrieved content locally.
- Clearly cite retrieved URLs.

---

# 22. Local-First Requirements

## 22.1 Data Storage

All user data should be stored locally by default.

Stored locally:

- Sessions
- Debate transcripts
- Personas
- Model settings
- API keys
- Sources
- Evidence summaries
- App preferences

## 22.2 Database

Recommended V1 database:

```text
SQLite
```

## 22.3 Local File Storage

Use local file storage for:

- Cached webpages
- Source snapshots
- Logs
- Exported markdown files
- Model metadata

## 22.4 Vector Store

Recommended V1 vector store:

```text
Chroma
```

Alternative:

```text
Qdrant local
```

Use only if needed for source retrieval and evidence memory within a session.

## 22.5 Privacy Position

The app should clearly communicate:

```text
Your sessions are stored locally.
Your API requests are sent only to the model providers you configure.
Local models do not send prompts to cloud providers.
```

## 22.6 No Mandatory Account

V1 should not require:

- Sign up
- Login
- Cloud workspace
- Subscription account

---

# 23. Security Requirements

## 23.1 API Key Storage

API keys must be encrypted locally.

Requirements:

- Never store plaintext API keys.
- Use OS-level secure storage where possible.
- Fall back to encrypted local storage only when necessary.
- Hide keys in the UI after entry.
- Allow users to delete keys.

## 23.2 Local Data Control

Users must be able to:

- Delete a session.
- Delete all history.
- Delete all sources.
- Reset the app.
- Remove model provider keys.

## 23.3 Error Handling

Errors should be readable by non-technical users.

Bad:

```text
HTTP 429 provider error
```

Good:

```text
The model provider rejected the request because the rate limit was reached. Try again later or choose another model.
```

---

# 24. UX Requirements

## 24.1 Design Principles

The UI should be:

- Minimal
- Text-first
- Calm
- Fast
- Focused
- Easy for non-technical users

Avoid:

- Heavy dashboards
- Excessive colors
- Avatar clutter
- Fake gamification
- Overdesigned animations
- Complex settings screens

## 24.2 Main Layout

Recommended layout:

```text
--------------------------------------------------
DissentLab
--------------------------------------------------

Question Input

Debate Intensity:
[Quick] [Standard] [Deep Dive]

Model:
[Provider / Model Dropdown]

[Start Council]

--------------------------------------------------

Live Council

Optimist
Message...

Pessimist
Message...

Contrarian
Message...

Observer
Checkpoint...

--------------------------------------------------

Final Report

Recommendation
Confidence
Key Agreements
Key Disagreements
Sources
--------------------------------------------------
```

## 24.3 Live Debate View

The live debate view should be the main screen after the user starts a session.

It should stream messages as they are generated.

Each persona message should appear as a clean text card.

Card fields:

- Persona name
- Persona role
- Round number
- Message
- Sources cited
- Optional confidence

## 24.4 Observer Checkpoints

Observer should appear between rounds when useful.

Example:

```text
Observer Checkpoint — Round 3

Consensus: Medium

The council agrees that the product experience is differentiated.
The main disagreement is whether the differentiation is strong enough to overcome latency and cost.
```

## 24.5 Source Panel

A side panel or bottom section should list sources.

Each source should show:

- Title
- Domain
- Short summary
- Used by which persona
- Open link button

## 24.6 Session History

Users can access previous sessions.

History item should show:

- Question
- Date
- Debate intensity
- Model used
- Final recommendation preview

## 24.7 Settings

Settings should include:

- Model provider
- API key management
- Local model configuration
- Default debate intensity
- Default research limits
- Persona management
- Data deletion

---

# 25. Core Screens

## 25.1 Home Screen

Purpose:

Start a new council session.

Elements:

- App title
- Question input
- Debate intensity selector
- Model selector
- Start button
- Recent sessions

## 25.2 Live Council Screen

Purpose:

Watch research and debate.

Elements:

- User question
- Current phase indicator
- Live debate stream
- Observer checkpoints
- Source panel
- Stop button
- Generate final summary button

## 25.3 Final Report Screen

Purpose:

Review final output.

Elements:

- Recommendation
- Confidence
- Summary
- Agreements
- Disagreements
- Persona strongest arguments
- Sources
- Open questions
- Export to markdown

## 25.4 Persona Manager

Purpose:

Customize council.

Elements:

- List of personas
- Add persona
- Edit persona
- Disable persona
- Delete custom persona
- Restore defaults

## 25.5 Model Settings

Purpose:

Configure model providers.

Elements:

- Provider selector
- API key input
- Local model detection
- Test connection button
- Default model selector

## 25.6 History Screen

Purpose:

View previous sessions.

Elements:

- Search sessions
- Filter by date
- Open session
- Delete session

---

# 26. LangGraph Architecture

## 26.1 High-Level Flow

```text
User Question
    |
Validate Input
    |
Create Session State
    |
Persona Research Phase
    |
Evidence Pool Merge
    |
Initial Persona Positions
    |
Debate Loop
    |
Observer Checkpoint
    |
Continue or Stop?
    |         |
   Yes        No
    |         |
Next Round   Final Report
```

## 26.2 Graph Nodes

### Node 1: Input Validator

Responsibilities:

- Validate user question.
- Check required model provider.
- Check web research availability.
- Check active personas.
- Initialize session state.

### Node 2: Task Brief Generator

Responsibilities:

- Convert user question into a structured task.
- Identify research angles.
- Assign research framing to each persona.

### Node 3: Persona Research Nodes

Runs in parallel.

One node per active persona.

Responsibilities:

- Generate search queries from persona perspective.
- Search web.
- Read selected URLs.
- Extract claims.
- Summarize evidence.
- Return structured findings.

### Node 4: Evidence Merger

Responsibilities:

- Merge all persona findings.
- Deduplicate URLs.
- Deduplicate claims.
- Score source relevance.
- Build shared evidence pool.

### Node 5: Initial Position Nodes

Runs in parallel.

One node per active persona.

Responsibilities:

- Review evidence pool.
- Produce initial position.
- Cite evidence.
- Identify confidence level.

### Node 6: Debate Round Node

Responsibilities:

- Give each persona access to previous round messages.
- Ask each persona to respond to other arguments.
- Require each persona to add new value or revise position.
- Stream outputs to UI.

### Node 7: Observer Checkpoint Node

Responsibilities:

- Summarize current state.
- Calculate consensus score.
- Detect repetition.
- Identify unresolved disagreements.
- Decide whether another round is useful.

### Node 8: Router Node

Responsibilities:

Route to:

- Another debate round
- Final report

Based on:

- Consensus score
- Repetition score
- Round count
- User stop request
- Error state

### Node 9: Final Report Node

Responsibilities:

- Generate final synthesis.
- Preserve disagreements.
- Include sources.
- Produce recommendation.

---

# 27. LangGraph State Schema

Example state shape:

```python
from typing import TypedDict, List, Optional

class Source(TypedDict):
    id: str
    title: str
    url: str
    domain: str
    retrieved_at: str
    summary: str
    discovered_by: str
    relevance_score: float
    claims: List[str]

class PersonaConfig(TypedDict):
    id: str
    name: str
    role: str
    system_prompt: str
    enabled: bool
    model_provider: str
    model_name: str
    tools_enabled: List[str]

class PersonaFinding(TypedDict):
    persona_id: str
    summary: str
    sources: List[str]
    claims: List[str]
    confidence: str

class DebateMessage(TypedDict):
    round_number: int
    persona_id: str
    content: str
    cited_sources: List[str]
    confidence: str
    created_at: str

class ObserverCheckpoint(TypedDict):
    round_number: int
    consensus_score: float
    repetition_score: float
    agreements: List[str]
    disagreements: List[str]
    should_continue: bool
    reason: str

class CouncilState(TypedDict):
    session_id: str
    user_question: str
    task_brief: str
    personas: List[PersonaConfig]
    sources: List[Source]
    persona_findings: List[PersonaFinding]
    debate_messages: List[DebateMessage]
    observer_checkpoints: List[ObserverCheckpoint]
    round_count: int
    max_rounds: int
    consensus_threshold: float
    final_report: Optional[str]
    status: str
```

---

# 28. Streaming Requirements

## 28.1 Live Updates

The UI must receive live updates during:

- Research start
- Source found
- Persona initial position
- Debate message
- Observer checkpoint
- Final report generation

## 28.2 Recommended Transport

Use:

```text
WebSocket
```

or:

```text
Server-Sent Events
```

WebSocket is preferred if bidirectional control is needed.

## 28.3 User Controls During Streaming

User can:

- Stop session
- Skip to final summary
- Expand/collapse sources
- Pause auto-scroll
- Copy message
- Copy final report

---

# 29. Data Model

## 29.1 Tables

Recommended SQLite tables:

```text
sessions
personas
model_configs
tool_configs
sources
persona_findings
debate_messages
observer_checkpoints
final_reports
settings
```

## 29.2 sessions

Fields:

- id
- question
- created_at
- updated_at
- status
- debate_intensity
- model_summary
- final_recommendation_preview

## 29.3 personas

Fields:

- id
- name
- role
- system_prompt
- enabled
- is_default
- model_provider
- model_name
- tool_permissions
- created_at
- updated_at

## 29.4 sources

Fields:

- id
- session_id
- title
- url
- domain
- summary
- discovered_by_persona_id
- relevance_score
- retrieved_at

## 29.5 debate_messages

Fields:

- id
- session_id
- round_number
- persona_id
- content
- cited_source_ids
- confidence
- created_at

## 29.6 observer_checkpoints

Fields:

- id
- session_id
- round_number
- consensus_score
- repetition_score
- agreements_json
- disagreements_json
- should_continue
- reason
- created_at

## 29.7 final_reports

Fields:

- id
- session_id
- content_markdown
- confidence
- recommendation
- created_at

---

# 30. Technical Architecture

## 30.1 Recommended Stack

Frontend:

```text
Next.js
TailwindCSS
shadcn/ui
```

Desktop wrapper:

```text
Tauri
```

Backend:

```text
FastAPI
```

Agent orchestration:

```text
LangGraph
LangChain
```

Database:

```text
SQLite
```

Vector store:

```text
Chroma
```

Local model integration:

```text
Ollama
```

Cloud/API model integration:

```text
OpenAI
Anthropic
Gemini
Moonshot/Kimi
OpenRouter optional
```

## 30.2 Application Structure

Recommended modules:

```text
/apps
  /desktop
  /web

/backend
  /api
  /agents
  /graph
  /models
  /tools
  /storage
  /security

/frontend
  /components
  /screens
  /hooks
  /stores
  /styles
```

## 30.3 Backend Responsibilities

The backend handles:

- LangGraph execution
- Model provider calls
- Tool execution
- Web search
- URL reading
- Source processing
- Session persistence
- API key encryption
- Streaming events

## 30.4 Frontend Responsibilities

The frontend handles:

- User input
- Live debate display
- Session history
- Settings
- Persona manager
- Source panel
- Final report display

---

# 31. Model Gateway

## 31.1 Purpose

The Model Gateway abstracts all model providers behind a common interface.

Personas should not know whether they are using:

- Ollama
- OpenAI
- Claude
- Gemini
- Moonshot
- OpenRouter

## 31.2 Required Methods

```python
class ModelGateway:
    def generate(self, prompt, model_config):
        pass

    def stream(self, prompt, model_config):
        pass

    def supports_streaming(self, model_config):
        pass

    def supports_tool_calling(self, model_config):
        pass

    def get_context_window(self, model_config):
        pass
```

## 31.3 Provider Failure Handling

If a model provider fails:

- Show readable error.
- Allow retry.
- Allow switching provider.
- Preserve session state.
- Do not lose already-generated debate messages.

---

# 32. Prompting Requirements

## 32.1 Persona Prompt Structure

Each persona prompt should include:

- Role
- Objective
- Debate behavior
- Research behavior
- Constraints
- Output format

## 32.2 Persona Output Format

Persona debate outputs should be structured internally.

Example:

```json
{
  "position": "The idea has strong potential but requires sharp UX differentiation.",
  "argument": "The core emotional hook is watching AI reasoning unfold.",
  "evidence_used": ["source_1", "source_3"],
  "challenge_to_others": "Pessimist is over-weighting latency without considering user tolerance for high-value research.",
  "confidence": "Medium"
}
```

The UI does not need to display raw JSON.

## 32.3 Observer Output Format

Observer should output structured fields:

```json
{
  "consensus_score": 0.72,
  "repetition_score": 0.31,
  "agreements": [],
  "disagreements": [],
  "should_continue": true,
  "reason": "The council has not resolved whether the product is primarily utility or entertainment."
}
```

---

# 33. Consensus Logic

## 33.1 Consensus Is Not Always Required

The system should not force consensus.

Some questions have legitimate unresolved disagreement.

The Observer should be allowed to conclude:

```text
The council did not reach consensus.
```

## 33.2 Consensus Score Inputs

Consensus score should consider:

- Similarity of recommendations
- Agreement on key facts
- Agreement on risks
- Agreement on next steps
- Remaining unresolved objections

## 33.3 Repetition Score Inputs

Repetition score should consider:

- Repeated claims
- No new evidence
- No changed positions
- No new objections
- Circular argument patterns

## 33.4 Stop Conditions

Stop debate if any condition is true:

```text
consensus_score >= 0.75
round_count >= max_rounds
repetition_score >= 0.85 for 2 consecutive rounds
user clicks "Generate Final Report"
critical provider/tool failure occurs
```

---

# 34. Performance Requirements

## 34.1 Target Performance

Quick Mode:

```text
Target: under 45 seconds
```

Standard Mode:

```text
Target: 1–3 minutes
```

Deep Dive Mode:

```text
Target: user accepts longer duration
```

## 34.2 Streaming Requirement

The user should see activity within:

```text
3 seconds
```

Even if the full answer takes longer.

## 34.3 Perceived Performance

The app must avoid blank waiting states.

Always show:

- Current phase
- Active persona
- Recent meaningful update
- Progress through debate rounds

---

# 35. Cost Controls

## 35.1 API Cost Risk

Multi-agent debate can become expensive quickly.

V1 must include cost controls.

## 35.2 Cost Control Features

Required:

- Research limits
- Debate round limits
- Model selection
- Warning for Deep Dive mode
- Stop button
- Per-session estimated usage where possible

## 35.3 Default Limits

Default Standard Mode:

```text
Active debating personas: 3
Observer: 1
Max rounds: 5
Max searches per persona: 4
Max URLs per persona: 6
```

Deep Dive Mode:

```text
Max rounds: 15
Higher research limit
Explicit warning before start
```

---

# 36. Error States

## 36.1 Model Provider Error

Show:

```text
The selected model provider failed. You can retry, switch model, or generate a partial summary from completed messages.
```

## 36.2 Search Error

Show:

```text
Web research failed for one or more personas. The council can continue using available evidence.
```

## 36.3 Local Model Error

Show:

```text
The local model is not available. Check that Ollama is running or choose another provider.
```

## 36.4 No Sources Found

Show:

```text
The council could not find reliable sources. The final answer will be based on reasoning only and should be treated with lower confidence.
```

---

# 37. Export Requirements

## 37.1 V1 Export

V1 should support:

```text
Copy final report as markdown
Copy full debate transcript as markdown
```

Optional:

```text
Export session as .md file
```

PDF export is not required for V1.

---

# 38. Accessibility Requirements

V1 should support:

- Keyboard navigation
- Readable font sizes
- High contrast text
- Reduced motion
- Copyable text
- Clear focus states

---

# 39. Success Metrics

## 39.1 Product Quality Metrics

Track locally where possible:

- Number of sessions created
- Average debate rounds per session
- Percentage of sessions completed
- Percentage of sessions stopped manually
- Number of final reports copied/exported
- Number of persona customizations
- Repeat usage frequency

## 39.2 UX Metrics

Important signals:

- User starts a second session.
- User watches the debate instead of skipping immediately.
- User copies final report.
- User opens source panel.
- User customizes personas.
- User uses Standard or Deep Dive mode more than once.

## 39.3 Failure Signals

Bad signs:

- Users stop sessions early often.
- Users never read debate.
- Users only want final answer.
- Debates become repetitive.
- Sources are weak.
- Latency feels too long.
- Setup is too technical.

---

# 40. Acceptance Criteria

## 40.1 New Session

Given the user enters a question and clicks Start Council:

- A new session is created.
- Active personas are loaded.
- Model provider is validated.
- Debate screen opens.
- Live progress appears within 3 seconds.

## 40.2 Persona Research

Given web research is enabled:

- Each active persona performs independent research.
- Sources are added to the evidence pool.
- Duplicate sources are merged.
- Sources show which persona found them.

## 40.3 Live Debate

Given research is complete:

- Personas produce initial positions.
- Debate messages stream into the UI.
- Messages are grouped by round.
- Observer appears between rounds when appropriate.

## 40.4 Dynamic Stop

Given the debate is running:

- Observer evaluates after each round.
- Debate stops when consensus threshold is met.
- Debate stops at max round limit.
- Debate stops when repetition is too high.
- User can manually stop and generate final report.

## 40.5 Final Report

Given debate ends:

- Observer generates final report.
- Report includes recommendation.
- Report includes confidence.
- Report includes agreements.
- Report includes disagreements.
- Report includes sources.
- Report does not fake consensus.

## 40.6 Persona Management

Given user opens Persona Manager:

- User can edit default persona prompt.
- User can add custom persona.
- User can disable persona.
- User can delete custom persona.
- User cannot delete Observer.
- User can restore defaults.

## 40.7 Model Settings

Given user opens Model Settings:

- User can configure Ollama.
- User can configure API provider key.
- User can test model connection.
- User can choose default model.
- User receives readable errors on failure.

---

# 41. MVP Build Priority

## 41.1 Must Build First

1. Local app shell
2. Basic question input
3. Model provider gateway
4. Default personas
5. LangGraph debate loop
6. Streaming debate UI
7. Observer final report
8. SQLite session storage

## 41.2 Build Second

1. Web research tools
2. Source panel
3. Persona-specific research
4. Evidence pool
5. Consensus scoring
6. Dynamic stopping

## 41.3 Build Third

1. Persona manager
2. Advanced model assignment
3. Debate intensity presets
4. Markdown export
5. Better error handling

---

# 42. Roadmap

## 42.1 V1

Focus:

- Prove the live AI council experience.
- Make debate watchable.
- Generate useful final reports.
- Support local-first usage.

Features:

- Default personas
- Observer
- Live debate
- Independent research
- Local/API models
- Session history
- Persona customization
- Markdown copy/export

## 42.2 V1.1

Focus:

- Improve reliability and usability.

Possible features:

- Better Hugging Face local model support
- Better source quality ranking
- Debate replay
- Improved cost estimation
- Better local model setup wizard
- Session search

## 42.3 V2

Focus:

- Power-user customization.

Possible features:

- Custom council templates
- Per-persona advanced tool configuration
- Red Team mode
- Research Auditor persona
- PDF/file ingestion
- Local knowledge base
- Memory per persona

## 42.4 V3

Focus:

- Advanced research workflows.

Possible features:

- Long-running investigations
- Scheduled research
- Multi-session projects
- Report comparison
- Voice debate playback
- Shareable read-only reports
- Cloud sync optional

---

# 43. Major Risks

## 43.1 Risk: Debate Becomes Repetitive

Problem:

AI personas may repeat the same arguments across rounds.

Mitigation:

- Observer tracks repetition.
- Stop early when repetition is high.
- Require each persona to add new evidence, revise position, or directly answer another persona.
- Limit default rounds to 3–5.

## 43.2 Risk: Fake Drama

Problem:

Contrarian may disagree for no reason.

Mitigation:

- Contrarian must cite reasoning or evidence.
- Observer can call out low-quality disagreement.
- Prompt requires alternative framing, not empty disagreement.

## 43.3 Risk: Latency Too High

Problem:

Independent research plus debate can take too long.

Mitigation:

- Stream progress.
- Use parallel execution.
- Add debate intensity presets.
- Enforce research limits.
- Allow user to skip to final report.

## 43.4 Risk: API Cost Explosion

Problem:

Multiple personas and debate rounds multiply cost.

Mitigation:

- Research budgets.
- Round caps.
- Deep Dive warning.
- Local model support.
- User stop control.

## 43.5 Risk: Non-Technical Setup Is Too Hard

Problem:

Local models, API keys, and providers can confuse users.

Mitigation:

- Simple onboarding.
- Provider test button.
- Clear error messages.
- Ollama detection.
- Default recommended setup.

## 43.6 Risk: Final Answer Is Worse Than Single Chatbot

Problem:

More agents do not automatically mean better answers.

Mitigation:

- Strong Observer synthesis.
- Evidence pool.
- Source citations.
- Debate stop logic.
- Persona prompts that force useful disagreement.

---

# 44. Recommended V1 Defaults

## 44.1 Default Council

```text
Optimist
Pessimist
Contrarian
Observer
```

## 44.2 Default Debate Intensity

```text
Standard
```

## 44.3 Default Max Rounds

```text
5
```

## 44.4 Deep Dive Max Rounds

```text
15
```

## 44.5 Default Consensus Threshold

```text
0.75
```

## 44.6 Default Model Mode

```text
One model for all personas
```

## 44.7 Default UI Mode

```text
Live debate visible
Sources collapsible
Final report generated at end
```

---

# 45. Open Product Questions

These decisions should be finalized before engineering starts:

1. Should Hugging Face local model support be included in V1, or deferred to V1.1?
2. Should OpenRouter be the recommended API path, or only an optional provider?
3. Should users be allowed to assign different models per persona in V1, or should that be advanced mode only?
4. Should Observer messages appear after every round or only when meaningful?
5. Should the user be able to interrupt the debate with follow-up instructions mid-session?
6. Should the app support browser-only local mode, or only desktop-wrapped local mode for V1?
7. Should source snapshots be stored locally, or only source metadata and summaries?

---

# 46. Brutal Scope Recommendation

Do not overbuild V1.

The only thing V1 truly needs to prove is this:

> A user asks a question, watches an engaging AI council debate, and receives a better final answer than a normal chatbot would have given.

Everything else is secondary.

The highest-risk parts are:

1. Debate quality
2. Latency
3. Source quality
4. Setup simplicity

Do not spend early time on cosmetic persona features, complex dashboards, or marketplace-like customization.

The product wins if the user thinks:

> "That debate changed how I think about the question."

The product loses if the user thinks:

> "This is just three chatbots repeating each other slowly."

Build the smallest version that makes the first reaction happen.
