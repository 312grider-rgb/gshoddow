/* Home "Today" card: a daily inspiration plus up to three next steps chosen by
   simple local rules. No AI is used, so it costs nothing and works offline once
   loaded. Usage: LNE_TODAY.mount({el, sb, user, role:'student'|'teacher'}) */
(function(){
  var T = function(s){ try{ return (window.LNE_I18N && LNE_I18N.t) ? LNE_I18N.t(s) : s; }catch(e){ return s; } };
  var QUOTES=[["The beautiful thing about learning is that no one can take it away from you.","B.B. King"],["Live as if you were to die tomorrow. Learn as if you were to live forever.","Mahatma Gandhi"],["An investment in knowledge always pays the best interest.","Benjamin Franklin"],["The expert in anything was once a beginner.","Helen Hayes"],["Learning never exhausts the mind.","Leonardo da Vinci"],["Education is not the filling of a pail, but the lighting of a fire.","William Butler Yeats"],["The more that you read, the more things you will know.","Dr. Seuss"],["You don't have to be great to start, but you have to start to be great.","Zig Ziglar"],["Small daily improvements are the key to staggering long-term results.","James Clear"],["It always seems impossible until it's done.","Nelson Mandela"]];
  var WORDS=[["Ephemeral (adj.)","Lasting for a very short time."],["Ubiquitous (adj.)","Present, appearing, or found everywhere."],["Resilience (n.)","The capacity to recover quickly from difficulties."],["Serendipity (n.)","The occurrence of finding valuable things by chance."],["Meticulous (adj.)","Showing great attention to detail; very careful."],["Eloquent (adj.)","Fluent and persuasive in speaking or writing."],["Pragmatic (adj.)","Dealing with things sensibly and realistically."],["Cognizant (adj.)","Having knowledge or awareness of something."],["Tenacious (adj.)","Tending to keep a firm hold; persistent."],["Lucid (adj.)","Expressed clearly; easy to understand."]];
  var HISTORY=[["In 1969, Apollo 11 astronauts became the first humans to walk on the Moon.","1969"],["The Eiffel Tower officially opened to the public in Paris.","1889"],["Johannes Gutenberg introduced the printing press to Europe, transforming the spread of information.","c. 1440"],["Alexander Fleming discovered penicillin, the first true antibiotic.","1928"],["The Hubble Space Telescope was launched into orbit.","1990"],["The Bill of Rights was ratified in the United States.","1791"],["Alexander Graham Bell was granted a patent for the telephone.","1876"],["The first message was sent over ARPANET, an early precursor to the modern internet.","1969"],["Lewis and Clark began their expedition across the western United States.","1804"],["The Montgolfier brothers launched the first hot air balloon flight carrying passengers.","1783"]];
  var SCIENCE=["Honey never spoils: archaeologists have found edible honey in ancient Egyptian tombs thousands of years old.","Light from the Sun takes about 8 minutes to reach Earth.","A bolt of lightning is roughly five times hotter than the surface of the Sun.","Octopuses have three hearts and blue blood.","The human brain generates enough electricity to power a small lightbulb.","Bananas are naturally slightly radioactive due to their potassium content.","Water can exist as solid, liquid, and gas at the same time at its 'triple point.'","Sound travels about four times faster in water than in air.","A day on Venus is longer than its year.","There are more possible chess games than atoms in the observable universe."];
  var CODE=["Name variables for what they represent, not how they're used: 'userEmail' beats 'temp1'.","Write the failing test before the fix. It proves the bug existed and stays green forever after.","Comments should explain 'why,' not 'what'. The code already shows what it does.","Small, frequent commits are easier to review and revert than one giant commit.","Read the error message fully before searching for it online. The answer is often right there.","Premature optimization can cost more time than it saves. Profile before you optimize.","Consistent formatting matters more than personal preference. Follow the project's style.","A function should do one thing well. If describing it needs 'and,' split it in two.","Version control isn't just for teams. Commit often even solo, it's a free undo button.","The best debugging tool is often just printing the state at each step."];
  var BOOKS=[["Atomic Habits","James Clear","A practical framework for building better habits through small changes."],["Sapiens: A Brief History of Humankind","Yuval Noah Harari","A sweeping look at how humans came to shape the world."],["The Pragmatic Programmer","David Thomas & Andrew Hunt","Timeless practical advice for software developers."],["Man's Search for Meaning","Viktor Frankl","A profound reflection on finding purpose through hardship."],["Thinking, Fast and Slow","Daniel Kahneman","Explores the two systems that drive how we think and decide."],["Educated","Tara Westover","A memoir about the transformative power of education."],["The Elements of Style","Strunk & White","A classic, concise guide to clear writing."],["A Short History of Nearly Everything","Bill Bryson","An accessible tour through science and the universe."],["Deep Work","Cal Newport","On the value of focused, distraction-free effort in a noisy world."],["The Alchemist","Paulo Coelho","A fable about following your personal calling."]];
  var CHALL=["Complete one full lesson in any course today.","Write down one new thing you learned yesterday and why it matters.","Teach someone else something you learned this week. Teaching cements learning.","Read for at least 15 minutes on a topic outside your usual interests.","Try explaining a concept you're studying in one simple sentence.","Review your notes from a few days ago. Repetition builds memory.","Ask your AI Tutor one question you've been putting off.","Set a 25-minute focused study block with no phone distractions.","Write a one-paragraph summary of something you studied this week.","Look up the origin of one word you use often."];
  var CATS=[['quote','📖 Quote'],['word','🧠 Word'],['history','🌍 History'],['science','🔬 Science'],['code','💻 Code Tip'],['book','📚 Book'],['challenge','🎯 Challenge']];

  function dayNo(){ var n=new Date(); return Math.floor((n-new Date(n.getFullYear(),0,0))/86400000); }
  function pick(a){ return a[dayNo()%a.length]; }
  function ymd(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function el(tag,cls,txt){ var e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }

  // What today's inspiration says, for each category: [small label, main text, small text]
  function inspo(key){
    if(key==='word'){ var w=pick(WORDS); return ['Word of the Day',w[0],w[1]]; }
    if(key==='history'){ var h=pick(HISTORY); return ['Historical Spotlight',h[0],h[1]]; }
    if(key==='science') return ['Scientific Fact of the Day',pick(SCIENCE),''];
    if(key==='code') return ['Programming Tip of the Day',pick(CODE),''];
    if(key==='book'){ var b=pick(BOOKS); return ['Book Recommendation',b[0]+' - '+b[1],b[2]]; }
    if(key==='challenge') return ["Today's Learning Challenge",pick(CHALL),''];
    var q=pick(QUOTES); return ['Quote of the Day','"'+q[0]+'"','- '+q[1]];
  }

  // The rules. facts = {lessonsDone, doneToday, inClass, classes}; returns a list, best first.
  function steps(role,f){
    var s=[];
    if(role==='teacher'){
      if(f.classes===0) s.push(['🏫','Create your first classroom','Students join with a code.','skillstream-classrooms.html']);
      s.push(['🎙️','Record a short lesson','Draw, talk and add pictures. Students watch any time.','skillstream-record.html']);
      if(f.classes>0) s.push(['📂','Share material with your students','Documents, songs, videos and PDFs.','skillstream-hub-learn.html']);
      s.push(['💬','Check your messages','Answer students and parents.','skillstream-messages.html']);
      s.push(['🔮','Explore Future Architect','Plan what is next for you.','skillstream-future-architect.html']);
      return s.slice(0,3);
    }
    if(f.doneToday===false) s.push(['🔥','Keep your streak going','Finish today\'s challenge and mark it done.',null,'markDone']);
    if(f.lessonsDone===0) s.push(['🚀','Start your first lesson','Pick a course and finish one lesson.','skillstream-self-paced.html']);
    else s.push(['▶️','Continue where you stopped','Your courses are below.','#inProgressList']);
    if(f.inClass===false) s.push(['🏫','Join your teacher\'s class','Use the code your teacher gave you.','skillstream-classrooms.html']);
    s.push(['🧑‍🏫','Ask the AI Teacher one question','Something you have been wondering about.','skillstream-ai-hub.html']);
    s.push(['🎯','Test your level','A short quiz shows what to learn next.','skillstream-ai-hub.html']);
    s.push(['🔮','Explore Future Architect','See how change opens new opportunities.','skillstream-future-architect.html']);
    return s.slice(0,3);
  }

  async function count(q){ try{ var r=await q; return r.error?null:(r.count||0); }catch(e){ return null; } }

  async function facts(o){
    var sb=o.sb,u=o.user.id,f={lessonsDone:null,doneToday:null,inClass:null,classes:null};
    if(o.role==='teacher'){
      f.classes=await count(sb.from('classrooms').select('id',{count:'exact',head:true}).eq('teacher_id',u));
      return f;
    }
    var a=await Promise.all([
      count(sb.from('lesson_progress').select('lesson_id',{count:'exact',head:true}).eq('user_id',u).eq('completed',true)),
      count(sb.from('challenge_completions').select('completed_date',{count:'exact',head:true}).eq('user_id',u).eq('completed_date',ymd())),
      count(sb.from('classroom_members').select('classroom_id',{count:'exact',head:true}).eq('user_id',u))
    ]);
    f.lessonsDone=a[0]===null?1:a[0];            // unknown: assume they have started
    f.doneToday=a[1]===null?null:a[1]>0;
    f.inClass=a[2]===null?null:a[2]>0;
    return f;
  }

  function css(){
    if(document.getElementById('lneTodayCss')) return;
    var s=document.createElement('style'); s.id='lneTodayCss';
    s.textContent='.lt-card{background:linear-gradient(135deg,#141F38,#1F2E52);color:#FBF7EF;border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 8px 24px rgba(20,31,56,.18)}'
    +'.lt-k{font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:#E4C583;font-weight:800;margin-bottom:12px}'
    +'.lt-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px}'
    +'.lt-chip{flex:0 0 auto;background:rgba(255,255,255,.1);border:0;color:#FBF7EF;padding:8px 13px;border-radius:20px;font-size:14.5px;font-weight:600;cursor:pointer;white-space:nowrap}'
    +'.lt-chip.on{background:#C9A24E;color:#141F38}'
    +'.lt-eye{font-size:13px;color:#E4C583;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}'
    +'.lt-main{font-size:19px;line-height:1.5;margin-bottom:6px;overflow-wrap:anywhere}'
    +'.lt-sub{font-size:15px;opacity:.8;line-height:1.5;overflow-wrap:anywhere}'
    +'.lt-next{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.14)}'
    +'.lt-step{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.08);border-radius:14px;padding:12px;margin-top:8px;color:#FBF7EF;text-decoration:none;border:0;width:100%;text-align:start;font:inherit;cursor:pointer;box-sizing:border-box}'
    +'.lt-step:active{background:rgba(255,255,255,.16)}'
    +'.lt-ic{font-size:24px;flex:0 0 auto}.lt-st{font-weight:700;font-size:16.5px}.lt-sd{font-size:14.5px;opacity:.75;margin-top:2px}'
    +'.lt-go{margin-inline-start:auto;color:#E4C583;font-size:20px}[dir=rtl] .lt-go{transform:scaleX(-1)}';
    document.head.appendChild(s);
  }

  function mount(o){
    var root=o.el; if(!root) return; css();
    var key='quote'; try{ var k=localStorage.getItem('lne_insp_cat'); if(CATS.some(function(c){return c[0]===k})) key=k; }catch(e){}
    var card=el('div','lt-card'), chips=el('div','lt-chips'), body=el('div'), next=el('div','lt-next');
    card.appendChild(el('div','lt-k','✨ Daily Inspiration'));
    CATS.forEach(function(c){
      var b=el('button','lt-chip'+(c[0]===key?' on':''),c[1]); b.type='button';
      b.onclick=function(){ key=c[0]; try{localStorage.setItem('lne_insp_cat',key)}catch(e){}
        Array.prototype.forEach.call(chips.children,function(x){ x.classList.toggle('on',x===b); }); draw(); };
      chips.appendChild(b);
    });
    card.appendChild(chips); card.appendChild(body); card.appendChild(next);
    root.textContent=''; root.appendChild(card);
    function draw(){
      var v=inspo(key); body.textContent='';
      body.appendChild(el('div','lt-eye',v[0])); body.appendChild(el('div','lt-main',v[1]));
      if(v[2]) body.appendChild(el('div','lt-sub',v[2]));
    }
    draw();
    function drawNext(f){
      next.textContent='';
      next.appendChild(el('div','lt-k','What should I do next?'));
      steps(o.role,f).forEach(function(s){
        var node;
        if(s[3]&&s[3].charAt(0)!=='#'){ node=el('a','lt-step'); node.href=s[3]; }
        else{ node=el('button','lt-step'); node.type='button';
          node.onclick=async function(){
            if(s[4]==='markDone'&&typeof window.markTodayDone==='function'){ node.disabled=true; try{ await window.markTodayDone(); }catch(e){} f.doneToday=true; drawNext(f); }
            else if(s[3]){ var t=document.querySelector(s[3]); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); }
          }; }
        var tx=el('div'); tx.appendChild(el('div','lt-st',s[1])); tx.appendChild(el('div','lt-sd',s[2]));
        node.appendChild(el('span','lt-ic',s[0])); node.appendChild(tx); node.appendChild(el('span','lt-go','›'));
        next.appendChild(node);
      });
    }
    drawNext({lessonsDone:1,doneToday:null,inClass:null,classes:null});
    facts(o).then(drawNext).catch(function(){});
  }
  window.LNE_TODAY={mount:mount,steps:steps,inspo:inspo,cats:CATS};
})();
