/**
 * rhps.live Pure Cloudflare AI Foundation Worker
 * Handles:
 * - Public API: Casts directory, live ads
 * - AI Concierge & Support: LLM + Vectorize
 * - Sponsorship Engine: Intake, AI moderation, Stripe checkout
 * - Scheduled Cron: Automated site maintenance, link audits, ad expirations
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Health & Status
      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok', service: 'rhps-ai-foundation', timestamp: new Date().toISOString() }, { headers: corsHeaders });
      }

      // 2. Active Ads (Sub-millisecond KV or D1 fallback)
      if (url.pathname === '/api/ads/active') {
        const slot = url.searchParams.get('slot') || 'navbar_spotlight';
        const state = url.searchParams.get('state');

        // Check KV cache first if bound
        if (env.ACTIVE_ADS) {
          const cached = await env.ACTIVE_ADS.get(`ad_${slot}_${state || 'global'}`, 'json');
          if (cached) return Response.json({ ad: cached, cached: true }, { headers: corsHeaders });
        }

        // Query D1
        if (env.DB) {
          const now = new Date().toISOString();
          const query = `
            SELECT id, headline, subtext, target_url, image_r2_key, slot_type
            FROM sponsorships
            WHERE status = 'active'
              AND (starts_at IS NULL OR starts_at <= ?)
              AND (expires_at IS NULL OR expires_at >= ?)
              AND slot_type = ?
            ORDER BY RANDOM() LIMIT 1
          `;
          const result = await env.DB.prepare(query).bind(now, now, slot).first();
          return Response.json({ ad: result || null, cached: false }, { headers: corsHeaders });
        }

        return Response.json({ ad: null, mock: true }, { headers: corsHeaders });
      }

      // 3. AI Concierge / Customer Support Endpoint
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const body = await request.json();
        const userMessage = body.message || '';

        if (!userMessage) {
          return Response.json({ error: 'Message required' }, { status: 400, headers: corsHeaders });
        }

        // Run Workers AI (Llama 3.1)
        if (env.AI) {
          const systemPrompt = `You are the official rhps.live Concierge. You are welcoming, knowledgeable, witty, and passionate about The Rocky Horror Picture Show shadowcast culture.
Help users find local shadowcasts, learn theater etiquette (virgin survival tips, props etiquette), and guide cast organizers. Keep answers concise, fun, and helpful.`;

          const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 350
          });

          return Response.json({ response: aiResponse.response }, { headers: corsHeaders });
        }

        return Response.json({
          response: "Don't dream it, be it! Workers AI binding will be active once deployed."
        }, { headers: corsHeaders });
      }

      // 4. Casts Directory API
      if (url.pathname === '/api/casts') {
        if (env.DB) {
          const { results } = await env.DB.prepare('SELECT * FROM casts WHERE is_active = 1 ORDER BY name ASC').all();
          return Response.json({ casts: results }, { headers: corsHeaders });
        }
        return Response.json({ error: 'Database unconfigured' }, { status: 503, headers: corsHeaders });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  },

  /**
   * Scheduled Cron Task:
   * - Audits ticketing & social links for shadowcasts
   * - Deactivates expired sponsorships
   */
  async scheduled(event, env, ctx) {
    console.log(`[Cron Trigger] Executing scheduled maintenance at: ${event.scheduledTime}`);

    if (!env.DB) return;

    // A. Sweep expired ads
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE sponsorships
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND expires_at < ?
    `).bind(now).run();

    // B. Log maintenance execution
    await env.DB.prepare(`
      INSERT INTO audit_logs (id, audit_type, severity, message)
      VALUES (?, 'ad_expiration', 'info', 'Expired ads swept successfully')
    `).bind(crypto.randomUUID()).run();
  }
};
