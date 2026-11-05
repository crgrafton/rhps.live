/**
 * Cloudflare-powered AI Concierge & Dynamic Ads Loader
 */
const CLOUDFLARE_API_BASE = 'https://rhps-api.chris-ad5.workers.dev';

// 1. Fetch Dynamic Sponsorship Ad for Navbar
async function loadDynamicSponsorAd() {
  try {
    const res = await fetch(`${CLOUDFLARE_API_BASE}/api/ads/active?slot=navbar_spotlight`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.ad) {
      const sponsorContainer = document.querySelector('.nav-sponsor');
      if (sponsorContainer) {
        sponsorContainer.innerHTML = `
          <span class="sponsor-tag">Sponsor</span>
          <a href="${data.ad.target_url}" target="_blank" rel="noopener noreferrer" class="sponsor-link" title="${data.ad.headline}">
            <strong>${data.ad.headline}</strong>: ${data.ad.subtext || ''} &bull; <span class="email-indicator"><i class="fa fa-external-link"></i> Visit</span>
          </a>
        `;
      }
    }
  } catch (err) {
    console.debug('Dynamic ad fetch skipped (using default static sponsor tag):', err);
  }
}

// 2. Initialize AI Concierge Widget
function initAIConcierge() {
  // Inject widget HTML
  const widgetHtml = `
    <button class="ai-concierge-trigger" id="aiTriggerBtn" title="Ask the rhps.live AI Concierge">
      <span class="ai-pulse-dot"></span>
      <i class="fa fa-comments"></i> Ask AI Concierge
    </button>

    <div class="ai-concierge-panel" id="aiPanel">
      <div class="ai-panel-header">
        <div class="ai-panel-title">
          <i class="fa fa-bolt" style="color: #d81b60;"></i> rhps.live Concierge
        </div>
        <button class="ai-panel-close" id="aiCloseBtn"><i class="fa fa-times"></i></button>
      </div>
      <div class="ai-messages-container" id="aiMessages">
        <div class="ai-msg ai-msg-bot">
          Hi darling! Don't dream it, be it. Ask me where to find a shadowcast, how to handle your first time (virgin kit tips!), or how to list your cast!
        </div>
      </div>
      <form class="ai-chat-input-bar" id="aiForm">
        <input type="text" id="aiInput" placeholder="Ask about shows, virgins, etiquette..." autocomplete="off" />
        <button type="submit"><i class="fa fa-paper-plane"></i></button>
      </form>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  const triggerBtn = document.getElementById('aiTriggerBtn');
  const panel = document.getElementById('aiPanel');
  const closeBtn = document.getElementById('aiCloseBtn');
  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const messages = document.getElementById('aiMessages');

  triggerBtn.addEventListener('click', () => {
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) input.focus();
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    // Append user message
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-msg ai-msg-user';
    userDiv.textContent = query;
    messages.appendChild(userDiv);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Bot typing placeholder
    const botDiv = document.createElement('div');
    botDiv.className = 'ai-msg ai-msg-bot';
    botDiv.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Thinking...';
    messages.appendChild(botDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch(`${CLOUDFLARE_API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      const data = await res.json();
      botDiv.innerHTML = (data.response || 'Sorry, something glitched in the laboratory. Try again!').replace(/\n/g, '<br>');
    } catch (err) {
      botDiv.textContent = 'Unable to reach the concierge right now. Try again in a moment!';
    }
    messages.scrollTop = messages.scrollHeight;
  });
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadDynamicSponsorAd();
  initAIConcierge();
});
