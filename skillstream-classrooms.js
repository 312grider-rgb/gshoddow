/* SkillStream Classrooms — Supabase-backed
   Include after skillstream-auth.js:
     <script src="skillstream-classrooms.js"></script>
   All methods are ASYNC — use `await`.
*/
(function () {
  function client() { return SSAuth.client; }
  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }
  async function currentUserOrFail() {
    const u = SSAuth.currentUser();
    if (!u) throw new Error('Not logged in');
    return u;
  }

  // Reshape a classroom row + its related rows into the same shape the old
  // localStorage version used, so the HTML pages barely need to change.
  async function hydrateClassroom(row) {
    const cid = row.id;
    const [{ data: members }, { data: assignments }, { data: announcements },
           { data: quizzes }, { data: messages }] = await Promise.all([
      client().from('classroom_members').select('student_id, joined_at, profiles(name,email)').eq('classroom_id', cid),
      client().from('assignments').select('*').eq('classroom_id', cid).order('created_at'),
      client().from('announcements').select('*, profiles(name)').eq('classroom_id', cid).order('created_at', { ascending: false }),
      client().from('quizzes').select('*').eq('classroom_id', cid).order('created_at'),
      client().from('messages').select('*, profiles(name)').eq('classroom_id', cid).order('created_at')
    ]);

    const assignmentIds = (assignments || []).map(a => a.id);
    const quizIds = (quizzes || []).map(q => q.id);
    let submissions = {}, quizResults = {};
    if (assignmentIds.length) {
      const { data: subs } = await client().from('submissions').select('*, profiles(name)').in('assignment_id', assignmentIds);
      (subs || []).forEach(s => {
        if (!submissions[s.assignment_id]) submissions[s.assignment_id] = [];
        submissions[s.assignment_id].push({
          studentEmail: s.student_id, studentName: s.profiles ? s.profiles.name : '',
          text: s.text_answer, attachments: s.attachment_url ? [{ name: s.attachment_name, data: s.attachment_url }] : [],
          submittedAt: new Date(s.submitted_at).getTime(), grade: s.grade, feedback: s.feedback, _id: s.id
        });
      });
    }
    if (quizIds.length) {
      const { data: results } = await client().from('quiz_results').select('*, profiles(name)').in('quiz_id', quizIds);
      (results || []).forEach(r => {
        if (!quizResults[r.quiz_id]) quizResults[r.quiz_id] = [];
        quizResults[r.quiz_id].push({
          studentEmail: r.student_id, studentName: r.profiles ? r.profiles.name : '',
          answers: r.answers, score: r.score, total: r.total, submittedAt: new Date(r.submitted_at).getTime()
        });
      });
    }
    assignmentIds.forEach(id => { if (!submissions[id]) submissions[id] = []; });
    quizIds.forEach(id => { if (!quizResults[id]) quizResults[id] = []; });

    return {
      id: row.id, code: row.code, name: row.name, subject: row.subject, description: row.description,
      teacherEmail: row.teacher_id, teacherName: row.teacher_name || '', createdAt: new Date(row.created_at).getTime(),
      students: (members || []).map(m => ({ email: m.student_id, name: m.profiles ? m.profiles.name : '', joinedAt: new Date(m.joined_at).getTime() })),
      assignments: (assignments || []).map(a => ({
        id: a.id, title: a.title, description: a.description, dueDate: a.due_date, points: a.points,
        attachments: a.attachment_url ? [{ name: a.attachment_name, data: a.attachment_url }] : [],
        createdAt: new Date(a.created_at).getTime()
      })),
      announcements: (announcements || []).map(a => ({
        id: a.id, title: a.title, body: a.body, authorName: a.profiles ? a.profiles.name : '', authorEmail: a.author_id,
        createdAt: new Date(a.created_at).getTime()
      })),
      quizzes: (quizzes || []).map(q => ({ id: q.id, title: q.title, questions: q.questions, createdAt: new Date(q.created_at).getTime() })),
      messages: (messages || []).map(m => ({ id: m.id, authorEmail: m.author_id, authorName: m.profiles ? m.profiles.name : '', text: m.text, createdAt: new Date(m.created_at).getTime() })),
      submissions, quizResults
    };
  }

  const SSClass = {
    async create({ name, subject, description }) {
      const user = await currentUserOrFail();
      if (!name) return { ok: false, error: 'Classroom name is required.' };
      let code, exists = true, tries = 0;
      do {
        code = genCode();
        const { data } = await client().from('classrooms').select('id').eq('code', code).maybeSingle();
        exists = !!data; tries++;
      } while (exists && tries < 8);
      const { data, error } = await client().from('classrooms').insert({
        code, name, subject: subject || '', description: description || '', teacher_id: user.id
      }).select().single();
      if (error) return { ok: false, error: error.message };
      const classroom = await hydrateClassroom({ ...data, teacher_name: user.name });
      return { ok: true, classroom };
    },

    async join(code) {
      const user = await currentUserOrFail();
      const { data: room, error: findErr } = await client().from('classrooms').select('*').eq('code', (code || '').trim().toUpperCase()).maybeSingle();
      if (findErr || !room) return { ok: false, error: 'No classroom found with that code.' };
      if (room.teacher_id === user.id) return { ok: false, error: "You can't join your own classroom as a student." };
      const { error } = await client().from('classroom_members').insert({ classroom_id: room.id, student_id: user.id });
      if (error) {
        if (error.code === '23505') return { ok: false, error: "You're already in this classroom." };
        return { ok: false, error: error.message };
      }
      const classroom = await hydrateClassroom(room);
      return { ok: true, classroom };
    },

    async myClasses() {
      const user = await currentUserOrFail();
      const [{ data: teaching }, { data: memberRows }] = await Promise.all([
        client().from('classrooms').select('*').eq('teacher_id', user.id),
        client().from('classroom_members').select('classroom_id, classrooms(*)').eq('student_id', user.id)
      ]);
      const teachingHydrated = await Promise.all((teaching || []).map(r => hydrateClassroom({ ...r, teacher_name: user.name })));
      const enrolledHydrated = await Promise.all((memberRows || []).filter(m => m.classrooms).map(m => hydrateClassroom(m.classrooms)));
      return { teaching: teachingHydrated, enrolled: enrolledHydrated };
    },

    async get(classId) {
      const { data, error } = await client().from('classrooms').select('*, profiles!classrooms_teacher_id_fkey(name)').eq('id', classId).maybeSingle();
      if (error || !data) return null;
      return hydrateClassroom({ ...data, teacher_name: data.profiles ? data.profiles.name : '' });
    },

    async leave(classId) {
      const user = await currentUserOrFail();
      const { error } = await client().from('classroom_members').delete().eq('classroom_id', classId).eq('student_id', user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    async deleteClass(classId) {
      const { error } = await client().from('classrooms').delete().eq('id', classId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    async addAssignment(classId, { title, description, dueDate, points, attachments }) {
      let attachment_url = null, attachment_name = null;
      if (attachments && attachments[0] && attachments[0]._file) {
        const up = await SSAuth.uploadFile(attachments[0]._file, 'assignments');
        if (up.ok) { attachment_url = up.url; attachment_name = up.name; }
      }
      const { data, error } = await client().from('assignments').insert({
        classroom_id: classId, title, description: description || '', due_date: dueDate || null,
        points: points || 100, attachment_url, attachment_name
      }).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, assignment: data };
    },

    async addSubmission(classId, assignmentId, { text, attachments }) {
      const user = await currentUserOrFail();
      let attachment_url = null, attachment_name = null;
      if (attachments && attachments[0] && attachments[0]._file) {
        const up = await SSAuth.uploadFile(attachments[0]._file, 'submissions');
        if (up.ok) { attachment_url = up.url; attachment_name = up.name; }
      }
      const { error } = await client().from('submissions').upsert({
        assignment_id: assignmentId, student_id: user.id, text_answer: text || '',
        attachment_url, attachment_name, submitted_at: new Date().toISOString()
      }, { onConflict: 'assignment_id,student_id' });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    async gradeSubmission(classId, assignmentId, studentEmail, { grade, feedback }) {
      const { error } = await client().from('submissions').update({ grade, feedback: feedback || '' })
        .eq('assignment_id', assignmentId).eq('student_id', studentEmail);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    async addAnnouncement(classId, { title, body }) {
      const user = await currentUserOrFail();
      const { data, error } = await client().from('announcements').insert({
        classroom_id: classId, title: title || '', body: body || '', author_id: user.id
      }).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, announcement: data };
    },

    async addQuiz(classId, { title, questions }) {
      if (!title || !questions || !questions.length) return { ok: false, error: 'A quiz needs a title and at least one question.' };
      const { data, error } = await client().from('quizzes').insert({ classroom_id: classId, title, questions }).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, quiz: data };
    },

    async submitQuiz(classId, quizId, answers) {
      const user = await currentUserOrFail();
      const { data: quiz, error: qErr } = await client().from('quizzes').select('*').eq('id', quizId).single();
      if (qErr || !quiz) return { ok: false, error: 'Quiz not found.' };
      let score = 0, total = 0;
      quiz.questions.forEach((q, i) => { const pts = q.points || 1; total += pts; if (answers[i] === q.correctIndex) score += pts; });
      const { error } = await client().from('quiz_results').upsert({
        quiz_id: quizId, student_id: user.id, answers, score, total, submitted_at: new Date().toISOString()
      }, { onConflict: 'quiz_id,student_id' });
      if (error) return { ok: false, error: error.message };
      return { ok: true, score, total };
    },

    async postMessage(classId, text) {
      const user = await currentUserOrFail();
      if (!text || !text.trim()) return { ok: false, error: 'Message is empty.' };
      const { data, error } = await client().from('messages').insert({ classroom_id: classId, author_id: user.id, text: text.trim() }).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, message: data };
    },

    async gradesFor(classId) {
      const c = await this.get(classId);
      if (!c) return null;
      return { assignments: c.assignments, submissions: c.submissions, quizzes: c.quizzes, quizResults: c.quizResults, students: c.students };
    },

    async upcomingEvents() {
      const { teaching, enrolled } = await this.myClasses();
      const all = [...teaching, ...enrolled];
      const events = [];
      all.forEach(c => {
        c.assignments.forEach(a => { if (a.dueDate) events.push({ type: 'assignment', classId: c.id, className: c.name, title: a.title, date: a.dueDate, id: a.id }); });
        c.announcements.forEach(an => events.push({ type: 'announcement', classId: c.id, className: c.name, title: an.title || 'Announcement', date: new Date(an.createdAt).toISOString().slice(0, 10), id: an.id }));
      });
      return events.sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // Unread tracking stays client-side (localStorage) since it's per-device UI state, not shared data.
    _lastSeenKey(user) { return 'ss_lastseen_' + user.id; },
    _getLastSeen(user) { try { return JSON.parse(localStorage.getItem(this._lastSeenKey(user))) || {}; } catch (e) { return {}; } },
    async markSeen(classId) {
      const user = SSAuth.currentUser(); if (!user) return;
      const seen = this._getLastSeen(user); seen[classId] = Date.now();
      localStorage.setItem(this._lastSeenKey(user), JSON.stringify(seen));
    },
    async unreadCounts() {
      const user = SSAuth.currentUser(); if (!user) return {};
      const { teaching, enrolled } = await this.myClasses();
      const seen = this._getLastSeen(user);
      const counts = {};
      [...teaching, ...enrolled].forEach(c => {
        const since = seen[c.id] || 0;
        let n = 0;
        n += c.assignments.filter(a => a.createdAt > since).length;
        n += c.announcements.filter(a => a.createdAt > since).length;
        n += (c.messages || []).filter(m => m.createdAt > since).length;
        counts[c.id] = n;
      });
      return counts;
    }
  };

  window.SSClass = SSClass;
})();
