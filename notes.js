"use strict";
(() => {
  const key = "pnp-notes-v1";
  const get = id => document.getElementById(id);
  let editing = null;
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  };
  function read() {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const notes = JSON.parse(raw);
    if (!Array.isArray(notes)) throw new Error("Saved notes could not be read.");
    return notes;
  }
  function persist(notes) {
    localStorage.setItem(key, JSON.stringify(notes));
  }
  function status(message) { get("notes-status").textContent = message; }
  function reset() {
    editing = null;
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
      const notes = read().filter(n => `${n.date} ${n.title} ${n.body}`.toLowerCase().includes(query))
        .sort((a,b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created));
      if (!notes.length) {
        const empty = document.createElement("p");
        empty.className = "note";
        empty.textContent = query ? "No matching notes." : "No notes yet. Save your first observation above.";
        list.append(empty);
      }
      for (const note of notes) {
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
        const controls = document.createElement("div");
        controls.className = "controls";
        const edit = document.createElement("button");
        edit.className = "secondary";
        edit.textContent = "Edit";
        edit.onclick = () => {
          editing = note.id;
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
        remove.onclick = () => {
          if (!confirm(`Delete the note “${note.title}”?`)) return;
          try {
            persist(read().filter(n => n.id !== note.id));
            if (editing === note.id) reset();
            status("Note deleted");
            render();
          } catch { status("Could not delete the note. Browser storage may be unavailable."); }
        };
        controls.append(edit, remove);
        card.append(date, title, body, controls);
        list.append(card);
      }
    } catch { status("Could not read saved notes. Existing data has not been overwritten."); }
  }
  get("notes-form").onsubmit = event => {
    event.preventDefault();
    const date = get("note-date").value;
    const title = get("note-title").value.trim();
    const body = get("note-body").value.trim();
    if (!date || !title || !body) return status("Enter a date, title, and note.");
    try {
      const notes = read();
      const now = new Date().toISOString();
      if (editing) {
        const index = notes.findIndex(n => n.id === editing);
        if (index < 0) return status("This note no longer exists. Cancel editing to start a new note.");
        notes[index] = {...notes[index],date,title,body,updated:now};
      } else {
        notes.push({id:crypto.randomUUID(),date,title,body,created:now,updated:now});
      }
      persist(notes);
      reset();
      status("Note saved on this device");
      render();
    } catch { status("Could not save. Your text is still here; browser storage may be full or unavailable."); }
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
  window.addEventListener("storage", event => { if (event.key === key) render(); });
  reset();
  render();
})();
