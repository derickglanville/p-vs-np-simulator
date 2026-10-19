"use strict";
(() => {
  function context() {
    const p = document.getElementById("benchmark-puzzle");
    p.textContent = `Numbers: ${instance.values.join(", ") || "(empty set)"} · Target: ${instance.target} · ${instance.values.length} elements.`;
  }
  function explain(rows, puzzle) {
    const complete = rows.filter(row => row.status === "completed");
    const yes = complete.filter(row => row.exists);
    const paragraphs = [];
    if (!complete.length) paragraphs.push("No algorithm completed within the time limit. There is no answer to compare yet; try a smaller puzzle or a longer limit.");
    else if (yes.length === complete.length) {
      const row = yes[0];
      const answer = row.solution.length ? row.solution.map(i => puzzle.values[i]).join(" + ") : "0 (empty subset)";
      paragraphs.push(`${yes.length} of ${rows.length} selected algorithms found a solution. For example, ${answer} = ${puzzle.target}. They solved the same task you did: find one subset that reaches the target.`);
    } else if (!yes.length) paragraphs.push(`${complete.length} completed algorithms found no solution. Each completed its search and concluded no subset reaches ${puzzle.target}. Any timed-out algorithm remains undecided.`);
    else paragraphs.push("The completed algorithms disagree about whether a solution exists. Treat this as a correctness issue to investigate, not a performance result.");
    if (complete.length) {
      const fastest = [...complete].sort((a,b) => a.time-b.time)[0];
      paragraphs.push(`The lowest measured median time in this run was ${fastest.name}: ${Number(fastest.time).toFixed(3)} ms. ${puzzle.values.length <= 10 ? "This puzzle is tiny: browser activity and timer precision can outweigh the differences. Do not read this ordering as a reliable speed ranking." : "This ordering applies only to these inputs, implementations, and this device."}`);
      paragraphs.push("Compare the work counts next: brute force tries subsets, dynamic programming reuses reachable sums, meet-in-the-middle combines two smaller searches, and backtracking skips branches that cannot reach the target. More setup work can make a sophisticated method slower on a small puzzle.");
    }
    const timedOut = rows.filter(r => r.status === "timeout" || r.timedOutTrials > 0).length;
    if (timedOut) paragraphs.push(`${timedOut} algorithms had at least one timed-out trial. Their timing summaries include completed trials only and may be biased toward faster runs.`);
    paragraphs.push("Next experiment: use New puzzle in Practice and compare again. For growth with larger inputs, use Generate and Complexity. One fast run does not establish polynomial time or settle P versus NP.");
    return paragraphs;
  }
  window.BenchmarkGuide = {
    context,
    results(rows,puzzle) {
      context();
      const box = document.getElementById("benchmark-explanation");
      box.replaceChildren();
      for (const text of explain(rows,puzzle)) { const p = document.createElement("p"); p.textContent = text; box.append(p); }
      document.getElementById("benchmark-instruction").textContent = "Results are ready below. Start with the explanation, then compare the answers and work counts.";
    }
  };
  context();
})();
