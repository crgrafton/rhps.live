/**
 * Cloudflare-powered Dynamic Ads Loader for rhps.live
 */
const CLOUDFLARE_API_BASE = 'https://rhps-api.chris-ad5.workers.dev';

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
    console.debug('Dynamic ad fetch skipped (using fallback):', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDynamicSponsorAd();
});
