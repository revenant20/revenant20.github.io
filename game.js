(function(){
  const size = 8;
  const colors = 6; // 0..5, mapped to CSS classes c0..c5
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const resetBtn = document.getElementById('reset');

  let grid = [];
  let score = 0;
  let selected = null; // {r,c}
  let isAnimating = false;

  function randColor(){ return Math.floor(Math.random() * colors); }

  function createGrid(){
    grid = Array.from({length:size}, () => Array.from({length:size}, () => randColor()));
    // Avoid starting with matches by reshuffling simple conflicts
    resolveAllMatches(true);
  }

  function render(mask){
    boardEl.innerHTML = '';
    boardEl.style.setProperty('grid-template-columns', `repeat(${size}, 42px)`);
    boardEl.style.setProperty('grid-template-rows', `repeat(${size}, 42px)`);
    for (let r=0; r<size; r++){
      for (let c=0; c<size; c++){
        const v = grid[r][c];
        const div = document.createElement('div');
        div.className = 'tile ' + (v>=0?`c${v}`:'');
        if (mask && mask[r][c]) div.classList.add('vanish');
        div.setAttribute('role', 'gridcell');
        div.dataset.r = r; div.dataset.c = c;
        if (selected && selected.r===r && selected.c===c) div.classList.add('sel');
        div.addEventListener('click', onTileClick, {passive:true});
        boardEl.appendChild(div);
      }
    }
    scoreEl.textContent = String(score);
  }

  function onTileClick(e){
    if (isAnimating) return;
    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    if (!selected){
      selected = {r,c};
      render();
      return;
    }
    // If clicked same - unselect
    if (selected.r===r && selected.c===c){ selected=null; render(); return; }
    // If adjacent - try swap
    if (isAdjacent(selected, {r,c})){
      swap(selected, {r,c});
      if (!hasAnyMatch()){ // invalid move, revert
        swap(selected, {r,c});
        selected = null;
        render();
      } else {
        selected = null;
        stepResolve();
      }
    } else {
      // select new
      selected = {r,c};
      render();
    }
  }

  function isAdjacent(a,b){
    return Math.abs(a.r-b.r) + Math.abs(a.c-b.c) === 1;
  }
  function swap(a,b){
    const t = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = t;
  }

  function findMatches(){
    const match = Array.from({length:size}, () => Array(size).fill(false));
    // horizontal
    for (let r=0; r<size; r++){
      let run=1;
      for (let c=1; c<size; c++){
        if (grid[r][c] >= 0 && grid[r][c] === grid[r][c-1]) run++; else {
          if (run >= 3){ for (let k=0; k<run; k++) match[r][c-1-k]=true; }
          run=1;
        }
      }
      if (run >= 3){ for (let k=0; k<run; k++) match[r][size-1-k]=true; }
    }
    // vertical
    for (let c=0; c<size; c++){
      let run=1;
      for (let r=1; r<size; r++){
        if (grid[r][c] >= 0 && grid[r][c] === grid[r-1][c]) run++; else {
          if (run >= 3){ for (let k=0; k<run; k++) match[r-1-k][c]=true; }
          run=1;
        }
      }
      if (run >= 3){ for (let k=0; k<run; k++) match[size-1-k][c]=true; }
    }
    return match;
  }

  function hasAnyMatch(){
    const m = findMatches();
    for (let r=0; r<size; r++) for (let c=0; c<size; c++) if (m[r][c]) return true;
    return false;
  }

  function clearMatches(match){
    let cleared = 0;
    for (let r=0; r<size; r++){
      for (let c=0; c<size; c++){
        if (match[r][c]){ grid[r][c] = -1; cleared++; }
      }
    }
    if (cleared>0) score += cleared;
    return cleared;
  }

  function dropAndFill(){
    for (let c=0; c<size; c++){
      let write = size-1;
      for (let r=size-1; r>=0; r--){
        if (grid[r][c] >= 0){
          grid[write][c] = grid[r][c];
          write--;
        }
      }
      while (write >= 0){ grid[write][c] = randColor(); write--; }
    }
  }

  function resolveAllMatches(initial){
    // resolve chain until no matches (used for initial board only, without animations)
    let loops=0;
    while (true){
      const match = findMatches();
      const cleared = clearMatches(match);
      if (cleared === 0){ break; }
      dropAndFill();
      if (!initial) render();
      // prevent infinite loop (should not happen)
      if (++loops > 50) break;
    }
  }

  function stepResolve(){
    if (isAnimating) return;
    isAnimating = true;
    const animateDelay = 240; // must be >= CSS vanish duration

    function loop(guard){
      if (guard > 50){ // safety
        isAnimating = false;
        render();
        return;
      }
      const match = findMatches();
      // check if any true in mask
      let any=false;
      for (let r=0;r<size && !any;r++) for (let c=0;c<size;c++) if (match[r][c]) { any=true; break; }
      if (!any){
        isAnimating = false;
        render();
        return;
      }
      // show animation
      render(match);
      setTimeout(() => {
        clearMatches(match);
        dropAndFill();
        // render intermediate state without matches before next loop
        render();
        loop(guard+1);
      }, animateDelay);
    }

    loop(0);
  }

  function reset(){
    score = 0;
    selected = null;
    createGrid();
    render();
  }

  resetBtn.addEventListener('click', reset);

  // init
  reset();
})();
