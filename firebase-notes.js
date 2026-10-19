"use strict";
window.ResearchNotesCloud = (() => {
  // Public Firebase web configuration, matching the Food Tracker project.
  const config = {
    apiKey: "AIzaSyC1s8rJbIlukPwvlDi8KnlAHyFjYiqFd14",
    authDomain: "glanville-issue-tracker.firebaseapp.com",
    projectId: "glanville-issue-tracker"
  };
  const allowedEmail = "dglanville@gmail.com";
  const root = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/pnp_research_notes`;
  function auth() {
    if (!window.firebase) throw Error("Google sign-in could not load. Check your connection and reload.");
    if (!firebase.apps.length) firebase.initializeApp(config);
    return firebase.auth();
  }
  function authorized(user) {
    return !!user && user.emailVerified && (user.email || "").toLowerCase() === allowedEmail;
  }
  function watch(callback) {
    return auth().onAuthStateChanged(user => callback(authorized(user) ? user : null));
  }
  async function signIn() {
    const result = await auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    if (!authorized(result.user)) {
      await auth().signOut();
      throw Error(`Sign in with ${allowedEmail} to access research notes.`);
    }
  }
  async function request(method, path = "", params = {}, body) {
    const user = auth().currentUser;
    if (!authorized(user)) throw Error(`Sign in with ${allowedEmail} first.`);
    const url = new URL(root + path);
    Object.entries(params).forEach(([key,value]) => url.searchParams.set(key,value));
    async function send(refresh) {
      const token = await user.getIdToken(refresh);
      return fetch(url, {method, headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        ...(body ? {body:JSON.stringify(body)} : {})});
    }
    let response;
    try { response = await send(false); if (response.status === 401) response = await send(true); }
    catch { throw Error("Firebase could not be reached. Your change has not been confirmed; your text is still here."); }
    if (!response.ok) {
      const error = Error(response.status === 403
        ? "Firestore access is denied. The pnp_research_notes collection needs the private access rule in FIREBASE_SETUP.md."
        : [409,412,404].includes(response.status)
          ? "This note changed on another device or no longer exists. Refresh notes before trying again; your text has been kept."
          : `Firebase returned ${response.status}. Your change has not been confirmed.`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  function decode(doc) {
    const note = {id:doc.name.split("/").pop(),version:doc.updateTime};
    Object.entries(doc.fields || {}).forEach(([key,value]) => { note[key] = value.stringValue; });
    return note;
  }
  function fields(note) {
    return Object.fromEntries(["date","title","body","created","updated"].map(key => [key,{stringValue:note[key]}]));
  }
  async function list() {
    const notes = [];
    let pageToken = "";
    do {
      const page = await request("GET","",{pageSize:"300",...(pageToken ? {pageToken} : {})});
      notes.push(...(page.documents || []).map(decode));
      pageToken = page.nextPageToken || "";
    } while (pageToken);
    return notes;
  }
  async function save(note) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(note.id)) throw Error("Invalid note identifier.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(note.date) || !note.title?.trim() || note.title.length > 200 || !note.body?.trim() || note.body.length > 20000) throw Error("Enter a date, title (up to 200 characters), and note (up to 20,000 characters).");
    const params = note.version ? {"currentDocument.updateTime":note.version} : {"currentDocument.exists":"false"};
    return decode(await request("PATCH",`/${note.id}`,params,{fields:fields(note)}));
  }
  async function remove(note) {
    await request("DELETE",`/${encodeURIComponent(note.id)}`,{"currentDocument.updateTime":note.version});
  }
  return {watch,signIn,signOut:() => auth().signOut(),list,save,remove};
})();
