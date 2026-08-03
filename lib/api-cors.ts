export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Cart-Token, X-Store-Id, X-Publishable-Key",
};

export function withCorsHeaders<T extends Response>(response: T): T {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function corsJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);

  return withCorsHeaders(response);
}