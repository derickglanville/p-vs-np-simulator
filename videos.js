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
  const knownDurations = {pQsdygaYcE4:"19:43",EHp4FPyajKQ:"15:32",OY41QYPI8cw:"10:09"};
  function validDuration(value) {
    return /^(?:\d{1,3}:)?[0-5]?\d:[0-5]\d$/.test(String(value || ""));
  }
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
    const duration = validDuration(video.duration) ? video.duration : knownDurations[video.id];
    get("video-selected-channel").textContent = `${video.channel || "YouTube"} · Length: ${duration || "not set"}`;
    const durationBadge = document.createElement("span");
    durationBadge.textContent = duration || "Length not set";
    durationBadge.style.cssText = "position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.85);color:white;padding:2px 7px;border-radius:4px;font-size:14px;font-weight:700";
    const priorBadge = get("video-duration-badge");
    if (priorBadge && priorBadge.remove) priorBadge.remove();
    durationBadge.id = "video-duration-badge";
    get("video-thumbnail-link").append(durationBadge);
    const setDuration = document.createElement("button");
    setDuration.type = "button"; setDuration.className = "text-button";
    setDuration.style.cssText = "font-size:12px;margin-left:8px";
    setDuration.textContent = "Set length";
    setDuration.onclick = async () => {
      if (!signedIn) return status("Sign in to save the video length across devices.");
      const value = prompt("Video length (m:ss or h:mm:ss)",duration || "");
      if (value === null) return;
      if (!validDuration(value.trim())) return status("Enter a length such as 19:43 or 1:05:30.");
      setDuration.disabled = true; status("Saving video length to Firebase…");
      try {
        const records = await cloud.list();
        const previous = records.find(n => n.id === `video_${video.id}`);
        const now = new Date().toISOString();
        await cloud.save({...(previous || {}),id:`video_${video.id}`,date:previous?.date || now.slice(0,10),title:video.title,
          body:JSON.stringify({url:`https://www.youtube.com/watch?v=${video.id}`,channel:video.channel,duration:value.trim()}),created:previous?.created || now,updated:now});
        video.duration = value.trim(); render(); status("Video length saved to Firebase.");
      } catch (error) { status(error.message); }
      finally { setDuration.disabled = false; }
    };
    get("video-selected-channel").append(setDuration);
    get("video-watch").href = `https://www.youtube.com/watch?v=${video.id}`;
    get("video-thumbnail-link").href = get("video-watch").href;
    get("video-thumbnail-link").setAttribute("aria-label",`Watch ${video.title} on YouTube`);
    const thumbnail = get("video-thumbnail");
    thumbnail.hidden = false;
    thumbnail.alt = `Video thumbnail: ${video.title}`;
    thumbnail.onerror = () => {
      thumbnail.onerror = () => { thumbnail.hidden = true; };
      thumbnail.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    };
    thumbnail.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
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
          merged.set(parsed.id,{id:parsed.id,title:note.title,channel:String(bookmark.channel || ""),duration:validDuration(bookmark.duration) ? bookmark.duration : ""});
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
