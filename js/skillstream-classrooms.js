/* SkillStream Classrooms — Supabase-backed data layer
   Rewritten to match the exact function names/signatures that
   skillstream-classrooms.html actually calls.

   Include AFTER skillstream-auth.js:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
     <script src="skillstream-auth.js"></script>
     <script src="skillstream-classrooms.js"></script>

   NOTE ON "email" fields: the classrooms.html UI compares teacherEmail /
   studentEmail against me.id to determine roles. Rather than change that
   UI, this module simply puts the user's real Supabase auth id (a UUID)
   into those "email"-named fields — they're just unique identifiers as
   far as the comparisons are concerned.
*/
(function () {
  function client() {
    if (!window.SSAuth || !window.SSAuth.client) {
      throw new Error('SSAuth not loaded — include skillstream-auth.js before skillstream-classrooms.js');
    }
    return window.SSAuth.client;
  }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function currentUserOrThrow() {
    const user = window.SSAuth.currentUser();
    if (!user) throw new Error('Not logged in.');
    return user;
  }

  function fileNameFromUrl(url) {
    if (!url) return 'file';
    const last = url.split('/').pop() || 'file';
    const parts = last.split('_');
    return parts.length > 1 ? parts.slice(1).join('_') : last;
  }

  // ════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════
  // Look up display names for a list of user ids (no table-link/embed needed).
  async function nameMap(db, ids) {
    const uniq = Array.from(new Set((ids || []).filter(Boolean)));
    const map = {};
    if (!uniq.length) return map;
    const { data } = await db.from('public_profiles').select('id, name, full_name').in('id', uniq);
    (data || []).forEach(p => { map[p.id] = p.name || p.full_name || null; });
    return map;
  }

  async function myClasses() {
    const user = await currentUserOrThrow();
    const db = client();

    const { data: taught, error: e1 } = await db
      .from('classrooms').select('*').eq('teacher_id', user.id);
    if (e1) throw e1;

    // Student counts for the classes I teach
    const taughtIds = (taught || []).map(c => c.id);
    const countByClass = {};
    if (taughtIds.length) {
      const { data: mem } = await db.from('classroom_members').select('classroom_id').in('classroom_id', taughtIds);
      (mem || []).forEach(m => { countByClass[m.classroom_id] = (countByClass[m.classroom_id] || 0) + 1; });
    }

    // Classes I am a student in
    const { data: memberRows, error: e2 } = await db
      .from('classroom_members').select('classroom_id').eq('student_id', user.id);
    if (e2) throw e2;
    const enrolledIds = (memberRows || []).map(r => r.classroom_id);
    let enrolledClasses = [];
    if (enrolledIds.length) {
      const { data: cls, error: e3 } = await db
        .from('classrooms').select('id, name, subject, teacher_id').in('id', enrolledIds);
      if (e3) throw e3;
      enrolledClasses = cls || [];
    }
    const teacherNames = await nameMap(db, enrolledClasses.map(c => c.teacher_id));

    const teaching = (taught || []).map(c => ({
      id: c.id, name: c.name, subject: c.subject, code: c.code,
      students: new Array(countByClass[c.id] || 0)
    }));
    const enrolled = enrolledClasses.map(c => ({
      id: c.id, name: c.name, subject: c.subject,
      teacherName: teacherNames[c.teacher_id] || 'Unknown teacher'
    }));

    return { teaching, enrolled };
  }

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

  async function join(code) {
    if (!code || !code.trim()) return { ok: false, error: 'Enter a class code.' };
    await currentUserOrThrow();
    const db = client();
    // The lookup by code runs inside the database (join_classroom, migration 026),
    // because a student cannot read a classroom before they are a member.
    const { data: cid, error: joinErr } = await db.rpc('join_classroom', { p_code: code.trim() });
    if (joinErr) return { ok: false, error: joinErr.message };
    const { data: classroom } = await db.from('classrooms').select('*').eq('id', cid).single();
    return { ok: true, classroom: classroom || { id: cid } };
  }

  // ════════════════════════════════════
  // DETAIL VIEW — get() returns one fully hydrated classroom object
  // ════════════════════════════════════
  async function get(classroomId) {
    const db = client();

    const { data: classroom, error } = await db
      .from('classrooms').select('*').eq('id', classroomId).single();
    if (error) throw error;

    const { data: members, error: mErr } = await db
      .from('classroom_members').select('student_id').eq('classroom_id', classroomId);
    if (mErr) throw mErr;
    const sids = (members || []).map(m => m.student_id);

    const { data: announcements, error: anErr } = await db
      .from('announcements').select('*').eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });
    if (anErr) throw anErr;

    const { data: assignments, error: asErr } = await db
      .from('assignments').select('*').eq('classroom_id', classroomId)
      .order('due_date', { ascending: true });
    if (asErr) throw asErr;

    const assignmentIds = (assignments || []).map(a => a.id);
    let submissionRows = [];
    if (assignmentIds.length) {
      const { data, error: subErr } = await db
        .from('submissions').select('*').in('assignment_id', assignmentIds);
      if (subErr) throw subErr;
      submissionRows = data || [];
    }

    const { data: quizzes, error: qErr } = await db
      .from('quizzes').select('*').eq('classroom_id', classroomId);
    if (qErr) throw qErr;

    const quizIds = (quizzes || []).map(q => q.id);
    let quizResultRows = [];
    if (quizIds.length) {
      const { data, error: qrErr } = await db
        .from('quiz_results').select('*').in('quiz_id', quizIds);
      if (qrErr) throw qrErr;
      quizResultRows = data || [];
    }

    const { data: messageRows, error: msgErr } = await db
      .from('messages').select('*').eq('classroom_id', classroomId)
      .order('created_at', { ascending: true });
    if (msgErr) throw msgErr;

    // One lookup for every name we need
    const names = await nameMap(db, [
      classroom.teacher_id, ...sids,
      ...(announcements || []).map(a => a.author_id),
      ...submissionRows.map(r => r.user_id),
      ...quizResultRows.map(r => r.user_id),
      ...(messageRows || []).map(m => m.user_id)
    ]);
    const nm = id => names[id] || 'Unknown';

    const students = sids.map(id => ({ name: nm(id), email: id })); // "email" field = real user id

    const submissions = {};
    submissionRows.forEach(r => {
      submissions[r.assignment_id] = submissions[r.assignment_id] || [];
      submissions[r.assignment_id].push({
        studentName: nm(r.user_id), studentEmail: r.user_id,
        grade: r.grade, feedback: r.feedback, submittedAt: r.submitted_at
      });
    });

    const quizResults = {};
    quizResultRows.forEach(r => {
      const quiz = (quizzes || []).find(q => q.id === r.quiz_id);
      const total = quiz ? (quiz.questions || []).reduce((sum, x) => sum + (x.points || 1), 0) : 0;
      quizResults[r.quiz_id] = quizResults[r.quiz_id] || [];
      quizResults[r.quiz_id].push({ studentName: nm(r.user_id), studentEmail: r.user_id, score: r.score, total });
    });

    const messages = (messageRows || []).map(m => ({
      authorName: nm(m.user_id), text: m.body, createdAt: m.created_at
    }));

    return {
      id: classroom.id, name: classroom.name, subject: classroom.subject, code: classroom.code,
      teacherName: names[classroom.teacher_id] || 'Unknown teacher',
      teacherEmail: classroom.teacher_id, // "email" field = teacher's real user id
      students,
      announcements: (announcements || []).map(a => ({
        title: a.title, body: a.body, authorName: nm(a.author_id), createdAt: a.created_at
      })),
      assignments: (assignments || []).map(a => ({
        id: a.id, title: a.title, description: a.description,
        dueDate: a.due_date, points: a.points, createdAt: a.created_at,
        attachments: a.file_url ? [{ name: fileNameFromUrl(a.file_url), data: a.file_url }] : []
      })),
      submissions,
      quizzes: (quizzes || []).map(q => ({ id: q.id, title: q.title, questions: q.questions || [] })),
      quizResults,
      messages
    };
  }

  // ════════════════════════════════════
  // CALENDAR — assignment due dates + announcements across all my classes
  // ════════════════════════════════════
  async function upcomingEvents() {
    const db = client();
    const { teaching, enrolled } = await myClasses();
    const all = [...teaching, ...enrolled];
    if (!all.length) return [];
    const ids = all.map(c => c.id);
    const classNameById = {};
    all.forEach(c => { classNameById[c.id] = c.name; });

    const { data: due, error: e1 } = await db
      .from('assignments').select('classroom_id, title, due_date')
      .in('classroom_id', ids).not('due_date', 'is', null);
    if (e1) throw e1;

    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data: posts, error: e2 } = await db
      .from('announcements').select('classroom_id, title, created_at')
      .in('classroom_id', ids).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(80);
    if (e2) throw e2;

    const events = [];
    (due || []).forEach(a => events.push({
      date: String(a.due_date).slice(0, 10), title: a.title || 'Assignment',
      type: 'assignment', className: classNameById[a.classroom_id] || 'Class'
    }));
    (posts || []).forEach(a => events.push({
      date: String(a.created_at).slice(0, 10), title: a.title || 'Announcement',
      type: 'announcement', className: classNameById[a.classroom_id] || 'Class'
    }));
    events.sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
    return events;
  }

  // ════════════════════════════════════
  // ANNOUNCEMENTS
  // ════════════════════════════════════
  async function addAnnouncement(classroomId, { title, body }) {
    const user = await currentUserOrThrow();
    const db = client();
    const { error } = await db.from('announcements').insert({ classroom_id: classroomId, title: title || null, body, author_id: user.id });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ════════════════════════════════════
  // ASSIGNMENTS
  // ════════════════════════════════════
  async function addAssignment(classroomId, { title, description, dueDate, points, attachments }) {
    const db = client();
    let fileUrl = null;
    if (attachments && attachments[0] && attachments[0]._file) {
      const up = await window.SSAuth.uploadFile(attachments[0]._file, 'assignments');
      if (!up.ok) return { ok: false, error: 'File upload failed: ' + up.error };
      fileUrl = up.url;
    }
    const { error } = await db.from('assignments').insert({
      classroom_id: classroomId, title, description: description || null,
      due_date: dueDate || null, points: points || 100, file_url: fileUrl
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function addSubmission(classroomId, assignmentId, { text, attachments }) {
    const user = await currentUserOrThrow();
    const db = client();
    let fileUrl = null;
    if (attachments && attachments[0] && attachments[0]._file) {
      const up = await window.SSAuth.uploadFile(attachments[0]._file, 'submissions');
      if (!up.ok) return { ok: false, error: 'File upload failed: ' + up.error };
      fileUrl = up.url;
    }
    const { error } = await db.from('submissions').upsert({
      assignment_id: assignmentId, user_id: user.id, content: text || null,
      file_url: fileUrl, submitted_at: new Date().toISOString()
    }, { onConflict: 'assignment_id,user_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function gradeSubmission(classroomId, assignmentId, studentEmail, { grade, feedback }) {
    const db = client();
    const { error } = await db.from('submissions')
      .update({ grade, feedback: feedback || null, graded_at: new Date().toISOString() })
      .eq('assignment_id', assignmentId)
      .eq('user_id', studentEmail); // "studentEmail" here is actually the user's real id
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // ════════════════════════════════════
  // QUIZZES
  // ════════════════════════════════════
  async function addQuiz(classroomId, { title, questions }) {
    const db = client();
    const { error } = await db.from('quizzes').insert({ classroom_id: classroomId, title, questions });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function submitQuiz(classroomId, quizId, answers) {
    const user = await currentUserOrThrow();
    const db = client();
    const { data: quiz, error: qErr } = await db.from('quizzes').select('*').eq('id', quizId).single();
    if (qErr) return { ok: false, error: qErr.message };

    let score = 0, total = 0;
    (quiz.questions || []).forEach((q, i) => {
      const pts = q.points || 1;
      total += pts;
      if (answers[i] === q.correctIndex) score += pts;
    });

    const { error } = await db.from('quiz_results').upsert({
      quiz_id: quizId, user_id: user.id, score, answers, submitted_at: new Date().toISOString()
    }, { onConflict: 'quiz_id,user_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true, score, total };
  }

  // ════════════════════════════════════
  // CHAT
  // ════════════════════════════════════
  async function postMessage(classroomId, text) {
    if (!text || !text.trim()) return { ok: false, error: 'Message is empty.' };
    const user = await currentUserOrThrow();
    const db = client();
    const { error } = await db.from('messages').insert({ classroom_id: classroomId, user_id: user.id, body: text.trim() });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  window.SSClass = {
    myClasses, unreadCounts, markSeen, create, join, get, upcomingEvents,
    addAnnouncement, addAssignment, addSubmission, gradeSubmission,
    addQuiz, submitQuiz, postMessage
  };
})();
