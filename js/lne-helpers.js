/**
 * Shared helpers for Learning Never Ends pages.
 * Load AFTER the Supabase CDN script:
 *   <script src="js/lne-helpers.js"></script>
 * No build step and no dependencies (each function receives the page's Supabase client).
 */
(function () {
  /**
   * Fills row.profiles = { full_name } for each row, using the safe public_profiles view.
   * Replaces the old pattern  .select('*, profiles(full_name)')  which stops working
   * once the profiles table is made private (email/phone protection).
   *   rows  : array returned by a Supabase query
   *   idKey : column holding the user id, e.g. 'teacher_id' or 'user_id'
   */
  window.attachProfiles = async function (sb, rows, idKey) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;
    const ids = Array.from(new Set(rows.map(function (r) { return r[idKey]; }).filter(Boolean)));
    const names = {};
    if (ids.length) {
      try {
        const res = await sb.from('public_profiles').select('id, full_name, name').in('id', ids);
        (res.data || []).forEach(function (p) { names[p.id] = p.full_name || p.name || null; });
      } catch (e) { /* names are cosmetic: never break the page */ }
    }
    rows.forEach(function (r) {
      r.profiles = names[r[idKey]] ? { full_name: names[r[idKey]] } : null;
    });
    return rows;
  };

  /**
   * Headers for calls to /api/ask-ai. The server requires the user's login token so
   * that AI usage can be attributed, limited and metered per user.
   */
  window.aiHeaders = async function (sb) {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const res = await sb.auth.getSession();
      const token = res && res.data && res.data.session && res.data.session.access_token;
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } catch (e) { /* server will answer 401 and the page shows its normal error */ }
    return headers;
  };
})();
