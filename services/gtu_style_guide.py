"""
GTU answer-writing style guide.

Encodes the conventions that GTU (Gujarat Technological University) toppers
use when answering theory exam questions in CE/IT/CSE branches. Used by
services.answer_engine to shape LLM prompts.

Sources synthesised from: GTU online-script assessment guidelines, Quora
threads on GTU answer-writing methodology, Darshan Institute paper-solution
format, Aakash topper-strategy article, Karpagam engineering answer
structuring guide.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Core rubric injected into every prompt.
# Kept tight; tier-specific guidance comes from EXEMPLARS + style_block().
# ---------------------------------------------------------------------------
GTU_SYSTEM_RULES = """\
GTU TOPPER ANSWER-WRITING RULES (Gujarat Technological University, BE/Diploma):

GENERAL FORMAT:
- Open with a one-line **definition** or direct statement of the concept (no warm-up sentences).
- Use **point-wise structure**: numbered points (1., 2., 3.) for explanations; bullets (-) only for sub-items.
- Bold every key technical term using **term** the first time it appears.
- Write key acronyms in CAPS on first mention with full form: e.g. **TCP (Transmission Control Protocol)**.
- Each numbered point = 2-3 short sentences max. No long paragraphs.
- End with a one-line **Conclusion:** or summary sentence stating the takeaway.

MARKS-TO-CONTENT MAPPING (GTU norm: ~40 words per mark):
- 1 mark : one-line definition, ~20-30 words, no diagram.
- 2 marks: definition + 2 key points OR 1 short example, ~60-80 words.
- 3 marks: definition + 3 numbered points, optional 1-line example, ~100-120 words.
- 4 marks: definition + 3-4 numbered points + 1 example, ~140-180 words; small diagram if applicable.
- 7 marks: open with 1-line definition, then 4-6 numbered points (2-3 sentences each), include
  at least one **Example:** and one **Diagram:** (if topic is visual), end with 1-line **Conclusion:**.
  Target ~250-300 words.

DIAGRAMS:
- For any visual concept (architecture, flow, layered model, circuit, ER, UML, tree),
  insert a placeholder line: `Diagram: [labelled diagram of <subject> showing <key labels>]`.
- Always state the figure caption: `Fig: <name>`.
- Mention the diagram in prose: "As shown in the diagram above, ...".

FORMULAS:
- Present each formula on its own line, prefixed with `Formula:` and followed by `where:` block listing every symbol with its **unit**.
- Example: `Formula: T = 2*pi*sqrt(L/g)   where: T = time period (s), L = length (m), g = 9.81 m/s^2`.

NUMERICAL / DERIVATION QUESTIONS:
- State **Given:**, **To find:**, **Formula:**, **Solution:** (step-by-step), **Answer:** (boxed value with unit).
- Show every intermediate step; never skip algebra.

COMPARISON QUESTIONS:
- Use a markdown table with columns | Parameter | A | B |. Minimum 4 rows of comparison.

LIST / ENUMERATE QUESTIONS:
- Pure numbered list, one item per line, each with a 1-line explanation.

TOPPER HABITS (DO):
- Underline / bold the question's key noun in the first sentence.
- Use the exact terminology from the GTU syllabus / textbook.
- Always cite an Indian / GTU-relevant **Example:** ("e.g., Aadhaar uses SHA-256...").
- Quote textbook authors when defining (e.g., "According to Tanenbaum, ...").
- Keep margins clean; one concept per point; never merge two ideas in one bullet.

MISTAKES TO AVOID (DON'T):
- No preamble like "Here is the answer" or "In this answer we will discuss".
- No filler ("It is very important to note that..."). Get to the point.
- Don't write wall-of-text paragraphs for >=3 mark questions.
- Don't omit the diagram placeholder when the topic is inherently visual.
- Don't skip units in formulas or numerical answers.
- Don't end mid-thought; always include the **Conclusion:** line.
"""


# ---------------------------------------------------------------------------
# Hand-crafted exemplars (look like real GTU topper answers).
# Keep each one short; style_block embeds at most one per tier to control tokens.
# ---------------------------------------------------------------------------
EXEMPLARS: dict[int, list[dict]] = {
    2: [
        {
            "question": "Define deadlock in operating systems. (2 marks)",
            "answer": (
                "**Deadlock** is a situation in an **operating system** where a set of "
                "processes are blocked because each process is holding a resource and "
                "waiting for another resource held by some other process in the set.\n"
                "- Key condition: circular wait on resources.\n"
                "Example: Process P1 holds Printer and waits for Scanner; P2 holds Scanner "
                "and waits for Printer.\n"
                "Conclusion: No process can proceed without external intervention."
            ),
        },
    ],
    3: [
        {
            "question": "List any three characteristics of a good algorithm. (3 marks)",
            "answer": (
                "An **algorithm** is a finite, well-defined sequence of steps to solve a "
                "computational problem. Key characteristics:\n"
                "1. **Finiteness** - It must terminate after a finite number of steps.\n"
                "2. **Definiteness** - Every step must be precise and unambiguous.\n"
                "3. **Effectiveness** - Each step must be basic enough to be carried out, "
                "in principle, by a person using only pencil and paper.\n"
                "Example: Euclid's GCD algorithm satisfies all three.\n"
                "Conclusion: These properties distinguish an algorithm from an arbitrary "
                "procedure."
            ),
        },
    ],
    4: [
        {
            "question": "Explain the four pillars of object-oriented programming with one-line example each. (4 marks)",
            "answer": (
                "**Object-Oriented Programming (OOP)** organises code around objects that "
                "bundle data and behaviour. Its four pillars are:\n"
                "1. **Encapsulation** - Wrapping data and methods inside a single unit (class) "
                "and restricting direct access. e.g., `private` fields with getters in Java.\n"
                "2. **Inheritance** - A child class acquires properties of a parent class, "
                "enabling code reuse. e.g., `class Car extends Vehicle`.\n"
                "3. **Polymorphism** - Same interface, different behaviours; method overloading "
                "and overriding. e.g., `area()` differs for Circle vs Square.\n"
                "4. **Abstraction** - Hiding implementation details and exposing only "
                "essentials. e.g., an `abstract class Shape` declaring `area()` without body.\n"
                "Diagram: [labelled diagram of OOP pillars with class hierarchy]\n"
                "Conclusion: Together these pillars improve modularity, reusability and "
                "maintainability of software."
            ),
        },
    ],
    7: [
        {
            "question": "Explain the OSI reference model with a neat labelled diagram. (7 marks)",
            "answer": (
                "The **OSI (Open Systems Interconnection)** reference model, proposed by "
                "**ISO** in 1984, is a conceptual framework that standardises the functions of "
                "a telecommunication system into **seven abstraction layers**.\n\n"
                "Diagram: [labelled diagram of OSI 7-layer stack with layers from bottom to top: "
                "Physical, Data Link, Network, Transport, Session, Presentation, Application; "
                "show PDU names (Bits, Frames, Packets, Segments, Data) and example protocols "
                "next to each layer]\n"
                "Fig: OSI Seven-Layer Reference Model\n\n"
                "1. **Physical Layer** - Transmits raw bits over a physical medium; deals with "
                "voltages, cables, pins. e.g., Ethernet cable, RJ-45 connector.\n"
                "2. **Data Link Layer** - Provides node-to-node delivery and framing; performs "
                "MAC addressing and error detection. e.g., Ethernet, PPP.\n"
                "3. **Network Layer** - Handles logical addressing and routing of packets across "
                "networks. e.g., **IP**, ICMP.\n"
                "4. **Transport Layer** - Provides end-to-end reliable (or unreliable) data "
                "transfer, segmentation and flow control. e.g., **TCP**, UDP.\n"
                "5. **Session Layer** - Establishes, manages and terminates sessions between "
                "applications. e.g., NetBIOS, RPC.\n"
                "6. **Presentation Layer** - Translates, encrypts and compresses data; deals "
                "with syntax. e.g., SSL/TLS, JPEG, ASCII.\n"
                "7. **Application Layer** - Interface to the end-user application; provides "
                "network services. e.g., HTTP, SMTP, FTP, DNS.\n\n"
                "Example: When you open `https://gtu.ac.in`, HTTP (L7) is encrypted by TLS (L6), "
                "broken into TCP segments (L4), routed via IP packets (L3), framed as Ethernet "
                "frames (L2), and finally pushed onto the wire as bits (L1).\n\n"
                "Conclusion: The OSI model gives a vendor-neutral blueprint that decouples "
                "networking concerns layer-by-layer, enabling interoperability across diverse "
                "hardware and software."
            ),
        },
    ],
}


# ---------------------------------------------------------------------------
# Public helpers.
# ---------------------------------------------------------------------------
def _nearest_tier(marks: int) -> int:
    """Snap arbitrary marks to the closest exemplar tier we maintain."""
    tiers = sorted(EXEMPLARS.keys())
    if marks <= tiers[0]:
        return tiers[0]
    if marks >= tiers[-1]:
        return tiers[-1]
    # find closest
    return min(tiers, key=lambda t: abs(t - marks))


def style_block(marks: int) -> str:
    """
    Return a complete prompt fragment combining the GTU rubric with the
    exemplar(s) most appropriate for the given marks tier.

    Output is bounded (single exemplar per call) so style_block(7) stays under
    ~1500 tokens even with the full rubric.
    """
    tier = _nearest_tier(marks)
    exemplars = EXEMPLARS.get(tier, [])
    exemplar_text_parts: list[str] = []
    for ex in exemplars[:1]:  # cap at 1 exemplar per prompt to control token budget
        exemplar_text_parts.append(
            f"EXEMPLAR ({tier}-mark) — write in this exact style and structure:\n"
            f"Q: {ex['question']}\n"
            f"A:\n{ex['answer']}"
        )
    exemplar_block = "\n\n".join(exemplar_text_parts) if exemplar_text_parts else ""
    return f"{GTU_SYSTEM_RULES}\n\n{exemplar_block}".strip()


# Keyword buckets for question-type detection. Order matters: numerical and
# derivation are checked before generic "explain" because they are more specific.
_TYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("numerical", ("calculate", "compute", "find the value", "evaluate", "determine the")),
    ("derivation", ("derive", "prove", "show that", "obtain the expression")),
    ("comparison", ("compare", "differentiate", "difference between", " vs ", "versus", "distinguish")),
    ("diagram",   ("draw", "sketch", "labelled diagram", "labeled diagram", "block diagram", "flowchart", "circuit")),
    ("list",      ("list ", "enumerate", "enlist", "name the", "state the types", "classify")),
    ("shortnote", ("write a short note", "short note on", "write short notes")),
    ("define",    ("define ", "what is", "what do you mean by", "give definition")),
    ("explain",   ("explain", "describe", "discuss", "elaborate")),
]

_TYPE_HINTS: dict[str, str] = {
    "numerical":  "QUESTION TYPE: Numerical. Layout strictly as -> Given:, To find:, Formula: (with units), Solution: (step-by-step), Answer: (boxed value with unit). Do NOT skip steps.",
    "derivation": "QUESTION TYPE: Derivation. State assumptions first, then derive line-by-line with each algebraic step on its own line. Number every step. End with the boxed final expression and a one-line physical interpretation.",
    "comparison": "QUESTION TYPE: Comparison. Produce a markdown table with columns | Parameter | <Item A> | <Item B> | and at least 4-6 rows. Follow the table with a 1-2 line conclusion.",
    "diagram":    "QUESTION TYPE: Diagram-required. Insert `Diagram: [labelled diagram of <topic> showing <labels>]` near the top, give a `Fig:` caption, then explain each labelled part as a numbered point.",
    "list":       "QUESTION TYPE: List/enumerate. Produce a clean numbered list; each item gets one short explanatory sentence. No long paragraphs.",
    "shortnote":  "QUESTION TYPE: Short note. Use a heading line, then 3-5 numbered points covering definition, working, types, advantages and one application/example.",
    "define":     "QUESTION TYPE: Definition. Open with a single precise sentence definition (textbook style), then 1-2 supporting points and a one-line example. Keep it tight.",
    "explain":    "QUESTION TYPE: Explanation. Start with a 1-line definition, then 4-6 numbered points; include one Example: and a Conclusion: line.",
}


def question_type_hint(question_text: str) -> str:
    """
    Cheap keyword-based classifier. Returns a single instruction line tailored
    to the detected GTU question type. Falls back to the generic "explain" hint.
    """
    if not question_text:
        return _TYPE_HINTS["explain"]
    q = f" {question_text.lower().strip()} "
    for qtype, keywords in _TYPE_KEYWORDS:
        for kw in keywords:
            if kw in q:
                return _TYPE_HINTS[qtype]
    return _TYPE_HINTS["explain"]
