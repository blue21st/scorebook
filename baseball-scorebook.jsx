import { useState } from "react";
const INNINGS = 6;
const PITCH_SYMBOLS = [
  { s: "○", label: "見逃しS", color: "#16a34a" },
  { s: "●", label: "空振りS", color: "#ea580c" },
  { s: "ー", label: "ボール", color: "#2563eb" },
  { s: "∨", label: "ファール", color: "#92400e" },
  { s: "◇", label: "バント空振", color: "#7c3aed" },
  { s: "△", label: "バントファウル", color: "#b45309" },
];
const POSITIONS = ["1","2","3","4","5","6","7","8","9","DH"];
const POS_LABEL = {"1":"投","2":"捕","3":"一","4":"二","5":"三","6":"遊","7":"左","8":"中","9":"右","DH":"指"};
const mkCell = () => ({
  pitches: [],
  br: "",      // 1塁到達コード（守備番号 or K/B等）
  hitType: "", // ヒット種別（H/2B/3B/HR/IH）セルには非表示
  tr: "",
  tl: "",
  bl: "",
  center: "",
});
const REACH_REASONS = [
  { code: "(1)", label: "1番", color: "#a78bfa" },
  { code: "(2)", label: "2番", color: "#a78bfa" },
  { code: "(3)", label: "3番", color: "#a78bfa" },
  { code: "(4)", label: "4番", color: "#a78bfa" },
  { code: "(5)", label: "5番", color: "#a78bfa" },
  { code: "(6)", label: "6番", color: "#a78bfa" },
  { code: "(7)", label: "7番", color: "#a78bfa" },
  { code: "(8)", label: "8番", color: "#a78bfa" },
  { code: "(9)", label: "9番", color: "#a78bfa" },
  { code: "H", label: "安打", color: "#16a34a" },
  { code: "2B", label: "二塁打", color: "#15803d" },
  { code: "3B", label: "三塁打", color: "#14532d" },
  { code: "HR", label: "本塁打", color: "#dc2626" },
  { code: "IH", label: "内野安打", color: "#4d7c0f" },
  { code: "B", label: "四球", color: "#2563eb" },
  { code: "HBP", label: "死球", color: "#7c3aed" },
  { code: "SAC", label: "犠打", color: "#0891b2" },
  { code: "SF", label: "犠飛", color: "#0e7490" },
  { code: "E", label: "失策", color: "#b45309" },
  { code: "FC", label: "野選", color: "#92400e" },
  { code: "S", label: "盗塁", color: "#0d9488" },
  { code: "WP", label: "暴投", color: "#78716c" },
  { code: "PB", label: "捕逸", color: "#a8a29e" },
  { code: "BK", label: "ボーク", color: "#64748b" },
];
const AT_BAT_RESULTS = [
  { code: "K",   label: "見逃三振", color: "#ea580c", isHit: false, isAB: true },
  { code: "SK",  label: "空振三振", color: "#f97316", isHit: false, isAB: true },
  { code: "KK",  label: "振逃げ",   color: "#c2410c", isHit: false, isAB: true },
  { code: "B",   label: "四球",     color: "#2563eb", isHit: false, isAB: false },
  { code: "HBP", label: "死球",     color: "#7c3aed", isHit: false, isAB: false },
  { code: "SAC", label: "犠打",     color: "#0891b2", isHit: false, isAB: false },
  { code: "SF",  label: "犠飛",     color: "#0e7490", isHit: false, isAB: false },
  { code: "E",   label: "失策",     color: "#b45309", isHit: false, isAB: true },
  { code: "FC",  label: "野選",     color: "#92400e", isHit: false, isAB: true },
];

// ヒット系（守備番号入力後に選択、セルには表示しない）
const HIT_TYPES = [
  { code: "H",  label: "単打",     bases: 1, color: "#16a34a" },
  { code: "2B", label: "二塁打",   bases: 2, color: "#15803d" },
  { code: "3B", label: "三塁打",   bases: 3, color: "#14532d" },
  { code: "HR", label: "本塁打",   bases: 4, color: "#dc2626" },
  { code: "IH", label: "内野安打", bases: 1, color: "#4d7c0f" },
];
const RESULT_MAP = Object.fromEntries(AT_BAT_RESULTS.map(r => [r.code, r]));
const REACH_MAP = Object.fromEntries(REACH_REASONS.map(r => [r.code, r]));
const ALL_CODE_MAP = { ...RESULT_MAP, ...REACH_MAP };
const sum = arr => arr.reduce((a, v) => a + (parseInt(v) || 0), 0);
const SCORE_MARKS = new Set(["①","②","③","④","⑤"]);
const OUT_MARKS = new Set(["Ⅰ","Ⅱ","Ⅲ"]);

// 投球列からボール数・ストライク数を計算する共通関数
const calcCount = (pitches) => {
  let balls = 0;
  let strikes = 0;
  for (const p of pitches) {
    if (p === "ー") {
      balls++;
    } else if (["○","●","◇","△"].includes(p)) {
      // 見逃し・空振り・バント空振り・バントファウルは常にストライク
      strikes++;
    } else if (p === "∨") {
      // ファールは2ストライクまでのみカウント、以降無効
      if (strikes < 2) strikes++;
    }
    // 3ストライク以上になったら打席終了なので以降は処理しない
    if (strikes >= 3 || balls >= 4) break;
  }
  return { balls, strikes };
};
const CENTER_OPTIONS = [
  { code: "①", label: "1点目", color: "#2d8a2d" },
  { code: "②", label: "2点目", color: "#2d8a2d" },
  { code: "③", label: "3点目", color: "#2d8a2d" },
  { code: "④", label: "4点目", color: "#2d8a2d" },
  { code: "⑤", label: "5点目", color: "#2d8a2d" },
  { code: "⑥", label: "6点目", color: "#2d8a2d" },
  { code: "⑦", label: "7点目", color: "#2d8a2d" },
  { code: "⑧", label: "8点目", color: "#2d8a2d" },
  { code: "⑨", label: "9点目", color: "#2d8a2d" },
  { code: "⑩", label: "10点目", color: "#2d8a2d" },
  { code: "⑪", label: "11点目", color: "#2d8a2d" },
  { code: "⑫", label: "12点目", color: "#2d8a2d" },
  { code: "⑬", label: "13点目", color: "#2d8a2d" },
  { code: "⑭", label: "14点目", color: "#2d8a2d" },
  { code: "⑮", label: "15点目", color: "#2d8a2d" },
  { code: "⑯", label: "16点目", color: "#2d8a2d" },
  { code: "⑰", label: "17点目", color: "#2d8a2d" },
  { code: "⑱", label: "18点目", color: "#2d8a2d" },
  { code: "⑲", label: "19点目", color: "#2d8a2d" },
  { code: "⑳", label: "20点目", color: "#2d8a2d" },
  { code: "㉑", label: "21点目", color: "#2d8a2d" },
  { code: "㉒", label: "22点目", color: "#2d8a2d" },
  { code: "㉓", label: "23点目", color: "#2d8a2d" },
  { code: "㉔", label: "24点目", color: "#2d8a2d" },
  { code: "㉕", label: "25点目", color: "#2d8a2d" },
  { code: "㉖", label: "26点目", color: "#2d8a2d" },
  { code: "㉗", label: "27点目", color: "#2d8a2d" },
  { code: "㉘", label: "28点目", color: "#2d8a2d" },
  { code: "㉙", label: "29点目", color: "#2d8a2d" },
  { code: "㉚", label: "30点目", color: "#2d8a2d" },
  { code: "Ⅰ", label: "1アウト", color: "#c0392b" },
  { code: "Ⅱ", label: "2アウト", color: "#c0392b" },
  { code: "Ⅲ", label: "3アウト", color: "#c0392b" },
  { code: "ℓ", label: "残塁", color: "#f59e0b" },
  { code: "//", label: "イニングチェンジ", color: "#666666" },
];
// 各打順は選手の配列（先発＋交代選手）
const mkPlayer = (name, pos, number, role="先発") => ({ name, pos, number, role });
const mkPlayers = () => [
  [mkPlayer("やくも",    "9", "4")],
  [mkPlayer("さくひさ",  "8", "3")],
  [mkPlayer("あきと",   "3", "1")],
  [mkPlayer("たいしろう","2", "18")],
  [mkPlayer("そうすけ",  "6", "6")],
  [mkPlayer("いっせい",  "7", "11")],
  [mkPlayer("はると",   "3", "8")],
  [mkPlayer("そうへい",  "4", "0")],
  [mkPlayer("きいち",   "5", "10")],
];
const init = () => ({
  teamName: ["チームA", "チームB"],
  date: new Date().toISOString().slice(0, 10),
  venue: "",
  players: [mkPlayers(), mkPlayers()],
  cells: [
    Array.from({ length: 9 }, () => Array.from({ length: INNINGS }, mkCell)),
    Array.from({ length: 9 }, () => Array.from({ length: INNINGS }, mkCell)),
  ],
  runs: [Array(INNINGS).fill(""), Array(INNINGS).fill("")],
  pitchers: [
    Array.from({ length: 2 }, (_, i) => ({ name: `投手${i+1}`, ip:"", h:"", er:"", bb:"", so:"" })),
    Array.from({ length: 2 }, (_, i) => ({ name: `投手${i+1}`, ip:"", h:"", er:"", bb:"", so:"" })),
  ],
});

const PITCH_COLOR = { "○":"#16a34a", "●":"#ea580c", "ー":"#1565c0", "∨":"#b45309", "◇":"#7c3aed", "△":"#b45309" };

function ScoreCell({ cell, onClick, size = 72, disabled = false, transcribeMode = false }) {
  const s = size;
  const pitchW = 22;
  const areaLeft = pitchW + 1;
  const areaRight = s;
  const areaTop = 0;
  const areaBot = s;
  const cx = (areaLeft + areaRight) / 2;
  const cy = (areaTop + areaBot) / 2;
  const r2 = (areaRight - areaLeft) * 0.24;
  const top = { x: cx, y: cy - r2 };
  const right = { x: cx + r2, y: cy };
  const bottom = { x: cx, y: cy + r2 };
  const left = { x: cx - r2, y: cy };
  // hitTypeベースでダイヤモンドの辺を赤く描画
  const hitBases = { "H":1, "IH":1, "2B":2, "3B":3, "HR":4 };
  const brBases = hitBases[cell.hitType] || 0;
  // 各辺が赤く光るか（進塁数に応じて）
  const redSide1 = brBases >= 1; // 右下辺（1塁）
  const redSide2 = brBases >= 2; // 右上辺（2塁）
  const redSide3 = brBases >= 3; // 左上辺（3塁）
  const redSide4 = brBases >= 4; // 左下辺（本塁）
  const rc = "#c0392b"; // 赤
  const dc = "#2d6a2d"; // 暗い緑（デフォルト）
  const lc = (red) => red ? rc : dc;
  const lw = (red) => red ? 2.5 : 1;
  // 後方互換：ランナーの進塁表示（br以外）
  // tr/tl/blはヒット系コードで進塁表示（緑線）は現在未使用
  const has2 = false;
  const has3 = false;
  const hasH = false;
  const cOpt = CENTER_OPTIONS.find(o => o.code === cell.center);
  // 打席結果が確定している場合、最後の1球は右下コードで判別できるので表示しない
  // 転記モードでは全球表示、リアルタイムモードでは最後の1球を非表示
  const displayPitches = (!transcribeMode && cell.br) ? cell.pitches.slice(0, -1) : cell.pitches;
  const useTwoCols = displayPitches.length > 6;
  const col1 = useTwoCols ? displayPitches.filter((_, i) => i % 2 === 0) : displayPitches;
  const col2 = useTwoCols ? displayPitches.filter((_, i) => i % 2 === 1) : [];
  const codeColor = (code) => {
    const r = ALL_CODE_MAP[code];
    return r ? r.color : "#94a3b8";
  };
  return (
    <div onClick={onClick} style={{
      width: s, height: s + 14, cursor: disabled ? "default" : "pointer", position: "relative",
      borderRight: "1px solid #0d1f0d", borderBottom: "1px solid #0d1f0d",
      flexShrink: 0, userSelect: "none", overflow: "hidden",
      opacity: disabled ? 0.4 : 1,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#ffffff09"; }}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ position:"absolute", top:4, left:0, width:pitchW, display:"flex", flexDirection:"row" }}>
        <div style={{ width:11, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
          {col1.map((sym, i) => (
            <span key={i} style={{ fontSize:8, lineHeight:1, fontWeight:800, color:PITCH_COLOR[sym]||"#666666" }}>{sym}</span>
          ))}
        </div>
        <div style={{ width:11, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
          {col2.map((sym, i) => (
            <span key={i} style={{ fontSize:8, lineHeight:1, fontWeight:800, color:PITCH_COLOR[sym]||"#666666" }}>{sym}</span>
          ))}
        </div>
      </div>
      <div style={{ position:"absolute", top:0, left:pitchW, bottom:0, width:1, background:"#2d6a2d" }}/>
      <svg width={s} height={s} style={{ position:"absolute", top:0 }}>
        {/* 緑の延長線（常に表示） */}
        <line x1={top.x} y1={top.y} x2={cx} y2={areaTop} stroke="#2d6a2d" strokeWidth={1}/>
        <line x1={right.x} y1={right.y} x2={areaRight} y2={cy} stroke="#2d6a2d" strokeWidth={1}/>
        <line x1={bottom.x} y1={bottom.y} x2={cx} y2={areaBot} stroke="#2d6a2d" strokeWidth={1}/>
        <line x1={left.x} y1={left.y} x2={areaLeft} y2={cy} stroke="#2d6a2d" strokeWidth={1}/>
        {/* ダイヤの斜め4辺（ヒット時は赤、それ以外は暗い緑） */}
        <line x1={bottom.x} y1={bottom.y} x2={right.x} y2={right.y} stroke={lc(redSide1)} strokeWidth={lw(redSide1)}/>
        <line x1={right.x} y1={right.y} x2={top.x} y2={top.y} stroke={lc(redSide2)} strokeWidth={lw(redSide2)}/>
        <line x1={top.x} y1={top.y} x2={left.x} y2={left.y} stroke={lc(redSide3)} strokeWidth={lw(redSide3)}/>
        <line x1={left.x} y1={left.y} x2={bottom.x} y2={bottom.y} stroke={lc(redSide4)} strokeWidth={lw(redSide4)}/>
      </svg>
      {cell.center && cell.center !== "//" && (
        <div style={{
          position:"absolute",
          left: areaLeft + (areaRight - areaLeft) / 2 - 8,
          top: cy - 8, width:16, height:16,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: cell.center === "ℓ" ? 11 : 10,
          fontWeight:900, color: cOpt?.color || "#94a3b8",
          pointerEvents:"none",
        }}>
          {cell.center}
        </div>
      )}
      {cell.center === "//" && (
        <svg style={{ position:"absolute", bottom:0, right:0, pointerEvents:"none" }} width={20} height={20}>
          <line x1={4} y1={18} x2={12} y2={2} stroke="#666666" strokeWidth={1.5}/>
          <line x1={9} y1={18} x2={17} y2={2} stroke="#666666" strokeWidth={1.5}/>
        </svg>
      )}
      {cell.br && (() => {
        // ヒット時はhitTypeコード部分を除いた守備番号だけ表示
        let br = cell.br;
        if (cell.hitType) {
          // 末尾のヒットコードを除去（例: "7H"→"7", "8dH"→"8d"）
          br = br.replace(/(H|2B|3B|HR|IH)$/, "");
          if (!br) return null; // 守備番号なし（K/B等）の場合は非表示
        }
        const dirMatch = br.match(/^([\^-]?)([1-9])([durl]?)(.*)$/);
        if (dirMatch) {
          const [, pfx, n, dir, rest] = dirMatch;
          const col = codeColor(br);
          // pfxがある（^/-）かつrestが空 → フライ/ライナー（上付き記号）
          // pfxがない or restあり → 通常表示（6-3Aなど）
          const isFlyLiner = pfx && !rest && !dir;
          return (
            <div style={{ position:"absolute", bottom:14, right:2,
              pointerEvents:"none" }}>
              {isFlyLiner ? (
                <svg width={14} height={20}>
                  <text x={7} y={9}  textAnchor="middle" fontSize={7} fontWeight={900} fill={col}>{pfx}</text>
                  <text x={7} y={19} textAnchor="middle" fontSize={10} fontWeight={900} fill={col}>{n}</text>
                </svg>
              ) : (
                <div style={{ position:"relative" }}>
                  <span style={{ fontSize:8, fontWeight:800, color:col }}>{br}</span>
                  {dir === "u" && <span style={{ position:"absolute", top:"-5px", left:"50%", transform:"translateX(-50%)", fontSize:6, color:col }}>・</span>}
                  {dir === "d" && <span style={{ position:"absolute", bottom:"-5px", left:"50%", transform:"translateX(-50%)", fontSize:6, color:col }}>・</span>}
                  {dir === "r" && <span style={{ position:"absolute", top:"50%", right:"-6px", transform:"translateY(-50%)", fontSize:6, color:col }}>・</span>}
                  {dir === "l" && <span style={{ position:"absolute", top:"50%", left:"-6px", transform:"translateY(-50%)", fontSize:6, color:col }}>・</span>}
                </div>
              )}
            </div>
          );
        }
        return (
          <div style={{ position:"absolute", bottom:16, right:2, fontSize:8, fontWeight:800, color:codeColor(br),
            display:"inline-flex", flexDirection:"column", alignItems:"center", lineHeight:1 }}>
            {br === "KK" ? <span style={{ transform:"scaleX(-1)", display:"inline-block" }}>K</span> : br}
          </div>
        );
      })()}
      {cell.tr && (
        <div style={{ position:"absolute", top:2, right:2, fontSize:8, fontWeight:800, color:codeColor(cell.tr) }}>
          {cell.tr}
        </div>
      )}
      {cell.tl && (
        <div style={{ position:"absolute", top:2, left:pitchW+3, fontSize:8, fontWeight:800, color:codeColor(cell.tl) }}>
          {cell.tl}
        </div>
      )}
      {cell.bl && (
        <div style={{ position:"absolute", bottom:16, left:pitchW+3, fontSize:8, fontWeight:800, color:codeColor(cell.bl) }}>
          {cell.bl}
        </div>
      )}
    </div>
  );
}

const FIELDERS = ["1","2","3","4","5","6","7","8","9"];
const OUTFIELD = new Set(["7","8","9"]);

// ── FieldInputPicker ──────────────────────────────────────────────────────
// フロー：① 守備番号 → ② 打球種別 → ③ 結果（アウト/ヒット）→ ④ 方向（外野ヒットのみ）
function FieldInputPicker({ value, onChange, hideQuickResults = false }) {
  const [num, setNum] = useState("");         // 守備番号
  const [ballType, setBallType] = useState(""); // ゴロ/フライ/ライナー
  const [result, setResult] = useState("");   // ヒット種別 or アウト種別
  const [direction, setDirection] = useState(""); // 外野ヒットの方向
  const [relayParts, setRelayParts] = useState([]); // 送球先組み立て

  const isOutfield = OUTFIELD.has(num);
  const needDirection = result && ["H","2B","3B","HR"].includes(result) && isOutfield;
  const isDone = result && (
    ["A","TO"].includes(relayParts[relayParts.length-1]) ||
    (needDirection && direction) ||
    (!needDirection && ["H","2B","3B","HR","IH"].includes(result)) ||
    (!["H","2B","3B","HR","IH"].includes(result) && result && relayParts.length === 0 && ["A","TO"].includes(result))
  );

  // 表示コードの組み立て
  const buildCode = () => {
    if (!num) return "";
    const prefix = ballType === "フライ" ? "^" : ballType === "ライナー" ? "-" : "";
    const dirSuffix = direction ? direction : "";
    const relay = relayParts.join("");
    return prefix + num + dirSuffix + relay;
  };

  const built = buildCode();

  const clear = () => {
    setNum(""); setBallType(""); setResult(""); setDirection(""); setRelayParts([]);
    onChange("");
  };

  const emit = (overrides = {}) => {
    const n = overrides.num ?? num;
    const bt = overrides.ballType ?? ballType;
    const r = overrides.result ?? result;
    const d = overrides.direction ?? direction;
    const rp = overrides.relayParts ?? relayParts;
    const prefix = bt === "フライ" ? "^" : bt === "ライナー" ? "-" : "";
    // 方向はd/u/r/lをそのままsuffixとして付ける（表示時に点の位置に変換）
    const dirSuffix = d ? d : "";
    const relay = rp.join("");
    const code = prefix + n + dirSuffix + relay;
    if (["H","2B","3B","HR","IH"].includes(r)) {
      onChange({ br: prefix + n + dirSuffix, hitType: r });
    } else {
      onChange(code);
    }
  };

  // ステップ判定
  const step = !num ? "num"
    : !ballType ? "ballType"
    : !result ? "result"
    : needDirection && !direction ? "direction"
    : "relay";

  const addRelay = (p) => {
    const next = [...relayParts, p];
    setRelayParts(next);
    const prefix = ballType === "フライ" ? "^" : ballType === "ライナー" ? "-" : "";
    const dir = direction === "前" ? "・" : direction === "オーバー" ? "↑" : direction === "右" ? "→" : direction === "左" ? "←" : "";
    onChange(prefix + num + dir + next.join(""));
  };

  const popRelay = () => {
    const next = relayParts.slice(0,-1);
    setRelayParts(next);
    const prefix = ballType === "フライ" ? "^" : ballType === "ライナー" ? "-" : "";
    const dir = direction === "前" ? "・" : direction === "オーバー" ? "↑" : direction === "右" ? "→" : direction === "左" ? "←" : "";
    onChange(prefix + num + dir + next.join(""));
  };

  const lastRelay = relayParts[relayParts.length-1] || "";
  const canRelayNum = lastRelay === "-" || lastRelay === "" && result === "送球";
  const canDash = lastRelay !== "-" && lastRelay !== "A" && lastRelay !== "TO" && num;
  const canE = lastRelay !== "E" && lastRelay !== "A" && lastRelay !== "TO" && lastRelay !== "-" && lastRelay !== "";
  const relayDone = lastRelay === "A" || lastRelay === "TO";

  return (
    <div>
      {/* プレビュー */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14 }}>
        <div style={{
          flex:1, background:"#f8f7f2", border:"1px solid #22c55e55",
          borderRadius:8, padding:"10px 14px", minHeight:48,
          fontSize:22, fontWeight:900, color:"#1a7a1a", letterSpacing:3,
        }}>
          {built || <span style={{ color:"#cccccc", fontSize:13, fontWeight:400 }}>未入力</span>}
        </div>
        {(num || value) && (
          <button onClick={clear} style={{
            background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
            borderRadius:7, padding:"8px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:13,
          }}>✕</button>
        )}
      </div>

      {/* ステップ表示 */}
      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {[["num","①番号"], ["ballType","②種別"], ["result","③結果"], ...(needDirection||direction ? [["direction","④方向"]] : [])].map(([key, label]) => (
          <div key={key} style={{
            fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6,
            background: step===key ? "#c8e6c933" : "transparent",
            border: `1px solid ${step===key ? "#2d8a2d" : "#2d6a2d"}`,
            color: step===key ? "#1a7a1a" : "#555555",
          }}>{label}</div>
        ))}
      </div>

      {/* ① 守備番号 */}
      {step === "num" && (
        <div>
          {!hideQuickResults && (
            <>
              <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>三振・四死球など</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, marginBottom:16 }}>
                {AT_BAT_RESULTS.map(o => (
                  <button key={o.code} onClick={() => { onChange(o.code); }} style={{
                    background:`${o.color}11`, border:`1px solid ${o.color}44`,
                    color:o.color, borderRadius:8, padding:"8px 4px",
                    cursor:"pointer", fontFamily:"inherit", textAlign:"center",
                  }}>
                    <div style={{ fontSize:14, fontWeight:800, transform: o.code==="KK" ? "scaleX(-1)" : "none", display:"inline-block" }}>
                      {o.code === "KK" ? "K" : o.code}
                    </div>
                    <div style={{ fontSize:8, opacity:0.8 }}>{o.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>守備番号</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {FIELDERS.map(n => (
              <button key={n} onClick={() => { setNum(n); }} style={{
                width:44, height:44, borderRadius:"50%",
                background:"#eceae3", border:"2px solid #1a3a1a",
                color:"#1a7a1a", cursor:"pointer", fontFamily:"inherit", fontWeight:900, fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{n}</button>
            ))}
          </div>
        </div>
      )}

      {/* ② 打球種別 */}
      {step === "ballType" && (
        <div>
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>打球種別</div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { code:"ゴロ",   label:"ゴロ",   symbol:"",  color:"#78716c", done:false },
              { code:"フライ", label:"フライ", symbol:"^", color:"#a8a29e", done:true },
              { code:"ライナー",label:"ライナー",symbol:"－",color:"#94a3b8", done:true },
            ].map(o => (
              <button key={o.code} onClick={() => {
                setBallType(o.code);
                // フライ・ライナーはアウト確定→即完了
                if (o.done) {
                  const prefix = o.code === "フライ" ? "^" : "-";
                  onChange(prefix + num);
                }
              }} style={{
                flex:1, padding:"14px 6px", borderRadius:9,
                background:`${o.color}11`, border:`1px solid ${o.color}55`,
                color:o.color, cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:13, textAlign:"center",
              }}>
                <div style={{ fontSize:18 }}>{o.symbol || num}</div>
                <div style={{ fontSize:10, marginTop:4 }}>{o.label}</div>
                {o.done && <div style={{ fontSize:8, opacity:0.6, marginTop:2 }}>即完了</div>}
              </button>
            ))}
          </div>
          <button onClick={() => setNum("")} style={{
            marginTop:12, background:"transparent", border:"1px solid #1a3a1a",
            color:"#555555", borderRadius:7, padding:"6px 14px",
            cursor:"pointer", fontFamily:"inherit", fontSize:12,
          }}>← 番号に戻る</button>
        </div>
      )}

      {/* ③ 結果 */}
      {step === "result" && (
        <div>
          <div style={{ fontSize:10, color:"#16a34a88", fontWeight:700, marginBottom:8 }}>ヒット</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:14 }}>
            {HIT_TYPES.map(o => (
              <button key={o.code} onClick={() => {
                setResult(o.code);
                // 内野ヒットまたは本塁打は方向不要→即完了
                if (!OUTFIELD.has(num) || o.code === "HR") {
                  emit({ result: o.code, direction: "" });
                }
              }} style={{
                padding:"8px 12px", borderRadius:9,
                background:`${o.color}11`, border:`1px solid ${o.color}55`,
                color:o.color, cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:13,
              }}>{o.label}</button>
            ))}
          </div>
          <div style={{ fontSize:10, color:"#ef444488", fontWeight:700, marginBottom:8 }}>アウト</div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[
              { code:"A", label:"フォースアウト", sub:"ベース踏む", color:"#c0392b" },
              { code:"TO", label:"タッチアウト", sub:"打者にタッチ", color:"#f97316" },
            ].map(o => (
              <button key={o.code} onClick={() => {
                setResult(o.code);
                setRelayParts([o.code]);
                emit({ result: o.code, relayParts: [o.code] });
              }} style={{
                flex:1, padding:"10px 6px", borderRadius:9,
                background:`${o.color}11`, border:`1px solid ${o.color}55`,
                color:o.color, cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:15, textAlign:"center",
              }}>
                <div>{o.code}</div>
                <div style={{ fontSize:9, opacity:0.7, marginTop:2 }}>{o.sub}</div>
              </button>
            ))}
          </div>
          {/* 送球組み立て */}
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>送球先（守備番号）</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {FIELDERS.filter(n => n !== num).map(n => (
              <button key={n} onClick={() => { setResult("送球"); setRelayParts(["-",n]); emit({result:"送球", relayParts:["-",n]}); }} style={{
                width:44, height:44, borderRadius:"50%",
                background:"#eceae3", border:"2px solid #1a3a1a44", color:"#666666",
                cursor:"pointer", fontFamily:"inherit", fontWeight:900, fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{n}</button>
            ))}
          </div>
          {/* ベースカバー（A/B/C/D） */}
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>ベースカバー</div>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            {[
              { code:"A", label:"1塁", color:"#c0392b" },
              { code:"B", label:"2塁", color:"#f97316" },
              { code:"C", label:"3塁", color:"#eab308" },
              { code:"D", label:"本塁", color:"#2d8a2d" },
            ].map(o => (
              <button key={o.code} onClick={() => {
                setResult(o.code);
                setRelayParts([o.code]);
                emit({ result: o.code, relayParts: [o.code] });
              }} style={{
                flex:1, padding:"10px 6px", borderRadius:9,
                background:`${o.color}11`, border:`1px solid ${o.color}55`,
                color:o.code, cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:16, textAlign:"center",
                color:o.color,
              }}>
                <div>{o.code}</div>
                <div style={{ fontSize:9, opacity:0.7, marginTop:2 }}>{o.label}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setBallType("")} style={{
            marginTop:4, background:"transparent", border:"1px solid #1a3a1a",
            color:"#555555", borderRadius:7, padding:"6px 14px",
            cursor:"pointer", fontFamily:"inherit", fontSize:12,
          }}>← 種別に戻る</button>
        </div>
      )}

      {/* ④ 方向（外野ヒットのみ） */}
      {step === "direction" && (
        <div>
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:12 }}>打球方向</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { code:"d", label:"前" },
              { code:"u", label:"オーバー" },
              { code:"r", label:"右" },
              { code:"l", label:"左" },
            ].map(o => (
              <button key={o.code} onClick={() => {
                setDirection(o.code);
                emit({ direction: o.code });
              }} style={{
                flex:1, padding:"18px 6px", borderRadius:9,
                background:"#eceae3", border:"1px solid #22c55e33",
                color:"#1a7a1a", cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:16, textAlign:"center",
              }}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => setResult("")} style={{
            marginTop:12, background:"transparent", border:"1px solid #1a3a1a",
            color:"#555555", borderRadius:7, padding:"6px 14px",
            cursor:"pointer", fontFamily:"inherit", fontSize:12,
          }}>← 結果に戻る</button>
        </div>
      )}

      {/* 送球組み立て続き（A/TO/E/-/数字） */}
      {step === "relay" && !relayDone && (
        <div>
          <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>送球の続き</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
            {FIELDERS.map(n => (
              <button key={n} onClick={() => addRelay(n)} style={{
                width:44, height:44, borderRadius:"50%",
                background:"#eceae3", border:"2px solid #1a3a1a", color:"#1a7a1a",
                cursor:"pointer", fontFamily:"inherit", fontWeight:900, fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{n}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <button onClick={() => addRelay("-")} style={{
              flex:1, padding:"10px 0", borderRadius:8, fontWeight:900, fontSize:22,
              background:"#eceae3", border:"1px solid #22c55e44", color:"#1a7a1a",
              cursor:"pointer", fontFamily:"inherit",
            }}>－</button>
            <button onClick={() => addRelay("E")} style={{
              flex:1, padding:"10px 0", borderRadius:8, fontWeight:900, fontSize:22,
              background:"#fce8e8", border:"1px solid #b4530966", color:"#b45309",
              cursor:"pointer", fontFamily:"inherit",
            }}>E</button>
            <button onClick={() => addRelay("A")} style={{
              flex:1, padding:"10px 0", borderRadius:8, fontWeight:800, fontSize:16,
              background:"#fce8e8", border:"1px solid #ef444466", color:"#c0392b",
              cursor:"pointer", fontFamily:"inherit",
            }}>A</button>
            <button onClick={() => addRelay("TO")} style={{
              flex:1, padding:"10px 0", borderRadius:8, fontWeight:800, fontSize:14,
              background:"#fff3e0", border:"1px solid #f9731666", color:"#f97316",
              cursor:"pointer", fontFamily:"inherit",
            }}>TO</button>
          </div>
          <button onClick={popRelay} style={{
            background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
            borderRadius:7, padding:"6px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:12,
          }}>← 戻す</button>
        </div>
      )}

      {/* 完了表示 */}
      {(relayDone || (step === "relay" && isDone)) && (
        <div style={{
          marginTop:8, padding:"12px 14px", borderRadius:9,
          background:"#e8f5e9", border:"1px solid #22c55e33",
          color:"#1a7a1a", fontSize:13, fontWeight:700,
        }}>
          ✓ 記録完了：<span style={{ fontSize:18, letterSpacing:2 }}>{built}</span>
        </div>
      )}
    </div>
  );
}

function ReasonPicker({ value, onChange, options }) {
  const batterOptions = options.filter(o => o.code.startsWith("("));
  const playOptions = options.filter(o => !o.code.startsWith("("));
  return (
    <div>
      {batterOptions.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:"#a78bfa88", fontWeight:700, marginBottom:6, letterSpacing:1 }}>打順による進塁</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {batterOptions.map(o => {
              const sel = value === o.code;
              return (
                <button key={o.code} onClick={() => onChange(sel ? "" : o.code)} style={{
                  width:42, height:42, borderRadius:"50%",
                  background: sel ? "#a78bfa33" : "#eceae3",
                  border: `2px solid ${sel ? "#a78bfa" : "#2a2a4a"}`,
                  color: sel ? "#a78bfa" : "#555555",
                  cursor:"pointer", fontFamily:"inherit", fontWeight:900, fontSize:15,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, transition:"all 0.1s",
                }}>
                  ({o.code.replace(/[()]/g,"")})
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6, letterSpacing:1 }}>プレー</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5 }}>
        {playOptions.map(o => {
          const sel = value === o.code;
          return (
            <button key={o.code} onClick={() => onChange(sel ? "" : o.code)} style={{
              background: sel ? `${o.color}33` : "#eceae3",
              border: `1px solid ${sel ? o.color : o.color+"44"}`,
              color: sel ? o.color : o.color+"99",
              borderRadius:8, padding:"8px 4px", cursor:"pointer", fontFamily:"inherit",
              textAlign:"center", transition:"all 0.1s",
            }}>
              <div style={{ fontSize:13, fontWeight:800 }}>{o.code}</div>
              <div style={{ fontSize:8, opacity:0.8 }}>{o.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SymbolBuilder：記号を組み合わせて入力するUI ─────────────────────────
const SYMBOL_ROWS = [
  {
    label: "守備番号",
    color: "#1a7a1a",
    symbols: [
      { s:"1", label:"投" },
      { s:"2", label:"捕" },
      { s:"3", label:"一" },
      { s:"4", label:"二" },
      { s:"5", label:"三" },
      { s:"6", label:"遊" },
      { s:"7", label:"左" },
      { s:"8", label:"中" },
      { s:"9", label:"右" },
    ]
  },
  {
    label: "打球・送球",
    color: "#a8a29e",
    symbols: [
      { s:"^", label:"フライ" },
      { s:"-", label:"送球" },
      { s:"E", label:"エラー" },
      { s:"A", label:"1塁(ベース)" },
      { s:"B", label:"2塁(ベース)" },
      { s:"C", label:"3塁(ベース)" },
      { s:"D", label:"本塁(ベース)" },
      { s:"TO", label:"タッチ" },
      { s:"d", label:"前" },
      { s:"u", label:"オーバー" },
      { s:"r", label:"右" },
      { s:"l", label:"左" },
    ]
  },
  {
    label: "打席結果",
    color: "#1a7a1a",
    symbols: [
      { s:"K",   label:"見逃三振" },
      { s:"SK",  label:"空振三振" },
      { s:"KK",  label:"振逃げ",  flip:true },
      { s:"B",   label:"四球" },
      { s:"HBP", label:"死球" },
      { s:"SAC", label:"犠打" },
      { s:"SF",  label:"犠飛" },
      { s:"E",   label:"失策" },
      { s:"FC",  label:"野選" },
    ]
  },
  {
    label: "進塁理由",
    color: "#a78bfa",
    symbols: [
      { s:"H",   label:"安打" },
      { s:"2B",  label:"二塁打" },
      { s:"3B",  label:"三塁打" },
      { s:"HR",  label:"本塁打" },
      { s:"S",   label:"盗塁" },
      { s:"WP",  label:"暴投" },
      { s:"PB",  label:"捕逸" },
      { s:"BK",  label:"ボーク" },
    ]
  },
  {
    label: "打順による進塁（丸数字）",
    color: "#c4b5fd",
    symbols: [
      { s:"①", label:"1番" },
      { s:"②", label:"2番" },
      { s:"③", label:"3番" },
      { s:"④", label:"4番" },
      { s:"⑤", label:"5番" },
      { s:"⑥", label:"6番" },
      { s:"⑦", label:"7番" },
      { s:"⑧", label:"8番" },
      { s:"⑨", label:"9番" },
    ]
  },
];

// 表示用プレビュー：^/-を上付き、ヒットコード(H/2B/3B/HR/IH)は非表示
const HIT_CODES_PREVIEW = ["IH","2B","3B","HR","H"];
function renderSymbolPreview(value) {
  if (!value) return null;
  // ヒットコードを末尾から除去して表示
  let display = value;
  for (const code of HIT_CODES_PREVIEW) {
    if (display.endsWith(code)) {
      display = display.slice(0, -code.length);
      break;
    }
  }
  if (!display) return null;
  // ^数字 または -数字 → 上付き表示
  const parts = [];
  let i = 0;
  while (i < display.length) {
    const ch = display[i];
    if ((ch === "^" || ch === "-") && i + 1 < display.length && /\d/.test(display[i+1])) {
      parts.push(
        <span key={i} style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", lineHeight:1 }}>
          <span style={{ fontSize:11, color:"#a8a29e", lineHeight:1 }}>{ch}</span>
          <span style={{ fontSize:22, lineHeight:1 }}>{display[i+1]}</span>
        </span>
      );
      i += 2;
    } else {
      parts.push(<span key={i}>{ch}</span>);
      i++;
    }
  }
  return parts;
}

function SymbolBuilder({ value, onChange, areaLabel, overwrite = false }) {
  const parts = value ? value.split("") : [];

  const append = (s) => {
    // overwirteモードは常に上書き（進塁理由など単一選択の場合）
    const next = overwrite ? s : value + s;
    onChange(next);
  };

  const pop = () => {
    // 末尾の文字を削除（マルチバイト対応）
    const arr = [...value];
    arr.pop();
    onChange(arr.join(""));
  };

  const clear = () => onChange("");

  return (
    <div>
      <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>{areaLabel}</div>

      {/* プレビュー：^や-を数字の上に小さく表示 */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <div style={{
          flex:1, background:"#f8f7f2", border:"1px solid #22c55e55",
          borderRadius:8, padding:"10px 14px", minHeight:48,
          fontSize:22, fontWeight:900, color:"#1a7a1a", letterSpacing:3,
          display:"flex", alignItems:"center", gap:2,
        }}>
          {value ? renderSymbolPreview(value) : <span style={{ color:"#cccccc", fontSize:13, fontWeight:400 }}>未入力</span>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <button onClick={pop} disabled={!value} style={{
            background:"#eceae3", border:"1px solid #1a3a1a", color: value ? "#666666" : "#2d6a2d",
            borderRadius:7, padding:"8px 10px", cursor: value ? "pointer" : "default",
            fontFamily:"inherit", fontSize:13,
          }}>←</button>
          <button onClick={clear} disabled={!value} style={{
            background:"#fce8e8", border:"1px solid #7f1d1d44", color: value ? "#c0392b" : "#fce8e8",
            borderRadius:7, padding:"8px 10px", cursor: value ? "pointer" : "default",
            fontFamily:"inherit", fontSize:13,
          }}>✕</button>
        </div>
      </div>

      {/* 記号ボタン群 */}
      {SYMBOL_ROWS.map(row => (
        <div key={row.label} style={{ marginBottom:12 }}>
          <div style={{ fontSize:9, color:`${row.color}88`, fontWeight:700, marginBottom:5, letterSpacing:1 }}>
            {row.label}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {row.symbols.map(sym => (
              <button key={sym.s} onClick={() => append(sym.s)} style={{
                padding:"7px 8px", borderRadius:8, minWidth:40,
                background:`${row.color}11`, border:`1px solid ${row.color}33`,
                color:row.color, cursor:"pointer", fontFamily:"inherit",
                fontWeight:800, fontSize:13, textAlign:"center",
                display:"flex", flexDirection:"column", alignItems:"center", gap:1,
              }}>
                <span style={{ transform: sym.flip ? "scaleX(-1)" : "none", display:"inline-block", fontSize:14 }}>
                  {sym.flip ? "K" : sym.s}
                </span>
                <span style={{ fontSize:8, opacity:0.7, fontWeight:400 }}>{sym.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TranscribeCellModal：転記モード専用モーダル ─────────────────────────
function TranscribeCellModal({ cell, playerName, inning, onSave, onClose }) {
  const [c, setC] = useState(() => JSON.parse(JSON.stringify(cell)));
  const [area, setArea] = useState(null); // 選択中のエリア
  const [hoverArea, setHoverArea] = useState(null); // ホバー中のエリア

  const s = 220;
  const pitchW = 40;
  const areaLeft = pitchW + 1;
  const areaRight = s;
  const cx = (areaLeft + areaRight) / 2;
  const cy = s / 2;
  const r2 = (areaRight - areaLeft) * 0.28;
  const top    = { x: cx,      y: cy - r2 };
  const right  = { x: cx + r2, y: cy      };
  const bottom = { x: cx,      y: cy + r2 };
  const left   = { x: cx - r2, y: cy      };
  const dc = "#2d6a2d";

  const areaColor = (key) => area === key ? "#1a7a1a" : "#2d6a2d";
  const areaWidth = (key) => area === key ? 3 : 1.5;

  const handleSvgClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left + areaLeft;
    const my = e.clientY - rect.top;
    const dx = mx - cx;
    const dy = my - cy;
    if (Math.abs(dx) < r2 * 0.35 && Math.abs(dy) < r2 * 0.35) setArea("center");
    else if (dx > 0 && dy > 0) setArea("br");
    else if (dx > 0 && dy < 0) setArea("tr");
    else if (dx < 0 && dy < 0) setArea("tl");
    else setArea("bl");
  };

  const setField = (f, v) => setC(p => ({ ...p, [f]: p[f] === v ? "" : v }));

  const codeColor = (code) => {
    if (!code) return "#94a3b8";
    const maps = { "K":"#ea580c","SK":"#f97316","KK":"#c2410c","B":"#2563eb","HBP":"#7c3aed",
      "SAC":"#0891b2","SF":"#0e7490","E":"#b45309","FC":"#92400e" };
    return maps[code] || "#1a7a1a";
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200,
    }}>
      <div style={{
        background:"#f0efe9", border:"1px solid #1a3a1a",
        borderRadius:"16px 16px 0 0",
        padding:"16px 16px 32px", width:"100%", maxWidth:480,
        maxHeight:"90vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* ヘッダー */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <span style={{ fontWeight:800, color:"#1a7a1a", fontSize:15 }}>{playerName}</span>
            <span style={{ color:"#2d8a2d", fontSize:12, marginLeft:8 }}>{inning+1}回</span>
            <span style={{ marginLeft:8, fontSize:10, fontWeight:700, padding:"2px 8px",
              borderRadius:10, background:"#fff8e1", border:"1px solid #f59e0b66", color:"#fbbf24" }}>
              📝 転記
            </span>
          </div>
          <button onClick={() => onSave(c)} style={{
            background:"#166534", border:"none", color:"#fff",
            borderRadius:8, padding:"6px 16px",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:800,
          }}>保存 ✓</button>
        </div>

        {/* 拡大セル */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14,
          background:"#f8f7f2", borderRadius:10, padding:16 }}>
          <div style={{ position:"relative", width:s, height:s }}>
            {/* 左欄（投球） */}
            <div onClick={() => setArea("pitch")}
              onMouseEnter={e => { if(area!=="pitch") e.currentTarget.style.background="#c8e6c966"; }}
              onMouseLeave={e => { if(area!=="pitch") e.currentTarget.style.background="#eceae3"; }}
              style={{
              position:"absolute", left:0, top:0, width:pitchW, height:s,
              background: area==="pitch" ? "#c8e6c933" : "#eceae3",
              border:`1px solid ${area==="pitch" ? "#2d8a2d" : "#2d6a2d"}`,
              borderRadius:6, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <span style={{ fontSize:10, color: area==="pitch" ? "#1a7a1a" : "#555555",
                fontWeight:700, writingMode:"vertical-rl" }}>投球</span>
            </div>
            {/* ダイヤモンド */}
            <svg width={s - pitchW} height={s}
              style={{ position:"absolute", left:pitchW, cursor:"pointer" }}
              onClick={handleSvgClick}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mx = e.clientX - rect.left + areaLeft;
                const my = e.clientY - rect.top;
                const dx = mx - cx; const dy = my - cy;
                let hov = "center";
                if (Math.abs(dx) < r2*0.35 && Math.abs(dy) < r2*0.35) hov = "center";
                else if (dx > 0 && dy > 0) hov = "br";
                else if (dx > 0 && dy < 0) hov = "tr";
                else if (dx < 0 && dy < 0) hov = "tl";
                else hov = "bl";
                setHoverArea(hov);
              }}
              onMouseLeave={() => setHoverArea(null)}
            >
              {/* 象限ごとのホバーオーバーレイ：各頂点→セル角の三角形 */}
              {(() => {
                const W = s - areaLeft;
                const rx = right.x - areaLeft; const ry = right.y;
                const tx = top.x - areaLeft;   const ty = top.y;
                const bx = bottom.x - areaLeft; const by = bottom.y;
                const lx = left.x - areaLeft;  const ly = left.y;
                const quads = [
                  // 右下：right頂点 → bottom頂点 → 右下角(W,s)
                  { key:"br", pts:`${rx},${ry} ${bx},${by} ${W},${s}` },
                  // 右上：top頂点 → right頂点 → 右上角(W,0)
                  { key:"tr", pts:`${tx},${ty} ${rx},${ry} ${W},0` },
                  // 左上：left頂点 → top頂点 → 左上角(0,0)
                  { key:"tl", pts:`${lx},${ly} ${tx},${ty} 0,0` },
                  // 左下：bottom頂点 → left頂点 → 左下角(0,s)
                  { key:"bl", pts:`${bx},${by} ${lx},${ly} 0,${s}` },
                ];
                return quads.map(({key,pts}) => (
                  <polygon key={key} points={pts}
                    fill={area===key ? "#2d8a2d33" : hoverArea===key ? "#2d8a2d18" : "transparent"}
                    style={{ pointerEvents:"none", transition:"fill 0.12s" }}/>
                ));
              })()}
              <circle cx={cx-areaLeft} cy={cy} r={r2*0.35}
                fill={area==="center" ? "#fbbf2433" : hoverArea==="center" ? "#fbbf2422" : "transparent"}
                style={{ pointerEvents:"none" }}/>
              <line x1={top.x-areaLeft} y1={top.y} x2={cx-areaLeft} y2={0} stroke={dc} strokeWidth={1}/>
              <line x1={right.x-areaLeft} y1={right.y} x2={s-areaLeft} y2={cy} stroke={dc} strokeWidth={1}/>
              <line x1={bottom.x-areaLeft} y1={bottom.y} x2={cx-areaLeft} y2={s} stroke={dc} strokeWidth={1}/>
              <line x1={left.x-areaLeft} y1={left.y} x2={0} y2={cy} stroke={dc} strokeWidth={1}/>
              {(() => {
                const hb = { "H":1,"IH":1,"2B":2,"3B":3,"HR":4 };
                const bases = hb[c.hitType] || 0;
                const rc = "#c0392b";
                const lc2 = (side) => bases >= side ? rc : (area === ["br","tr","tl","bl"][side-1] ? "#1a7a1a" : "#2d6a2d");
                const lw2 = (side) => bases >= side ? 3 : (area === ["br","tr","tl","bl"][side-1] ? areaWidth(["br","tr","tl","bl"][side-1]) : 1.5);
                return (<>
                  <line x1={bottom.x-areaLeft} y1={bottom.y} x2={right.x-areaLeft} y2={right.y} stroke={bases>=1?rc:areaColor("br")} strokeWidth={bases>=1?3:areaWidth("br")}/>
                  <line x1={right.x-areaLeft} y1={right.y} x2={top.x-areaLeft} y2={top.y} stroke={bases>=2?rc:areaColor("tr")} strokeWidth={bases>=2?3:areaWidth("tr")}/>
                  <line x1={top.x-areaLeft} y1={top.y} x2={left.x-areaLeft} y2={left.y} stroke={bases>=3?rc:areaColor("tl")} strokeWidth={bases>=3?3:areaWidth("tl")}/>
                  <line x1={left.x-areaLeft} y1={left.y} x2={bottom.x-areaLeft} y2={bottom.y} stroke={bases>=4?rc:areaColor("bl")} strokeWidth={bases>=4?3:areaWidth("bl")}/>
                </>);
              })()}
              <circle cx={cx-areaLeft} cy={cy} r={area==="center"?14:hoverArea==="center"?12:10}
                fill={area==="center"?"#fbbf2433":hoverArea==="center"?"#fbbf2422":"transparent"}
                stroke={area==="center"?"#fbbf24":hoverArea==="center"?"#fbbf2488":dc}
                strokeWidth={area==="center"?2:hoverArea==="center"?1.5:1}/>
              {/* 現在の値を表示 */}
              {c.br && (() => {
                let display = c.br;
                for (const code of ["IH","2B","3B","HR","H"]) {
                  if (display.endsWith(code)) { display = display.slice(0,-code.length); break; }
                }
                return display ? <text x={right.x-areaLeft-8} y={bottom.y-8} fontSize={9} fill="#1a7a1a" fontWeight={700}>{display}</text> : null;
              })()}
              {c.tr && <text x={right.x-areaLeft-8} y={top.y+14} fontSize={9} fill="#1a7a1a" fontWeight={700}>{c.tr}</text>}
              {c.tl && <text x={left.x-areaLeft+4} y={top.y+14} fontSize={9} fill="#1a7a1a" fontWeight={700}>{c.tl}</text>}
              {c.bl && <text x={left.x-areaLeft+4} y={bottom.y-8} fontSize={9} fill="#1a7a1a" fontWeight={700}>{c.bl}</text>}
              {c.center && <text x={cx-areaLeft} y={cy+4} fontSize={11} textAnchor="middle" fill="#fbbf24" fontWeight={900}>{c.center}</text>}
            </svg>
          </div>
        </div>

        {/* 入力エリア */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {!area && (
            <div style={{ color:"#555555", fontSize:12, textAlign:"center", paddingTop:20 }}>
              上のセルのエリアをタップして編集
            </div>
          )}

          {/* 投球欄 */}
          {area === "pitch" && (
            <div>
              <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:8 }}>投球記号</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                {PITCH_SYMBOLS.map(ps => (
                  <button key={ps.s} onClick={() => setC(p => ({ ...p, pitches: [...p.pitches, ps.s] }))} style={{
                    background:`${ps.color}11`, border:`1px solid ${ps.color}44`,
                    color:ps.color, borderRadius:7, padding:"8px 12px",
                    cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:700,
                  }}>{ps.s}<span style={{ fontSize:10, opacity:0.7, marginLeft:4 }}>{ps.label}</span></button>
                ))}
                <button onClick={() => setC(p => ({ ...p, pitches: p.pitches.slice(0,-1) }))} style={{
                  background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
                  borderRadius:7, padding:"8px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:13,
                }}>← 削除</button>
              </div>
              <div style={{ background:"#f8f7f2", border:"1px solid #1a3a1a", borderRadius:8,
                padding:"10px 12px", fontSize:18, letterSpacing:3, color:"#1a7a1a" }}>
                {c.pitches.length > 0
                  ? <>{c.pitches.join("")}<span style={{ color:"#555555", fontSize:11, marginLeft:6 }}>{c.pitches.length}球</span></>
                  : <span style={{ color:"#cccccc", fontSize:12 }}>投球なし</span>}
              </div>
            </div>
          )}

          {/* 右下（1塁）/ 右上（2塁）/ 左上（3塁）/ 左下（本塁）共通：記号組み立てUI */}
          {["br","tr","tl","bl"].includes(area) && (
            <SymbolBuilder
              value={c[area]}
              overwrite={area !== "br"}
              onChange={v => {
                if (area === "br") {
                  const HIT_MAP = { "H":1, "IH":1, "2B":2, "3B":3, "HR":4 };
                  const hitType = Object.keys(HIT_MAP).find(code => v === code || v.endsWith(code)) || "";
                  // brにはhitCodeを含めない（守備番号＋方向のみ）
                  let brVal = v;
                  if (hitType) {
                    brVal = v.slice(0, v.length - hitType.length);
                  }
                  setC(p => ({ ...p, br: brVal, hitType }));
                } else {
                  // tr/tl/bl は進塁理由を上書き（追記しない）
                  // SymbolBuilderからは文字追記されてくるが、
                  // 進塁理由コード（S/WP/PB/BK/H/2B/3B/HR/①〜など）を検出したら上書き
                  const ADVANCE_CODES = ["S","WP","PB","BK","H","2B","3B","HR","E",
                    "①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩",
                    "⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];
                  const prev = "";
                  const isOverwrite = ADVANCE_CODES.some(code => v.endsWith(code) && v.length <= code.length + 2);
                  if (isOverwrite || ADVANCE_CODES.includes(v)) {
                    // 単体のコードなら上書き
                    setC(p => ({ ...p, [area]: v }));
                  } else {
                    setC(p => ({ ...p, [area]: v }));
                  }
                }
              }}
              areaLabel={area==="br"?"右下（1塁到達・打席結果）":area==="tr"?"右上（2塁到達）":area==="tl"?"左上（3塁到達）":"左下（本塁到達）"}
            />
          )}

          {/* 中央 */}
          {area === "center" && (
            <div>
              <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:12 }}>中央</div>
              <div style={{ display:"flex", gap:8 }}>
                {/* 得点 */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6 }}>得点</div>
                  <select
                    value={["Ⅰ","Ⅱ","Ⅲ","ℓ"].includes(c.center) ? "" : c.center}
                    onChange={e => setC(p => ({ ...p, center: e.target.value }))}
                    style={{
                      width:"100%", background:"#f8f7f2", border:"1px solid #22c55e55",
                      borderRadius:8, padding:"10px 8px", color:"#1a7a1a",
                      fontSize:16, fontWeight:700, fontFamily:"inherit", outline:"none",
                    }}>
                    <option value="">-</option>
                    {CENTER_OPTIONS.filter(o => !["Ⅰ","Ⅱ","Ⅲ","ℓ","//"].includes(o.code)).map(o => (
                      <option key={o.code} value={o.code}>{o.code}</option>
                    ))}
                  </select>
                </div>
                {/* アウト */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#ef444488", fontWeight:700, marginBottom:6 }}>アウト</div>
                  <select
                    value={["Ⅰ","Ⅱ","Ⅲ"].includes(c.center) ? c.center : ""}
                    onChange={e => setC(p => ({ ...p, center: e.target.value }))}
                    style={{
                      width:"100%", background:"#f8f7f2", border:"1px solid #ef444455",
                      borderRadius:8, padding:"10px 8px", color:"#c0392b",
                      fontSize:16, fontWeight:700, fontFamily:"inherit", outline:"none",
                    }}>
                    <option value="">-</option>
                    {["Ⅰ","Ⅱ","Ⅲ"].map((o,i) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                {/* 残塁 */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#f59e0b88", fontWeight:700, marginBottom:6 }}>残塁</div>
                  <button
                    onClick={() => setC(p => ({ ...p, center: p.center==="ℓ" ? "" : "ℓ" }))}
                    style={{
                      width:"100%", padding:"10px 0", borderRadius:8,
                      background: c.center==="ℓ" ? "#fff8e1" : "#eceae3",
                      border:`1px solid ${c.center==="ℓ" ? "#f59e0b" : "#2d6a2d"}`,
                      color: c.center==="ℓ" ? "#fbbf24" : "#333333",
                      cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:20,
                    }}>ℓ</button>
                </div>
                {/* イニングチェンジ */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#6b757088", fontWeight:700, marginBottom:6 }}>攻守交代</div>
                  <button
                    onClick={() => setC(p => ({ ...p, center: p.center==="//" ? "" : "//" }))}
                    style={{
                      width:"100%", padding:"10px 0", borderRadius:8,
                      background: c.center==="//" ? "#e0ddd6" : "#eceae3",
                      border:`1px solid ${c.center==="//" ? "#666666" : "#2d6a2d"}`,
                      color: c.center==="//" ? "#9ca3af" : "#333333",
                      cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:16,
                    }}>//</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} style={{
          marginTop:10, background:"transparent", border:"1px solid #1a3a1a",
          color:"#555555", borderRadius:8, padding:"8px 0",
          cursor:"pointer", fontFamily:"inherit", fontSize:13, flexShrink:0,
        }}>保存せず戻る</button>
      </div>
    </div>
  );
}

function CellModal({ cell, playerName, inning, onSave, onClose, transcribeMode = false }) {
  const [c, setC] = useState(() => JSON.parse(JSON.stringify(cell)));
  const [step, setStep] = useState("pitch");
  const [pitchWarning, setPitchWarning] = useState("");
  const [fromAction, setFromAction] = useState(false);

  // 打席終了判定（useStateの後に計算）
  const { balls: ballCount, strikes: strikeCount } = calcCount(c.pitches);
  const atBatOver = ballCount >= 4 || strikeCount >= 3 || !!c.br;

  const addPitch = sym => {
    if (!transcribeMode && atBatOver) {
      if (strikeCount >= 3) setPitchWarning("もう三振してるよ！");
      else if (ballCount >= 4) setPitchWarning("もう四球だよ！");
      else if (c.br) setPitchWarning("打席結果が確定してるよ！");
      setTimeout(() => setPitchWarning(""), 2000);
      return;
    }
    setPitchWarning("");
    setC(p => {
      const newPitches = [...p.pitches, sym];
      const { balls: newBalls, strikes: newStrikes } = calcCount(newPitches);
      let br = p.br;
      if (newBalls >= 4 && !br) br = "B";
      if (newStrikes >= 3 && !br) {
        // 空振り・バント空振りはSK、見逃し・バントファウルはK
        br = (sym === "●" || sym === "◇") ? "SK" : "K";
      }
      const newCell = { ...p, pitches: newPitches, br };
      if (!transcribeMode && br && !p.br) {
        setTimeout(() => onSave(newCell), 300);
      }
      return newCell;
    });
  };
  const popPitch = () => {
    setPitchWarning("");
    setC(p => ({ ...p, pitches: p.pitches.slice(0,-1), br: "", center: "" }));
  };
  const setField = (f, v) => setC(p => ({ ...p, [f]: p[f] === v ? "" : v }));
  const STEPS = [
    { key:"pitch", label:"投球" },
    { key:"base1", label:"右下±1塁" },
    { key:"base2", label:"右上±2塁" },
    { key:"base3", label:"左上±3塁" },
    { key:"home", label:"左下±本塁" },
    { key:"center", label:"中央" },
  ];
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200,
    }}>
      <div style={{
        background:"#f0efe9", border:"1px solid #1a3a1a",
        borderRadius:"16px 16px 0 0",
        padding:"16px 16px 32px", width:"100%", maxWidth:480,
        maxHeight:"80vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <span style={{ fontWeight:800, color:"#1a7a1a", fontSize:15 }}>{playerName}</span>
            <span style={{ color:"#2d8a2d", fontSize:12, marginLeft:8 }}>{inning+1}回</span>
            {transcribeMode && (
              <span style={{
                marginLeft:8, fontSize:10, fontWeight:700, padding:"2px 8px",
                borderRadius:10, background:"#fff8e1", border:"1px solid #f59e0b66",
                color:"#fbbf24",
              }}>📝 転記</span>
            )}
          </div>
          {pitchWarning && (
            <div style={{
              flex:1, textAlign:"center",
              fontSize:12, fontWeight:800, color:"#c0392b",
            }}>
              ⚠️ {pitchWarning}
            </div>
          )}
          <button onClick={() => onSave(c)} style={{
            background:"#166534", border:"none", color:"#fff",
            borderRadius:8, padding:"6px 16px",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:800,
          }}>保存 ✓</button>
        </div>
        <div style={{ display:"flex", gap:3, marginBottom:10, flexShrink:0, overflowX:"auto" }}>
          {STEPS.map(s => (
            <button key={s.key} onClick={() => setStep(s.key)} style={{
              padding:"5px 8px", borderRadius:6, border:"1px solid",
              borderColor: step===s.key ? "#2d8a2d" : "#2d6a2d",
              background: step===s.key ? "#c8e6c933" : "transparent",
              color: step===s.key ? "#1a7a1a" : "#555555",
              cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:11,
              whiteSpace:"nowrap", flexShrink:0,
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {step === "pitch" && (
            <div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                {PITCH_SYMBOLS.map(ps => (
                  <button key={ps.s} onClick={() => addPitch(ps.s)} style={{
                    background:`${ps.color}11`, border:`1px solid ${ps.color}44`,
                    color: ps.color, borderRadius:7, padding:"8px 12px",
                    cursor:"pointer", fontFamily:"inherit", fontSize:16, fontWeight:700,
                    opacity: atBatOver ? 0.4 : 1,
                  }}>
                    {ps.s}<span style={{ fontSize:10, opacity:0.7, marginLeft:4 }}>{ps.label}</span>
                  </button>
                ))}
                <button onClick={popPitch} style={{
                  background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
                  borderRadius:7, padding:"8px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:13,
                }}>← 削除</button>
                <button onClick={() => { setFromAction(true); setStep("base1"); }} style={{
                  background:"#e3f2fd", border:"1px solid #3b82f688", color:"#60a5fa",
                  borderRadius:7, padding:"8px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:13,
                  fontWeight:800, letterSpacing:0.5,
                }}>⚡ アクション</button>
              </div>

              <div style={{
                background:"#f8f7f2", border:"1px solid #1a3a1a", borderRadius:8,
                padding:"10px 12px", minHeight:40,
                fontSize:18, letterSpacing:3, color:"#1a7a1a",
              }}>
                {c.pitches.length > 0
                  ? <>{c.pitches.join("")}<span style={{ color:"#555555", fontSize:11, marginLeft:6 }}>{c.pitches.length}球</span></>
                  : null}
              </div>
            </div>
          )}
          {step === "base1" && (
            <FieldInputPicker
              value={c.br}
              hideQuickResults={fromAction}
              onChange={v => {
                if (typeof v === "object") {
                  setC(p => ({ ...p, br: v.br, hitType: v.hitType }));
                  if (!transcribeMode) setTimeout(() => onSave({ ...c, br: v.br, hitType: v.hitType }), 300);
                } else {
                  setC(p => ({ ...p, br: v, hitType: "" }));
                }
              }}
            />
          )}
          {step === "base2" && (
            <div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6, letterSpacing:1 }}>2塁到達理由</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input
                    type="text"
                    value={c.tr}
                    onChange={e => setC(p => ({ ...p, tr: e.target.value }))}
                    placeholder="例: 1-3"
                    style={{
                      flex:1, background:"#f8f7f2", border:"1px solid #22c55e55",
                      borderRadius:8, padding:"10px 12px", color:"#1a7a1a",
                      fontSize:18, fontWeight:800, fontFamily:"inherit", outline:"none",
                      letterSpacing:2,
                    }}
                  />
                  {c.tr && (
                    <button onClick={() => setC(p => ({ ...p, tr: "" }))} style={{
                      background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
                      borderRadius:8, padding:"10px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:16,
                    }}>✕</button>
                  )}
                </div>
              </div>
              <ReasonPicker value={c.tr} onChange={v => setField("tr", v)} options={REACH_REASONS}/>
            </div>
          )}
          {step === "base3" && (
            <div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6, letterSpacing:1 }}>3塁到達理由</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input
                    type="text"
                    value={c.tl}
                    onChange={e => setC(p => ({ ...p, tl: e.target.value }))}
                    placeholder="例: 1-3"
                    style={{
                      flex:1, background:"#f8f7f2", border:"1px solid #22c55e55",
                      borderRadius:8, padding:"10px 12px", color:"#1a7a1a",
                      fontSize:18, fontWeight:800, fontFamily:"inherit", outline:"none",
                      letterSpacing:2,
                    }}
                  />
                  {c.tl && (
                    <button onClick={() => setC(p => ({ ...p, tl: "" }))} style={{
                      background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
                      borderRadius:8, padding:"10px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:16,
                    }}>✕</button>
                  )}
                </div>
              </div>
              <ReasonPicker value={c.tl} onChange={v => setField("tl", v)} options={REACH_REASONS}/>
            </div>
          )}
          {step === "home" && (
            <div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6, letterSpacing:1 }}>本塁到達理由</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input
                    type="text"
                    value={c.bl}
                    onChange={e => setC(p => ({ ...p, bl: e.target.value }))}
                    placeholder="例: 1-3"
                    style={{
                      flex:1, background:"#f8f7f2", border:"1px solid #22c55e55",
                      borderRadius:8, padding:"10px 12px", color:"#1a7a1a",
                      fontSize:18, fontWeight:800, fontFamily:"inherit", outline:"none",
                      letterSpacing:2,
                    }}
                  />
                  {c.bl && (
                    <button onClick={() => setC(p => ({ ...p, bl: "" }))} style={{
                      background:"#fce8e8", border:"1px solid #7f1d1d44", color:"#c0392b",
                      borderRadius:8, padding:"10px 12px", cursor:"pointer", fontFamily:"inherit", fontSize:16,
                    }}>✕</button>
                  )}
                </div>
              </div>
              <ReasonPicker value={c.bl} onChange={v => setField("bl", v)} options={REACH_REASONS}/>
            </div>
          )}
          {step === "center" && (
            <div>
              {/* アウト・残塁 */}
              <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                {CENTER_OPTIONS.filter(o => ["Ⅰ","Ⅱ","Ⅲ","ℓ","//"].includes(o.code)).map(o => (
                  <button key={o.code} onClick={() => setField("center", o.code)} style={{
                    flex:1, background: c.center===o.code ? `${o.color}33` : "#eceae3",
                    border:`1px solid ${c.center===o.code ? o.color : "#2d6a2d"}`,
                    color: c.center===o.code ? o.color : "#333333",
                    borderRadius:8, padding:"10px 4px",
                    cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:16,
                  }}>
                    <div>{o.code}</div>
                    <div style={{ fontSize:9, opacity:0.7 }}>{o.label}</div>
                  </button>
                ))}
              </div>
              {/* 得点（プルダウン） */}
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:6 }}>得点</div>
                  <select
                    value={["Ⅰ","Ⅱ","Ⅲ","ℓ"].includes(c.center) ? "" : c.center}
                    onChange={e => setField("center", e.target.value)}
                    style={{
                      width:"100%", background:"#f8f7f2", border:"1px solid #22c55e55",
                      borderRadius:8, padding:"10px 8px", color:"#1a7a1a",
                      fontSize:16, fontWeight:700, fontFamily:"inherit", outline:"none",
                    }}>
                    <option value="">-</option>
                    {CENTER_OPTIONS.filter(o => !["Ⅰ","Ⅱ","Ⅲ","ℓ","//"].includes(o.code)).map(o => (
                      <option key={o.code} value={o.code}>{o.code}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#ef444488", fontWeight:700, marginBottom:6 }}>アウト</div>
                  <select
                    value={["Ⅰ","Ⅱ","Ⅲ"].includes(c.center) ? c.center : ""}
                    onChange={e => setField("center", e.target.value)}
                    style={{
                      width:"100%", background:"#f8f7f2", border:"1px solid #ef444455",
                      borderRadius:8, padding:"10px 8px", color:"#c0392b",
                      fontSize:16, fontWeight:700, fontFamily:"inherit", outline:"none",
                    }}>
                    <option value="">-</option>
                    {["Ⅰ","Ⅱ","Ⅲ"].map((o,i) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#f59e0b88", fontWeight:700, marginBottom:6 }}>残塁</div>
                  <button
                    onClick={() => setField("center", "ℓ")}
                    style={{
                      width:"100%", padding:"10px 0", borderRadius:8,
                      background: c.center==="ℓ" ? "#fff8e1" : "#eceae3",
                      border:`1px solid ${c.center==="ℓ" ? "#f59e0b" : "#2d6a2d"}`,
                      color: c.center==="ℓ" ? "#fbbf24" : "#333333",
                      cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:20,
                    }}>ℓ</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          marginTop:10, background:"transparent", border:"1px solid #1a3a1a",
          color:"#555555", borderRadius:8, padding:"8px 0",
          cursor:"pointer", fontFamily:"inherit", fontSize:13, flexShrink:0,
        }}>保存せず戻る</button>
      </div>
    </div>
  );
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize:10, color:"#22c55e88", fontWeight:700, marginBottom:5, letterSpacing:1 }}>
    {children}
  </div>
);

function InlineEdit({ value, onChange, placeholder, bold, color, size = 13 }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing)
    return (
      <input autoFocus value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onChange(v); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(v); setEditing(false); } }}
        style={{
          background:"#f8f7f2", border:"1px solid #22c55e", borderRadius:4,
          color:color||"#1a1a1a", padding:"2px 6px", fontSize:size,
          fontFamily:"inherit", fontWeight:bold?700:400, outline:"none", width:"100%", minWidth:60,
        }}/>
    );
  return (
    <span onClick={() => { setV(value); setEditing(true); }} title="クリックして編集"
      style={{
        cursor:"text", color:color||"#1a1a1a", fontWeight:bold?700:400, fontSize:size,
        borderBottom:"1px dashed #1e3a1e", paddingBottom:1, display:"inline-block", minWidth:40,
      }}>
      {value || <span style={{ opacity:0.3 }}>{placeholder}</span>}
    </span>
  );
}

function TeamToggle({ teams, active, onChange, onNameChange }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
        {[0,1].map(ti => (
          <button key={ti} onClick={() => onChange(ti)} style={{
            flex:1, padding:"7px 0", borderRadius:8, border:"1px solid",
            borderColor: active===ti ? "#2d8a2d" : "#2d6a2d",
            background: active===ti ? "#c8e6c933" : "transparent",
            color: active===ti ? "#1a7a1a" : "#555555",
            cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
          }}>
            {["先攻","後攻"][ti]}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ color:"#555555", fontSize:12 }}>チーム名：</span>
        <InlineEdit value={teams[active]} onChange={v => onNameChange(active, v)}
          placeholder="チーム名" bold color="#1a7a1a" size={15}/>
      </div>
    </div>
  );
}

const thS = {
  background:"#f8f7f2", color:"#333333", fontWeight:600, fontSize:11,
  padding:"6px 4px", textAlign:"center", borderBottom:"1px solid #0d1f0d", whiteSpace:"nowrap",
};
const tdS = {
  padding:"5px 4px", borderBottom:"1px solid #090f09", fontSize:13, color:"#1a1a1a",
};

// ── データエクスポート ────────────────────────────────────────────────────
function exportData(st) {
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    ...st,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = st.date || new Date().toISOString().slice(0, 10);
  const vs = st.teamName ? `${st.teamName[0]}vs${st.teamName[1]}` : "scorebook";
  a.href = url;
  a.download = `scorebook_${date}_${vs}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── データインポート ────────────────────────────────────────────────────
function importData(e, setSt) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const { version, exportedAt, ...st } = data;
      setSt(st);
      alert("読み込みました！");
    } catch (err) {
      alert("ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。");
    }
  };
  reader.readAsText(file);
  // inputをリセット（同じファイルを再度読み込めるように）
  e.target.value = "";
}

export default function BaseballScorebook() {
  // 印刷スタイル
  if (typeof document !== "undefined") {
    let style = document.getElementById("print-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "print-style";
      style.textContent = `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; }
          button, .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  const [st, setSt] = useState(init);
  const [activeTeam, setAT] = useState(0);
  const [currentInning, setCurrentInning] = useState(0);
  const [tab, setTab] = useState("score");
  const [modal, setModal] = useState(null);
  const [transcribeMode, setTranscribeMode] = useState(true); // 転記モード（デフォルト）
  const upd = fn => setSt(s => {
    const next = JSON.parse(JSON.stringify(s));
    fn(next);
    return next;
  });
  const setTeamName = (ti,v) => upd(s => { s.teamName[ti]=v; });
  const setDate = v => upd(s => { s.date=v; });
  const setVenue = v => upd(s => { s.venue=v; });
  const setRuns = (ti,i,v) => upd(s => { s.runs[ti][i]=v; });
  const setPlayer = (ti,pi,si,f,v) => upd(s => { s.players[ti][pi][si][f]=v; });
  const addPlayer = (ti,pi,role) => upd(s => {
    s.players[ti][pi].push(mkPlayer("", s.players[ti][pi][0].pos, "", role));
  });
  const removePlayer = (ti,pi,si) => upd(s => {
    if (s.players[ti][pi].length > 1) s.players[ti][pi].splice(si, 1);
  });
  const setPitcher = (ti,pi,f,v) => upd(s => { s.pitchers[ti][pi][f]=v; });
  const addPitcher = ti => upd(s => {
    s.pitchers[ti].push({ name:`投手${s.pitchers[ti].length+1}`,ip:"",h:"",er:"",bb:"",so:"" });
  });
  const isOutPlay = (br) => {
    if (!br) return false;
    // ゴロアウト系: 数字+A/B/C/D or 数字+TO
    if (/[ABCD]$|TO$/.test(br) && /\d/.test(br)) return true;
    // 単独ベースカバー: A/B/C/D のみ（送球なし）
    if (/^[ABCD]$/.test(br)) return true;
    // フライ: ^数字
    if (/^\^\d/.test(br)) return true;
    // ライナー: -数字で終わる
    if (/^-\d$/.test(br)) return true;
    return ["K","SK","KK"].includes(br); // B(四球)はアウトではないので含めない
  };

  const calcRunsFromCells = (cells, inn) => {
    let runs = 0;
    for (let p = 0; p < cells.length; p++) {
      if (SCORE_MARKS.has(cells[p][inn].center)) runs++;
    }
    return runs;
  };

  const saveCell = (ti, pi, inn, newCell) => {
    upd(s => {
      let cell = { ...newCell };

      // アウト自動入力（編集対象のセル自身は除外してカウント）
      if (isOutPlay(cell.br) && !cell.center) {
        let outCount = 0;
        for (let p = 0; p < s.cells[ti].length; p++) {
          if (p === pi) continue; // 自分自身は除外
          if (OUT_MARKS.has(s.cells[ti][p][inn].center)) outCount++;
        }
        const autoOut = ["Ⅰ","Ⅱ","Ⅲ"][outCount] || "";
        cell = { ...cell, center: autoOut };
      }
      s.cells[ti][pi][inn] = cell;

      // スコア自動集計：このイニングの得点マークを数えてrunsに反映
      const runsThisInning = calcRunsFromCells(s.cells[ti], inn);
      s.runs[ti][inn] = runsThisInning > 0 ? String(runsThisInning) : "";

      // 3アウト判定：次の攻撃に自動切替
      let outCount = 0;
      for (let p = 0; p < s.cells[ti].length; p++) {
        if (OUT_MARKS.has(s.cells[ti][p][inn].center)) outCount++;
      }
      if (!transcribeMode && (cell.center === "Ⅲ" || outCount >= 3)) {
        setTimeout(() => {
          if (ti === 0) {
            setAT(1);
          } else {
            setAT(0);
            setCurrentInning(prev => Math.min(prev + 1, INNINGS - 1));
          }
        }, 600);
      }
    });
    setModal(null);
  };
  const playerStat = (ti,pi) => {
    let ab=0,h=0,hr=0,bb=0,k=0,sac=0,rbi=0;
    st.cells[ti][pi].forEach(cell => {
      const code = cell.br;
      if (!code) return;
      const r = RESULT_MAP[code];
      if (!r) return;
      if (r.isAB) ab++;
      if (r.isHit) h++;
      if (code==="HR") hr++;
      if (code==="B"||code==="HBP") bb++;
      if (code==="K"||code==="KK") k++;
      if (code==="SAC"||code==="SF") sac++;
      if (cell.bl) rbi++;
    });
    const avg = ab>0 ? (h/ab).toFixed(3).replace(/^0/,"") : "---";
    return { ab,h,hr,bb,k,sac,rbi,avg };
  };
  const totalRuns = ti => sum(st.runs[ti]);
  const CELL_SIZE = 72;
  const NAV = [
    ["score","⚾ スコア"],["lineup","👤 打順"],["pitchers","⚡ 投手"],["stats","📊 成績"],
  ];
  return (
    <div style={{
      minHeight:"100vh", background:"#f8f7f2",
      color:"#1a1a1a", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",
    }}>
      <div style={{
        background:"#f8f7f299", backdropFilter:"blur(8px)",
        borderBottom:"1px solid #0d1f0d",
        padding:"10px 12px 8px",
        position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:22 }}>⚾</span>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontWeight:900, fontSize:16, color:"#1a7a1a", letterSpacing:"0.05em" }}>
                少年野球スコアブック
              </div>
              <button onClick={() => {
                const printWindow = window.open("", "_blank");
                if (!printWindow) { alert("ポップアップを許可してください"); return; }
                const html = document.documentElement.outerHTML;
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => { printWindow.print(); }, 500);
              }} style={{
                fontSize:11, padding:"3px 10px", borderRadius:6,
                background:"#e8f5e9", border:"1px solid #2d8a2d", color:"#1a7a1a",
                cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              }}>📄 PDF</button>
              <button onClick={() => exportData(st)} style={{
                fontSize:11, padding:"3px 10px", borderRadius:6,
                background:"#e8f5e9", border:"1px solid #2d8a2d", color:"#1a7a1a",
                cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              }}>💾 保存</button>
              <label style={{
                fontSize:11, padding:"3px 10px", borderRadius:6,
                background:"#e8f5e9", border:"1px solid #2d8a2d", color:"#1a7a1a",
                cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              }}>
                📂 読込
                <input type="file" accept=".json" onChange={e => importData(e, setSt)}
                  style={{ display:"none" }}/>
              </label>
            </div>
            <div style={{ display:"flex", gap:6, fontSize:11, color:"#555555", marginTop:1 }}>
              <input type="date" value={st.date} onChange={e => setDate(e.target.value)}
                style={{ background:"none", border:"none", color:"#555555", fontSize:11, fontFamily:"inherit" }}/>
              <span>@</span>
              <InlineEdit value={st.venue} onChange={setVenue} placeholder="会場名" size={11} color="#555555"/>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, overflowX:"auto", alignItems:"center" }}>
          {NAV.map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:"5px 10px", borderRadius:6, border:"1px solid",
              borderColor: tab===key ? "#2d8a2d" : "#2d6a2d",
              background: tab===key ? "#c8e6c922" : "transparent",
              color: tab===key ? "#1a7a1a" : "#555555",
              cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:11, whiteSpace:"nowrap",
            }}>{label}</button>
          ))}
          <div style={{ marginLeft:"auto", flexShrink:0 }}>
            <button onClick={() => setTranscribeMode(v => !v)} style={{
              padding:"5px 10px", borderRadius:6, border:"1px solid",
              borderColor: transcribeMode ? "#f59e0b" : "#2d6a2d",
              background: transcribeMode ? "#fff8e1" : "transparent",
              color: transcribeMode ? "#fbbf24" : "#555555",
              cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:11, whiteSpace:"nowrap",
            }}>{transcribeMode ? "📝 転記中" : "🔴 リアルタイム"}</button>
          </div>
        </div>
      </div>
      <div style={{ padding:"12px 8px", maxWidth:820, margin:"0 auto" }}>
        {tab==="score" && <>
          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
            {[0,1].map(ti => (
              <button key={ti} onClick={() => setAT(ti)} style={{
                flex:1, padding:"7px 0", borderRadius:8, border:"1px solid",
                borderColor: activeTeam===ti ? "#2d8a2d" : "#2d6a2d",
                background: activeTeam===ti ? "#c8e6c933" : "transparent",
                color: activeTeam===ti ? "#1a7a1a" : "#555555",
                cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
              }}>
                {["先攻","後攻"][ti]}：{st.teamName[ti]}
              </button>
            ))}
          </div>
          <div style={{ overflowX:"auto", marginBottom:14 }}>
            <table style={{ borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>
                  <th style={thS}>チーム</th>
                  {Array.from({length:INNINGS},(_,i)=>(
                    <th key={i} onClick={() => setCurrentInning(i)} style={{
                      ...thS,
                      color: i===currentInning ? "#fbbf24" : "#1a7a1a",
                      width:44,
                      background: i===currentInning ? "#fff8e1" : "#f8f7f2",
                      borderBottom: i===currentInning ? "2px solid #fbbf24" : "1px solid #0d1f0d",
                      cursor: "pointer",
                    }}>{i+1}</th>
                  ))}
                  <th style={{ ...thS, color:"#fbbf24" }}>計</th>
                </tr>
              </thead>
              <tbody>
                {[0,1].map(ti=>(
                  <tr key={ti} style={{
                    background: ti===activeTeam ? "#0a1a0a" : "transparent",
                  }}>
                    <td style={{ ...tdS, color:ti===0?"#60a5fa":"#c0392b", fontWeight:700, padding:"5px 8px",
                      borderLeft: ti===activeTeam ? "2px solid #22c55e" : "none",
                    }}>
                      {st.teamName[ti]}
                    </td>
                    {Array.from({length:INNINGS},(_,i)=>(
                      <td key={i}
                        onClick={() => { setAT(ti); setCurrentInning(i); }}
                        style={{ ...tdS, textAlign:"center", cursor:"pointer",
                          background: i===currentInning && ti===activeTeam ? "#e8f5e9" : "transparent",
                          borderBottom: i===currentInning && ti===activeTeam ? "2px solid #fbbf24" : "1px solid #090f09",
                        }}>
                        <span style={{
                          display:"inline-block", width:32,
                          color: i===currentInning && ti===activeTeam ? "#fbbf24" : st.runs[ti][i] ? "#fbbf24" : "#2d6a2d",
                          fontSize:14, fontWeight:700, textAlign:"center",
                        }}>
                          {st.runs[ti][i] || "0"}
                        </span>
                      </td>
                    ))}
                    <td style={{ ...tdS, textAlign:"center", color:"#fbbf24", fontWeight:900, fontSize:16 }}>
                      {sum(st.cells[ti].flatMap((row, pi) => row.map(cell => SCORE_MARKS.has(cell.center) ? 1 : 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thS, minWidth:28, width:28, position:"sticky", left:0, background:"#f8f7f2" }}>#</th>
                  <th style={{ ...thS, minWidth:72, width:72, textAlign:"left", paddingLeft:6, position:"sticky", left:28, background:"#f8f7f2" }}>選手</th>
                  <th style={{ ...thS, minWidth:28, width:28, position:"sticky", left:100, background:"#f8f7f2" }}>守</th>
                  {Array.from({length:INNINGS},(_,i)=>(
                    <th key={i} style={{
                      ...thS, width:CELL_SIZE+1,
                      color: i===currentInning ? "#fbbf24" : "#1a7a1a",
                      background: i===currentInning ? "#fff8e1" : "#f8f7f2",
                      borderBottom: i===currentInning ? "2px solid #fbbf24" : "1px solid #0d1f0d",
                    }}>{i+1}回</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {st.players[activeTeam].map((players,pi) => {
                  const p = players[0];
                  return (
                  <tr key={pi}>
                    <td style={{ ...tdS, textAlign:"center", fontWeight:800, color:"#1a7a1a", position:"sticky", left:0, background:"#f8f7f2" }}>
                      {pi+1}
                    </td>
                    <td style={{ ...tdS, minWidth:72, width:72, padding:"4px 6px", position:"sticky", left:28, background:"#f8f7f2" }}>
                      <InlineEdit value={p.name} onChange={v=>setPlayer(activeTeam,pi,0,"name",v)} placeholder="選手名"/>
                    </td>
                    <td style={{ ...tdS, textAlign:"center", minWidth:28, width:28, color:"#1a7a1a", position:"sticky", left:100, background:"#f8f7f2" }}>
                      {POS_LABEL[p.pos]||p.pos}
                    </td>
                    {Array.from({length:INNINGS},(_,inn)=>(
                      <td key={inn} style={{ padding:0, verticalAlign:"top" }}>
                        <ScoreCell
                          cell={st.cells[activeTeam][pi][inn]}
                          size={CELL_SIZE}
                          transcribeMode={transcribeMode}
                          onClick={() => {
                            if (!transcribeMode && inn !== currentInning) return;
                            setModal({ti:activeTeam,pi,inn});
                          }}
                          disabled={!transcribeMode && inn !== currentInning}
                        />
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:8, fontSize:10, color:"#cccccc" }}>※ マスをタップして打席内容を入力</div>
        </>}
        {tab==="lineup" && <>
          <TeamToggle teams={st.teamName} active={activeTeam} onChange={setAT} onNameChange={setTeamName}/>
          <div>
            {st.players[activeTeam].map((players, pi) => (
              <div key={pi} style={{
                borderBottom: `1px solid #2d6a2d`,
                paddingBottom: 8, marginBottom: 8,
              }}>
                {/* 打順ヘッダー */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:800, color:"#1a7a1a", fontSize:16, minWidth:24 }}>{pi+1}</span>
                  <button onClick={() => addPlayer(activeTeam, pi, "PH")} style={{
                    fontSize:11, padding:"2px 8px", borderRadius:6,
                    background:"#e8f5e9", border:"1px solid #2d8a2d", color:"#1a7a1a",
                    cursor:"pointer", fontFamily:"inherit", fontWeight:700,
                  }}>＋ 交代</button>
                </div>
                {/* 選手リスト */}
                {players.map((p, si) => (
                  <div key={si} style={{
                    display:"flex", alignItems:"center", gap:6,
                    padding:"6px 8px", marginBottom:4,
                    background: si === 0 ? "transparent" : "#f0efe9",
                    borderRadius: 8,
                    borderLeft: si > 0 ? `3px solid ${
                      p.role==="PH" ? "#1565c0" :
                      p.role==="PR" ? "#7b4a00" :
                      "#2d8a2d"
                    }` : "none",
                  }}>
                    {/* 役割バッジ */}
                    {si > 0 && (
                      <select value={p.role}
                        onChange={e => setPlayer(activeTeam, pi, si, "role", e.target.value)}
                        style={{
                          fontSize:10, fontWeight:700, padding:"2px 4px",
                          background:"transparent", border:"1px solid #2d6a2d",
                          borderRadius:4, color:"#333", fontFamily:"inherit",
                          flexShrink:0,
                        }}>
                        <option value="PH">PH</option>
                        <option value="PR">PR</option>
                        <option value="守備">守備</option>
                        <option value="投手">投手</option>
                      </select>
                    )}
                    {si === 0 && (
                      <span style={{ fontSize:10, color:"#555", minWidth:24, flexShrink:0 }}>先発</span>
                    )}
                    {/* 背番号 */}
                    <div style={{ minWidth:32, textAlign:"center", flexShrink:0 }}>
                      <InlineEdit value={p.number} onChange={v=>setPlayer(activeTeam,pi,si,"number",v)} placeholder="#" size={12}/>
                    </div>
                    {/* 選手名 */}
                    <div style={{ flex:1 }}>
                      <InlineEdit value={p.name} onChange={v=>setPlayer(activeTeam,pi,si,"name",v)} placeholder="選手名"/>
                    </div>
                    {/* 守備 */}
                    <select value={p.pos} onChange={e=>setPlayer(activeTeam,pi,si,"pos",e.target.value)}
                      style={{
                        background:"#f8f7f2", border:"1px solid #2d6a2d", color:"#1a7a1a",
                        borderRadius:6, padding:"3px 6px", fontFamily:"inherit", fontSize:12,
                        flexShrink:0,
                      }}>
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos} {POS_LABEL[pos]||""}</option>
                      ))}
                    </select>
                    {/* 削除ボタン（先発以外） */}
                    {si > 0 && (
                      <button onClick={() => removePlayer(activeTeam, pi, si)} style={{
                        background:"transparent", border:"none", color:"#c0392b",
                        cursor:"pointer", fontSize:16, padding:"0 4px", flexShrink:0,
                      }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>}
        {tab==="pitchers" && <>
          <TeamToggle teams={st.teamName} active={activeTeam} onChange={setAT} onNameChange={setTeamName}/>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:360 }}>
              <thead>
                <tr>
                  <th style={thS}>投手名</th>
                  <th style={{ ...thS, width:44, color:"#1a7a1a" }}>回</th>
                  <th style={{ ...thS, width:38 }}>被安</th>
                  <th style={{ ...thS, width:38, color:"#c0392b" }}>自責</th>
                  <th style={{ ...thS, width:38 }}>四球</th>
                  <th style={{ ...thS, width:38 }}>三振</th>
                </tr>
              </thead>
              <tbody>
                {st.pitchers[activeTeam].map((pt,pi) => (
                  <tr key={pi}>
                    <td style={tdS}>
                      <InlineEdit value={pt.name} onChange={v=>setPitcher(activeTeam,pi,"name",v)} placeholder="投手名"/>
                    </td>
                    {["ip","h","er","bb","so"].map(f => (
                      <td key={f} style={{ ...tdS, textAlign:"center" }}>
                        <input type={f==="ip"?"text":"number"} min="0" value={pt[f]}
                          onChange={e=>setPitcher(activeTeam,pi,f,e.target.value)}
                          style={{
                            width:f==="ip"?38:30, background:"transparent", border:"none",
                            borderBottom:"1px solid #0d1f0d",
                            color:f==="er"?"#c0392b":f==="ip"?"#1a7a1a":"#1a1a1a",
                            textAlign:"center", fontSize:13, fontWeight:700,
                            outline:"none", fontFamily:"inherit",
                          }}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={()=>addPitcher(activeTeam)} style={{
            marginTop:10, background:"transparent", border:"1px dashed #0d1f0d",
            color:"#1a7a1a", borderRadius:7, padding:"6px 16px",
            cursor:"pointer", fontFamily:"inherit", fontSize:12,
          }}>＋ 投手追加</button>
        </>}
        {tab==="stats" && <>
          <TeamToggle teams={st.teamName} active={activeTeam} onChange={setAT} onNameChange={setTeamName}/>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thS, width:26 }}>#</th>
                  <th style={thS}>選手</th>
                  <th style={{ ...thS, width:36 }}>打</th>
                  <th style={{ ...thS, width:36, color:"#1a7a1a" }}>安</th>
                  <th style={{ ...thS, width:36, color:"#dc2626" }}>本</th>
                  <th style={{ ...thS, width:36, color:"#fbbf24" }}>打点</th>
                  <th style={{ ...thS, width:36, color:"#60a5fa" }}>四死</th>
                  <th style={{ ...thS, width:36, color:"#f97316" }}>三振</th>
                  <th style={{ ...thS, width:52, color:"#fbbf24" }}>打率</th>
                </tr>
              </thead>
              <tbody>
                {st.players[activeTeam].map((players,pi) => {
                  const p = players[0];
                  const s = playerStat(activeTeam,pi);
                  return (
                    <tr key={pi}>
                      <td style={{ ...tdS, textAlign:"center", color:"#1a7a1a", fontWeight:700 }}>{pi+1}</td>
                      <td style={{ ...tdS, fontWeight:600 }}>{p.name}</td>
                      <td style={{ ...tdS, textAlign:"center" }}>{s.ab}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#1a7a1a", fontWeight:700 }}>{s.h||""}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#dc2626" }}>{s.hr||""}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#fbbf24" }}>{s.rbi||""}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#60a5fa" }}>{s.bb||""}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#f97316" }}>{s.k||""}</td>
                      <td style={{ ...tdS, textAlign:"center", color:"#fbbf24", fontWeight:800 }}>{s.avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}
      </div>
      {modal && (transcribeMode ? (
        <TranscribeCellModal
          cell={st.cells[modal.ti][modal.pi][modal.inn]}
          playerName={st.players[modal.ti][modal.pi][0].name}
          inning={modal.inn}
          onSave={c => saveCell(modal.ti,modal.pi,modal.inn,c)}
          onClose={() => setModal(null)}
        />
      ) : (
        <CellModal
          cell={st.cells[modal.ti][modal.pi][modal.inn]}
          playerName={st.players[modal.ti][modal.pi][0].name}
          inning={modal.inn}
          transcribeMode={transcribeMode}
          onSave={c => saveCell(modal.ti,modal.pi,modal.inn,c)}
          onClose={() => setModal(null)}
        />
      ))}
    </div>
  );
}
