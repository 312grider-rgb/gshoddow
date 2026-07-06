/* SkillStream Classrooms — Supabase-backed data layer
   Include AFTER skillstream-auth.js:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
     <script src="skillstream-auth.js"></script>
     <script src="skillstream-classrooms.js"></script>

   Uses the shared Supabase client set up in skillstream-auth.js (window.SSAuth.client).
   All methods are async and return { ok, error, ...data } or throw — check each
   function's comment for its exact return shape.

   Expected schema (adjust column names below if yours differ):
     profiles(id, email, name, role, username, bio, phone, country, timezone, skills, avatar_url, created_at)
     classrooms(id, name, subject, description, code, teacher_id, created_at)
     classroom_members(id, classroom_id, user_id, role, joined_at)   -- role: 'student' | 'teacher'
     assignments(id, classroom_id, title, description, due_date, points, file_url, created_at)
     submissions(id, assignment_id, user_id, file_url, submitted_at, grade, feedback, graded_at)
     quizzes(id, classroom_id, title, questions, created_at)         -- questions: jsonb array
     quiz_results(id, quiz_id, user_id, score, answers, submitted_at)
     announcements(id, classroom_id, title, body, author_id, created_at)
     messages(id, classroom_id, user_id, body, created_at)
*/
(function () {
  function client() {
    if (!window.SSAuth || !window.SSAuth.client) {
      throw new Error('SSAuth not loaded — include skillstream-auth.js before skillstream-classrooms.js');
    }
    return window.SSAuth.client;
  }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function currentUserOrThrow() {
    const user = window.SSAuth.currentUser();
    if (!user) throw new Error('Not logged in.');
    return user;
  }

  // ════════════════════════════════════
  // CLASSES
  // ════════════════════════════════════

  // Returns { teaching: [...], enrolled: [...] } — classes the current user
  // teaches vs. is enrolled in as a student, each hydrated with student count.
  async function myClasses() {
    const user = await currentUserOrThrow();
    const db = client();

    const { data: taught, error: e1 } = await db
      .from('classrooms')
      .select('*, classroom_members(count)')
      .eq('teacher_id', user.id);
    if (e1) throw e1;

    const { data: memberRows, error: e2 } = await db
      .from('classroom_members')
      .select('classroom_id, classrooms(*, profiles:teacher_id(name))')
      .eq('user_id', user.id)
      .eq('role', 'student');
    if (e2) throw e2;

    const teaching = (taught || []).map(c => ({
      id: c.id, name: c.name, subject: c.subject, code: c.code,
      students: new Array(c.classroom_members?.[0]?.count || 0)
    }));

    const enrolled = (memberRows || [])
      .filter(r => r.classrooms)
      .map(r => ({
        id: r.classrooms.id, name: r.classrooms.name, subject: r.classrooms.subject,
        teacherName: r.classrooms.profiles?.name || 'Unknown teacher'
      }));

    return { teaching, enrolled };
  }

  // Unread counts per classroom_id, based on messages newer than the
  // user's last-seen timestamp for that class (stored locally — swap for
  // a server-side table if you want it to sync across devices).
  async function unreadCounts() {
    const user = await currentUserOrThrow();
    const db = client();
    const { teaching, enrolled } = await myClasses();
    const all = [...teaching, ...enrolled];
    const counts = {};

    for (const c of all) {
      const lastSeen = localStorage.getItem(`ss_seen_${c.id}`) || '1970-01-01';
      const { count, error } = await db
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('classroom_id', c.id)
        .gt('created_at', lastSeen)
        .neq('user_id', user.id);
      if (!error && count) counts[c.id] = count;
    }
    return counts;
  }

  function markSeen(classroomId) {
    localStorage.setItem(`ss_seen_${classroomId}`, new Date().toISOString());
  }

  // Creates a classroom with the current user as teacher; returns { ok, classroom } or { ok:false, error }
  async function create({ name, subject, description }) {
    if (!name || !name.trim()) return { ok: false, error: 'Class name is required.' };
    const user = await currentUserOrThrow();
    const db = client();
    const code = genCode();

    const { data, error } = await db
      .from('classrooms')
      .insert({ name: name.trim(), subject: subject?.trim() || null, description: description?.trim() || null, teacher_id: user.id, code })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, classroom: data };
  }

  // Joins a classroom by its code as a student; returns { ok, classroom } or { ok:false, error }
  async function join(code) {
    if (!code || !code.trim()) return { ok: false, error: 'Enter a class code.' };
    const user = await currentUserOrThrow();
    const db = client();

    const { data: classroom, error: findErr } = await db
      .from('classrooms')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();
    if (findErr || !classroom) return { ok: false, error: 'No class found with that code.' };

    if (classroom.teacher_id === user.id) return { ok: false, error: "You're the teacher of this class." };

    const { error: joinErr } = await db
      .from('classroom_members')
      .upsert({ classroom_id: classroom.id, user_id: user.id, role: 'student' }, { onConflict: 'classroom_id,user_id' });
    if (joinErr) return { ok: false, error: joinErr.message };

    return { ok: true, classroom };
  }

  // Full hydrated classroom for the detail view: teacher info + roster (Students).
  async function getClassroom(classroomId) {
    const db = client();
    const { data: classroom, error } = await db
      .from('classrooms')
      .select('*, teacher:profiles!classrooms_teacher_id_fkey(id, name, email)')
      .eq('id', classroomId)
      .single();
    if (error) throw error;

    const { data: members, error: mErr } = await db
      .from('classroom_members')
      .select('user_id, role, joined_at, profiles(id, name, email, avatar_url)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student');
    if (mErr) throw mErr;

    const students = (members || []).map(m => ({
      id: m.profiles?.id, name: m.profiles?.name, email: m.profiles?.email,
      avatar: m.profiles?.avatar_url, joinedAt: m.joined_at
    }));

    return { ...classroom, students };
  }

  // ════════════════════════════════════
  // STUDENTS — roster for one class (subset of getClassroom, exposed
  // directly since the People tab only needs this piece).
  // ════════════════════════════════════
  async function getStudents(classroomId) {
    const db = client();
    const { data, error } = await db
      .from('classroom_members')
      .select('user_id, joined_at, profiles(id, name, email, avatar_url)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student');
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.profiles?.id, name: m.profiles?.name, email: m.profiles?.email,
      avatar: m.profiles?.avatar_url, joinedAt: m.joined_at
    }));
  }

  // ════════════════════════════════════
  // USERS — broader lookup, e.g. for an admin view or search-by-email
  // when inviting someone. Respects whatever RLS policy you set on
  // `profiles` — if it's locked to "own row only", this will just return
  // the current user; open it up in Supabase if you want it usable more
  // widely (e.g. anyone can SELECT name/email, but not edit others).
  // ════════════════════════════════════
  async function getUsers({ search, limit } = {}) {
    const db = client();
    let query = db.from('profiles').select('id, name, email, role, created_at').limit(limit || 100);
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function getUserById(userId) {
    const db = client();
    const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  }

  // ════════════════════════════════════
  // ASSIGNMENTS
  // ════════════════════════════════════
  async function getAssignments(classroomId) {
    const db = client();
    const { data, error } = await db
      .from('assignments')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createAssignment(classroomId, { title, description, dueDate, points, fileUrl }) {
    const db = client();
    const { data, error } = await db
      .from('assignments')
      .insert({ classroom_id: classroomId, title, description, due_date: dueDate || null, points: points || 100, file_url: fileUrl || null })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, assignment: data };
  }

  // Student submits work for an assignment (file already uploaded via
  // SSAuth.uploadFile — pass the returned url here).
  async function submitAssignment(assignmentId, fileUrl) {
    const user = await currentUserOrThrow();
    const db = client();
    const { data, error } = await db
      .from('submissions')
      .upsert({ assignment_id: assignmentId, user_id: user.id, file_url: fileUrl, submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,user_id' })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, submission: data };
  }

  async function getSubmissions(assignmentId) {
    const db = client();
    const { data, error } = await db
      .from('submissions')
      .select('*, profiles(name, email)')
      .eq('assignment_id', assignmentId);
    if (error) throw error;
    return data || [];
  }

  // Teacher grades a submission.
  async function gradeSubmission(submissionId, grade, feedback) {
    const db = client();
    const { error } = await db
      .from('submissions')
      .update({ grade, feedback: feedback || null, graded_at: new Date().toISOString() })
      .eq('id', submissionId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ════════════════════════════════════
  // GRADES — combined view: assignment grades + quiz scores per student,
  // plus per-student averages. Used by the Grades tab.
  // ════════════════════════════════════
  async function getGrades(classroomId) {
    const db = client();

    const { data: assignments, error: aErr } = await db
      .from('assignments').select('id, title, points').eq('classroom_id', classroomId);
    if (aErr) throw aErr;

    const assignmentIds = (assignments || []).map(a => a.id);
    let submissions = [];
    if (assignmentIds.length) {
      const { data, error } = await db
        .from('submissions')
        .select('assignment_id, user_id, grade, profiles(name)')
        .in('assignment_id', assignmentIds);
      if (error) throw error;
      submissions = data || [];
    }

    const { data: quizzes, error: qErr } = await db
      .from('quizzes').select('id, title').eq('classroom_id', classroomId);
    if (qErr) throw qErr;

    const quizIds = (quizzes || []).map(q => q.id);
    let quizResults = [];
    if (quizIds.length) {
      const { data, error } = await db
        .from('quiz_results')
        .select('quiz_id, user_id, score, profiles(name)')
        .in('quiz_id', quizIds);
      if (error) throw error;
      quizResults = data || [];
    }

    // Group everything by student
    const byStudent = {};
    for (const s of submissions) {
      const name = s.profiles?.name || 'Unknown';
      byStudent[s.user_id] = byStudent[s.user_id] || { name, assignments: [], quizzes: [] };
      byStudent[s.user_id].assignments.push({ id: s.assignment_id, grade: s.grade });
    }
    for (const r of quizResults) {
      const name = r.profiles?.name || 'Unknown';
      byStudent[r.user_id] = byStudent[r.user_id] || { name, assignments: [], quizzes: [] };
      byStudent[r.user_id].quizzes.push({ id: r.quiz_id, score: r.score });
    }

    const rows = Object.entries(byStudent).map(([userId, s]) => {
      const gradedAssignments = s.assignments.filter(a => a.grade != null);
      const avgAssignment = gradedAssignments.length
        ? gradedAssignments.reduce((sum, a) => sum + a.grade, 0) / gradedAssignments.length
        : null;
      const avgQuiz = s.quizzes.length
        ? s.quizzes.reduce((sum, q) => sum + q.score, 0) / s.quizzes.length
        : null;
      return { userId, name: s.name, avgAssignment, avgQuiz, assignmentCount: s.assignments.length, quizCount: s.quizzes.length };
    });

    return { assignments, quizzes, rows };
  }

  // ════════════════════════════════════
  // MESSAGES — classroom chat
  // ════════════════════════════════════
  async function getMessages(classroomId, limit) {
    const db = client();
    const { data, error } = await db
      .from('messages')
      .select('*, profiles(name)')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: true })
      .limit(limit || 100);
    if (error) throw error;
    return (data || []).map(m => ({ id: m.id, body: m.body, userId: m.user_id, name: m.profiles?.name || 'Unknown', createdAt: m.created_at }));
  }

  async function sendMessage(classroomId, body) {
    if (!body || !body.trim()) return { ok: false, error: 'Message is empty.' };
    const user = await currentUserOrThrow();
    const db = client();
    const { data, error } = await db
      .from('messages')
      .insert({ classroom_id: classroomId, user_id: user.id, body: body.trim() })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: data };
  }

  // Subscribes to new messages in real time; returns an unsubscribe function.
  function subscribeMessages(classroomId, onMessage) {
    const db = client();
    const channel = db
      .channel(`messages:${classroomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `classroom_id=eq.${classroomId}` },
        (payload) => onMessage(payload.new))
      .subscribe();
    return () => db.removeChannel(channel);
  }

  // ════════════════════════════════════
  // ANNOUNCEMENTS (Stream tab)
  // ════════════════════════════════════
  async function getAnnouncements(classroomId) {
    const db = client();
    const { data, error } = await db
      .from('announcements')
      .select('*, profiles:author_id(name)')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function postAnnouncement(classroomId, title, body) {
    const user = await currentUserOrThrow();
    const db = client();
    const { data, error } = await db
      .from('announcements')
      .insert({ classroom_id: classroomId, title, body, author_id: user.id })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, announcement: data };
  }

  // ════════════════════════════════════
  // QUIZZES
  // ════════════════════════════════════
  async function getQuizzes(classroomId) {
    const db = client();
    const { data, error } = await db.from('quizzes').select('*').eq('classroom_id', classroomId);
    if (error) throw error;
    return data || [];
  }

  async function createQuiz(classroomId, title, questions) {
    const db = client();
    const { data, error } = await db
      .from('quizzes')
      .insert({ classroom_id: classroomId, title, questions })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, quiz: data };
  }

  async function submitQuizAnswers(quizId, answers, score) {
    const user = await currentUserOrThrow();
    const db = client();
    const { data, error } = await db
      .from('quiz_results')
      .upsert({ quiz_id: quizId, user_id: user.id, answers, score, submitted_at: new Date().toISOString() }, { onConflict: 'quiz_id,user_id' })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: data };
  }

  window.SSClass = {
    myClasses, unreadCounts, markSeen, create, join, getClassroom,
    getStudents,
    getUsers, getUserById,
    getAssignments, createAssignment, submitAssignment, getSubmissions, gradeSubmission,
    getGrades,
    getMessages, sendMessage, subscribeMessages,
    getAnnouncements, postAnnouncement,
    getQuizzes, createQuiz, submitQuizAnswers
  };
})();
