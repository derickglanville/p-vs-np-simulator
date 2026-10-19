"use strict";
(() => {
  let values = [3,7,11,14,18];
  let target = 25;
  let puzzle = 1;
  let solutions = [];
  function prepare() {
    solutions = [];
    const reachable = new Set();
    for (let mask = 0; mask < 32; mask++) {
      const indices = values.map((_,i) => i).filter(i => mask & (1 << i));
      const sum = indices.reduce((total,i) => total + values[i],0);
      reachable.add(sum);
      if (sum === target) solutions.push(indices);
    }
    get("practice-heading").textContent = `Make a total of ${target}`;
    get("practice-target").textContent = target;
    get("practice-session").textContent = `Puzzle ${puzzle} · Start over clears your choices. New puzzle changes the numbers and target.`;
    const first = solutions[0];
    get("practice-hint").textContent = `Try starting with ${values[first[0]]}. How much more would you need to reach ${target}?`;
    get("practice-answer").textContent = `${solutions.length} solution${solutions.length === 1 ? "" : "s"}: ${solutions.map(indices => indices.map(i => values[i]).join(" + ") + " = " + target).join("; ")}. You only need to find one valid subset.`;
    let bonus = target + 1;
    while (reachable.has(bonus)) bonus++;
    get("practice-bonus-heading").textContent = `Bonus challenge: can you make ${bonus} instead?`;
    get("practice-bonus-answer").textContent = `No subset sums to ${bonus}. Checking all 32 subsets establishes that for this instance. You can also enter these values and target ${bonus} in the Problem Generator to check with the algorithms.`;
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
  get("practice-new").onclick = () => {
    const previous = JSON.stringify(values);
    do {
      const pool = Array.from({length:25},(_,i) => i+1);
      values = [];
      while (values.length < 5) values.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
      values.sort((a,b) => a-b);
    } while (JSON.stringify(values) === previous);
    target = values[1] + values[4];
    puzzle++; chosen.clear(); closeHints(); prepare(); render();
    get("practice-feedback").textContent = `New puzzle ${puzzle} ready. Find a subset that adds up to ${target}.`;
  };
  get("practice-benchmark").onclick = () => {
    instance = {values:[...values],target,seed:null,known:[...solutions[0]]};
    renderInstance();
    showPage("benchmark");
  };
  prepare(); render();
})();
