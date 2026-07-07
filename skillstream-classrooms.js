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
      .select('classroom_id, classrooms(*, teacher:profiles!classrooms_teacher_id_fkey(name))')
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
        teacherName: r.classrooms.teacher?.name || 'Unknown teacher'
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
    const user = await currentUserOrThrow();
    const db = client();
    const { data: classroom, error: findErr } = await db
      .from('classrooms').select('*').eq('code', code.trim().toUpperCase()).single();
    if (findErr || !classroom) return { ok: false, error: 'No class found with that code.' };
    if (classroom.teacher_id === user.id) return { ok: false, error: "You're the teacher of this class." };
    const { error: joinErr } = await db
      .from('classroom_members')
      .upsert({ classroom_id: classroom.id, user_id: user.id, role: 'student' }, { onConflict: 'classroom_id,user_id' });
    if (joinErr) return { ok: false, error: joinErr.message };
    return { ok: true, classroom };
  }

  // ════════════════════════════════════
  // DETAIL VIEW — get() returns one fully hydrated classroom object
  // ════════════════════════════════════
  async function get(classroomId) {
    const db = client();

    const { data: classroom, error } = await db
      .from('classrooms')
      .select('*, teacher:profiles!classrooms_teacher_id_fkey(id, name)')
      .eq('id', classroomId)
      .single();
    if (error) throw error;

    const { data: members, error: mErr } = await db
      .from('classroom_members')
      .select('user_id, profiles(id, name, email)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student');
    if (mErr) throw mErr;
    const students = (members || []).map(m => ({
      name: m.profiles?.name || 'Unknown', email: m.profiles?.id // "email" field = real user id
    }));

    const { data: announcements, error: anErr } = await db
      .from('announcements')
      .select('*, profiles:author_id(name)')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });
    if (anErr) throw anErr;

    const { data: assignments, error: asErr } = await db
      .from('assignments')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('due_date', { ascending: true });
    if (asErr) throw asErr;

    const assignmentIds = (assignments || []).map(a => a.id);
    let submissionRows = [];
    if (assignmentIds.length) {
      const { data, error: subErr } = await db
        .from('submissions')
        .select('*, profiles(id, name)')
        .in('assignment_id', assignmentIds);
      if (subErr) throw subErr;
      submissionRows = data || [];
    }
    const submissions = {};
    submissionRows.forEach(s => {
      submissions[s.assignment_id] = submissions[s.assignment_id] || [];
      submissions[s.assignment_id].push({
        studentName: s.profiles?.name || 'Unknown',
        studentEmail: s.profiles?.id,
        grade: s.grade, feedback: s.feedback, submittedAt: s.submitted_at
      });
    });

    const { data: quizzes, error: qErr } = await db
      .from('quizzes').select('*').eq('classroom_id', classroomId);
    if (qErr) throw qErr;

    const quizIds = (quizzes || []).map(q => q.id);
    let quizResultRows = [];
    if (quizIds.length) {
      const { data, error: qrErr } = await db
        .from('quiz_results')
        .select('*, profiles(id, name)')
        .in('quiz_id', quizIds);
      if (qrErr) throw qrErr;
      quizResultRows = data || [];
    }
    const quizResults = {};
    quizResultRows.forEach(r => {
      const quiz = (quizzes || []).find(q => q.id === r.quiz_id);
      const total = quiz ? (quiz.questions || []).reduce((sum, x) => sum + (x.points || 1), 0) : 0;
      quizResults[r.quiz_id] = quizResults[r.quiz_id] || [];
      quizResults[r.quiz_id].push({
        studentName: r.profiles?.name || 'Unknown',
        studentEmail: r.profiles?.id,
        score: r.score, total
      });
    });

    const { data: messageRows, error: msgErr } = await db
      .from('messages')
      .select('*, profiles(name)')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: true });
    if (msgErr) throw msgErr;
    const messages = (messageRows || []).map(m => ({
      authorName: m.profiles?.name || 'Unknown', text: m.body, createdAt: m.created_at
    }));

    return {
      id: classroom.id, name: classroom.name, subject: classroom.subject, code: classroom.code,
      teacherName: classroom.teacher?.name || 'Unknown teacher',
      teacherEmail: classroom.teacher?.id, // "email" field = teacher's real user id
      students,
      announcements: (announcements || []).map(a => ({
        title: a.title, body: a.body, authorName: a.profiles?.name || 'Unknown', createdAt: a.created_at
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
    myClasses, unreadCounts, markSeen, create, join, get,
    addAnnouncement, addAssignment, addSubmission, gradeSubmission,
    addQuiz, submitQuiz, postMessage
  };
})();
