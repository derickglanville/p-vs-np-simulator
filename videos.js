"use strict";
(() => {
  const get = id => document.getElementById(id);
  const cloud = window.ResearchNotesCloud;
  const defaults = [
    {id:"pQsdygaYcE4",title:"Biggest Puzzle in Computer Science: P vs. NP",channel:"Quanta Magazine"},
    {id:"EHp4FPyajKQ",title:"P vs. NP — The Biggest Unsolved Problem in Computer Science",channel:"Up and Atom"},
    {id:"OY41QYPI8cw",title:"P vs. NP — An Introduction",channel:""}
  ];
  let videos = [...defaults], selected = defaults[0].id, signedIn = false, loading = false;
  function parseURL(value) {
    let url;
    try { url = new URL(value); } catch { throw Error("Enter a valid YouTube URL."); }
    if (!["https:","http:"].includes(url.protocol)) throw Error("Enter a YouTube web URL.");
    const host = url.hostname.toLowerCase();
    let id;
    if (["youtu.be","www.youtu.be"].includes(host)) id = url.pathname.split("/")[1];
    else if (["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(shorts|embed|live)\//.test(url.pathname) ? url.pathname.split("/")[2] : null;
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) throw Error("Use a YouTube video link, not a channel or playlist link.");
    return {id,url:`https://www.youtube.com/watch?v=${id}`};
  }
  function status(text) { get("video-status").textContent = text; }
  function render() {
    const query = get("video-search").value.trim().toLowerCase();
    const filtered = videos.filter(v => `${v.title} ${v.channel} ${v.id}`.toLowerCase().includes(query));
    const list = get("video-list"); list.replaceChildren();
    get("video-count").textContent = `${filtered.length} of ${videos.length} videos`;
    for (const video of filtered) {
      const button = document.createElement("button"); button.type = "button"; button.className = "video-row";
      button.setAttribute("aria-pressed",String(video.id === selected));
      const number = document.createElement("span"); number.className = "video-number"; number.textContent = String(videos.indexOf(video)+1).padStart(2,"0");
      const text = document.createElement("span"), title = document.createElement("strong"), channel = document.createElement("small");
      title.textContent = video.title; channel.textContent = video.channel || "YouTube";
      text.append(title,channel); button.append(number,text);
      button.onclick = () => { selected = video.id; render(); };
      list.append(button);
    }
    if (!filtered.length) { const empty = document.createElement("p"); empty.textContent = "No matching videos."; list.append(empty); }
    const video = videos.find(v => v.id === selected) || videos[0];
    get("video-selected-title").textContent = video.title;
    get("video-selected-channel").textContent = video.channel || "YouTube";
    get("video-watch").href = `https://www.youtube.com/watch?v=${video.id}`;
    get("video-selected-url").textContent = `youtube.com/watch?v=${video.id}`;
    get("video-login").hidden = signedIn;
  }
  async function refresh() {
    if (!signedIn || loading) return;
    loading = true;
    status("Loading shared video library…");
    try {
      const records = await cloud.list();
      const merged = new Map(defaults.map(v => [v.id,v]));
      for (const note of records.filter(n => n.id.startsWith("video_"))) {
        try {
          const bookmark = JSON.parse(note.body), parsed = parseURL(bookmark.url);
          merged.set(parsed.id,{id:parsed.id,title:note.title,channel:String(bookmark.channel || "")});
        } catch { /* Invalid bookmarks do not prevent loading the library. */ }
      }
      if (!signedIn) return;
      videos = [...merged.values()]; render(); status("Shared library up to date.");
    } catch (error) { status(error.message); }
    finally { loading = false; }
  }
  async function metadata(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),4000);
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,{signal:controller.signal});
      if (!response.ok) return {};
      return await response.json();
    } catch { return {}; }
    finally { clearTimeout(timer); }
  }
  get("video-form").onsubmit = async event => {
    event.preventDefault();
    if (!signedIn) return status("Sign in with Google to save videos across your devices.");
    let parsed;
    try { parsed = parseURL(get("video-url").value.trim()); } catch (error) { return status(error.message); }
    if (videos.some(v => v.id === parsed.id)) { selected = parsed.id; render(); return status("That video is already in the library and has been selected."); }
    const button = get("video-add"); button.disabled = true; button.textContent = "Adding…";
    status("Looking up the title and saving to Firebase…");
    try {
      const info = await metadata(parsed.url);
      const title = (get("video-title").value.trim() || info.title || `YouTube video ${parsed.id}`).slice(0,200);
      const channel = String(info.author_name || "");
      const now = new Date(), iso = now.toISOString();
      const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      await cloud.save({id:`video_${parsed.id}`,date,title,body:JSON.stringify({url:parsed.url,channel}),created:iso,updated:iso});
      if (!signedIn) return;
      videos.push({id:parsed.id,title,channel}); selected = parsed.id; render();
      get("video-form").reset(); status("Video saved to Firebase and added to the shared library.");
    } catch (error) { status(error.message); }
    finally { button.disabled = false; button.textContent = "Add video"; }
  };
  get("video-search").oninput = render;
  get("video-refresh").onclick = () => signedIn ? refresh() : status("Sign in with Google to refresh saved videos.");
  get("video-login").onclick = () => cloud.signIn().catch(error => status(error.message));
  document.addEventListener("visibilitychange",() => { if (!document.hidden && location.hash === "#video") refresh(); });
  render();
  try { cloud.watch(user => { signedIn = !!user; videos = [...defaults]; render(); if(signedIn) refresh(); else status("Three starter videos are available. Sign in to add and sync your own links."); }); }
  catch (error) { status(error.message); }
})();
