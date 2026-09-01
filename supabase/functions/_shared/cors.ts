export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const isOriginAllowed = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Native apps and server-to-server calls do not send a browser Origin header.
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',').map(value => value.trim()).filter(Boolean);
  return configured.length === 0 || configured.includes(origin);
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
