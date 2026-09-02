/**
 * rhps.live - Interactive Map & Shadowcast Directory Engine
 */

let map;
let casts = [];
let markers = {};
let userLocation = null;
let currentFeaturedCast = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadCastDatabase();
  setupEventListeners();
});

/**
 * Initialize Leaflet Map
 */
function initMap() {
  // Default center on USA / global overview before geolocation
  map = L.map("map", {
    zoomControl: false,
  }).setView([38.5, -96.0], 4);

  // Custom Zoom Control placed at top-right
  L.control
    .zoom({
      position: "topright",
    })
    .addTo(map);

  // Add standard OpenStreetMap tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
}

/**
 * Load Plaintext Cast Database
 */
async function loadCastDatabase() {
  try {
    const response = await fetch(`data/casts.json?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    casts = await response.json();

    // Render Weekly Featured Cast
    renderWeeklyFeaturedCast(casts);

    // Plot markers on map
    renderMapMarkers(casts);

    // Render Sidebar Cast List
    renderCastList(casts);

    // Default to asking for location permission to find closest show
    requestUserLocation();
  } catch (error) {
    console.error("Failed to load shadowcast database:", error);
    document.getElementById("castList").innerHTML = `
      <div style="color: #ff5555; padding: 15px; font-size: 0.9rem;">
        Failed to load cast database from data/casts.json. Please check connection.
      </div>
    `;
  }
}

/**
 * Render Map Markers
 */
function renderMapMarkers(castList) {
  // Clear existing markers
  Object.values(markers).forEach((marker) => map.removeLayer(marker));
  markers = {};

  const customIcon = L.divIcon({
    className: "custom-pin-container",
    html: `
      <div class="custom-pin">
        <i class="fa fa-film"></i>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });

  castList.forEach((cast) => {
    if (!cast.venue || !cast.venue.coordinates) return;

    const { lat, lng } = cast.venue.coordinates;
    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    const popupHtml = `
      <div>
        <div class="popup-cast-title">${escapeHtml(cast.name)}</div>
        <div class="popup-venue">📍 ${escapeHtml(cast.venue.name)} - ${escapeHtml(cast.city)}, ${escapeHtml(cast.state)}</div>
        <div class="popup-schedule">🕒 ${escapeHtml(cast.schedule.details)} (${escapeHtml(cast.schedule.showtime)})</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          ${
            cast.links && cast.links.tickets
              ? `<a href="${cast.links.tickets}" target="_blank" rel="noopener noreferrer" style="background:#ff0055; color:#fff; text-decoration:none; padding:4px 10px; border-radius:4px; font-size:0.75rem; font-weight:700;">Tickets</a>`
              : ""
          }
          ${
            cast.links && cast.links.website
              ? `<a href="${cast.links.website}" target="_blank" rel="noopener noreferrer" style="background:#2b2b3d; color:#fff; text-decoration:none; padding:4px 10px; border-radius:4px; font-size:0.75rem; font-weight:600;">Website</a>`
              : ""
          }
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.on("click", () => {
      highlightSidebarCard(cast.id);
    });

    markers[cast.id] = marker;
  });
}

/**
 * Weekly Featured Cast Rotation
 * Deterministically picks a featured cast based on the ISO week number of the year
 */
function renderWeeklyFeaturedCast(castList) {
  if (!castList || castList.length === 0) return;

  // Calculate current week of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - startOfYear) / 86400000;
  const currentWeekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  // Pick index rotated by week number
  const featuredIndex = currentWeekNumber % castList.length;
  currentFeaturedCast = castList[featuredIndex];

  const featuredContainer = document.getElementById("featuredCastContainer");
  if (!featuredContainer || !currentFeaturedCast) return;

  featuredContainer.innerHTML = `
    <div class="featured-card">
      <div class="cast-title">${escapeHtml(currentFeaturedCast.name)}</div>
      <div class="cast-location">
        <i class="fa fa-map-marker"></i> ${escapeHtml(currentFeaturedCast.city)}, ${escapeHtml(currentFeaturedCast.state || currentFeaturedCast.country)}
      </div>
      <div class="cast-venue">
        <strong>Venue:</strong> ${escapeHtml(currentFeaturedCast.venue.name)}
      </div>
      <div class="cast-schedule">
        <i class="fa fa-calendar"></i> <strong>Schedule:</strong> ${escapeHtml(currentFeaturedCast.schedule.details)} (${escapeHtml(currentFeaturedCast.schedule.showtime)})
      </div>
      <p class="cast-bio">${escapeHtml(currentFeaturedCast.bio || "Live Rocky Horror Picture Show regular shadowcast.")}</p>
      
      <div class="cast-links">
        ${
          currentFeaturedCast.links && currentFeaturedCast.links.tickets
            ? `<a href="${currentFeaturedCast.links.tickets}" target="_blank" rel="noopener noreferrer" class="link-tickets"><i class="fa fa-ticket"></i> Get Tickets</a>`
            : ""
        }
        ${
          currentFeaturedCast.links && currentFeaturedCast.links.website
            ? `<a href="${currentFeaturedCast.links.website}" target="_blank" rel="noopener noreferrer" class="link-website"><i class="fa fa-globe"></i> Website</a>`
            : ""
        }
        ${
          currentFeaturedCast.links && currentFeaturedCast.links.instagram
            ? `<a href="${currentFeaturedCast.links.instagram}" target="_blank" rel="noopener noreferrer" class="link-social"><i class="fa fa-instagram"></i> Instagram</a>`
            : ""
        }
        ${
          currentFeaturedCast.links && currentFeaturedCast.links.facebook
            ? `<a href="${currentFeaturedCast.links.facebook}" target="_blank" rel="noopener noreferrer" class="link-social"><i class="fa fa-facebook"></i> Facebook</a>`
            : ""
        }
        <button onclick="focusCast('${currentFeaturedCast.id}')" class="btn-outline-neon" style="padding: 4px 10px; font-size: 0.8rem; margin-left: auto;">
          <i class="fa fa-crosshairs"></i> View on Map
        </button>
      </div>
    </div>
  `;
}

/**
 * Render Sidebar Cast Directory List
 */
function renderCastList(castList) {
  const listContainer = document.getElementById("castList");
  const countBadge = document.getElementById("castCount");
  if (!listContainer) return;

  if (countBadge) {
    countBadge.textContent = `${castList.length} Cast${castList.length === 1 ? "" : "s"}`;
  }

  if (castList.length === 0) {
    listContainer.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; padding: 25px 10px; font-size: 0.9rem;">
        No shadowcasts found matching your search.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = castList
    .map((cast) => {
      const distanceHtml = cast.distance !== undefined
        ? `<span class="distance-tag">${cast.distance.toFixed(1)} mi away</span>`
        : "";

      return `
        <div class="cast-card" id="card-${cast.id}" onclick="focusCast('${cast.id}')">
          ${distanceHtml}
          <div style="font-weight: 700; font-size: 1.05rem; color: #fff; margin-bottom: 2px;">
            ${escapeHtml(cast.name)}
          </div>
          <div style="font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 4px;">
            📍 ${escapeHtml(cast.venue.name)} - ${escapeHtml(cast.city)}, ${escapeHtml(cast.state || cast.country)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            🕒 ${escapeHtml(cast.schedule.details)} (${escapeHtml(cast.schedule.showtime)})
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Focus Cast on Map and open popup
 */
function focusCast(castId) {
  const cast = casts.find((c) => c.id === castId);
  if (!cast || !cast.venue || !cast.venue.coordinates) return;

  const { lat, lng } = cast.venue.coordinates;
  map.flyTo([lat, lng], 13, {
    animate: true,
    duration: 1.2,
  });

  if (markers[castId]) {
    markers[castId].openPopup();
  }

  highlightSidebarCard(castId);
}

/**
 * Highlight Sidebar Card
 */
function highlightSidebarCard(castId) {
  document.querySelectorAll(".cast-card").forEach((card) => {
    card.classList.remove("active");
  });
  const card = document.getElementById(`card-${castId}`);
  if (card) {
    card.classList.add("active");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

let userMarker = null;

/**
 * Request User Geolocation to find closest show
 */
function requestUserLocation(isUserInitiated = false) {
  const btnLocate = document.getElementById("btnLocate");
  if (btnLocate) {
    btnLocate.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Locating...`;
    btnLocate.disabled = true;
  }

  const resetBtn = () => {
    if (btnLocate) {
      btnLocate.innerHTML = `<i class="fa fa-location-arrow"></i> Near Me`;
      btnLocate.disabled = false;
    }
  };

  const handlePositionSuccess = (lat, lng, label = "You are here") => {
    userLocation = { lat, lng };

    // Remove previous user marker if it exists
    if (userMarker) {
      map.removeLayer(userMarker);
    }

    // Add user location pin
    const userIcon = L.divIcon({
      className: "user-location-pin",
      html: `<div style="width: 18px; height: 18px; background: #00e5ff; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 16px #00e5ff;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<strong>📍 ${label}</strong>`);

    // Calculate distances to all casts
    casts.forEach((cast) => {
      if (cast.venue && cast.venue.coordinates) {
        cast.distance = calculateDistanceMiles(
          userLocation.lat,
          userLocation.lng,
          cast.venue.coordinates.lat,
          cast.venue.coordinates.lng
        );
      }
    });

    // Sort casts strictly by closest distance
    casts.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));

    // Re-render cast list sorted by proximity
    renderCastList(casts);

    // Zoom to show both user and closest show, and open closest cast popup
    if (casts.length > 0 && casts[0].distance !== undefined && casts[0].venue && casts[0].venue.coordinates) {
      const closest = casts[0];
      const { lat: cLat, lng: cLng } = closest.venue.coordinates;

      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [cLat, cLng],
      ]);

      map.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: 13,
      });

      // Highlight card and open popup
      setTimeout(() => {
        if (markers[closest.id]) {
          markers[closest.id].openPopup();
        }
        highlightSidebarCard(closest.id);
      }, 400);
    } else {
      map.setView([userLocation.lat, userLocation.lng], 10);
    }

    resetBtn();
  };

  // Multi-provider fallback for IP geolocation
  const fallbackIpLocation = async () => {
    const endpoints = [
      "https://ipapi.co/json/",
      "https://get.geojs.io/v1/ip/geo.json",
      "https://ipwho.is/",
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const lat = parseFloat(data.latitude || data.lat);
          const lng = parseFloat(data.longitude || data.lon || data.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            const cityName = data.city || data.region || "Your Area";
            handlePositionSuccess(lat, lng, `Approx. Location (${cityName})`);
            return;
          }
        }
      } catch (err) {
        console.warn(`Fallback endpoint ${url} failed:`, err);
      }
    }

    resetBtn();
    if (isUserInitiated) {
      alert("Unable to detect your location automatically. Please check your browser location permissions or search for your city in the search bar.");
    }
  };

  if (!("geolocation" in navigator) || window.location.protocol === "file:") {
    fallbackIpLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      handlePositionSuccess(
        position.coords.latitude,
        position.coords.longitude,
        "You are here"
      );
    },
    (error) => {
      console.warn("Browser GPS permission not granted or unavailable, falling back to IP:", error.message);
      fallbackIpLocation();
    },
    { enableHighAccuracy: false, timeout: 5000 }
  );
}

/**
 * Calculate Great-Circle Distance (Haversine formula in Miles)
 */
function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Setup Event Listeners (Search, Modals, Forms)
 */
function setupEventListeners() {
  // Search Bar Filter
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = casts.filter((c) => {
        return (
          c.name.toLowerCase().includes(term) ||
          c.city.toLowerCase().includes(term) ||
          (c.state && c.state.toLowerCase().includes(term)) ||
          c.venue.name.toLowerCase().includes(term) ||
          c.schedule.details.toLowerCase().includes(term)
        );
      });

      renderMapMarkers(filtered);
      renderCastList(filtered);
    });
  }

  // Near Me Button
  const btnLocate = document.getElementById("btnLocate");
  if (btnLocate) {
    btnLocate.addEventListener("click", () => {
      requestUserLocation(true);
    });
  }

}

/**
 * Utility: HTML Escaping for XSS prevention
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
