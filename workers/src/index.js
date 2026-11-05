import { handleIncomingEmail } from './email.js';

export default {
  // HTTP Endpoint Router
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
      // 1. Healthcheck
      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok', service: 'rhps-ai-foundation', timestamp: new Date().toISOString() }, { headers: corsHeaders });
      }

      // 2. Dynamic Ads Delivery
      if (url.pathname === '/api/ads/active') {
        const slot = url.searchParams.get('slot') || 'navbar_spotlight';
        const state = url.searchParams.get('state');

        if (env.ACTIVE_ADS) {
          const cached = await env.ACTIVE_ADS.get(`ad_${slot}_${state || 'global'}`, 'json');
          if (cached) return Response.json({ ad: cached, cached: true }, { headers: corsHeaders });
        }

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

      // 3. Casts Directory API
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

  // Inbound Cloudflare Email Routing Handler (Agent Mail)
  async email(message, env, ctx) {
    await handleIncomingEmail(message, env, ctx);
  },

  // Scheduled Cron Task
  async scheduled(event, env, ctx) {
    console.log(`[Cron Trigger] Executing scheduled maintenance at: ${event.scheduledTime}`);
    if (!env.DB) return;

    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE sponsorships
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND expires_at < ?
    `).bind(now).run();

    await env.DB.prepare(`
      INSERT INTO audit_logs (id, audit_type, severity, message)
      VALUES (?, 'ad_expiration', 'info', 'Expired ads swept successfully')
    `).bind(crypto.randomUUID()).run();
  }
};
