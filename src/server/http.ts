import "server-only";
export class RequestError extends Error { constructor(public status: number) { super("Request rejected."); } }
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try { if (!origin || new URL(origin).host !== request.headers.get("host")) throw new Error(); }
  catch { throw new RequestError(403); }
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 12000) throw new RequestError(413);
  try { return JSON.parse(text); } catch { throw new RequestError(400); }
}
