/**
 * Inbound Email Handler for Agent Mail
 * Supports:
 * - sponsor@rhps.live: Sponsorship inquiries, media kit, pricing
 * - help@rhps.live / cast@rhps.live: Show inquiries, virgin guide, cast updates
 */

export async function handleIncomingEmail(message, env, ctx) {
  const recipient = message.to.toLowerCase();
  const sender = message.from;
  const rawEmail = await new Response(message.raw).text();

  // Basic extraction of Subject and Body
  const subjectMatch = rawEmail.match(/^Subject:\s*(.*)$/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';

  console.log(`[Agent Mail] Inbound email from ${sender} to ${recipient}: "${subject}"`);

  // Choose agent persona based on recipient
  let agentRole = 'community_support';
  let systemPrompt = '';

  if (recipient.includes('sponsor') || recipient.includes('ads')) {
    agentRole = 'sponsorship_agent';
    systemPrompt = `You are the Autonomous Sponsorship Agent for rhps.live (The Rocky Horror Picture Show shadowcast finder).
Tone: Professional, enthusiastic about cult cinema, efficient.
Your job is to answer sponsorship inquiries.
Current Offerings:
1. Navbar Spotlight Banner: $50/month (displays globally across all visits)
2. Regional Promoted Venue/Pin: $25/month (prominently pinned when users search a specific state/metro)
3. Custom Event Promotion: Contact us for custom runs.
Explain that we accept Stripe and all ads are reviewed for community safety within 24 hours.
Draft a friendly, polished email response answering the user's inquiry.`;
  } else {
    agentRole = 'community_support';
    systemPrompt = `You are the Community Support Agent for rhps.live (The Rocky Horror Picture Show shadowcast finder).
Tone: Witty, warm, welcoming, knowledgeable about Rocky Horror shadowcast traditions, call-and-response etiquette, virgin survival kits, and prop policies.
Draft a helpful, formatted email reply addressing their question or guiding them on how to register/update their cast listing.`;
  }

  let generatedReply = '';
  if (env.AI) {
    try {
      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Email Subject: ${subject}\n\nEmail Content:\n${rawEmail.slice(0, 2000)}` }
        ],
        max_tokens: 500
      });
      generatedReply = aiResponse.response;
    } catch (err) {
      console.error('[Agent Mail] AI generation error:', err);
    }
  }

  // Log conversation to Cloudflare D1 for audit trail
  if (env.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO support_conversations (id, session_id, user_identifier, category, summary, resolved)
        VALUES (?, ?, ?, ?, ?, 0)
      `).bind(
        crypto.randomUUID(),
        `email_${Date.now()}`,
        sender,
        agentRole,
        `Subject: ${subject} | Reply generated: ${generatedReply ? 'YES' : 'NO'}`
      ).run();
    } catch (dbErr) {
      console.error('[Agent Mail] D1 logging error:', dbErr);
    }
  }

  console.log(`[Agent Mail] Drafted response:\n${generatedReply}`);
  
  // Forward to administrator address (or send directly if send_email binding configured)
  // Example: if configured with env.ADMIN_EMAIL, we can forward or notify
  if (env.ADMIN_EMAIL && message.forward) {
    try {
      await message.forward(env.ADMIN_EMAIL);
    } catch (fwdErr) {
      console.error('[Agent Mail] Forward error:', fwdErr);
    }
  }
}
