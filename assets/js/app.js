
/* Xchange Prototype – localStorage powered front-end */
(function(){
  const APP_KEY = "xchange_db_v1";
  const SESSION_KEY = "xchange_session_v1";
  const PENDING_KEY = "xchange_pending_coins_v1";

  const $ = (sel, el=document)=> el.querySelector(sel);
  const $$ = (sel, el=document)=> [...el.querySelectorAll(sel)];

  function nowISO(){ return new Date().toISOString(); }
  function uid(prefix="id"){ return prefix + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16); }

  function seed(){
    const existing = localStorage.getItem(APP_KEY);
    if(existing) return;

    const users = [
      { id: 1, username: "student1", password: "pass123", fullName: "Student One", bio: "Here to learn and level up.", userType: "student", plan: "free", coins: 50, createdAt: nowISO() },
      { id: 2, username: "teacher1", password: "teach123", fullName: "Teacher One", bio: "I teach skills through video + live sessions.", userType: "teacher", plan: "free", coins: 50, createdAt: nowISO() },
      { id: 3, username: "hybrid1", password: "hybrid123", fullName: "Hybrid One", bio: "I learn, teach, and exchange skills.", userType: "teacher_student", plan: "free", coins: 50, createdAt: nowISO() }
    ];

    const courses = [
      // Learn
      { id: 101, title:"Guitar Basics", description:"Chords, strumming, rhythm. Start playing songs fast.", category:"learn", delivery:"video", level:"Beginner", price:18, teacherId:2, groupId:201 },
      { id: 102, title:"Python Basic", description:"Syntax, loops, functions, and mini projects.", category:"learn", delivery:"video", level:"Beginner", price:22, teacherId:2, groupId:202 },
      { id: 103, title:"Python Advanced", description:"OOP, decorators, async patterns + clean architecture.", category:"learn", delivery:"live", level:"Advanced", price:35, teacherId:2, groupId:null },
      { id: 104, title:"UI/UX Fundamentals", description:"Modern layouts, hierarchy, and prototyping habits.", category:"learn", delivery:"live", level:"Intermediate", price:28, teacherId:3, groupId:null },
      { id: 105, title:"Public Speaking", description:"Structure, delivery, Q&A confidence.", category:"learn", delivery:"video", level:"Intermediate", price:16, teacherId:3, groupId:203 },
      // Exchange (requires teacher_student)
      { id: 301, title:"Exchange: Conversational English", description:"Mutual speaking practice – match & trade sessions.", category:"exchange", delivery:"live", level:"Intermediate", price:18, teacherId:3, groupId:null },
      { id: 302, title:"Exchange: Thai Street Food Tour", description:"Language + culture exchange, guided live session.", category:"exchange", delivery:"live", level:"Beginner", price:20, teacherId:3, groupId:null },
      { id: 303, title:"Exchange: Math for Data", description:"Trade problem solving sessions with peers.", category:"exchange", delivery:"live", level:"Intermediate", price:24, teacherId:3, groupId:null }
    ];

    const groups = [
      { id:201, courseId:101, teacherId:2, name:"Guitar Basics – Video Group", videos:["lesson1.mp4","lesson2.mp4","lesson3.mp4"], createdAt: nowISO() },
      { id:202, courseId:102, teacherId:2, name:"Python Basic – Video Group", videos:["intro.mp4","loops.mp4","functions.mp4"], createdAt: nowISO() },
      { id:203, courseId:105, teacherId:3, name:"Public Speaking – Video Group", videos:["confidence.mp4","structure.mp4"], createdAt: nowISO() },
    ];

    const db = {
      users,
      courses,
      groups,
      enrollments: [], // {id,userId,courseId,delivery,createdAt}
      liveRequests: [], // {id,userId,courseId,message,status,createdAt}
      coinPurchases: [], // {id,userId,amount,method,info,createdAt}
      exchanges: { selections: [], matches: [] },
      chats: { messages: [] }
    };
    localStorage.setItem(APP_KEY, JSON.stringify(db));
  }

  function db(){ seed(); return JSON.parse(localStorage.getItem(APP_KEY)); }
  function saveDB(next){ localStorage.setItem(APP_KEY, JSON.stringify(next)); }

  function session(){ const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; }
  function setSession(userId){ localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: nowISO() })); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }
  function currentUser(){
    const s = session(); if(!s) return null;
    const d = db(); return d.users.find(u=>u.id===s.userId) || null;
  }

  function courseById(id){ const d=db(); return d.courses.find(c=>c.id===id) || null; }
  function userById(id){ const d=db(); return d.users.find(u=>u.id===id) || null; }

  function planLimits(plan){
    if(plan==="creator") return { maxGroups:10, maxCourses:10 };
    if(plan==="campus") return { maxGroups:100, maxCourses:100 };
    return { maxGroups:3, maxCourses:2 };
  }

  function badgeLabel(type){
    if(type==="student") return "Student";
    if(type==="teacher") return "Teacher";
    return "Teacher & Student";
  }

  function toast(msg){
    let el = $("#toast");
    if(!el){
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=> el.classList.remove("show"), 1800);
  }

  function money(n){ return Number(n||0).toFixed(0); }

  function requireAuth(redirectTo="login.html"){
    const u = currentUser();
    if(!u){ window.location.href = redirectTo; return null; }
    return u;
  }

  function renderHeader(){
    const host = document.getElementById("app-header");
    if(!host) return;

    const u = currentUser();
    const coins = u ? u.coins : 0;

    host.innerHTML = `
      <div class="header">
        <div class="container">
          <div class="nav">
            <a class="brand" href="index.html" aria-label="Xchange Home">
              <span class="logo" aria-hidden="true"></span>
              <span>Xchange</span>
              <span class="tag accent" style="margin-left:6px">Prototype</span>
            </a>

            <div class="navlinks">
              <a href="index.html#overview">Overview</a>
              <a href="index.html#features">Features</a>
              <a href="how-it-works.html">How it works</a>
              <a href="skills.html">Skills</a>
              <a href="upgrade.html">Upgrade</a>
            </div>

            <div class="nav-right">
              ${u ? `
                <span class="pill" title="Coins">
                  <span class="tag accent">🪙 ${money(coins)} coins</span>
                </span>
                <span class="badge ${u.userType}">${badgeLabel(u.userType)}</span>
                <a class="btn small" href="profile.html">Profile</a>
                <a class="btn small" href="groups.html">Groups</a>
                <a class="btn small" href="chat.html">Chat</a>
                ${(u.userType!=="student") ? `<a class="btn small" href="dashboard.html">Teach</a>` : ``}
                <button class="btn small ghost" id="logoutBtn">Logout</button>
              ` : `
                <a class="btn small" href="login.html">Login</a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    const lb = $("#logoutBtn");
    if(lb){
      lb.addEventListener("click", ()=>{
        clearSession();
        toast("Logged out.");
        setTimeout(()=> window.location.href="index.html", 250);
      });
    }
  }

  function renderFooter(){
    const host = document.getElementById("app-footer");
    if(!host) return;
    host.innerHTML = `
      <div class="footer">
        <div class="container">
          <div class="row" style="justify-content:space-between; align-items:center">
            <div>
              <b>Xchange</b> — learn, teach, and exchange skills with a coin-based system.
              <div class="muted" style="font-size:13px;margin-top:6px">
                Prototype only: all data is saved in your browser (localStorage).
              </div>
            </div>
            <div class="muted" style="font-size:13px">
              Demo accounts: <b>student1/pass123</b> · <b>teacher1/teach123</b> · <b>hybrid1/hybrid123</b>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function protectPage(){
    const needAuth = document.body.dataset.auth === "1";
    if(needAuth) requireAuth();
  }

  function initLoginPage(){
    const form = $("#loginForm");
    if(!form) return;

    const u = currentUser();
    if(u){
      toast("You're already logged in.");
      setTimeout(()=> window.location.href="index.html", 400);
      return;
    }

    $$("#demoButtons button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        $("#username").value = btn.dataset.user;
        $("#password").value = btn.dataset.pass;
        toast("Filled demo credentials.");
      });
    });

    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const username = $("#username").value.trim();
      const password = $("#password").value;

      const d = db();
      const user = d.users.find(u=>u.username.toLowerCase()===username.toLowerCase() && u.password===password);
      if(!user){ toast("Invalid username or password."); return; }
      setSession(user.id);
      toast(`Welcome, ${user.fullName}!`);
      setTimeout(()=> window.location.href="index.html", 350);
    });
  }

  function initUpgradePage(){
    const wrap = $("#upgradeWrap");
    if(!wrap) return;

    const u = currentUser();
    if(u){
      $("#currentPlan").textContent = u.plan.toUpperCase();
      $("#planNote").textContent = (u.plan==="free")
        ? "Free plan limits apply."
        : (u.plan==="creator" ? "Creator plan unlocked for this demo account." : "Campus plan (demo).");
    }

    // buy coins -> transaction page
    $$("#buyCoins button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const user = requireAuth();
        if(!user) return;
        const amount = Number(btn.dataset.amount);
        sessionStorage.setItem(PENDING_KEY, String(amount));
        window.location.href = "transaction.html";
      });
    });

    // upgrade to creator
    const upBtn = $("#upgradeCreatorBtn");
    if(upBtn){
      upBtn.addEventListener("click", ()=>{
        const user = requireAuth();
        if(!user) return;
        const d = db();
        const me = d.users.find(x=>x.id===user.id);
        me.plan = "creator";
        saveDB(d);
        renderHeader();
        $("#currentPlan").textContent = me.plan.toUpperCase();
        $("#planNote").textContent = "Creator plan unlocked for this demo account.";
        toast("Upgraded to Creator.");
        renderTeachingLimits();
      });
    }

    renderCoinHistory();
    renderTeachingLimits();

    function renderCoinHistory(){
      const user = currentUser();
      const host = $("#coinHistory");
      if(!host) return;
      if(!user){
        host.innerHTML = `<div class="muted">Login to see your coin purchases.</div>`;
        return;
      }
      const d = db();
      const rows = d.coinPurchases
        .filter(p=>p.userId===user.id)
        .slice(-8)
        .reverse()
        .map(p=>`<tr><td>${new Date(p.createdAt).toLocaleString()}</td><td>+${p.amount}</td><td>${(p.method||"").toUpperCase()}</td></tr>`)
        .join("");
      host.innerHTML = rows
        ? `<table class="table"><tr><th>Time</th><th>Coins</th><th>Method</th></tr>${rows}</table>`
        : `<div class="muted">No purchases yet. Choose a coin pack → Transaction.</div>`;
    }

    function renderTeachingLimits(){
      const user = currentUser();
      const host = $("#teachingLimits");
      if(!host) return;
      if(!user){
        host.innerHTML = `<div class="muted">Login to see plan limits.</div>`;
        return;
      }
      const limits = planLimits(user.plan);
      host.innerHTML = `
        <div class="feature">
          <b>Plan limits</b>
          <div class="muted">Groups: <b style="color:var(--text)">${limits.maxGroups}</b> · Courses: <b style="color:var(--text)">${limits.maxCourses}</b></div>
          <div class="muted" style="margin-top:6px">In the Free plan, teachers can create up to 2 courses and 3 groups. Creator unlocks 10 & 10.</div>
        </div>
      `;
    }
  }

  function initTransactionPage(){
    const host = $("#transactionWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    const pending = Number(sessionStorage.getItem(PENDING_KEY) || "0");

    host.innerHTML = `
      <div class="split">
        <div class="card"><div class="pad">
          <div class="h2">Transaction</div>
          <div class="muted">Select a payment option, fill any info you want, then Purchase (demo).</div>
          <hr class="sep" />

          <div class="feature">
            <b>Coins to purchase</b>
            <div class="muted">Amount: <b style="color:var(--text)">🪙 ${pending || "—"}</b></div>
            <div class="muted" style="margin-top:6px">If empty, go back to Upgrade and pick a coin pack.</div>
          </div>

          <div class="spacer"></div>

          <form class="form" id="txForm">
            <div>
              <label>Purchase option</label>
              <select id="txMethod" required>
                <option value="bank">Bank transfer</option>
                <option value="qr">QR / Scan</option>
                <option value="visa">Visa card</option>
              </select>
            </div>

            <div class="form-row">
              <div>
                <label>Full name</label>
                <input class="input" id="txName" placeholder="Type anything…" />
              </div>
              <div>
                <label>Reference / Note</label>
                <input class="input" id="txRef" placeholder="Type anything…" />
              </div>
            </div>

            <div class="form-row">
              <div>
                <label>Bank / Card info</label>
                <input class="input" id="txInfo1" placeholder="Type anything…" />
              </div>
              <div>
                <label>Phone / Email</label>
                <input class="input" id="txInfo2" placeholder="Type anything…" />
              </div>
            </div>

            <button class="btn primary" type="submit">Purchase</button>
            <a class="btn" href="upgrade.html">Back to Upgrade</a>
          </form>
        </div></div>

        <div class="card"><div class="pad">
          <div class="h2">Demo rules</div>
          <div class="muted">No real payments. This page simulates checkout and instantly updates your coins.</div>
          <hr class="sep" />
          <div class="feature">
            <b>Security note</b>
            <div class="muted">Prototype only — stored locally in your browser (no backend).</div>
          </div>
        </div></div>
      </div>
    `;

    $("#txForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const amount = Number(sessionStorage.getItem(PENDING_KEY) || "0");
      if(!amount){ toast("No coin pack selected. Go back to Upgrade."); return; }

      const d = db();
      const me = d.users.find(x=>x.id===u.id);
      me.coins += amount;
      d.coinPurchases.push({
        id: uid("buy"),
        userId: me.id,
        amount,
        method: $("#txMethod").value,
        info: { name: $("#txName").value.trim(), ref: $("#txRef").value.trim() },
        createdAt: nowISO()
      });

      saveDB(d);
      sessionStorage.removeItem(PENDING_KEY);
      renderHeader();
      toast(`Purchased ${amount} coins.`);
      setTimeout(()=> window.location.href="upgrade.html", 350);
    });
  }

  function initSkillsPage(){
    const host = $("#coursesGrid");
    if(!host) return;

    const tabBtns = $$("#tabButtons button");
    const filterDelivery = $("#filterDelivery");
    const search = $("#searchBox");

    let activeCategory = "learn";

    tabBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        tabBtns.forEach(b=> b.classList.remove("primary"));
        btn.classList.add("primary");
        activeCategory = btn.dataset.cat;
        render();
      });
    });

    [filterDelivery, search].forEach(el=>{ if(el) el.addEventListener("input", render); });

    render();

    function render(){
      const d = db();
      const delivery = filterDelivery.value;
      const q = (search.value||"").trim().toLowerCase();

      const user = currentUser();
      const blockedExchange = activeCategory==="exchange" && (!user || user.userType!=="teacher_student");

      if(blockedExchange){
        host.innerHTML = `
          <div class="notice">
            Exchange is only for <b>Teacher & Student</b> users. Please login as <b>hybrid1/hybrid123</b>.
          </div>
        `;
        $("#exchangePanel").style.display = "none";
        return;
      }

      const list = d.courses
        .filter(c=>c.category===activeCategory)
        .filter(c=> delivery==="all" ? true : c.delivery===delivery)
        .filter(c=> q ? (c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) : true);

      host.innerHTML = `
        <div class="grid3">
          ${list.map(c=> courseCard(c)).join("")}
        </div>
      `;

      $$("#coursesGrid [data-action='buy']").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const courseId = Number(btn.dataset.course);
          const delivery = btn.dataset.delivery;
          purchaseCourse(courseId, delivery);
        });
      });

      if(activeCategory==="exchange"){
        $("#exchangePanel").style.display = "block";
        renderExchangePanel();
      }else{
        $("#exchangePanel").style.display = "none";
      }
    }

    function courseCard(c){
      const teacher = userById(c.teacherId);
      const user = currentUser();
      const enrolled = user ? isEnrolled(user.id, c.id) : false;

      const action = enrolled
        ? `<span class="tag good">Enrolled</span>`
        : `<button class="btn small primary" data-action="buy" data-course="${c.id}" data-delivery="${c.delivery}">Buy (${c.delivery})</button>`;

      return `
        <div class="course-card">
          <div class="course-top">
            <div>
              <div class="course-title">${escapeHTML(c.title)}</div>
              <div class="muted" style="font-size:13px;margin-top:4px">${escapeHTML(c.description)}</div>
            </div>
            <div class="price"><span class="coin">🪙</span> ${c.price}</div>
          </div>
          <div class="course-meta">
            <span class="tag ${c.category==='exchange' ? 'accent' : 'blue'}">${c.category.toUpperCase()}</span>
            <span class="tag">${c.delivery.toUpperCase()}</span>
            <span class="tag">${escapeHTML(c.level)}</span>
            <span class="tag">Teacher: ${teacher ? escapeHTML(teacher.username) : "—"}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">
            <span class="muted" style="font-size:13px">1 coin = $1</span>
            ${action}
          </div>
        </div>
      `;
    }

    function isEnrolled(userId, courseId){
      const d = db();
      return d.enrollments.some(e=> e.userId===userId && e.courseId===courseId);
    }

    function purchaseCourse(courseId, delivery){
      const user = requireAuth();
      if(!user) return;

      const c = courseById(courseId);
      const d = db();
      const me = d.users.find(u=>u.id===user.id);

      if(me.coins < c.price){
        toast("Not enough coins. Buy coins in Upgrade.");
        return;
      }
      if(c.category==="exchange"){
        toast("Exchange courses are swapped via matching. Use the Exchange panel below.");
        return;
      }

      me.coins -= c.price;
      d.enrollments.push({ id:uid("enr"), userId:me.id, courseId:c.id, delivery, createdAt: nowISO() });

      if(delivery==="live"){
        d.liveRequests.push({
          id:uid("live"),
          userId: me.id,
          courseId: c.id,
          message: "Hi teacher, I'd like to schedule a live session. What times are available?",
          status: "pending",
          createdAt: nowISO()
        });
      }

      saveDB(d);
      renderHeader();
      toast(`Purchased: ${c.title} (${delivery})`);

      // If video course has a group, user can see it in Groups page
      initSkillsPage();
    }

    function renderExchangePanel(){
      const user = currentUser();
      const panel = $("#exchangePanel");
      if(!panel) return;

      const d = db();
      const exchangeCourses = d.courses.filter(c=>c.category==="exchange");
      const otherUsers = d.users.filter(u=>u.id!==user.id);

      panel.innerHTML = `
        <div class="card"><div class="pad">
          <div class="row" style="justify-content:space-between; align-items:center">
            <div>
              <div class="h2">Exchange matching</div>
              <div class="muted">Both users must select each other. If prices differ, the cheaper-course owner pays the difference in coins.</div>
            </div>
            <span class="tag accent">Teacher & Student only</span>
          </div>

          <hr class="sep" />

          <div class="split">
            <div>
              <label>Your offered course (Exchange)</label>
              <select id="offerCourse">
                ${exchangeCourses.map(c=>`<option value="${c.id}">${escapeHTML(c.title)} — 🪙 ${c.price}</option>`).join("")}
              </select>
            </div>
            <div>
              <label>Pick a user to exchange with</label>
              <select id="targetUser">
                ${otherUsers.map(u=>`<option value="${u.id}">${escapeHTML(u.username)} (${badgeLabel(u.userType)})</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="spacer"></div>

          <div>
            <label>Course you want from them (Exchange)</label>
            <select id="targetCourse">
              ${exchangeCourses.map(c=>`<option value="${c.id}">${escapeHTML(c.title)} — 🪙 ${c.price}</option>`).join("")}
              </select>
          </div>

          <div class="spacer"></div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn primary" id="submitExchange">Submit exchange request</button>
          </div>

          <div class="spacer"></div>
          <div id="exchangeStatus"></div>

          <hr class="sep" />
          <div class="h2">Recent matches</div>
          <div id="matchList" class="muted">—</div>
        </div></div>
      `;

      $("#submitExchange").addEventListener("click", ()=>{
        const offerCourseId = Number($("#offerCourse").value);
        const targetUserId = Number($("#targetUser").value);
        const targetCourseId = Number($("#targetCourse").value);
        submitExchange(user.id, offerCourseId, targetUserId, targetCourseId);
      });

      renderExchangeStatus(user.id);
      renderMatches(user.id);
    }

    function submitExchange(userId, offerCourseId, targetUserId, targetCourseId){
      const d = db();

      d.exchanges.selections.push({
        id: uid("sel"),
        userId,
        offerCourseId,
        targetUserId,
        targetCourseId,
        createdAt: nowISO()
      });

      const mutual = d.exchanges.selections.find(s =>
        s.userId===targetUserId &&
        s.targetUserId===userId &&
        s.offerCourseId===targetCourseId &&
        s.targetCourseId===offerCourseId
      );

      if(mutual){
        const a = userById(userId);
        const b = userById(targetUserId);

        if(a.userType!=="teacher_student" || b.userType!=="teacher_student"){
          toast("Both users must be Teacher & Student to exchange.");
          saveDB(d);
          renderExchangeStatus(userId);
          return;
        }

        const courseA = courseById(offerCourseId);
        const courseB = courseById(targetCourseId);

        const priceA = courseA.price;
        const priceB = courseB.price;

        let coinTransfer = 0;
        let payerId = null;
        if(priceA < priceB){
          coinTransfer = priceB - priceA;
          payerId = userId;
        }else if(priceB < priceA){
          coinTransfer = priceA - priceB;
          payerId = targetUserId;
        }

        if(coinTransfer>0 && payerId){
          const payer = d.users.find(u=>u.id===payerId);
          const receiverId = (payerId===userId) ? targetUserId : userId;
          const receiver = d.users.find(u=>u.id===receiverId);

          if(payer.coins < coinTransfer){
            toast("Match found, but the cheaper-course owner lacks coins for the difference.");
          }else{
            payer.coins -= coinTransfer;
            receiver.coins += coinTransfer;
            toast(`Match! Coin difference transferred: ${coinTransfer} coins.`);
          }
        }else{
          toast("Match! Equal value exchange.");
        }

        d.exchanges.matches.push({
          id: uid("match"),
          userA: userId, userB: targetUserId,
          courseA: offerCourseId, courseB: targetCourseId,
          coinTransfer,
          createdAt: nowISO()
        });

        saveDB(d);
        renderHeader();
      }else{
        saveDB(d);
        toast("Exchange request submitted. Waiting for mutual selection.");
      }

      renderExchangeStatus(userId);
      renderMatches(userId);
    }

    function renderExchangeStatus(userId){
      const host = $("#exchangeStatus");
      if(!host) return;
      const d = db();
      const pending = d.exchanges.selections
        .filter(s=> s.userId===userId)
        .slice(-4)
        .reverse();

      host.innerHTML = pending.length ? `
        <div class="feature">
          <b>Your latest exchange selections</b>
          <div class="muted" style="margin-top:8px; display:grid; gap:6px">
            ${pending.map(s=>{
              const offer = courseById(s.offerCourseId);
              const target = userById(s.targetUserId);
              const want = courseById(s.targetCourseId);
              return `<div>→ Offer <b style="color:var(--text)">${escapeHTML(offer.title)}</b> to <b style="color:var(--text)">${escapeHTML(target.username)}</b> for <b style="color:var(--text)">${escapeHTML(want.title)}</b></div>`;
            }).join("")}
          </div>
        </div>
      ` : `<div class="muted">No exchange selections yet.</div>`;
    }

    function renderMatches(userId){
      const host = $("#matchList");
      if(!host) return;
      const d = db();
      const matches = d.exchanges.matches
        .filter(m=> m.userA===userId || m.userB===userId)
        .slice(-6)
        .reverse();

      host.innerHTML = matches.length ? `
        <table class="table">
          <tr><th>Time</th><th>Exchange</th><th>Coin diff</th></tr>
          ${matches.map(m=>{
            const a = userById(m.userA);
            const b = userById(m.userB);
            const ca = courseById(m.courseA);
            const cb = courseById(m.courseB);
            return `<tr>
              <td>${new Date(m.createdAt).toLocaleString()}</td>
              <td><b style="color:var(--text)">${escapeHTML(a.username)}</b>: ${escapeHTML(ca.title)} ↔ <b style="color:var(--text)">${escapeHTML(b.username)}</b>: ${escapeHTML(cb.title)}</td>
              <td>${m.coinTransfer ? m.coinTransfer : "0"}</td>
            </tr>`;
          }).join("")}
        </table>
      ` : `<div class="muted">No matches yet. Try selecting with another user (e.g., log in as hybrid1 in another browser).</div>`;
    }

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function initProfilePage(){
    const host = $("#profileWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    const limits = planLimits(u.plan);
    const d = db();

    const myEnroll = d.enrollments.filter(e=>e.userId===u.id).map(e=>{
      const c = courseById(e.courseId);
      return { ...e, course: c };
    }).reverse();

    const myLive = d.liveRequests.filter(r=>r.userId===u.id).reverse();

    host.innerHTML = `
      <div class="split">
        <div class="card"><div class="pad">
          <div class="row" style="justify-content:space-between; align-items:flex-start">
            <div>
              <div class="h2">Your profile</div>
              <div class="muted">Update your name + bio (saved in your browser).</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <span class="badge ${u.userType}">${badgeLabel(u.userType)}</span>
              <span class="tag accent">${u.plan.toUpperCase()}</span>
            </div>
          </div>

          <hr class="sep" />

          <form class="form" id="profileForm">
            <div>
              <label>Username</label>
              <input class="input" value="${escapeHTML(u.username)}" disabled />
            </div>
            <div>
              <label>Full name</label>
              <input class="input" id="fullName" value="${escapeHTML(u.fullName||"")}" />
            </div>
            <div>
              <label>Bio</label>
              <textarea class="input" id="bio">${escapeHTML(u.bio||"")}</textarea>
            </div>
            <button class="btn primary" type="submit">Save profile</button>
          </form>

          <div class="spacer"></div>
          <div class="feature">
            <b>Plan limits</b>
            <div class="muted">Groups: <b style="color:var(--text)">${limits.maxGroups}</b> · Courses: <b style="color:var(--text)">${limits.maxCourses}</b></div>
          </div>
        </div></div>

        <div class="card"><div class="pad">
          <div class="h2">Your learning</div>
          <div class="muted">Courses you bought (video adds you to a private group automatically).</div>
          <hr class="sep" />
          ${myEnroll.length ? `
            <table class="table">
              <tr><th>Course</th><th>Delivery</th><th>Time</th></tr>
              ${myEnroll.slice(0,10).map(e=>`
                <tr>
                  <td><b style="color:var(--text)">${escapeHTML(e.course.title)}</b><div class="muted">${escapeHTML(e.course.category.toUpperCase())}</div></td>
                  <td>${e.delivery.toUpperCase()}</td>
                  <td>${new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              `).join("")}
            </table>
          ` : `<div class="muted">No enrollments yet. Go to Skills to buy a course.</div>`}

          <div class="spacer"></div>
          <div class="h2">Live session requests</div>
          <div class="muted">When you buy a live class, you’ll discuss scheduling with the teacher.</div>
          <hr class="sep" />
          ${myLive.length ? `
            <table class="table">
              <tr><th>Course</th><th>Status</th><th>Message</th></tr>
              ${myLive.slice(0,6).map(r=>{
                const c = courseById(r.courseId);
                return `<tr>
                  <td><b style="color:var(--text)">${escapeHTML(c.title)}</b></td>
                  <td>${escapeHTML(r.status)}</td>
                  <td>${escapeHTML(r.message)}</td>
                </tr>`;
              }).join("")}
            </table>
          ` : `<div class="muted">No live requests yet.</div>`}
        </div></div>
      </div>
    `;

    $("#profileForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const d = db();
      const me = d.users.find(x=>x.id===u.id);
      me.fullName = $("#fullName").value.trim() || me.fullName;
      me.bio = $("#bio").value.trim();
      saveDB(d);
      toast("Profile saved.");
      renderHeader();
    });

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function initGroupsPage(){
    const host = $("#groupsWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    const d = db();
    const myVideoEnrollments = d.enrollments
      .filter(e=> e.userId===u.id)
      .map(e=>{
        const c = d.courses.find(x=>x.id===e.courseId);
        return { ...e, course: c };
      })
      .filter(e=> e.course && e.course.delivery==="video" && e.course.groupId);

    const groupIds = [...new Set(myVideoEnrollments.map(e=> e.course.groupId))];
    const groups = d.groups.filter(g=> groupIds.includes(g.id));

    host.innerHTML = `
      <div class="card"><div class="pad">
        <div class="row" style="justify-content:space-between; align-items:flex-end">
          <div>
            <div class="h2">My Learning Groups</div>
            <div class="muted">When you buy a <b style="color:var(--text)">Video</b> course, you are automatically added to its private group (demo).</div>
          </div>
          <a class="btn" href="skills.html">Buy more courses</a>
        </div>

        <hr class="sep" />

        ${groups.length ? `
          <div style="display:grid; gap:14px">
            ${groups.map(g=>{
              const course = d.courses.find(c=>c.id===g.courseId);
              return `
                <div class="feature">
                  <div class="row" style="justify-content:space-between; align-items:flex-start">
                    <div>
                      <b>${escapeHTML(g.name)}</b>
                      <div class="muted" style="font-size:13px">Course: ${course ? escapeHTML(course.title) : "—"} · Group #${g.id}</div>
                    </div>
                    <span class="tag accent">PRIVATE</span>
                  </div>

                  <div class="spacer"></div>

                  <table class="table">
                    <tr><th>Video</th><th></th></tr>
                    ${g.videos.map(v=>`
                      <tr>
                        <td>${escapeHTML(v)}</td>
                        <td style="text-align:right">
                          <a class="btn small primary" href="video.html?group=${g.id}&v=${encodeURIComponent(v)}">Watch</a>
                        </td>
                      </tr>
                    `).join("")}
                  </table>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="muted">No video groups yet. Buy a video course in Skills to be added automatically.</div>
        `}
      </div></div>

      ${(u.userType!=="student") ? `
        <div class="spacer"></div>
        <div class="card"><div class="pad">
          <div class="h2">Teacher group management</div>
          <div class="muted">If you're a Teacher or Teacher & Student, manage groups and add videos in <b style="color:var(--text)">Teach → Teacher Dashboard</b>.</div>
          <div class="spacer"></div>
          <a class="btn primary" href="dashboard.html">Open Teacher Dashboard</a>
        </div></div>
      ` : ``}
    `;

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function initVideoPage(){
    const host = $("#videoWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    const params = new URLSearchParams(window.location.search);
    const groupId = Number(params.get("group")||"0");
    const videoName = params.get("v") || "";

    const d = db();
    const group = d.groups.find(g=>g.id===groupId);
    if(!group){
      host.innerHTML = `<div class="notice">Group not found.</div>`;
      return;
    }

    const ok = d.enrollments.some(e=>{
      if(e.userId!==u.id) return false;
      const c = d.courses.find(x=>x.id===e.courseId);
      return c && c.groupId===groupId && c.delivery==="video";
    });
    if(!ok){
      host.innerHTML = `<div class="notice">You are not enrolled in this group.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="card"><div class="pad">
        <div class="row" style="justify-content:space-between; align-items:flex-end">
          <div>
            <div class="h2">Watching</div>
            <div class="muted">Group: <b style="color:var(--text)">${escapeHTML(group.name)}</b> · Video: <b style="color:var(--text)">${escapeHTML(videoName)}</b></div>
          </div>
          <a class="btn" href="groups.html">Back to Groups</a>
        </div>

        <hr class="sep" />

        <div class="feature">
          <b>Demo video player</b>
          <div class="muted">This prototype stores filenames only. In a real system, this would stream the uploaded video file.</div>
          <div class="spacer"></div>
          <div class="card" style="border-radius:16px; background:rgba(0,0,0,.25); border:1px solid rgba(31,43,58,.9)">
            <div class="pad">
              <div style="height:260px; display:flex; align-items:center; justify-content:center; border-radius:14px; border:1px dashed rgba(255,176,32,.35); color:var(--accent2); font-weight:800">
                ▶ Video placeholder
              </div>
              <div class="muted" style="margin-top:10px">File: ${escapeHTML(videoName)}</div>
            </div>
          </div>
        </div>
      </div></div>
    `;

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function initChatPage(){
    const host = $("#chatWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    const d = db();
    const others = d.users.filter(x=>x.id!==u.id);

    host.innerHTML = `
      <div class="chat-wrap">
        <div class="card"><div class="chat-list">
          <div class="h2">Contacts</div>
          <div class="muted" style="font-size:13px;margin-bottom:10px">Chat works only when signed in.</div>
          <div id="contactList">
            ${others.map(o=>`
              <div class="chat-item" data-user="${o.id}">
                <b style="color:var(--text)">${escapeHTML(o.fullName || o.username)}</b>
                <div class="muted" style="font-size:12px">${escapeHTML(o.username)} · ${badgeLabel(o.userType)}</div>
              </div>
            `).join("")}
          </div>
        </div></div>

        <div class="card">
          <div class="chat-box">
            <div class="pad" style="border-bottom:1px solid rgba(31,43,58,.85)">
              <div class="h2" id="chatTitle">Select a contact</div>
              <div class="muted" id="chatSub">Messages are saved locally in your browser.</div>
            </div>
            <div class="chat-messages" id="chatMessages">
              <div class="muted">Choose a contact on the left.</div>
            </div>
            <div class="chat-input">
              <input class="input" id="chatText" placeholder="Type a message…" />
              <button class="btn primary" id="sendBtn">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let activeId = null;

    $$("#contactList .chat-item").forEach(item=>{
      item.addEventListener("click", ()=>{
        $$("#contactList .chat-item").forEach(i=> i.classList.remove("active"));
        item.classList.add("active");
        activeId = Number(item.dataset.user);
        const other = userById(activeId);
        $("#chatTitle").textContent = other ? (other.fullName || other.username) : "Chat";
        $("#chatSub").textContent = other ? `${other.username} · ${badgeLabel(other.userType)}` : "";
        renderMessages();
      });
    });

    $("#sendBtn").addEventListener("click", send);
    $("#chatText").addEventListener("keydown", (e)=>{ if(e.key==="Enter") send(); });

    function renderMessages(){
      const d = db();
      const msgs = d.chats.messages
        .filter(m => (m.from===u.id && m.to===activeId) || (m.from===activeId && m.to===u.id))
        .sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));

      const host = $("#chatMessages");
      if(!activeId){ host.innerHTML = `<div class="muted">Choose a contact on the left.</div>`; return; }

      host.innerHTML = msgs.length ? msgs.map(m=>`
        <div class="bubble ${m.from===u.id ? "mine" : ""}">
          ${escapeHTML(m.text)}
          <div class="muted" style="font-size:11px;margin-top:4px">${new Date(m.createdAt).toLocaleString()}</div>
        </div>
      `).join("") : `<div class="muted">No messages yet. Say hi 👋</div>`;

      host.scrollTop = host.scrollHeight;
    }

    function send(){
      const text = $("#chatText").value.trim();
      if(!activeId){ toast("Select a contact first."); return; }
      if(!text) return;

      const d = db();
      d.chats.messages.push({ id:uid("msg"), from:u.id, to:activeId, text, createdAt: nowISO() });
      saveDB(d);
      $("#chatText").value = "";
      renderMessages();
    }

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function initDashboardPage(){
    const host = $("#dashboardWrap");
    if(!host) return;
    const u = requireAuth();
    if(!u) return;

    if(u.userType==="student"){
      host.innerHTML = `<div class="notice">Teaching tools are for Teacher or Teacher & Student users only.</div>`;
      return;
    }

    const d = db();
    const limits = planLimits(u.plan);

    host.innerHTML = `
      <div class="split">
        <div class="card"><div class="pad">
          <div class="row" style="justify-content:space-between; align-items:flex-start">
            <div>
              <div class="h2">Teacher Dashboard</div>
              <div class="muted">Create courses & video groups (prototype rules). For Teacher&Student, you can also create Exchange courses.</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <span class="badge ${u.userType}">${badgeLabel(u.userType)}</span>
              <span class="tag accent">${u.plan.toUpperCase()}</span>
            </div>
          </div>

          <hr class="sep" />

          <div class="feature">
            <b>Limits (your plan)</b>
            <div class="muted" id="limitLine"></div>
          </div>

          <div class="spacer"></div>

          <form class="form" id="createCourseForm">
            <div class="form-row">
              <div>
                <label>Course title</label>
                <input class="input" id="cTitle" placeholder="e.g., Java OOP Mastery" required />
              </div>
              <div>
                <label>Category</label>
                <select id="cCategory">
                  <option value="learn">Learn</option>
                  ${u.userType==="teacher_student" ? `<option value="exchange">Exchange</option>` : ``}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div>
                <label>Delivery</label>
                <select id="cDelivery">
                  <option value="video">Video</option>
                  <option value="live">Live session</option>
                </select>
              </div>
              <div>
                <label>Price (coins)</label>
                <input class="input" id="cPrice" type="number" min="1" value="20" required />
              </div>
            </div>

            <div>
              <label>Description</label>
              <textarea class="input" id="cDesc" placeholder="What will students learn?" required></textarea>
            </div>

            <button class="btn primary" type="submit">Create course</button>
          </form>
        </div></div>

        <div class="card"><div class="pad">
          <div class="h2">Your courses</div>
          <div class="muted">If you create a Video course, you can also create a private group for it.</div>
          <hr class="sep" />
          <div id="myCoursesList"></div>

          <div class="spacer"></div>
          <div class="h2">Your private groups</div>
          <div class="muted">Add videos manually by filename (demo).</div>
          <hr class="sep" />
          <div id="myGroupsList"></div>
        </div></div>
      </div>
    `;

    renderLists();

    $("#createCourseForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const d = db();
      const me = d.users.find(x=>x.id===u.id);

      const myCourses = d.courses.filter(c=>c.teacherId===me.id);
      if(myCourses.length >= limits.maxCourses){
        toast("Course limit reached. Upgrade to Creator.");
        return;
      }

      const title = $("#cTitle").value.trim();
      const category = $("#cCategory").value;
      const delivery = $("#cDelivery").value;
      const price = Number($("#cPrice").value);
      const desc = $("#cDesc").value.trim();

      const newId = Math.floor(1000 + Math.random()*9000);
      const course = {
        id: newId,
        title,
        description: desc,
        category,
        delivery,
        level: "Intermediate",
        price,
        teacherId: me.id,
        groupId: null
      };
      d.courses.push(course);

      // If video, optionally create a group automatically (if you still have group capacity)
      if(delivery==="video"){
        const myGroups = d.groups.filter(g=>g.teacherId===me.id);
        if(myGroups.length < limits.maxGroups){
          const gid = Math.floor(5000 + Math.random()*4000);
          d.groups.push({
            id: gid,
            courseId: newId,
            teacherId: me.id,
            name: `${title} – Video Group`,
            videos:["welcome.mp4","lesson1.mp4"],
            createdAt: nowISO()
          });
          course.groupId = gid;
        }
      }

      saveDB(d);
      toast("Course created.");
      renderLists();
    });

    host.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-action]");
      if(!btn) return;

      const action = btn.dataset.action;
      const id = Number(btn.dataset.id);
      if(action==="createGroup") createGroupForCourse(id);
      if(action==="addVideo") addVideoToGroup(id);
    });

    function renderLists(){
      const d = db();
      const myCourses = d.courses.filter(c=>c.teacherId===u.id);
      const myGroups = d.groups.filter(g=>g.teacherId===u.id);

      $("#limitLine").innerHTML = `Courses: <b style="color:var(--text)">${myCourses.length}</b> / ${limits.maxCourses}
          · Groups: <b style="color:var(--text)">${myGroups.length}</b> / ${limits.maxGroups}`;

      $("#myCoursesList").innerHTML = myCourses.length ? `
        <table class="table">
          <tr><th>Title</th><th>Category</th><th>Delivery</th><th>Price</th><th>Group</th><th></th></tr>
          ${myCourses.map(c=>{
            const hasGroup = !!c.groupId;
            return `<tr>
              <td><b style="color:var(--text)">${escapeHTML(c.title)}</b><div class="muted">${escapeHTML(c.description).slice(0,46)}${c.description.length>46?"…":""}</div></td>
              <td>${c.category.toUpperCase()}</td>
              <td>${c.delivery.toUpperCase()}</td>
              <td>🪙 ${c.price}</td>
              <td>${hasGroup ? `#${c.groupId}` : "—"}</td>
              <td>
                ${(!hasGroup && c.delivery==="video") ? `<button class="btn small" data-action="createGroup" data-id="${c.id}">Create group</button>` : ``}
              </td>
            </tr>`;
          }).join("")}
        </table>
      ` : `<div class="muted">No courses yet. Create one on the left.</div>`;

      $("#myGroupsList").innerHTML = myGroups.length ? `
        <table class="table">
          <tr><th>Group</th><th>Course</th><th>Videos</th><th></th></tr>
          ${myGroups.map(g=>{
            const course = d.courses.find(c=>c.id===g.courseId);
            return `<tr>
              <td><b style="color:var(--text)">${escapeHTML(g.name)}</b><div class="muted">#${g.id}</div></td>
              <td>${course ? escapeHTML(course.title) : "—"}</td>
              <td>${g.videos.length}</td>
              <td><button class="btn small" data-action="addVideo" data-id="${g.id}">Add video</button></td>
            </tr>`;
          }).join("")}
        </table>
      ` : `<div class="muted">No groups yet.</div>`;
    }

    function createGroupForCourse(courseId){
      const d = db();
      const myGroups = d.groups.filter(g=>g.teacherId===u.id);
      if(myGroups.length >= limits.maxGroups){
        toast("Group limit reached. Upgrade to Creator.");
        return;
      }
      const course = d.courses.find(c=>c.id===courseId);
      if(!course) return;

      const gid = Math.floor(5000 + Math.random()*4000);
      d.groups.push({
        id: gid,
        courseId: courseId,
        teacherId: u.id,
        name: `${course.title} – Video Group`,
        videos:["welcome.mp4"],
        createdAt: nowISO()
      });
      course.groupId = gid;
      saveDB(d);
      toast("Group created.");
      renderLists();
    }

    function addVideoToGroup(groupId){
      const d = db();
      const g = d.groups.find(x=>x.id===groupId);
      if(!g) return;
      const name = prompt("Enter video filename (e.g., lesson4.mp4):", `lesson${g.videos.length+1}.mp4`);
      if(!name) return;
      g.videos.push(name);
      saveDB(d);
      toast("Video added.");
      renderLists();
    }

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
  }

  function init(){
    seed();
    renderHeader();
    renderFooter();
    protectPage();

    initLoginPage();
    initUpgradePage();
    initTransactionPage();
    initSkillsPage();
    initProfilePage();
    initGroupsPage();
    initVideoPage();
    initChatPage();
    initDashboardPage();
  }

  window.Xchange = { db, saveDB, currentUser, requireAuth, toast };

  document.addEventListener("DOMContentLoaded", init);
})();
