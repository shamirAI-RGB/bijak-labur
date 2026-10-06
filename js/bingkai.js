/* Bijak Labur: halang laman dipaparkan dalam bingkai (iframe) laman lain (serangan "clickjacking").
   GitHub Pages tidak boleh menghantar pengepala X-Frame-Options, dan frame-ancestors tidak berkesan dalam <meta> CSP. */
(function () {
  var dibingkai;
  try { dibingkai = window.top !== window.self; } catch (e) { dibingkai = true; }
  if (!dibingkai) return;
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) {}
})();
