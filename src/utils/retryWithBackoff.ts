// Every structure/metadata fetch in this app (RCSB, PubChem, Supabase) made
// exactly one attempt and surfaced a hard failure on any transient network
// blip. This wraps an arbitrary async operation — not just fetch() itself,
// since NGL's stage.loadFile() and Mol*'s data.download() builder do their
// own fetching internally and aren't raw fetch() calls we can intercept.
export async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) {
                await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** i));
            }
        }
    }
    throw lastError;
}
