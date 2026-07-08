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

  // If the Supabase library failed to load (blocked, slow/flaky connection, etc.),
  // show a friendly retry banner instead of letting every button silently fail.
  if (!window.supabase) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#FF3D5A;color:#fff;padding:14px 20px;text-align:center;font-family:sans-serif;font-size:14px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.4)';
    banner.innerHTML = 'Connection issue loading SkillStream. Please check your internet connection and <a href="javascript:location.reload()" style="color:#fff;text-decoration:underline;font-weight:700">tap here to retry</a>.';
    if (document.body) {
      document.body.prepend(banner);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.prepend(banner));
    }

    // Provide a stub SSAuth so pages don't throw "SSAuth is not defined" —
    // every method just reports the connection error instead.
    const connError = { ok: false, error: 'Connection issue — please reload the page.' };
    window.SSAuth = {
      ready: Promise.resolve(null),
      currentUser: () => null,
      signup: async () => connError,
      login: async () => connError,
      logout: async () => {},
      updateProfile: async () => connError,
      deleteAccount: async () => connError,
      uploadFile: async () => connError,
      requireAuth: async () => { return null; },
      requireRole: async () => { return null; }
    };
    return; // skip the rest of this file — nothing else can work without the library
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let cachedUser = null; // synchronous read cache, kept in sync below
  let inFlightRefresh = null; // shared promise so concurrent callers never see stale/partial data

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

  // Ensures a profiles row exists for this user. Safe to call even if a DB
  // trigger already created one — upsert just leaves existing data alone
  // for any column not passed here (onConflict + merge, not overwrite of
  // fields like bio/username the user may have already set).
  async function ensureProfile(user, extra) {
    const row = {
      id: user.id,
      email: user.email,
      name: (extra && extra.name) || user.user_metadata?.name || user.email.split('@')[0],
      role: (extra && extra.role) || user.user_metadata?.role || 'student'
    };
    const { error } = await client.from('profiles').upsert(row, { onConflict: 'id', ignoreDuplicates: false });
    if (error) console.warn('SSAuth: could not create/update profile row:', error.message);
  }

  // Accepts an optional already-known session (from onAuthStateChange) to avoid
  // an extra network round-trip via getUser(), which can otherwise re-trigger
  // more auth state events and create a refresh loop.
  //
  // Overlap-safe: if a refresh is already running, callers await that SAME
  // in-flight promise instead of getting back a possibly-stale cachedUser.
  function refreshCache(knownSession) {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
      try {
        let user;
        if (knownSession !== undefined) {
          user = knownSession ? knownSession.user : null;
        } else {
          const { data } = await client.auth.getSession(); // local, no network round-trip
          user = data.session ? data.session.user : null;
        }
        if (!user) { cachedUser = null; return null; }
        cachedUser = await fetchProfile(user.id);
        return cachedUser;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  }

  // Resolves once the initial session check is done. Pages can `await SSAuth.ready`
  // before relying on SSAuth.currentUser() synchronously. Times out after 10s so a
  // stuck network request can never freeze the page forever.
  const ready = Promise.race([
    refreshCache(),
    new Promise((resolve) => setTimeout(() => { console.error('SSAuth: initial session check timed out'); resolve(null); }, 10000))
  ]);

  let lastEvent = null;
  client.auth.onAuthStateChange((event, session) => {
    // Only react to events that actually change who's logged in — ignore noisy
    // repeats (e.g. TOKEN_REFRESHED firing repeatedly) that were causing a loop.
    if (event === lastEvent && (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) return;
    lastEvent = event;
    refreshCache(session);
  });

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

      // FIX: explicitly create the profile row here instead of assuming a
      // DB trigger will do it. Without this, signup could succeed in auth
      // but fetchProfile() would find nothing and return user: null.
      if (data.user) {
        await ensureProfile(data.user, { name, role });
      }

      await refreshCache(data.session);
      return { ok: true, user: cachedUser, needsEmailConfirm: !data.session };
    },

    async login({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email: (email || '').trim().toLowerCase(), password });
      if (error) return { ok: false, error: error.message };

      // Guard against a pre-existing account that somehow never got a
      // profile row (e.g. signed up before this fix shipped).
      if (data.user) await ensureProfile(data.user);

      await refreshCache(data.session);
      return { ok: true, user: cachedUser };
    },

    async logout() {
      await client.auth.signOut();
      cachedUser = null;
    },

    // Sends a password reset email. The link in that email brings the user
    // back to redirectPage (default: skillstream-reset-password.html) with
    // a temporary recovery session already active.
    async requestPasswordReset(email, redirectPage) {
      if (!email) return { ok: false, error: 'Enter your email address.' };
      const redirectTo = new URL(redirectPage || 'skillstream-reset-password.html', window.location.href).toString();
      const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // Called on the reset-password page once the user has clicked the
    // emailed link (Supabase automatically establishes a recovery session
    // when that link is opened, so no token handling is needed here).
    async updatePassword(newPassword) {
      if (!newPassword || newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
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
