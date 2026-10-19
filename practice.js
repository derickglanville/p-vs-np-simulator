"use strict";
(() => {
  const values = [3,7,11,14,18];
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
    get("practice-feedback").textContent = sum === 25 ? `You found a solution: ${[...chosen].sort((a,b) => a-b).map(index => values[index]).join(" + ")} = 25. Now try the benchmark below.`
      : !chosen.size ? "Choose a number to begin." : sum < 25 ? `You need ${25-sum} more. Try adding or changing a number.` : `You are ${sum-25} over the target. Try removing or changing a number.`;
  }
  get("practice-reset").onclick = () => { chosen.clear(); render(); };
  get("practice-benchmark").onclick = () => {
    instance = {values:[...values],target:25,seed:null,known:[1,4]};
    renderInstance();
    showPage("benchmark");
  };
  render();
})();
