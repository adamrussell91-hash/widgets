#!/usr/bin/env python3
"""
Build data/essayQuestions.json for the Section II (Q6) extended-response tab.

This is the brief's "setup phase, run once before go live" — a plain, deterministic
authoring step, NOT a model call and NOT part of the deployed tool. The runtime tool
only ever *reads* the static JSON this produces; it never generates anything.

  * The 7 published Question 6 questions (2019-2025) are transcribed VERBATIM from
    the build brief: their stems, five-band rubrics, marker feedback and authored
    checklists are copied exactly.
  * The 32 hand-authored variations reuse an authentic band rubric of a published
    question that shares the same directive verb, adjusting only the concept slot,
    and carry concept-accurate marker feedback and a checklist authored from it —
    exactly as the brief's setup phase prescribes. Every variation keeps an
    authentic directive verb, a Common Module concept and the prescribed text, and
    is answerable from The Merchant of Venice.

Run:  python3 scripts/build_essay_questions.py
"""

import json
import os

PRESCRIBED = "The Merchant of Venice"

ASSESSMENT_CRITERIA = [
    "demonstrate understanding of human experiences in texts",
    "analyse, explain and assess the ways human experiences are represented in texts",
    "organise, develop and express ideas using language appropriate to audience, purpose and context",
]

ASSESSMENT_OBJECTIVE_MAP = {
    "understanding": "demonstrate understanding of human experiences in texts",
    "representation": "analyse, explain and assess the ways human experiences are represented in texts",
    "expression": "organise, develop and express ideas using language appropriate to audience, purpose and context",
}

# Verb -> the quality verb that must open the band-5 descriptor (brief §4).
VERB_QUALITY = {
    "analyse": "Analyses",
    "how does": "Analyses",
    "evaluate": "Evaluates",
    "to what extent": "Evaluates",
    "explain": "Explains",
    "in what ways": "Explains",
    "how effectively": "Explains",
    "assess": "Assesses",
}

# Verb -> selection variety family (brief §2: four families, >=8 entries each).
VERB_FAMILY = {
    "analyse": "analyse",
    "how does": "analyse",
    "explain": "explain",
    "in what ways": "explain",
    "evaluate": "evaluate",
    "to what extent": "evaluate",
    "how effectively": "assess",
    "assess": "assess",
}

# Verb -> the descriptor clause that follows the quality verb, with a {concept} slot.
# Shapes mirror the authentic rubric wording so the swapped descriptors read true.
VERB_CLAUSE = {
    "analyse": "how the prescribed text represents {c}",
    "how does": "how the composer represents {c}",
    "explain": "how the prescribed text reveals {c}",
    "in what ways": "the ways in which the study of the prescribed text gives insight into {c}",
    "evaluate": "the extent to which the prescribed text explores {c}",
    "to what extent": "the extent to which the prescribed text explores {c}",
    "how effectively": "how the prescribed text represents {c}",
    "assess": "how the prescribed text represents {c}",
}

RANGES = ["17 to 20", "13 to 16", "9 to 12", "5 to 8", "1 to 4"]


def build_bands(verb, concept):
    """Five authentic-shaped bands with the concept slotted into the clause."""
    quality = VERB_QUALITY[verb]
    clause = VERB_CLAUSE[verb].format(c=concept)
    return [
        {"band": 5, "range": "17 to 20",
         "descriptor": f"{quality} skilfully {clause}. Presents a perceptive response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."},
        {"band": 4, "range": "13 to 16",
         "descriptor": f"{quality} effectively {clause}. Presents a thoughtful response supported by relevant textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."},
        {"band": 3, "range": "9 to 12",
         "descriptor": f"Explains {clause}. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate to audience, purpose and context."},
        {"band": 2, "range": "5 to 8",
         "descriptor": f"Expresses limited understanding of {clause}. Describes aspects of the prescribed text. Writes a response with limited control of language."},
        {"band": 1, "range": "1 to 4",
         "descriptor": "Refers to the prescribed text in a minimal way. Attempts to compose a response."},
    ]


# ── Per-family marker feedback templates (concept-slotted), distilled from the
#    donor published questions' real feedback. {c} = the variation's concept.
FAMILY_REWARDS = {
    "analyse": [
        "present a perceptive interpretation of how {c} is represented in the prescribed text",
        "purposefully analyse, not just explain, why the composer has employed specific dramatic forms and structural features",
        "sustain a line of argument through clear topic sentences, considered analysis and deliberate links to the question",
        "select and integrate a range of well chosen textual evidence purposefully to support their ideas",
    ],
    "explain": [
        "clearly articulate personal insights into {c} from their study of the prescribed text",
        "develop a well informed argument that explores the intricate and interrelated nature of {c}",
        "purposefully select evidence from the most appropriate scene or section of the prescribed text",
        "use clear expression and appropriate language to ensure continuity of response",
    ],
    "evaluate": [
        "engage with all components of the question, evaluating how the prescribed text explores {c}",
        "construct a personal and informed line of argument that deliberately responds to the question",
        "reveal a holistic understanding of the text through purposefully selected evidence drawn from across the whole play",
        "maintain a confident and controlled command of language",
    ],
    "assess": [
        "purposefully address the key terms of the question about {c} in a consistent and balanced way",
        "consider how the textual form, features and language of the prescribed text are used to shape meaning",
        "explain how the audience is positioned by the text's construction, with particular consideration of form and genre",
        "incorporate purposefully selected, wide ranging textual evidence",
    ],
}

FAMILY_IMPROVEMENTS = {
    "analyse": [
        "analysing rather than describing, showing an awareness of the text's construction and form",
        "using the metalanguage appropriate to drama when discussing {c} in The Merchant of Venice",
        "avoiding vague and general comments that do not develop the line of argument",
        "refining the clarity and control of expression by avoiding overly complex or wordy language",
    ],
    "explain": [
        "identifying {c} with greater clarity and specificity, rather than in vague general terms",
        "demonstrating an understanding of how the author's choice of specific language shapes meaning",
        "moving beyond the interior world of the text to a more conceptual argument about the composer's purpose",
        "avoiding verbose, inaccurate or convoluted language that may detract from the quality of the response",
    ],
    "evaluate": [
        "evaluating, rather than explaining, how meaning is communicated about {c}",
        "incorporating evidence drawn from across the text to reveal understanding of the whole text",
        "avoiding generalised references to context that do not support the argument",
        "using metalanguage meaningfully to enhance the specificity of the argument",
    ],
    "assess": [
        "responding to the full scope of the question rather than relying on generic statements from the module description",
        "analysing, rather than describing, how the text has been composed to represent {c}",
        "evaluating the author's intent and the effect of their compositional choices on the audience",
        "using the metalanguage of dramatic form",
    ],
}

# Per-family checklist template: 6 items covering all five categories, each tagged
# with category, the assessment objective it serves, and its source. {c} = concept.
# Objective mapping is constant across the provided published checklists:
#   argument->understanding, analysis/evidence/judgement->representation, expression->expression.
FAMILY_CHECKLIST = {
    "analyse": [
        ("c1", "argument", "understanding", "reward", "Have I built a perceptive, personal argument about {c}, addressing every part of the question rather than restating it?"),
        ("c2", "analysis", "representation", "reward", "Have I analysed, not just explained, why Shakespeare uses specific dramatic and structural features to represent {c}?"),
        ("c3", "analysis", "representation", "improvement", "Have I used accurate drama metalanguage and shown awareness of the play's construction, rather than making vague general comments?"),
        ("c4", "evidence", "representation", "reward", "Have I selected and integrated a range of well chosen quotations from across the play, tied to {c}?"),
        ("c5", "judgement", "representation", "reward", "Have I sustained a clear analytical line of argument and reached a judgement about {c}?"),
        ("c6", "expression", "expression", "improvement", "Is my expression clear and controlled, avoiding overly complex or wordy language, in a confident personal voice?"),
    ],
    "explain": [
        ("c1", "argument", "understanding", "reward", "Have I articulated clear personal insights and a well informed argument about {c}?"),
        ("c2", "argument", "understanding", "improvement", "Have I identified {c} with clarity and specificity, not in vague general terms?"),
        ("c3", "analysis", "representation", "improvement", "Have I analysed how Shakespeare's specific language choices shape meaning, pushing beyond the plot to the composer's purpose?"),
        ("c4", "evidence", "representation", "reward", "Have I chosen evidence from the most appropriate scenes to reveal {c}?"),
        ("c5", "judgement", "representation", "reward", "Have I sustained one clear line of argument with continuity across the whole essay?"),
        ("c6", "expression", "expression", "improvement", "Is my language clear and controlled, avoiding verbose or convoluted phrasing?"),
    ],
    "evaluate": [
        ("c1", "argument", "understanding", "reward", "Have I taken a clear personal stance on {c}, engaging with every part of the question?"),
        ("c2", "argument", "understanding", "improvement", "Have I moved beyond broad statements about the human experience to name the specific ideas the play raises about {c}?"),
        ("c3", "analysis", "representation", "improvement", "Have I evaluated how meaning is communicated and used drama metalanguage meaningfully, rather than just explaining?"),
        ("c4", "evidence", "representation", "reward", "Have I drawn evidence from across the whole play to show a holistic understanding, not one narrow section?"),
        ("c5", "judgement", "representation", "reward", "Have I reached and defended a judgement about the extent I agree, not just described?"),
        ("c6", "expression", "expression", "reward", "Have I written with a confident, controlled command of language?"),
    ],
    "assess": [
        ("c1", "argument", "understanding", "reward", "Have I addressed the full scope of the question about {c} in a consistent and balanced way, building a convincing thesis?"),
        ("c2", "analysis", "representation", "improvement", "Have I analysed, not described, how the form, features and language shape meaning, using the metalanguage of drama?"),
        ("c3", "analysis", "representation", "reward", "Have I explained how the audience is positioned by the play's construction, form and genre?"),
        ("c4", "evidence", "representation", "improvement", "Have I supported my thesis with purposefully selected, wide ranging evidence, not generic module statements?"),
        ("c5", "judgement", "representation", "reward", "Have I evaluated Shakespeare's intent and the effect of his compositional choices on the audience?"),
        ("c6", "expression", "expression", "reward", "Have I written a coherent, controlled response from start to finish?"),
    ],
}


def build_checklist(family, concept):
    out = []
    for cid, cat, obj, src, text in FAMILY_CHECKLIST[family]:
        out.append({"id": cid, "category": cat, "objective": obj, "source": src,
                    "text": text.format(c=concept)})
    return out


def variation(idx, verb, concept, stem):
    family = VERB_FAMILY[verb]
    return {
        "id": f"s2-var-{idx:03d}",
        "verb": verb,
        "verbFamily": family,
        "marks": 20,
        "concept": concept,
        "prescribedText": PRESCRIBED,
        "stemText": stem,
        "isAuthenticPastQuestion": False,
        "assessmentCriteria": list(ASSESSMENT_CRITERIA),
        "markingBands": build_bands(verb, concept),
        "markerRewards": [r.format(c=concept) for r in FAMILY_REWARDS[family]],
        "markerImprovements": [i.format(c=concept) for i in FAMILY_IMPROVEMENTS[family]],
        "assessmentObjectiveMap": dict(ASSESSMENT_OBJECTIVE_MAP),
        "checklist": build_checklist(family, concept),
    }


# ── The 7 published questions, transcribed VERBATIM from the build brief. ──────
def published(pid, verb, year, concept, stem, rewards, improvements, bands, checklist):
    return {
        "id": pid,
        "verb": verb,
        "verbFamily": VERB_FAMILY[verb],
        "marks": 20,
        "concept": concept,
        "prescribedText": PRESCRIBED,
        "stemText": stem,
        "isAuthenticPastQuestion": True,
        "year": year,
        "assessmentCriteria": list(ASSESSMENT_CRITERIA),
        "markingBands": [{"band": b, "range": r, "descriptor": d}
                         for b, r, d in bands],
        "markerRewards": rewards,
        "markerImprovements": improvements,
        "assessmentObjectiveMap": dict(ASSESSMENT_OBJECTIVE_MAP),
        "checklist": checklist,
    }


PUBLISHED = []

PUBLISHED.append(published(
    "s2-2025-mov", "analyse", 2025, "the endurance of the human spirit",
    "Analyse how the representation of particular lives in The Merchant of Venice enriches your understanding of the endurance of the human spirit.",
    [
        "present a perceptive interpretation of how the representation of particular lives in the text enriches understanding of the endurance of the human spirit",
        "address all aspects of the question throughout their response",
        "sustain a confident and personal voice revealing how their own understanding of the endurance of the human spirit has been enriched by the prescribed text",
        "select and integrate a range of evidence purposefully to support their ideas",
        "develop a cohesive response by establishing and maintaining a clear line of argument",
    ],
    [
        "drawing on their prescribed text to articulate their personal understanding of the endurance of the human spirit",
        "referring to specific parts of the prescribed text to support their ideas, rather than restating the question",
        "refining the clarity and control of their expression by avoiding overly complex or wordy language",
        "using accurate technical language to analyse how ideas are represented in the text, for example the form, genre and style of the prescribed text",
    ],
    [
        (5, "17 to 20", "Analyses skilfully how the representation of particular lives in their prescribed text enriches their understanding of the endurance of the human spirit. Presents a perceptive response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."),
        (4, "13 to 16", "Analyses effectively how the representation of particular lives in their prescribed text enriches their understanding of the endurance of the human spirit. Presents a thoughtful response supported by relevant textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."),
        (3, "9 to 12", "Explains how the representation of particular lives in their prescribed text enriches their understanding of the endurance of the human spirit. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate to audience, purpose and context."),
        (2, "5 to 8", "Expresses limited understanding of how the representation of particular lives in their prescribed text enriches their understanding of the human spirit. Describes aspects of the prescribed text. Writes a response with limited control of language."),
        (1, "1 to 4", "Refers to the prescribed text in a minimal way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I built a perceptive, personal argument about the endurance of the human spirit, addressing every part of the question rather than restating it?"},
        {"id": "c2", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I used accurate drama metalanguage to analyse how Shakespeare represents the endurance of the human spirit, rather than paraphrasing?"},
        {"id": "c3", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I selected and integrated a range of well chosen quotations from across the play, tied to the endurance of the human spirit?"},
        {"id": "c4", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I sustained a clear line of argument and reached a judgement about the endurance of the human spirit?"},
        {"id": "c5", "category": "expression", "objective": "expression", "source": "improvement", "text": "Is my expression clear and controlled, avoiding overly complex or wordy language, in a confident personal voice?"},
    ],
))

PUBLISHED.append(published(
    "s2-2024-mov", "in what ways", 2024, "the complex relationship between human qualities, motivations and actions",
    "In what ways has the study of The Merchant of Venice given you insights into the complex relationship between human qualities, motivations and actions?",
    [
        "clearly articulate personal insights from their study of the prescribed text",
        "develop a well informed argument that explores the intricate and interrelated nature of qualities, motivations and actions",
        "purposefully select evidence from the most appropriate scene or section of their prescribed text",
        "use clear expression and appropriate language to reveal a personal understanding and ensure continuity of response",
    ],
    [
        "identifying the qualities, motivations and actions of the human experience with greater clarity and specificity",
        "demonstrating an understanding of how the author's choice of specific language shapes meaning",
        "moving beyond the interior world of the text to a more conceptual argument about the composer's purpose",
        "avoiding the use of verbose, inaccurate or convoluted language that may detract from the quality of the response",
    ],
    [
        (5, "17 to 20", "Explains skilfully the ways in which the study of their prescribed text gives them insights into the complex relationship between human qualities, motivations and actions. Presents a perceptive response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."),
        (4, "13 to 16", "Explains effectively the ways in which the study of their prescribed text gives them insights into the complex relationship between human qualities, motivations and actions. Presents a thoughtful response supported by relevant textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."),
        (3, "9 to 12", "Explains the ways in which the study of their prescribed text gives them insights into the complex relationship between human qualities, motivations and actions. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate to audience, purpose and context."),
        (2, "5 to 8", "Expresses limited understanding of the ways in which the study of their prescribed text gives them insights into the complex relationship between human qualities, motivations and actions. Describes aspects of the prescribed text. Writes a response with limited control of language."),
        (1, "1 to 4", "Refers to the prescribed text in a minimal way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I articulated clear personal insights and a well informed argument about the complex relationship between qualities, motivations and actions?"},
        {"id": "c2", "category": "argument", "objective": "understanding", "source": "improvement", "text": "Have I identified the specific qualities, motivations and actions with clarity and specificity, not in vague general terms?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I analysed how Shakespeare's specific language choices shape meaning, pushing beyond the plot to the composer's purpose?"},
        {"id": "c4", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I chosen evidence from the most appropriate scenes to show the interplay of qualities, motivations and actions?"},
        {"id": "c5", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I sustained one clear line of argument with continuity across the whole essay?"},
        {"id": "c6", "category": "expression", "objective": "expression", "source": "improvement", "text": "Is my language clear and controlled, avoiding verbose or convoluted phrasing?"},
    ],
))

PUBLISHED.append(published(
    "s2-2023-mov", "to what extent", 2023, "collective human experiences that enrich our view of the world",
    "A text can ignite ideas about collective human experiences that enrich our view of the world. To what extent do you agree with this statement in relation to The Merchant of Venice?",
    [
        "employ a personal voice to demonstrate their interpretation of the question, text and module",
        "engage with all components of the question, demonstrating an ability to evaluate how the text enriches our view of the world",
        "construct a personal and informed line of argument that deliberately responds to the question",
        "reveal a holistic understanding of the text through purposefully selected evidence",
        "maintain a confident and controlled command of language",
    ],
    [
        "evaluating, rather than explaining, how meaning is communicated",
        "incorporating evidence drawn from across the text to reveal understanding of the whole text",
        "avoiding generalised references to context that do not support their argument",
        "using metalanguage meaningfully to enhance the specificity of their argument",
        "moving beyond broad statements about the human experience and into a more specific identification of the ideas and the views of the world ignited by the text",
    ],
    [
        (5, "17 to 20", "Evaluates skilfully the extent to which the prescribed text ignites ideas about collective human experiences that enrich our view of the world. Presents an insightful response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate for audience, purpose and context."),
        (4, "13 to 16", "Evaluates effectively the extent to which the prescribed text ignites ideas about collective human experiences that enrich our view of the world. Presents a thoughtful response supported by relevant textual references from the prescribed text. Writes an organised response using language appropriate for audience, purpose and context."),
        (3, "9 to 12", "Explains the extent to which the prescribed text ignites ideas about collective human experiences that enrich our view of the world. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate for audience and purpose."),
        (2, "5 to 8", "Expresses limited understanding of the extent to which the prescribed text ignites ideas about collective human experiences that enrich our view of the world. Describes aspects of the prescribed text. Writes a response with minimal control of language."),
        (1, "1 to 4", "Refers to the prescribed text in a minimal way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I taken a clear personal stance on how far the play ignites collective human experiences that enrich our view of the world, engaging every part of the question?"},
        {"id": "c2", "category": "argument", "objective": "understanding", "source": "improvement", "text": "Have I moved beyond broad statements about the human experience to name the specific ideas and views of the world the play ignites?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I evaluated how meaning is communicated and used drama metalanguage meaningfully, rather than just explaining?"},
        {"id": "c4", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I drawn evidence from across the whole play to show a holistic understanding, not one narrow section?"},
        {"id": "c5", "category": "evidence", "objective": "representation", "source": "improvement", "text": "Have I avoided generalised references to context that do not support my argument?"},
        {"id": "c6", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I reached and defended a judgement on the extent I agree, not just described?"},
        {"id": "c7", "category": "expression", "objective": "expression", "source": "reward", "text": "Have I written with a confident, controlled command of language?"},
    ],
))

PUBLISHED.append(published(
    "s2-2022-mov", "how does", 2022, "the emotions arising from human experiences through the features of drama",
    "How does Shakespeare represent the emotions arising from human experiences through the features of drama?",
    [
        "engage with all components of the question by identifying specific emotions and exploring how they arose through human experiences",
        "analyse the distinctive features of the text's form and consider how they represent specifically identified emotions",
        "incorporate purposefully selected and wide ranging textual evidence",
        "maintain control of language to express their ideas",
        "construct a personal and informed line of argument that is sustained throughout the response",
    ],
    [
        "engaging with all parts of the question",
        "analysing how a range of language and structural features are employed to construct meaning",
        "incorporating detailed evidence that is specific to the text's medium and form",
        "avoiding vague or generic comments that do not develop their line of argument",
    ],
    [
        (5, "17 to 20", "Analyses skilfully how the composer represents the emotions arising from human experiences through the features of their chosen form. Presents an insightful response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate for audience, purpose and context."),
        (4, "13 to 16", "Analyses how the composer represents the emotions arising from human experiences through the features of their chosen form. Presents a thoughtful response supported by textual references from the prescribed text. Writes an organised response using language appropriate for audience, purpose and context."),
        (3, "9 to 12", "Explains how the composer represents the emotions arising from human experiences through the features of their chosen form. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate for audience and purpose."),
        (2, "5 to 8", "Expresses limited understanding of how the composer represents the emotions arising from human experiences through the features of their chosen form. Describes aspects of the prescribed text. Writes a response with minimal control of language."),
        (1, "1 to 4", "Refers to the prescribed text in a minimal way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I identified the specific emotions and shown how they arise from human experiences, addressing every part of the question?"},
        {"id": "c2", "category": "analysis", "objective": "representation", "source": "reward", "text": "Have I analysed the distinctive features of drama and how they represent those specific emotions?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I analysed how a range of language and structural features construct meaning, rather than making vague or generic comments?"},
        {"id": "c4", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I used purposefully selected, wide ranging evidence that is specific to the dramatic form?"},
        {"id": "c5", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I sustained one personal, informed line of argument throughout?"},
        {"id": "c6", "category": "expression", "objective": "expression", "source": "reward", "text": "Have I maintained control of language to express my ideas clearly?"},
    ],
))

PUBLISHED.append(published(
    "s2-2021-mov", "analyse", 2021, "the ways individuals respond to the challenges they face",
    "Analyse how The Merchant of Venice represents the ways individuals respond to the challenges they face.",
    [
        "purposefully analyse, not just explain, why the composer has employed specific language forms and structural features",
        "employ and maintain a controlled voice",
        "purposefully structure their response with a line of argument sustained through clear topic sentences, considered analysis and deliberate links to the question",
        "analyse the text according to its medium, which for The Merchant of Venice means a conscious awareness of dramatic form",
    ],
    [
        "demonstrating an awareness of the text's construction and form",
        "analysing, rather than just explaining, how the responses to challenges were represented",
        "avoiding vague and general comments",
        "using the metalanguage appropriate to the form, for example employing the language appropriate to drama when discussing The Merchant of Venice",
    ],
    [
        (5, "17 to 20", "Analyses skilfully how the prescribed text represents the ways individuals respond to the challenges they face. Presents an insightful response supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."),
        (4, "13 to 16", "Analyses how the prescribed text represents the ways individuals respond to the challenges they face. Presents a thoughtful response supported by textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."),
        (3, "9 to 12", "Explains how the prescribed text represents the ways individuals respond to the challenges they face. Presents a response supported by some textual references from the prescribed text. Writes a response using variable control of language appropriate to audience and purpose."),
        (2, "5 to 8", "Expresses limited understanding of ideas about individuals and challenges represented in the prescribed text. Describes aspects of the texts. Writes a response with minimal control of language."),
        (1, "1 to 4", "Refers to the prescribed text in an elementary way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I structured a sustained line of argument about how individuals respond to challenges, with clear topic sentences and deliberate links to the question?"},
        {"id": "c2", "category": "analysis", "objective": "representation", "source": "reward", "text": "Have I analysed, not just explained, why Shakespeare uses specific dramatic forms and structural features?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I shown awareness of the play's construction and form, using drama metalanguage, rather than vague general comments?"},
        {"id": "c4", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I supported each point with evidence that shows how the responses to challenges are represented?"},
        {"id": "c5", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I reached a clear analytical judgement about the ways individuals respond, not description?"},
        {"id": "c6", "category": "expression", "objective": "expression", "source": "reward", "text": "Have I maintained a controlled voice throughout?"},
    ],
))

PUBLISHED.append(published(
    "s2-2020-mov", "how effectively", 2020, "the personal and shared nature of human experiences",
    "How effectively does The Merchant of Venice tell stories to reveal both the personal and shared nature of human experiences?",
    [
        "purposefully address the key terms of the question in a consistent and balanced way",
        "build a convincing thesis that evaluated how stories effectively reveal the shared and personal nature of experiences",
        "consider how the textual form, features and language of the prescribed text are used to tell stories and reveal meaning",
        "explain how the audience is positioned by the text's construction, with particular consideration of form and genre",
    ],
    [
        "ensuring they respond to the full scope of the question",
        "developing a line of argument that deliberately addresses the specific elements of the question without relying on generic statements from the module description",
        "evaluating the author's intent and the effect of their compositional choices on the audience",
        "analysing, rather than describing, how the text has been composed",
        "using the metalanguage of form",
    ],
    [
        (5, "17 to 20", "Explains skilfully how the text tells stories to reveal both the personal and shared nature of human experiences. Presents an insightful response with detailed analysis supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."),
        (4, "13 to 16", "Explains effectively how the text tells stories to reveal both the personal and shared nature of human experiences. Presents a thoughtful response with analysis supported by textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."),
        (3, "9 to 12", "Explains how the text tells stories to reveal both the personal and shared nature of human experiences. Presents a response with some analysis supported by some textual references from the prescribed text. Writes an adequate response using language appropriate to audience, purpose and context."),
        (2, "5 to 8", "Expresses limited understanding of how the text tells stories about the personal and shared nature of human experiences. Describes aspects of the text. Writes a limited response."),
        (1, "1 to 4", "Refers to the prescribed text in an elementary way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I addressed both the personal and the shared nature of human experiences in balance, across the full scope of the question?"},
        {"id": "c2", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I built a convincing thesis about how effectively the play tells stories to reveal these experiences?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I analysed, not described, how the form, features and language tell stories and shape meaning, using the metalanguage of drama?"},
        {"id": "c4", "category": "analysis", "objective": "representation", "source": "reward", "text": "Have I explained how the audience is positioned by the play's construction, form and genre?"},
        {"id": "c5", "category": "evidence", "objective": "representation", "source": "improvement", "text": "Have I supported my thesis with evidence of the storytelling choices, not generic module statements?"},
        {"id": "c6", "category": "judgement", "objective": "representation", "source": "improvement", "text": "Have I evaluated Shakespeare's intent and the effect of his choices on the audience?"},
        {"id": "c7", "category": "expression", "objective": "expression", "source": "reward", "text": "Have I written a coherent, controlled response from start to finish?"},
    ],
))

PUBLISHED.append(published(
    "s2-2019-mov", "to what extent", 2019, "a reconsideration of your understanding of deception",
    "To what extent does the exploration of human experience in The Merchant of Venice invite you to reconsider your understanding of deception?",
    [
        "consider all aspects of the question in their response",
        "develop and sustain a conceptual thesis which engaged with the question",
        "evaluate to what extent texts invite a reconsideration of the specified human experience",
        "adopt a confident personal voice",
        "articulate a considered interpretation of the specified human experience",
        "develop their argument to reveal a strong understanding of the text and how the specified idea was explored",
        "create a purposefully structured and thoughtfully integrated argument",
        "demonstrate a strong sense of how the audience is positioned by the text",
        "show awareness of textual purpose and the text as a whole",
        "select well chosen and detailed textual evidence",
    ],
    [
        "analysing rather than describing texts",
        "selecting and analysing textual references which contribute purposefully to the argument",
        "demonstrating an awareness of audience and the representation of meaning",
        "demonstrating greater awareness of textual form and features and their impact on meaning",
        "controlling expression throughout the response",
    ],
    [
        (5, "17 to 20", "Evaluates skilfully the extent to which the text invites a reconsideration of the specified human experience. Presents an insightful response with detailed analysis supported by well chosen textual references from the prescribed text. Writes a coherent and sustained response using language appropriate to audience, purpose and context."),
        (4, "13 to 16", "Evaluates effectively the extent to which the text invites a reconsideration of the specified human experience. Presents a thoughtful response with analysis supported by well chosen textual references from the prescribed text. Writes an organised response using language appropriate to audience, purpose and context."),
        (3, "9 to 12", "Explains the extent to which the text invites a reconsideration of the specified human experience. Presents a response with some analysis using textual references from the prescribed text. Writes an adequate response using language appropriate to audience, purpose and context."),
        (2, "5 to 8", "Expresses limited understanding of ideas about human experiences represented in the prescribed text. Describes aspects of the text. Writes a limited response."),
        (1, "1 to 4", "Refers to the prescribed text in an elementary way. Attempts to compose a response."),
    ],
    [
        {"id": "c1", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I developed and sustained a conceptual thesis on the extent the play invites me to reconsider deception, considering every aspect of the question?"},
        {"id": "c2", "category": "argument", "objective": "understanding", "source": "reward", "text": "Have I given a considered personal interpretation in a confident voice, showing understanding of the text as a whole and its purpose?"},
        {"id": "c3", "category": "analysis", "objective": "representation", "source": "improvement", "text": "Have I analysed rather than described, showing how dramatic form and features shape meaning?"},
        {"id": "c4", "category": "analysis", "objective": "representation", "source": "reward", "text": "Have I shown a strong sense of how the audience is positioned to reconsider deception?"},
        {"id": "c5", "category": "evidence", "objective": "representation", "source": "reward", "text": "Have I selected well chosen, detailed evidence and analysed it purposefully, not just dropped it in?"},
        {"id": "c6", "category": "judgement", "objective": "representation", "source": "reward", "text": "Have I evaluated to what extent, reaching a defended judgement rather than description?"},
        {"id": "c7", "category": "expression", "objective": "expression", "source": "improvement", "text": "Have I controlled my expression throughout?"},
    ],
))


# ── The 32 hand-authored variations, grouped by directive verb (brief reference). ─
# (verb, concept, stem)
VARIATIONS = [
    # Verb: analyse
    ("analyse", "the ways individuals respond to the challenges they face",
     "Analyse how The Merchant of Venice represents the ways individuals respond to the challenges they face."),
    ("analyse", "the endurance of the human spirit",
     "Analyse how the representation of particular lives in The Merchant of Venice enriches your understanding of the endurance of the human spirit."),
    ("analyse", "the tension between justice and mercy as a human experience",
     "Analyse how The Merchant of Venice represents the tension between justice and mercy as a human experience."),
    ("analyse", "the ways prejudice shapes human behaviour",
     "Analyse how Shakespeare represents the ways prejudice shapes human behaviour in The Merchant of Venice."),
    ("analyse", "the paradoxes of loyalty and friendship",
     "Analyse how The Merchant of Venice explores the paradoxes of loyalty and friendship."),
    ("analyse", "human motivations",
     "Analyse how the dramatic form of The Merchant of Venice shapes your understanding of human motivations."),
    ("analyse", "the individual experience of exclusion and belonging",
     "Analyse how The Merchant of Venice represents the individual experience of exclusion and belonging."),
    ("analyse", "the emotions arising from human experiences",
     "Analyse how Shakespeare uses the features of drama to represent the emotions arising from human experiences."),
    # Verb: explain, in what ways
    ("in what ways", "the complex relationship between human qualities, motivations and actions",
     "In what ways has your study of The Merchant of Venice given you insights into the complex relationship between human qualities, motivations and actions?"),
    ("explain", "the assumptions people make about others",
     "Explain how The Merchant of Venice invites you to reconsider the assumptions people make about others."),
    ("in what ways", "the gap between how individuals present themselves and who they really are",
     "In what ways does The Merchant of Venice reveal the gap between how individuals present themselves and who they really are?"),
    ("explain", "the collective experience of a divided society",
     "Explain how The Merchant of Venice represents the collective experience of a divided society."),
    ("in what ways", "human relationships",
     "In what ways does Shakespeare use dramatic tension to explore human relationships in The Merchant of Venice?"),
    ("explain", "the human capacity for both cruelty and compassion",
     "Explain how The Merchant of Venice represents the human capacity for both cruelty and compassion."),
    ("in what ways", "the role of self interest in human behaviour",
     "In what ways has your study of The Merchant of Venice deepened your understanding of the role of self interest in human behaviour?"),
    ("explain", "the personal and shared nature of human experiences",
     "Explain how The Merchant of Venice represents the personal and shared nature of human experiences."),
    # Verb: evaluate, to what extent
    ("to what extent", "a reconsideration of your understanding of deception",
     "To what extent does the exploration of human experience in The Merchant of Venice invite you to reconsider your understanding of deception?"),
    ("evaluate", "collective human experiences that enrich our view of the world",
     "Evaluate the ways The Merchant of Venice ignites ideas about collective human experiences that enrich our view of the world."),
    ("to what extent", "the idea that human behaviour is driven by emotion rather than reason",
     "To what extent does The Merchant of Venice reveal that human behaviour is driven by emotion rather than reason?"),
    ("evaluate", "the anomalies and paradoxes of human behaviour",
     "Evaluate how The Merchant of Venice represents the anomalies and paradoxes of human behaviour."),
    ("to what extent", "the fairness of the world it depicts",
     "To what extent does The Merchant of Venice invite you to question the fairness of the world it depicts?"),
    ("evaluate", "the endurance of the human spirit through adversity",
     "Evaluate the ways The Merchant of Venice represents the endurance of the human spirit through adversity."),
    ("to what extent", "sympathy for characters who do wrong",
     "To what extent does Shakespeare position you to feel sympathy for characters who do wrong?"),
    ("evaluate", "the relationship between individual desire and social expectation",
     "Evaluate the ways The Merchant of Venice represents the relationship between individual desire and social expectation."),
    # Verb: how effectively, assess
    ("how effectively", "the personal and shared nature of human experiences",
     "How effectively does The Merchant of Venice tell stories to reveal both the personal and shared nature of human experiences?"),
    ("how effectively", "the emotions arising from human experiences",
     "How effectively does Shakespeare represent the emotions arising from human experiences through the features of drama?"),
    ("assess", "the human spirit",
     "Assess how the representation of particular lives in The Merchant of Venice enriches your understanding of the human spirit."),
    ("how effectively", "human motivations",
     "How effectively does The Merchant of Venice use dramatic conflict to explore human motivations?"),
    ("assess", "the tension between mercy and the letter of the law",
     "Assess how The Merchant of Venice represents the tension between mercy and the letter of the law."),
    ("how effectively", "ideas about justice",
     "How effectively does The Merchant of Venice invite you to reconsider ideas about justice?"),
    ("assess", "human inconsistency and contradiction",
     "Assess the ways The Merchant of Venice represents human inconsistency and contradiction."),
    ("how effectively", "the ways individuals are shaped by the society they live in",
     "How effectively does Shakespeare represent the ways individuals are shaped by the society they live in?"),
]


def build():
    entries = list(PUBLISHED)
    for i, (verb, concept, stem) in enumerate(VARIATIONS, start=1):
        entries.append(variation(i, verb, concept, stem))
    return entries


# ── Validation mirrors the runtime schema checks (brief §3). ──────────────────
ALLOWED_VERBS = {"analyse", "explain", "in what ways", "evaluate",
                 "to what extent", "how does", "how effectively", "assess"}
CATEGORIES = {"argument", "analysis", "evidence", "judgement", "expression"}
OBJECTIVES = {"understanding", "representation", "expression"}
SOURCES = {"reward", "improvement"}


def validate(entries):
    ids = set()
    for e in entries:
        assert e["id"] and e["id"] not in ids, f"bad/dup id {e['id']}"
        ids.add(e["id"])
        assert e["verb"] in ALLOWED_VERBS, f"{e['id']}: verb {e['verb']}"
        assert e["marks"] == 20, f"{e['id']}: marks"
        assert e["concept"] and e["stemText"], f"{e['id']}: concept/stem"
        assert len(e["assessmentCriteria"]) == 3, f"{e['id']}: criteria"
        bands = e["markingBands"]
        assert len(bands) == 5, f"{e['id']}: band count"
        assert [b["range"] for b in bands] == RANGES, f"{e['id']}: band ranges"
        quality = VERB_QUALITY[e["verb"]]
        assert bands[0]["descriptor"].startswith(quality + " skilfully"), \
            f"{e['id']}: band5 opener != {quality} skilfully"
        assert len(e["markerRewards"]) >= 3, f"{e['id']}: rewards"
        assert len(e["markerImprovements"]) >= 3, f"{e['id']}: improvements"
        cl = e["checklist"]
        assert len(cl) >= 5, f"{e['id']}: checklist size"
        cats = set()
        for it in cl:
            assert it["category"] in CATEGORIES, f"{e['id']}: cat {it['category']}"
            assert it["objective"] in OBJECTIVES, f"{e['id']}: obj {it['objective']}"
            assert it["source"] in SOURCES, f"{e['id']}: src {it['source']}"
            assert it["text"], f"{e['id']}: empty checklist text"
            cats.add(it["category"])
        assert cats == CATEGORIES, f"{e['id']}: checklist misses {CATEGORIES - cats}"
        assert e["assessmentObjectiveMap"] == ASSESSMENT_OBJECTIVE_MAP, f"{e['id']}: objmap"

    # Aggregate targets (brief §2).
    published = [e for e in entries if e["isAuthenticPastQuestion"]]
    assert len(published) == 7, f"published {len(published)}"
    assert len(entries) >= 39, f"total {len(entries)}"
    from collections import Counter
    fam = Counter(VERB_FAMILY[e["verb"]] for e in entries)
    for f in ("analyse", "explain", "evaluate", "assess"):
        assert fam[f] >= 8, f"family {f} only {fam[f]}"
    return {"total": len(entries), "published": len(published), "families": dict(fam)}


if __name__ == "__main__":
    entries = build()
    stats = validate(entries)
    out = os.path.join(os.path.dirname(__file__), "..", "data", "essayQuestions.json")
    out = os.path.normpath(out)
    with open(out, "w") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("wrote", out)
    print("stats", stats)
