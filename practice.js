"use strict";
(() => {
  let values = [3,7,11,14,18];
  let target = 25;
  let puzzle = 0;
  const levels = {easy:{size:5,max:25,pick:2,min:2},medium:{size:8,max:50,pick:4,min:3},hard:{size:12,max:99,pick:6,min:5}};
  let solutions = [];
  function prepare() {
    solutions = [];
    const reachable = new Set();
    for (let mask = 0; mask < 2**values.length; mask++) {
      const indices = values.map((_,i) => i).filter(i => mask & (1 << i));
      const sum = indices.reduce((total,i) => total + values[i],0);
      reachable.add(sum);
      if (sum === target) solutions.push(indices);
    }
    get("practice-heading").textContent = `Make a total of ${target}`;
    get("practice-target").textContent = target;
    const level = get("practice-difficulty").value || "medium";
    get("practice-session").textContent = `Puzzle ${puzzle} · ${level[0].toUpperCase()+level.slice(1)} · ${values.length} numbers · at least ${levels[level].min} numbers needed.`;
    get("practice-search-space").textContent = `This puzzle has ${values.length} numbers and ${2**values.length} possible subsets, including choosing none.`;
    const first = solutions[0];
    get("practice-hint").textContent = `One valid solution uses ${first.length} numbers and includes ${values[first[0]]}. After choosing it, look for a combination totaling ${target-values[first[0]]}.`;
    get("practice-answer").textContent = `${solutions.length} solution${solutions.length === 1 ? "" : "s"} in total. ${solutions.length>3?"First three: ":""}${solutions.slice(0,3).map(indices => indices.map(i => values[i]).join(" + ") + " = " + target).join("; ")}. You only need to find one valid subset.`;
    let bonus = target + 1;
    while (reachable.has(bonus)) bonus++;
    get("practice-bonus-heading").textContent = `Bonus challenge: can you make ${bonus} instead?`;
    get("practice-bonus-answer").textContent = `No subset sums to ${bonus}. Checking all ${2**values.length} subsets establishes that for this instance. You can also enter these values and target ${bonus} in the Problem Generator to check with the algorithms.`;
  }
  const chosen = new Set();
  const get = id => document.getElementById(id);
  function render() {
    const row = get("practice-numbers");
    row.replaceChildren();
    values.forEach((value,index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = chosen.has(index) ? "primary" : "secondary";
      button.style.cssText = "min-width:60px;font-size:22px;padding:12px";
      button.textContent = value;
      button.setAttribute("aria-label",`${value}, ${chosen.has(index) ? "selected" : "not selected"}`);
      button.setAttribute("aria-pressed",String(chosen.has(index)));
      button.onclick = () => { if(chosen.has(index)) chosen.delete(index); else chosen.add(index); render(); };
      row.append(button);
    });
    const sum = [...chosen].reduce((total,index) => total + values[index],0);
    get("practice-sum").textContent = sum;
    get("practice-feedback").textContent = sum === target ? `You found a solution: ${[...chosen].sort((a,b) => a-b).map(index => values[index]).join(" + ")} = ${target}. Now try the benchmark below.`
      : !chosen.size ? "Choose a number to begin." : sum < target ? `You need ${target-sum} more. Try adding or changing a number.` : `You are ${sum-target} over the target. Try removing or changing a number.`;
  }
  function closeHints() { document.querySelectorAll("#practice details").forEach(detail => { detail.open = false; }); }
  get("practice-reset").onclick = () => {
    chosen.clear(); closeHints(); render();
    get("practice-feedback").textContent = `Puzzle ${puzzle} reset. Your sum is 0. Choose numbers again, or select New puzzle for a different set.`;
  };
  function newPuzzle() {
    const level = levels[get("practice-difficulty").value] || levels.medium;
    const previous = JSON.stringify(values);
    do {
      const pool = Array.from({length:level.max},(_,i) => i+1);
      values = [];
      while (values.length < level.size) values.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
      values.sort((a,b) => a-b);
    } while (JSON.stringify(values) === previous);
    const lowerBound = values.slice(-(level.min-1)).reduce((sum,value) => sum+value,0);
    let attempts = 0;
    do {
      const indices = values.map((_,i) => i);
      target = 0;
      for(let i=0;i<level.pick;i++) target += values[indices.splice(Math.floor(Math.random()*indices.length),1)[0]];
    } while (target <= lowerBound && ++attempts < 100);
    if(target <= lowerBound) target = values.slice(-level.pick).reduce((sum,value) => sum+value,0);
    puzzle++; chosen.clear(); closeHints(); prepare(); render();
    get("practice-feedback").textContent = `New puzzle ${puzzle} ready. Find a subset that adds up to ${target}.`;
  }
  get("practice-new").onclick = newPuzzle;
  get("practice-difficulty").onchange = newPuzzle;
  get("practice-benchmark").onclick = () => {
    instance = {values:[...values],target,seed:null,known:[...solutions[0]]};
    renderInstance();
    showPage("benchmark");
    runBenchmarks();
  };
  newPuzzle();
})();
