/* SkillStream Auth — Supabase-backed
   Include AFTER the Supabase CDN script:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
     <script src="skillstream-auth.js"></script>

   IMPORTANT: All methods are now ASYNC (they return Promises) because they
   talk to a real server. Every call site must use `await` or `.then()`.
*/
(function () {
  const SUPABASE_URL = 'https://vauudtedojtcveiqajlr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdXVkdGVkb2p0Y3ZlaXFhamxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTc5OTQsImV4cCI6MjA5ODQ3Mzk5NH0.QwJNPegqBPPfv4Tq7PqIGjuy9-iycajuJihMo-dlizo';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let cachedUser = null; // synchronous read cache, kept in sync below

  async function fetchProfile(userId) {
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return {
      id: data.id, email: data.email, name: data.name, role: data.role,
      username: data.username, bio: data.bio, phone: data.phone,
      country: data.country, timezone: data.timezone,
      skills: data.skills || [], avatar: data.avatar_url,
      createdAt: data.created_at
    };
  }

  async function refreshCache() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { cachedUser = null; return null; }
    cachedUser = await fetchProfile(user.id);
    return cachedUser;
  }

  // Resolves once the initial session check is done. Pages can `await SSAuth.ready`
  // before relying on SSAuth.currentUser() synchronously.
  const ready = refreshCache();

  client.auth.onAuthStateChange(() => { refreshCache(); });

  const SSAuth = {
    client, // exposed in case a page needs raw Supabase access (e.g. Storage uploads)
    ready,

    async signup({ email, password, role, name }) {
      if (!email || !password) return { ok: false, error: 'Email and password are required.' };
      if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name || email.split('@')[0], role: role || 'student' } }
      });
      if (error) return { ok: false, error: error.message };
      await refreshCache();
      return { ok: true, user: cachedUser, needsEmailConfirm: !data.session };
    },

    async login({ email, password }) {
      const { error } = await client.auth.signInWithPassword({ email: (email || '').trim().toLowerCase(), password });
      if (error) return { ok: false, error: error.message };
      await refreshCache();
      return { ok: true, user: cachedUser };
    },

    async logout() {
      await client.auth.signOut();
      cachedUser = null;
    },

    // Synchronous read of the last-known user (populated after `ready` resolves,
    // and kept fresh automatically). Returns null if nobody's logged in.
    currentUser() {
      return cachedUser;
    },

    async updateProfile(patch) {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return { ok: false, error: 'Not logged in.' };
      const row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.username !== undefined) row.username = patch.username;
      if (patch.bio !== undefined) row.bio = patch.bio;
      if (patch.phone !== undefined) row.phone = patch.phone;
      if (patch.country !== undefined) row.country = patch.country;
      if (patch.timezone !== undefined) row.timezone = patch.timezone;
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.skills !== undefined) row.skills = patch.skills;
      if (patch.avatar !== undefined) row.avatar_url = patch.avatar;
      row.updated_at = new Date().toISOString();
      const { error } = await client.from('profiles').update(row).eq('id', user.id);
      if (error) return { ok: false, error: error.message };
      await refreshCache();
      return { ok: true, user: cachedUser };
    },

    async deleteAccount() {
      // Note: fully deleting an auth.users row requires admin privileges (a server-side
      // key), which a static frontend can't safely hold. This signs the user out and
      // clears their profile row; add a Supabase Edge Function later to remove the
      // underlying auth account too if you need true deletion.
      const { data: { user } } = await client.auth.getUser();
      if (!user) return { ok: false };
      await client.from('profiles').delete().eq('id', user.id);
      await client.auth.signOut();
      cachedUser = null;
      return { ok: true };
    },

    // Uploads a file to Supabase Storage and returns its public URL.
    async uploadFile(file, pathPrefix) {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return { ok: false, error: 'Not logged in.' };
      const path = `${pathPrefix || 'files'}/${user.id}/${Date.now()}_${file.name}`;
      const { error } = await client.storage.from('skillstream-files').upload(path, file);
      if (error) return { ok: false, error: error.message };
      const { data } = client.storage.from('skillstream-files').getPublicUrl(path);
      return { ok: true, url: data.publicUrl, name: file.name };
    },

    // Redirects to login if nobody's signed in. Awaits the session check first.
    async requireAuth(redirectTo) {
      await ready;
      if (!cachedUser) { window.location.href = redirectTo || 'skillstream-login.html'; return null; }
      return cachedUser;
    },

    async requireRole(role, redirectTo) {
      const u = await this.requireAuth(redirectTo);
      if (u && u.role !== role && u.role !== 'both') {
        window.location.href = redirectTo || 'skillstream-dashboard.html';
        return null;
      }
      return u;
    }
  };

  window.SSAuth = SSAuth;
})();
