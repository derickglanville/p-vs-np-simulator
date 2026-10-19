"use strict";
(() => {
  const key = "pnp-notes-v1";
  const get = id => document.getElementById(id);
  let editing = null;
  let editingVersion = null;
  let notes = [];
  let signedIn = false;
  let ready = false;
  let busy = false;
  const cloud = window.ResearchNotesCloud;
  function controls() {
    get("note-save").disabled = !ready || busy;
    get("notes-refresh").disabled = !signedIn || busy;
    get("notes-signin").hidden = signedIn;
    get("notes-signout").hidden = !signedIn;
    get("notes-migrate").disabled = !ready || busy;
    get("notes-list").querySelectorAll("button").forEach(button => { button.disabled = !ready || busy; });
  }
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  };
  function localNotes() {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const notes = JSON.parse(raw);
    if (!Array.isArray(notes)) throw new Error("Saved notes could not be read.");
    return notes;
  }
  function read() { return notes; }
  function status(message) { get("notes-status").textContent = message; }
  function reset() {
    editing = null;
    editingVersion = null;
    get("notes-form").reset();
    get("note-date").value = today();
    get("note-save").textContent = "Save note";
    get("note-cancel").hidden = true;
  }
  function render() {
    const list = get("notes-list");
    list.replaceChildren();
    try {
      const query = get("notes-search").value.trim().toLowerCase();
      const visibleNotes = read().filter(n => `${n.date} ${n.title} ${n.body}`.toLowerCase().includes(query))
        .sort((a,b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created));
      if (!visibleNotes.length) {
        const empty = document.createElement("p");
        empty.className = "note";
        empty.textContent = !signedIn ? "Sign in to see your shared research notes." : !ready ? "Cloud notes are not loaded yet." : query ? "No matching notes." : "No notes yet. Save your first observation above.";
        list.append(empty);
      }
      for (const note of visibleNotes) {
        const card = document.createElement("article");
        card.className = "panel";
        const date = document.createElement("time");
        date.dateTime = note.date;
        date.className = "eyebrow";
        date.textContent = new Date(`${note.date}T12:00:00`).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
        const title = document.createElement("h2");
        title.textContent = note.title;
        const body = document.createElement("p");
        body.textContent = note.body;
        body.style.whiteSpace = "pre-wrap";
        body.style.overflowWrap = "anywhere";
        const actions = document.createElement("div");
        actions.className = "controls";
        const edit = document.createElement("button");
        edit.className = "secondary";
        edit.textContent = "Edit";
        edit.onclick = () => {
          editing = note.id;
          editingVersion = note.version;
          get("note-date").value = note.date;
          get("note-title").value = note.title;
          get("note-body").value = note.body;
          get("note-save").textContent = "Update note";
          get("note-cancel").hidden = false;
          status("Editing saved note");
          get("notes-form").scrollIntoView({behavior:"smooth",block:"center"});
          get("note-title").focus({preventScroll:true});
        };
        const remove = document.createElement("button");
        remove.className = "danger";
        remove.textContent = "Delete";
        remove.onclick = async () => {
          if (!confirm(`Delete the note “${note.title}”?`)) return;
          busy = true; controls();
          try {
            await cloud.remove(note);
            notes = notes.filter(n => n.id !== note.id);
            if (editing === note.id) reset();
            status("Note deleted");
            render();
          } catch (error) { status(error.message); }
          finally { busy = false; controls(); }
        };
        actions.append(edit, remove);
        card.append(date, title, body, actions);
        list.append(card);
      }
    } catch { status("Could not read saved notes. Existing data has not been overwritten."); }
    controls();
  }
  get("notes-form").onsubmit = async event => {
    event.preventDefault();
    const date = get("note-date").value;
    const title = get("note-title").value.trim();
    const body = get("note-body").value.trim();
    if (!date || !title || !body) return status("Enter a date, title, and note.");
    if (!ready || busy) return status("Sign in and load cloud notes before saving.");
    busy = true; controls();
    status("Saving to Firebase… Please wait for confirmation.");
    get("note-save").textContent = "Saving…";
    try {
      const now = new Date().toISOString();
      let note;
      if (editing) {
        const index = notes.findIndex(n => n.id === editing);
        if (index < 0) return status("This note no longer exists. Cancel editing to start a new note.");
        note = {...notes[index],version:editingVersion,date,title,body,updated:now};
      } else {
        note = {id:crypto.randomUUID(),date,title,body,created:now,updated:now};
      }
      const saved = await cloud.save(note);
      notes = [...notes.filter(n => n.id !== saved.id),saved];
      reset();
      status("Saved to Firebase — available on your other devices");
      render();
    } catch (error) { status(error.message); }
    finally { busy = false; get("note-save").textContent = editing ? "Update note" : "Save note"; controls(); }
  };
  get("note-cancel").onclick = () => { reset(); status(""); };
  get("notes-search").oninput = render;
  get("notes-export").onclick = () => {
    try {
      const notes = read();
      const url = URL.createObjectURL(new Blob([JSON.stringify(notes,null,2)],{type:"application/json"}));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pnp-notes-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch { status("Could not export notes."); }
  };
  async function refresh() {
    if (!signedIn || busy) return;
    busy = true; controls();
    get("notes-cloud-status").textContent = "Loading shared notes from Firebase…";
    try {
      const loaded = await cloud.list();
      if (!signedIn) return;
      notes = loaded; ready = true;
      get("notes-cloud-status").textContent = `Firebase connected · ${notes.length} shared notes · dglanville@gmail.com`;
      render();
    } catch (error) {
      ready = false;
      get("notes-cloud-status").textContent = error.message;
    } finally { busy = false; controls(); }
  }
  get("notes-signin").onclick = async () => {
    try { await cloud.signIn(); }
    catch (error) { get("notes-cloud-status").textContent = error.message; }
  };
  get("notes-signout").onclick = () => cloud.signOut().catch(error => status(error.message));
  get("notes-refresh").onclick = refresh;
  get("notes-migrate").onclick = async () => {
    if (!ready || busy) return;
    busy = true; controls();
    try {
      const local = localNotes();
      for (const note of local) {
        if (notes.some(n => n.id === note.id)) continue;
        const now = new Date().toISOString();
        const saved = await cloud.save({...note,created:note.created || now,updated:note.updated || now});
        notes.push(saved);
      }
      status("Local notes imported to Firebase. The original local copies have been kept as a backup.");
      render();
    } catch (error) { status(`Import stopped: ${error.message} Original local notes are unchanged.`); }
    finally { busy = false; controls(); }
  };
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !editing && !get("note-title").value && !get("note-body").value) refresh(); });
  reset();
  render();
  try {
    get("notes-migrate").hidden = !localNotes().length;
    cloud.watch(user => {
      signedIn = !!user; ready = false; notes = [];
      render();
      if (signedIn) refresh();
      else get("notes-cloud-status").textContent = "Sign in with dglanville@gmail.com to sync notes across devices.";
    });
  } catch (error) { get("notes-cloud-status").textContent = error.message; }
})();
