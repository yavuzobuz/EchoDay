// Theme initialization - prevents FOUC
(function() {
  try {
    const raw = localStorage.getItem('theme');
    let theme = raw;
    if (raw && raw.startsWith('"') && raw.endsWith('"')) {
      try { 
        theme = JSON.parse(raw); 
      } catch (_) { 
        /* ignore */ 
      }
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.remove('dark');
  }
})();
