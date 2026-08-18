const defaultNormalizer = {
    normalize(input) {
        return input.normalize("NFKC").trim().replace(/[\s。！？,.!?]+/g, "");
    }
};
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function compilePattern(pattern, slots) {
    const placeholder = /\{([a-zA-Z0-9_-]+)\}/g;
    let source = "";
    let cursor = 0;
    let match;
    while ((match = placeholder.exec(pattern)) !== null) {
        source += escapeRegex(pattern.slice(cursor, match.index));
        const slotName = match[1];
        const values = slots[slotName];
        if (!values || values.length === 0) {
            throw new Error(`Grammar pattern references undefined slot: ${slotName}`);
        }
        source += `(?:${values.map(escapeRegex).join("|")})`;
        cursor = match.index + match[0].length;
    }
    source += escapeRegex(pattern.slice(cursor));
    return new RegExp(`^${source}$`, "u");
}
export function evaluateAnswer(rawAnswer, frame, normalizer = defaultNormalizer) {
    const answer = normalizer.normalize(rawAnswer);
    const normalizedPatterns = frame.patterns.map((pattern) => normalizer.normalize(pattern));
    const normalizedSlots = Object.fromEntries(Object.entries(frame.slots).map(([key, values]) => [
        key,
        values.map((value) => normalizer.normalize(value))
    ]));
    let matchedPattern;
    for (const pattern of normalizedPatterns) {
        if (compilePattern(pattern, normalizedSlots).test(answer)) {
            matchedPattern = pattern;
            break;
        }
    }
    const missingSlots = Object.entries(normalizedSlots)
        .filter(([, values]) => !values.some((value) => answer.includes(value)))
        .map(([slot]) => slot);
    const slotCount = Object.keys(normalizedSlots).length;
    const slotScore = slotCount === 0 ? 1 : (slotCount - missingSlots.length) / slotCount;
    const patternMatched = Boolean(matchedPattern);
    const score = patternMatched ? 1 : Math.max(0, Math.min(0.95, slotScore * 0.75));
    const feedback = missingSlots.map((slot) => frame.feedback?.[slot] ?? `Missing or unrecognized slot: ${slot}`);
    if (!patternMatched && missingSlots.length === 0) {
        feedback.push("The meaning components are present, but the sentence pattern is not yet accepted.");
    }
    return {
        score,
        intentMatched: patternMatched || slotScore >= 0.75,
        patternMatched,
        slotScore,
        matchedPattern,
        missingSlots,
        feedback
    };
}
