// Inject JSON-LD structured data without inline scripts (CSP-friendly).
(function () {
  var data = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "megert",
    "jobTitle": "Software & Engineering",
    "url": "https://mikkmaide.com/",
    "address": { "@type": "PostalAddress", "addressCountry": "Estonia" },
    "sameAs": [
      "https://github.com/MikeEgert"
    ]
  };

  if (/(^|\/)home(\.html)?$/.test(window.location.pathname)) {
    data.email = "maidemikkegert@gmail.com";
  }

  var el = document.createElement("script");
  el.type = "application/ld+json";
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
})();
