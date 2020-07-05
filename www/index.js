import { WASMGameMaster, init_panic_hook } from "tetris-wasm";
import { memory } from "tetris-wasm/tetris_wasm_bg";

init_panic_hook();

const BLOCK_SIZE = 15; // px
const GRID_COLOR = "#CCCCCC";
const EMPTY_COLOR = "#FFFFFF";
const FILLED_COLOR = "#000000";
const NEXT_SIZE = 4;
const HOLD_SIZE = 4;
const NUM_NEXTS = 6;
const ENABLE_GHOST = true;
const ENABLE_GARBAGE = true;

const width = 10;
const height = 20;
const gm = WASMGameMaster.new(height, width, NUM_NEXTS, NEXT_SIZE, HOLD_SIZE, ENABLE_GHOST, ENABLE_GARBAGE);

const canvas = document.getElementById("tetris-canvas");
canvas.height = (BLOCK_SIZE + 1) * (height + 10) + 1;
canvas.width = (BLOCK_SIZE + 1) * (width + HOLD_SIZE + 1 + NEXT_SIZE + 1) + 1;
const pre = document.getElementById("num-deleted-lines");

const ctx = canvas.getContext('2d');

let right_rotate_key = false;
let left_rotate_key = false;
let hold_key = false;
let soft_drop_key = false;
let hard_drop_key = false;
let right_move_key = false;
let left_move_key = false;
let pause = false;

window.addEventListener("keydown", event => {
  if (event.code == "KeyX"){ // 右回転
    right_rotate_key = true;
  }
  if (event.code == "KeyZ"){ // 左回転
    left_rotate_key = true;
  }
  if (event.code == "ShiftLeft"){ // ホールド
    hold_key = true;
  }
  if (event.code == "ArrowLeft"){
    left_move_key = true;
  }
  if (event.code == "ArrowRight"){
    right_move_key = true;
  }
  if (event.code == "ArrowUp"){ // ハードドロップ
    hard_drop_key = true;
  }
  if (event.code == "ArrowDown"){ // ソフトドロップ
    soft_drop_key = true;
  }
});

window.addEventListener("keyup", event => {
  if (event.code == "KeyS"){ // 右回転
    pause = !pause;
  }
  if (event.code == "KeyX"){ // 右回転
    right_rotate_key = false;
  }
  if (event.code == "KeyZ"){ // 左回転
    left_rotate_key = false;
  }
  if (event.code == "ShiftLeft"){ // ホールド
    hold_key = false;
  }
  if (event.code == "ArrowLeft"){
    left_move_key = false;
  }
  if (event.code == "ArrowRight"){
    right_move_key = false;
  }
  if (event.code == "ArrowUp"){ // ハードドロップ
    hard_drop_key = false;
  }
  if (event.code == "ArrowDown"){ // ソフトドロップ
    soft_drop_key = false;
  }
});

const renderLoop = () => {
  gm.render();
  gm.render_next();
  gm.render_hold();
  pre.textContent = gm.get_num_deleted_lines();

  if (!pause){
    gm.tick(Date.now() % 1000000,
            right_rotate_key,
            left_rotate_key,
            hold_key,
            soft_drop_key,
            hard_drop_key,
            right_move_key,
            left_move_key,
            ); // TODO: 時間が適当すぎる
  }

  drawGrid();
  drawBlocks();
  drawNexts();
  drawHold();

  requestAnimationFrame(renderLoop);
};

requestAnimationFrame(renderLoop);

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo((HOLD_SIZE + 1 + i) * (BLOCK_SIZE + 1) + 1, 0);
    ctx.lineTo((HOLD_SIZE + 1 + i) * (BLOCK_SIZE + 1) + 1, (BLOCK_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo((BLOCK_SIZE + 1) * (HOLD_SIZE + 1) + 1, j * (BLOCK_SIZE + 1) + 1);
    ctx.lineTo((BLOCK_SIZE + 1) * (HOLD_SIZE + 1 + width) + 1, j * (BLOCK_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const drawBlocks = () => {
  const blocksPtr = gm.field();
  const blocksColorPtr = gm.field_color();
  const blocks = new Uint8Array(memory.buffer, blocksPtr, width * height);
  const blocksColor = new Float32Array(memory.buffer, blocksColorPtr, width * height * 4);

  ctx.beginPath();

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const r = Math.floor(255 * blocksColor[i * width * 4 + j * 4 + 0]);
      const g = Math.floor(255 * blocksColor[i * width * 4 + j * 4 + 1]);
      const b = Math.floor(255 * blocksColor[i * width * 4 + j * 4 + 2]);

      ctx.fillStyle = blocks[i * width + j] === 0
        ? EMPTY_COLOR
        : `rgb(${r}, ${g}, ${b})`;

      ctx.fillRect(
        (HOLD_SIZE + 1 + j) * (BLOCK_SIZE + 1) + 1,
        i * (BLOCK_SIZE + 1) + 1,
        BLOCK_SIZE,
        BLOCK_SIZE
      );
    }
  }

  ctx.stroke();
};

const drawNexts = () => {
  const nextsPtr = gm.nexts();
  const nextsColorPtr = gm.nexts_color();
  const nexts = new Uint8Array(memory.buffer, nextsPtr, NEXT_SIZE * NEXT_SIZE * NUM_NEXTS);
  const nextsColor = new Float32Array(memory.buffer, nextsColorPtr, NEXT_SIZE * NEXT_SIZE * NUM_NEXTS * 4);

  ctx.beginPath();

  for (let i = 0; i < NEXT_SIZE * NUM_NEXTS; i++) {
    for (let j = 0; j < NEXT_SIZE; j++) {
      const r = Math.floor(255 * nextsColor[i * NEXT_SIZE * 4 + j * 4 + 0]);
      const g = Math.floor(255 * nextsColor[i * NEXT_SIZE * 4 + j * 4 + 1]);
      const b = Math.floor(255 * nextsColor[i * NEXT_SIZE * 4 + j * 4 + 2]);

      ctx.fillStyle = nexts[i * NEXT_SIZE + j] === 0
        ? EMPTY_COLOR
        : `rgb(${r}, ${g}, ${b})`;

      ctx.fillRect(
        (HOLD_SIZE + 1 + width + 1 + j) * (BLOCK_SIZE + 1) + 1,
        i * (BLOCK_SIZE + 1) + 1,
        BLOCK_SIZE,
        BLOCK_SIZE
      );
    }
  }

  ctx.stroke();
};

const drawHold = () => {
  const holdPtr = gm.hold();
  const holdColorPtr = gm.hold_color();
  const hold = new Uint8Array(memory.buffer, holdPtr, HOLD_SIZE * HOLD_SIZE);
  const holdColor = new Float32Array(memory.buffer, holdColorPtr, HOLD_SIZE * HOLD_SIZE * 4);

  ctx.beginPath();

  for (let i = 0; i < HOLD_SIZE; i++) {
    for (let j = 0; j < HOLD_SIZE; j++) {
      const r = Math.floor(255 * holdColor[i * HOLD_SIZE * 4 + j * 4 + 0]);
      const g = Math.floor(255 * holdColor[i * HOLD_SIZE * 4 + j * 4 + 1]);
      const b = Math.floor(255 * holdColor[i * HOLD_SIZE * 4 + j * 4 + 2]);

      ctx.fillStyle = hold[i * HOLD_SIZE + j] === 0
        ? EMPTY_COLOR
        : `rgb(${r}, ${g}, ${b})`;

      ctx.fillRect(
        j * (BLOCK_SIZE + 1) + 1,
        i * (BLOCK_SIZE + 1) + 1,
        BLOCK_SIZE,
        BLOCK_SIZE
      );
    }
  }

  ctx.stroke();
};

