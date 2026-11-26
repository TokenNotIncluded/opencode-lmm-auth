export function parseMetadata(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid LMM model metadata.');
    const row = value;
    const limit = (key) => {
        const n = row[key];
        if (n === undefined || n === null)
            return null;
        if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0)
            throw new Error('Invalid LMM model limit.');
        return n;
    };
    const flag = (key) => {
        const n = row[key];
        if (n === undefined || n === null)
            return null;
        if (typeof n !== 'boolean')
            throw new Error('Invalid LMM model capability.');
        return n;
    };
    const modalities = (key) => {
        const n = row[key];
        if (n === undefined || n === null)
            return null;
        if (!Array.isArray(n) || !n.every(x => typeof x === 'string'))
            throw new Error('Invalid LMM model modalities.');
        return [...n];
    };
    if (typeof row.source !== 'string')
        throw new Error('Invalid LMM metadata source.');
    const gatewayOutput = limit('gateway_max_output_tokens');
    return { context_window: limit('context_window'), max_input_tokens: limit('max_input_tokens'),
        ...(gatewayOutput === null ? {} : { gateway_max_output_tokens: gatewayOutput }),
        max_output_tokens: limit('max_output_tokens'), input_modalities: modalities('input_modalities'),
        output_modalities: modalities('output_modalities'), reasoning: flag('reasoning'), tool_call: flag('tool_call'), source: row.source };
}
/** A maximum-input limit can constrain a conservative host budget; never add output to it. */
export function contextBudget(m) {
    return m.context_window === null ? m.max_input_tokens ?? undefined : Math.min(m.context_window, m.max_input_tokens ?? Infinity);
}
export function textOutput(m) {
    return m.input_modalities?.includes('text') === true && m.output_modalities?.length === 1 && m.output_modalities[0] === 'text';
}
