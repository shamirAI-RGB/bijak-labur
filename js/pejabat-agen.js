/* Dijana oleh scripts/bina-pejabat-agen.mjs daripada pejabat-agen/App.jsx. Jangan sunting terus. */
(function () {
"use strict";
const {
  useEffect,
  useMemo,
  useState
} = React;
const {
  motion,
  AnimatePresence
} = Motion;
const AGENTS = [{
  id: "fox",
  name: "Felix Fennec",
  species: "Musang",
  role: "Penyelidik",
  color: "#ff8a3d",
  room: "#fff1e0",
  accent: "#f26b1d",
  sumber: "Mengambil data waktu solat (aliran Data waktu solat)"
}, {
  id: "cat",
  name: "Clara Whiskers",
  species: "Kucing",
  role: "Penyunting",
  color: "#8fa3c7",
  room: "#eef2ff",
  accent: "#5b6fa8",
  sumber: "Kemas kini terkini pada cawangan main"
}, {
  id: "raccoon",
  name: "Rocco Bandit",
  species: "Rakun",
  role: "Pembangun",
  color: "#8a8f9c",
  room: "#e8fbef",
  accent: "#18a957",
  sumber: "PR daripada AI Agent harian dan Claude"
}, {
  id: "bunny",
  name: "Bella Hopps",
  species: "Arnab",
  role: "Pereka",
  color: "#f4f1f6",
  room: "#fff0f6",
  accent: "#ec4899",
  sumber: "Terbitan laman GitHub Pages"
}, {
  id: "lion",
  name: "Leo Mane",
  species: "Singa",
  role: "Pengurus",
  color: "#f2b33d",
  room: "#fff8db",
  accent: "#d97706",
  sumber: "Binaan app Android dan iOS"
}, {
  id: "hound",
  name: "Hugo Bloodhound",
  species: "Anjing pemburu",
  role: "Penyemak Fakta",
  color: "#b07a4f",
  room: "#f3ece4",
  accent: "#8b5a2b",
  sumber: "Pemantau setiap jam dan issue pantau"
}, {
  id: "squirrel",
  name: "Sunny Nutkin",
  species: "Tupai",
  role: "Penganalisis Data",
  color: "#c8682f",
  room: "#e6f6ff",
  accent: "#0284c7",
  sumber: "Angka daripada Actions, commit dan PR"
}, {
  id: "bird",
  name: "Bree Songbird",
  species: "Burung",
  role: "Komunikator",
  color: "#38bdf8",
  room: "#ecfeff",
  accent: "#0891b2",
  sumber: "Pemasangan pelayan Cloudflare Workers"
}];
const INK = "#2b2140";
function Eyes({
  y = 52,
  gap = 11,
  mask = false
}) {
  return React.createElement("g", {
    className: "ao-blink",
    style: {
      transformOrigin: `60px ${y}px`
    }
  }, mask && React.createElement("path", {
    d: `M28 ${y - 6} Q60 ${y - 18} 92 ${y - 6} Q86 ${y + 9} 60 ${y + 5} Q34 ${y + 9} 28 ${y - 6}Z`,
    fill: "#2f2a3a"
  }), [-gap, gap].map(dx => React.createElement("g", {
    key: dx
  }, React.createElement("ellipse", {
    cx: 60 + dx,
    cy: y,
    rx: "5.2",
    ry: "6.2",
    fill: "#fff"
  }), React.createElement("circle", {
    cx: 60 + dx + 0.8,
    cy: y + 0.8,
    r: "3.4",
    fill: INK
  }), React.createElement("circle", {
    cx: 60 + dx + 2,
    cy: y - 1.2,
    r: "1.2",
    fill: "#fff"
  }))));
}
function Smile({
  y = 68
}) {
  return React.createElement("path", {
    d: `M53 ${y} Q60 ${y + 6} 67 ${y}`,
    stroke: INK,
    strokeWidth: "2.2",
    fill: "none",
    strokeLinecap: "round"
  });
}
function Body({
  fur,
  belly,
  shirt
}) {
  return React.createElement("g", {
    className: "ao-breathe",
    style: {
      transformOrigin: "60px 140px"
    }
  }, React.createElement("path", {
    d: "M30 140 Q30 96 60 94 Q90 96 90 140Z",
    fill: shirt || fur
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "122",
    rx: "15",
    ry: "16",
    fill: belly,
    opacity: shirt ? 0 : 1
  }), shirt && React.createElement("path", {
    d: "M52 96 L60 110 L68 96",
    fill: "#fff",
    opacity: ".9"
  }));
}
const CHARACTERS = {
  fox: () => React.createElement(React.Fragment, null, React.createElement("path", {
    d: "M82 120 Q118 112 112 84 Q104 106 84 108Z",
    fill: "#ff8a3d",
    className: "ao-wag",
    style: {
      transformOrigin: "84px 114px"
    }
  }), React.createElement("path", {
    d: "M108 86 Q112 80 112 84 Q110 92 104 94Z",
    fill: "#fff"
  }), React.createElement(Body, {
    fur: "#ff8a3d",
    belly: "#fff4e6"
  }), React.createElement("path", {
    d: "M36 40 L30 8 L54 28Z",
    fill: "#ff8a3d"
  }), React.createElement("path", {
    d: "M38 34 L34 15 L49 28Z",
    fill: "#3b2a24"
  }), React.createElement("path", {
    d: "M84 40 L90 8 L66 28Z",
    fill: "#ff8a3d"
  }), React.createElement("path", {
    d: "M82 34 L86 15 L71 28Z",
    fill: "#3b2a24"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#ff8a3d"
  }), React.createElement("path", {
    d: "M32 58 Q60 92 88 58 Q74 70 60 70 Q46 70 32 58Z",
    fill: "#fff4e6"
  }), React.createElement(Eyes, null), React.createElement("g", {
    stroke: INK,
    strokeWidth: "1.8",
    fill: "none"
  }, React.createElement("circle", {
    cx: "49",
    cy: "52",
    r: "8"
  }), React.createElement("circle", {
    cx: "71",
    cy: "52",
    r: "8"
  }), React.createElement("path", {
    d: "M57 52 H63"
  })), React.createElement("ellipse", {
    cx: "60",
    cy: "64",
    rx: "4",
    ry: "3",
    fill: INK
  }), React.createElement(Smile, {
    y: 69
  })),
  cat: () => React.createElement(React.Fragment, null, React.createElement("path", {
    d: "M86 132 Q116 126 108 96",
    stroke: "#8fa3c7",
    strokeWidth: "8",
    fill: "none",
    strokeLinecap: "round",
    className: "ao-wag",
    style: {
      transformOrigin: "86px 132px"
    }
  }), React.createElement(Body, {
    fur: "#8fa3c7",
    belly: "#eef2ff",
    shirt: "#7c3aed"
  }), React.createElement("path", {
    d: "M34 38 L36 12 L56 28Z",
    fill: "#8fa3c7"
  }), React.createElement("path", {
    d: "M38 33 L39 19 L50 28Z",
    fill: "#f9a8d4"
  }), React.createElement("path", {
    d: "M86 38 L84 12 L64 28Z",
    fill: "#8fa3c7"
  }), React.createElement("path", {
    d: "M82 33 L81 19 L70 28Z",
    fill: "#f9a8d4"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#8fa3c7"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "66",
    rx: "14",
    ry: "10",
    fill: "#eef2ff"
  }), React.createElement(Eyes, null), React.createElement("path", {
    d: "M57 62 L63 62 L60 66Z",
    fill: "#f472b6"
  }), React.createElement("g", {
    stroke: INK,
    strokeWidth: "1.2",
    opacity: ".6"
  }, React.createElement("path", {
    d: "M44 64 L26 60"
  }), React.createElement("path", {
    d: "M44 68 L26 70"
  }), React.createElement("path", {
    d: "M76 64 L94 60"
  }), React.createElement("path", {
    d: "M76 68 L94 70"
  })), React.createElement(Smile, {
    y: 68
  }), React.createElement("path", {
    d: "M40 86 Q60 94 80 86",
    stroke: "#facc15",
    strokeWidth: "3",
    fill: "none"
  })),
  raccoon: () => React.createElement(React.Fragment, null, React.createElement("g", {
    className: "ao-wag",
    style: {
      transformOrigin: "86px 128px"
    }
  }, React.createElement("path", {
    d: "M84 130 Q118 128 112 98 Q104 118 86 118Z",
    fill: "#8a8f9c"
  }), React.createElement("path", {
    d: "M100 122 l8 -6 M106 112 l6 -6",
    stroke: "#2f2a3a",
    strokeWidth: "5",
    strokeLinecap: "round"
  })), React.createElement(Body, {
    fur: "#8a8f9c",
    belly: "#d9dce3",
    shirt: "#1f2937"
  }), React.createElement("path", {
    d: "M44 100 Q60 86 76 100",
    stroke: "#111827",
    strokeWidth: "6",
    fill: "none"
  }), React.createElement("circle", {
    cx: "38",
    cy: "30",
    r: "11",
    fill: "#8a8f9c"
  }), React.createElement("circle", {
    cx: "38",
    cy: "30",
    r: "5",
    fill: "#2f2a3a"
  }), React.createElement("circle", {
    cx: "82",
    cy: "30",
    r: "11",
    fill: "#8a8f9c"
  }), React.createElement("circle", {
    cx: "82",
    cy: "30",
    r: "5",
    fill: "#2f2a3a"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#8a8f9c"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "66",
    rx: "16",
    ry: "11",
    fill: "#eceef2"
  }), React.createElement(Eyes, {
    mask: true
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "63",
    rx: "4",
    ry: "3",
    fill: INK
  }), React.createElement(Smile, {
    y: 68
  })),
  bunny: () => React.createElement(React.Fragment, null, React.createElement(Body, {
    fur: "#f4f1f6",
    belly: "#ffffff",
    shirt: "#f9a8d4"
  }), React.createElement("g", {
    className: "ao-ear",
    style: {
      transformOrigin: "46px 30px"
    }
  }, React.createElement("ellipse", {
    cx: "44",
    cy: "10",
    rx: "9",
    ry: "26",
    fill: "#f4f1f6"
  }), React.createElement("ellipse", {
    cx: "44",
    cy: "12",
    rx: "4.5",
    ry: "19",
    fill: "#f9a8d4"
  })), React.createElement("g", {
    transform: "rotate(28 76 30)"
  }, React.createElement("ellipse", {
    cx: "78",
    cy: "10",
    rx: "9",
    ry: "26",
    fill: "#f4f1f6"
  }), React.createElement("ellipse", {
    cx: "78",
    cy: "12",
    rx: "4.5",
    ry: "19",
    fill: "#f9a8d4"
  })), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#f4f1f6"
  }), React.createElement(Eyes, null), React.createElement("circle", {
    cx: "44",
    cy: "64",
    r: "5",
    fill: "#fbcfe8"
  }), React.createElement("circle", {
    cx: "76",
    cy: "64",
    r: "5",
    fill: "#fbcfe8"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "62",
    rx: "3.5",
    ry: "2.6",
    fill: "#f472b6"
  }), React.createElement(Smile, {
    y: 66
  }), React.createElement("rect", {
    x: "57",
    y: "69",
    width: "6",
    height: "5",
    rx: "1",
    fill: "#fff",
    stroke: "#e5e7eb"
  }), React.createElement("path", {
    d: "M38 36 Q60 26 82 36",
    stroke: "#a78bfa",
    strokeWidth: "4",
    fill: "none",
    strokeLinecap: "round"
  })),
  lion: () => React.createElement(React.Fragment, null, React.createElement(Body, {
    fur: "#f2b33d",
    belly: "#fde68a",
    shirt: "#1e3a8a"
  }), React.createElement("path", {
    d: "M60 98 L56 104 L60 126 L64 104Z",
    fill: "#dc2626"
  }), React.createElement("g", {
    className: "ao-mane",
    style: {
      transformOrigin: "60px 54px"
    }
  }, Array.from({
    length: 14
  }).map((_, i) => {
    const a = i / 14 * Math.PI * 2;
    return React.createElement("circle", {
      key: i,
      cx: 60 + Math.cos(a) * 33,
      cy: 54 + Math.sin(a) * 33,
      r: "12",
      fill: i % 2 ? "#b45309" : "#c2410c"
    });
  })), React.createElement("circle", {
    cx: "36",
    cy: "30",
    r: "8",
    fill: "#f2b33d"
  }), React.createElement("circle", {
    cx: "84",
    cy: "30",
    r: "8",
    fill: "#f2b33d"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "29",
    fill: "#f2b33d"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "66",
    rx: "13",
    ry: "10",
    fill: "#fde68a"
  }), React.createElement(Eyes, null), React.createElement("path", {
    d: "M55 61 L65 61 L60 66Z",
    fill: "#7c2d12"
  }), React.createElement(Smile, {
    y: 69
  }), React.createElement("path", {
    d: "M44 26 L48 14 L54 22 L60 10 L66 22 L72 14 L76 26Z",
    fill: "#facc15",
    stroke: "#ca8a04",
    strokeWidth: "1.5"
  })),
  hound: () => React.createElement(React.Fragment, null, React.createElement("g", {
    className: "ao-wag",
    style: {
      transformOrigin: "86px 128px"
    }
  }, React.createElement("path", {
    d: "M86 128 Q110 120 108 100",
    stroke: "#b07a4f",
    strokeWidth: "7",
    fill: "none",
    strokeLinecap: "round"
  })), React.createElement(Body, {
    fur: "#b07a4f",
    belly: "#f0dcc4",
    shirt: "#a16207"
  }), React.createElement("path", {
    d: "M48 96 L60 120 L72 96",
    fill: "none",
    stroke: "#713f12",
    strokeWidth: "2"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#b07a4f"
  }), React.createElement("path", {
    d: "M32 40 Q18 52 26 84 Q36 80 40 56Z",
    fill: "#6b4226",
    className: "ao-ear",
    style: {
      transformOrigin: "34px 44px"
    }
  }), React.createElement("path", {
    d: "M88 40 Q102 52 94 84 Q84 80 80 56Z",
    fill: "#6b4226"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "68",
    rx: "15",
    ry: "11",
    fill: "#f0dcc4"
  }), React.createElement(Eyes, null), React.createElement("path", {
    d: "M44 44 Q49 41 54 44 M66 44 Q71 41 76 44",
    stroke: INK,
    strokeWidth: "2",
    fill: "none"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "63",
    rx: "6",
    ry: "4",
    fill: INK
  }), React.createElement(Smile, {
    y: 70
  }), React.createElement("path", {
    d: "M34 30 Q60 6 86 30 Z",
    fill: "#78716c"
  }), React.createElement("rect", {
    x: "28",
    y: "28",
    width: "64",
    height: "6",
    rx: "3",
    fill: "#57534e"
  })),
  squirrel: () => React.createElement(React.Fragment, null, React.createElement("path", {
    d: "M78 136 Q122 132 112 82 Q104 54 84 66 Q102 74 98 98 Q94 118 76 122Z",
    fill: "#c8682f",
    className: "ao-wag",
    style: {
      transformOrigin: "80px 128px"
    }
  }), React.createElement("path", {
    d: "M96 84 Q104 76 100 70",
    stroke: "#f6c89f",
    strokeWidth: "4",
    fill: "none",
    strokeLinecap: "round"
  }), React.createElement(Body, {
    fur: "#c8682f",
    belly: "#f6c89f"
  }), React.createElement("path", {
    d: "M38 36 L38 14 L52 28Z",
    fill: "#c8682f"
  }), React.createElement("path", {
    d: "M38 14 l-3 -6 M38 14 l3 -6",
    stroke: "#c8682f",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: "M82 36 L82 14 L68 28Z",
    fill: "#c8682f"
  }), React.createElement("path", {
    d: "M82 14 l-3 -6 M82 14 l3 -6",
    stroke: "#c8682f",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "29",
    fill: "#c8682f"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "66",
    rx: "14",
    ry: "11",
    fill: "#f6c89f"
  }), React.createElement(Eyes, null), React.createElement("ellipse", {
    cx: "60",
    cy: "62",
    rx: "3.5",
    ry: "2.6",
    fill: INK
  }), React.createElement(Smile, {
    y: 67
  }), React.createElement("circle", {
    cx: "42",
    cy: "66",
    r: "6",
    fill: "#f6c89f"
  }), React.createElement("circle", {
    cx: "78",
    cy: "66",
    r: "6",
    fill: "#f6c89f"
  })),
  bird: () => React.createElement(React.Fragment, null, React.createElement("path", {
    d: "M32 112 Q10 100 18 82 Q30 96 40 100Z",
    fill: "#0ea5e9",
    className: "ao-flap",
    style: {
      transformOrigin: "38px 104px"
    }
  }), React.createElement("path", {
    d: "M88 112 Q110 100 102 82 Q90 96 80 100Z",
    fill: "#0ea5e9",
    className: "ao-flap",
    style: {
      transformOrigin: "82px 104px"
    }
  }), React.createElement(Body, {
    fur: "#38bdf8",
    belly: "#fef3c7"
  }), React.createElement("path", {
    d: "M54 22 Q58 4 64 20 Q70 6 70 24",
    fill: "#facc15"
  }), React.createElement("circle", {
    cx: "60",
    cy: "54",
    r: "30",
    fill: "#38bdf8"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "66",
    rx: "16",
    ry: "12",
    fill: "#fef3c7"
  }), React.createElement(Eyes, null), React.createElement("path", {
    d: "M52 60 L68 60 L60 72Z",
    fill: "#f59e0b"
  }), React.createElement("path", {
    d: "M28 54 Q28 18 60 18 Q92 18 92 54",
    stroke: "#334155",
    strokeWidth: "5",
    fill: "none"
  }), React.createElement("rect", {
    x: "22",
    y: "46",
    width: "10",
    height: "18",
    rx: "5",
    fill: "#475569"
  }), React.createElement("rect", {
    x: "88",
    y: "46",
    width: "10",
    height: "18",
    rx: "5",
    fill: "#475569"
  }), React.createElement("path", {
    d: "M93 62 Q94 82 72 82",
    stroke: "#475569",
    strokeWidth: "3",
    fill: "none"
  }), React.createElement("circle", {
    cx: "70",
    cy: "82",
    r: "3.5",
    fill: "#ef4444"
  }))
};
function Critter({
  id,
  size = 120
}) {
  const Art = CHARACTERS[id];
  return React.createElement("svg", {
    viewBox: "0 0 120 140",
    width: size,
    height: size * (140 / 120),
    "aria-hidden": "true",
    className: "overflow-visible"
  }, React.createElement("ellipse", {
    cx: "60",
    cy: "139",
    rx: "34",
    ry: "5",
    fill: "#000",
    opacity: ".12"
  }), React.createElement("g", {
    className: "ao-bob"
  }, React.createElement(Art, null)));
}
function Desk({
  children,
  tone = "#a16207"
}) {
  return React.createElement("div", {
    className: "absolute inset-x-3 bottom-3 h-9 rounded-xl shadow-inner",
    style: {
      background: tone
    }
  }, React.createElement("div", {
    className: "absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/25"
  }), children);
}
const CODE = ["const agent = new Burrow()", "await agent.run()", "if (ok) deploy()", "git push origin main", "tests: 128 passed", "fn(x) => x * 2"];
function Scene({
  agent,
  busy
}) {
  const run = busy ? "running" : "paused";
  const style = {
    animationPlayState: run
  };
  switch (agent.id) {
    case "fox":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "absolute left-3 top-4 flex h-24 w-14 flex-col justify-around rounded-md bg-amber-800/90 p-1.5 shadow"
      }, ["#ef4444", "#3b82f6", "#22c55e"].map((c, i) => React.createElement("div", {
        key: c,
        className: "flex gap-0.5"
      }, [0, 1, 2].map(j => React.createElement("div", {
        key: j,
        className: "h-5 w-2.5 rounded-sm",
        style: {
          background: c,
          opacity: 0.6 + j * 0.15
        }
      }))))), [0, 1, 2, 3].map(i => React.createElement("div", {
        key: i,
        className: "ao-fly absolute left-12 top-10 grid h-5 w-7 place-items-center rounded bg-white text-[8px] font-bold text-orange-600 shadow ring-1 ring-orange-200",
        style: {
          ...style,
          animationDelay: `${i * 0.9}s`
        }
      }, "DATA")), React.createElement("div", {
        className: "absolute right-3 top-4 w-28 rounded-full bg-white px-2 py-1 text-[9px] text-slate-500 shadow ring-1 ring-orange-200"
      }, React.createElement("span", {
        className: "ao-type inline-block overflow-hidden whitespace-nowrap align-bottom",
        style: style
      }, "saham patuh syariah 2026")), React.createElement(Desk, {
        tone: "#c2410c"
      }, React.createElement("div", {
        className: "absolute left-1/2 top-[-10px] h-3 w-14 -translate-x-1/2 rounded-sm bg-white shadow"
      })));
    case "cat":
      return React.createElement(React.Fragment, null, ["Aa", "¶", "draf", "sunting", "—", "✓"].map((t, i) => React.createElement("span", {
        key: i,
        className: "ao-rise absolute bottom-12 text-xs font-bold text-indigo-500",
        style: {
          ...style,
          left: `${18 + i * 12}%`,
          animationDelay: `${i * 0.5}s`
        }
      }, t)), React.createElement(Desk, {
        tone: "#4c1d95"
      }, React.createElement("div", {
        className: "absolute left-1/2 top-[-26px] h-7 w-24 -translate-x-1/2 rounded-t-md bg-slate-200 p-1 shadow"
      }, React.createElement("div", {
        className: "h-full rounded-sm bg-white p-0.5"
      }, [80, 60, 70].map((w, i) => React.createElement("div", {
        key: i,
        className: "ao-line mb-0.5 h-0.5 rounded bg-indigo-300",
        style: {
          ...style,
          width: `${w}%`,
          animationDelay: `${i * 0.3}s`
        }
      })))), React.createElement("div", {
        className: "ao-keys absolute left-1/2 top-[2px] h-2 w-20 -translate-x-1/2 rounded-sm bg-slate-300",
        style: style
      })));
    case "raccoon":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "absolute inset-0 overflow-hidden rounded-2xl"
      }, Array.from({
        length: 9
      }).map((_, i) => React.createElement("span", {
        key: i,
        className: "ao-matrix absolute top-0 font-mono text-[10px] text-emerald-500/70",
        style: {
          ...style,
          left: `${6 + i * 11}%`,
          animationDelay: `${i * 0.37 % 2}s`
        }
      }, "01λ{}<>"[i % 7]))), React.createElement("div", {
        className: "absolute right-3 top-4 w-32 rounded-lg bg-slate-900 p-1.5 font-mono text-[8px] leading-tight text-emerald-400 shadow-lg shadow-emerald-500/40 ring-1 ring-emerald-400/60"
      }, React.createElement("div", {
        className: "h-12 overflow-hidden"
      }, React.createElement("div", {
        className: "ao-scroll",
        style: style
      }, [...CODE, ...CODE].map((l, i) => React.createElement("div", {
        key: i
      }, "> ", l)))), React.createElement("span", {
        className: "ao-caret"
      }, "\u258B")), React.createElement(Desk, {
        tone: "#1f2937"
      }));
    case "bunny":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "absolute right-3 top-3 h-24 w-28 rounded-md border-4 border-amber-700 bg-white shadow"
      }, React.createElement("div", {
        className: "ao-shape1 absolute h-6 w-6 rounded-full bg-pink-400",
        style: style
      }), React.createElement("div", {
        className: "ao-shape2 absolute h-5 w-5 rounded-sm bg-sky-400",
        style: style
      }), React.createElement("div", {
        className: "ao-shape3 absolute h-0 w-0 border-x-[12px] border-b-[20px] border-x-transparent border-b-amber-400",
        style: style
      }), React.createElement("svg", {
        className: "absolute inset-0",
        viewBox: "0 0 100 80"
      }, React.createElement("path", {
        className: "ao-draw",
        d: "M8 60 Q30 20 50 50 T92 30",
        stroke: "#a855f7",
        strokeWidth: "3",
        fill: "none",
        strokeLinecap: "round",
        style: style
      }))), React.createElement("div", {
        className: "absolute right-[30px] top-[100px] h-1.5 w-20 bg-amber-800"
      }), React.createElement(Desk, {
        tone: "#be185d"
      }));
    case "lion":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "absolute left-3 top-3 w-36 rounded-lg bg-white p-2 shadow ring-1 ring-amber-200"
      }, React.createElement("div", {
        className: "mb-1 text-[8px] font-black uppercase tracking-wider text-amber-700"
      }, "Peta jalan S4"), React.createElement("div", {
        className: "relative h-1.5 rounded-full bg-amber-100"
      }, React.createElement("div", {
        className: "ao-progress absolute inset-y-0 left-0 rounded-full bg-amber-500",
        style: style
      })), React.createElement("div", {
        className: "mt-1 flex justify-between text-[7px] font-bold text-slate-500"
      }, React.createElement("span", null, "Rancang"), React.createElement("span", null, "Bina"), React.createElement("span", null, "Lancar"))), React.createElement("svg", {
        className: "ao-point absolute left-[150px] top-6 h-6 w-6",
        viewBox: "0 0 24 24",
        style: style,
        "aria-hidden": "true"
      }, React.createElement("path", {
        d: "M22 12H6m0 0 6-6m-6 6 6 6",
        stroke: "#d97706",
        strokeWidth: "3",
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      })), React.createElement(Desk, {
        tone: "#92400e"
      }));
    case "hound":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "absolute right-4 top-4 h-24 w-20 rotate-3 rounded-sm bg-white p-2 shadow ring-1 ring-stone-200"
      }, [90, 70, 85, 60, 80, 50].map((w, i) => React.createElement("div", {
        key: i,
        className: "mb-1.5 h-1 rounded bg-stone-300",
        style: {
          width: `${w}%`
        }
      })), React.createElement("span", {
        className: "ao-stamp absolute bottom-1 right-1 rounded border-2 border-emerald-600 px-1 text-[7px] font-black text-emerald-600",
        style: style
      }, "DISAHKAN")), React.createElement("div", {
        className: "ao-magnify absolute right-14 top-4",
        style: style
      }, React.createElement("div", {
        className: "h-9 w-9 rounded-full border-4 border-stone-700 bg-sky-100/60 shadow"
      }), React.createElement("div", {
        className: "ml-7 -mt-1 h-5 w-1.5 -rotate-45 rounded bg-stone-700"
      })), React.createElement(Desk, {
        tone: "#78350f"
      }));
    case "squirrel":
      return React.createElement(React.Fragment, null, React.createElement("div", {
        className: "ao-float absolute left-3 top-4 flex h-16 items-end gap-1 rounded-lg bg-white p-2 shadow ring-1 ring-sky-200",
        style: style
      }, [0.5, 0.8, 0.4, 1, 0.7].map((h, i) => React.createElement("div", {
        key: i,
        className: "ao-bar w-2.5 rounded-t bg-sky-500",
        style: {
          ...style,
          height: `${h * 100}%`,
          animationDelay: `${i * 0.2}s`
        }
      }))), React.createElement("div", {
        className: "ao-spin absolute right-6 top-5 h-12 w-12 rounded-full shadow",
        style: {
          ...style,
          background: "conic-gradient(#0284c7 0 40%, #f59e0b 0 65%, #22c55e 0 85%, #ef4444 0)"
        }
      }), ["+12%", "18k", "σ 0.4"].map((n, i) => React.createElement("span", {
        key: n,
        className: "ao-rise absolute bottom-14 text-[10px] font-black text-sky-700",
        style: {
          ...style,
          left: `${40 + i * 14}%`,
          animationDelay: `${i * 0.8}s`
        }
      }, n)), React.createElement(Desk, {
        tone: "#0369a1"
      }));
    case "bird":
      return React.createElement(React.Fragment, null, [0, 1, 2].map(i => React.createElement("div", {
        key: i,
        className: "ao-bubble absolute right-3 rounded-2xl rounded-br-sm bg-white px-2 py-1 text-[9px] font-semibold text-cyan-700 shadow ring-1 ring-cyan-200",
        style: {
          ...style,
          top: `${10 + i * 26}px`,
          animationDelay: `${i * 0.8}s`
        }
      }, ["Mesej baharu!", "Panggil 3 ptg?", "Dihantar ✓"][i])), React.createElement("div", {
        className: "absolute left-4 top-8 flex h-10 items-center gap-1"
      }, Array.from({
        length: 6
      }).map((_, i) => React.createElement("div", {
        key: i,
        className: "ao-wave w-1.5 rounded-full bg-cyan-500",
        style: {
          ...style,
          animationDelay: `${i * 0.12}s`
        }
      }))), React.createElement(Desk, {
        tone: "#155e75"
      }));
    default:
      return null;
  }
}
const GH = "https://api.github.com/repos/shamirAI-RGB/bijak-labur";
const SOURCES = {
  runs: GH + "/actions/runs?per_page=100",
  solat: GH + "/actions/workflows/solat-data.yml/runs?per_page=5",
  pantau: GH + "/actions/workflows/pantau.yml/runs?per_page=5",
  pulls: GH + "/pulls?state=all&sort=updated&direction=desc&per_page=20",
  issues: GH + "/issues?state=all&labels=pantau&per_page=10",
  commits: GH + "/commits?sha=main&per_page=15"
};
const CACHE_KEY = "pejabat_gh";
const FRESH_MS = 10 * 60 * 1000;
const RUN_KEYS = ["id", "name", "status", "conclusion", "html_url", "created_at", "updated_at", "run_started_at"];
const pickKeys = (o, keys) => Object.fromEntries(keys.map(k => [k, o?.[k]]));
function slim(d) {
  const runs = x => ({
    workflow_runs: (x?.workflow_runs || []).map(r => pickKeys(r, RUN_KEYS))
  });
  const list = x => Array.isArray(x) ? x : [];
  return {
    runs: runs(d.runs),
    solat: runs(d.solat),
    pantau: runs(d.pantau),
    pulls: list(d.pulls).map(p => pickKeys(p, ["id", "number", "title", "state", "draft", "html_url", "created_at", "closed_at", "merged_at", "updated_at"])),
    issues: list(d.issues).map(i => ({
      ...pickKeys(i, ["id", "number", "title", "state", "html_url", "created_at", "closed_at", "updated_at"]),
      pull_request: !!i.pull_request
    })),
    commits: list(d.commits).map(c => ({
      sha: c.sha,
      html_url: c.html_url,
      commit: {
        message: firstLine(c.commit?.message),
        committer: {
          date: c.commit?.committer?.date
        },
        author: {
          date: c.commit?.author?.date
        }
      }
    }))
  };
}
async function loadGithub(fetchFn = fetch, force = false) {
  const cached = read(CACHE_KEY, null);
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return {
    data: cached.data,
    at: cached.at,
    error: ""
  };
  try {
    const entries = await Promise.all(Object.entries(SOURCES).map(async ([k, url]) => {
      const r = await fetchFn(url, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });
      if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? "had" : "http " + r.status);
      return [k, await r.json()];
    }));
    const data = slim(Object.fromEntries(entries));
    const at = Date.now();
    write(CACHE_KEY, {
      at,
      data
    });
    return {
      data,
      at,
      error: ""
    };
  } catch (e) {
    const msg = e.message === "had" ? "GitHub mengehadkan bilangan semakan buat sementara. Data terakhir dipaparkan; cuba lagi dalam beberapa minit." : "Tidak dapat menghubungi GitHub. Data terakhir dipaparkan.";
    return {
      data: cached ? cached.data : null,
      at: cached ? cached.at : 0,
      error: cached ? msg : msg.replace("Data terakhir dipaparkan; cuba", "Cuba").replace(" Data terakhir dipaparkan.", " Semak sambungan internet dan cuba lagi.")
    };
  }
}
function lalu(at, now) {
  const m = Math.floor((now - new Date(at).getTime()) / 60000);
  if (m < 1) return "baru sahaja";
  if (m < 60) return `${m} minit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}
const firstLine = t => String(t || "").split("\n")[0].slice(0, 90);
function runItem(r) {
  let tone = "ok",
    label = "berjaya";
  if (r.status !== "completed") {
    tone = "run";
    label = "sedang berjalan";
  } else if (r.conclusion === "failure" || r.conclusion === "timed_out") {
    tone = "fail";
    label = "gagal";
  } else if (r.conclusion !== "success") {
    tone = "rehat";
    label = r.conclusion === "cancelled" ? "dibatalkan" : r.conclusion === "skipped" ? "dilangkau" : String(r.conclusion);
  }
  const name = r.name === "pages build and deployment" ? "Terbitan laman" : r.name;
  return {
    key: "run" + r.id,
    text: `${name}: ${label}`,
    at: r.status === "completed" ? r.updated_at : r.run_started_at || r.created_at,
    start: r.run_started_at || r.created_at,
    url: r.html_url,
    tone
  };
}
function prItem(p) {
  if (p.state === "open" && p.draft) return {
    key: "pr" + p.id,
    text: `PR #${p.number} (draf) sedang disediakan: ${firstLine(p.title)}`,
    at: p.created_at,
    url: p.html_url,
    tone: "run"
  };
  if (p.state === "open") return {
    key: "pr" + p.id,
    text: `PR #${p.number} menunggu semakan: ${firstLine(p.title)}`,
    at: p.created_at,
    url: p.html_url,
    tone: "run"
  };
  if (p.merged_at) return {
    key: "pr" + p.id,
    text: `PR #${p.number} di-merge: ${firstLine(p.title)}`,
    at: p.merged_at,
    url: p.html_url,
    tone: "ok"
  };
  return {
    key: "pr" + p.id,
    text: `PR #${p.number} ditutup: ${firstLine(p.title)}`,
    at: p.closed_at || p.updated_at,
    url: p.html_url,
    tone: "rehat"
  };
}
function issueItem(i) {
  return i.state === "open" ? {
    key: "is" + i.id,
    text: `Masalah ditemui #${i.number}: ${firstLine(i.title)}`,
    at: i.created_at,
    url: i.html_url,
    tone: "fail"
  } : {
    key: "is" + i.id,
    text: `Masalah selesai #${i.number}: ${firstLine(i.title)}`,
    at: i.closed_at || i.updated_at,
    url: i.html_url,
    tone: "ok"
  };
}
const byTime = (a, b) => new Date(b.at) - new Date(a.at);
const sameDay = (a, now) => new Date(a).toDateString() === new Date(now).toDateString();
function deriveAgents(data, now = Date.now()) {
  const runs = (data?.runs?.workflow_runs || []).map(runItem);
  const rawRuns = data?.runs?.workflow_runs || [];
  const pick = pred => rawRuns.filter(pred).map(runItem);
  const pulls = Array.isArray(data?.pulls) ? data.pulls : [];
  const issues = Array.isArray(data?.issues) ? data.issues.filter(i => !i.pull_request) : [];
  const commits = Array.isArray(data?.commits) ? data.commits : [];
  const items = {
    fox: (data?.solat?.workflow_runs || []).map(runItem),
    cat: commits.map(c => ({
      key: "c" + c.sha,
      text: `Kemas kini laman: ${firstLine(c.commit?.message)}`,
      at: c.commit?.committer?.date || c.commit?.author?.date,
      url: c.html_url,
      tone: "ok"
    })),
    raccoon: pulls.map(prItem),
    bunny: pick(r => r.name === "pages build and deployment"),
    lion: pick(r => r.name === "Android" || r.name === "iOS"),
    hound: [...(data?.pantau?.workflow_runs || []).map(runItem), ...issues.map(issueItem)],
    squirrel: [],
    bird: pick(r => /^(Pelayan|Pintu)/.test(r.name))
  };
  const completed = rawRuns.filter(r => r.status === "completed" && r.conclusion !== "skipped" && r.conclusion !== "cancelled").slice(0, 30);
  const passRate = completed.length ? Math.round(completed.filter(r => r.conclusion === "success").length / completed.length * 100) : null;
  const commitsToday = commits.filter(c => sameDay(c.commit?.committer?.date, now)).length;
  const mergedWeek = pulls.filter(p => p.merged_at && now - new Date(p.merged_at) < 7 * 864e5).length;
  const openPRs = pulls.filter(p => p.state === "open").length;
  const openIssues = issues.filter(i => i.state === "open").length;
  const doneToday = rawRuns.filter(r => r.conclusion === "success" && sameDay(r.updated_at, now)).length + pulls.filter(p => p.merged_at && sameDay(p.merged_at, now)).length;
  const latestAny = [...runs, ...items.cat].sort(byTime)[0];
  items.squirrel = [passRate != null && {
    key: "s1",
    text: `Kadar lulus ${completed.length} semakan terakhir: ${passRate}%`,
    at: latestAny?.at || new Date(now).toISOString(),
    tone: passRate >= 80 ? "ok" : "fail"
  }, {
    key: "s2",
    text: `${commitsToday} kemas kini laman hari ini`,
    at: latestAny?.at || new Date(now).toISOString(),
    tone: "ok"
  }, {
    key: "s3",
    text: `${mergedWeek} PR di-merge dalam 7 hari`,
    at: latestAny?.at || new Date(now).toISOString(),
    tone: "ok"
  }].filter(Boolean);
  const state = {};
  for (const a of AGENTS) {
    const list = (items[a.id] || []).filter(x => x.at).sort(byTime);
    const running = list.find(x => x.tone === "run");
    const latest = list[0];
    let st;
    if (!latest || !data) st = {
      tone: "rehat",
      status: "Tiada rekod terkini",
      progress: 0,
      busy: false
    };else if (a.id === "squirrel") st = {
      tone: passRate != null && passRate < 80 ? "fail" : "ok",
      status: list.map(x => x.text).slice(0, 2).join(" · "),
      progress: passRate ?? 0,
      busy: now - new Date(latest.at) < 2 * 3600e3
    };else if (running) {
      const mins = (now - new Date(running.start || running.at)) / 60000;
      st = {
        tone: "run",
        status: a.id === "raccoon" ? `${list.filter(x => x.tone === "run").length} PR menunggu semakan anda` : `Sedang: ${running.text}`,
        progress: a.id === "raccoon" ? 50 : Math.min(92, 10 + mins * 12),
        busy: true
      };
    } else {
      const fresh = now - new Date(latest.at) < 2 * 3600e3;
      st = {
        tone: latest.tone,
        status: `${latest.text} · ${lalu(latest.at, now)}`,
        progress: latest.tone === "rehat" ? 0 : 100,
        busy: fresh
      };
    }
    state[a.id] = {
      ...st,
      items: list.slice(0, 10)
    };
  }
  const feed = Object.entries(state).filter(([id]) => id !== "squirrel").flatMap(([id, s]) => s.items.map(x => ({
    ...x,
    id
  }))).sort(byTime).slice(0, 20);
  return {
    state,
    feed,
    stats: {
      openPRs,
      openIssues,
      doneToday,
      passRate
    }
  };
}
const TONE = {
  run: {
    dot: null,
    label: "Sedang bekerja",
    bar: null
  },
  ok: {
    dot: "#16a34a",
    label: "Selesai",
    bar: "#16a34a"
  },
  fail: {
    dot: "#dc2626",
    label: "Perlu perhatian",
    bar: "#dc2626"
  },
  rehat: {
    dot: "#94a3b8",
    label: "Rehat",
    bar: "#94a3b8"
  }
};
function ItemLink({
  item,
  now,
  accent
}) {
  const color = item.tone === "fail" ? "#dc2626" : item.tone === "run" ? accent : item.tone === "ok" ? "#16a34a" : "#94a3b8";
  const body = React.createElement(React.Fragment, null, React.createElement("span", {
    className: "mt-1 h-2 w-2 shrink-0 rounded-full",
    style: {
      background: color
    }
  }), React.createElement("span", {
    className: "min-w-0 flex-1 [overflow-wrap:anywhere]"
  }, item.text), React.createElement("span", {
    className: "shrink-0 tabular-nums text-slate-400"
  }, lalu(item.at, now)));
  return item.url ? React.createElement("a", {
    href: item.url,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-300"
  }, body) : React.createElement("div", {
    className: "flex items-start gap-2 px-1 py-0.5"
  }, body);
}
function Room({
  agent,
  st,
  onOpen,
  onHover,
  hovered
}) {
  const walking = agent.id === "lion" && st.busy;
  const dot = TONE[st.tone].dot || agent.accent;
  return React.createElement(motion.button, {
    type: "button",
    layout: true,
    onClick: () => onOpen(agent.id),
    onMouseEnter: () => onHover(agent.id),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(agent.id),
    onBlur: () => onHover(null),
    whileHover: {
      y: -4
    },
    whileTap: {
      scale: 0.98
    },
    className: `group relative h-56 w-full overflow-visible rounded-3xl border-4 text-left shadow-[0_8px_0_rgba(43,33,64,0.15)] outline-none focus-visible:ring-4 focus-visible:ring-violet-400 ${st.tone === "fail" ? "border-red-400" : "border-white"}`,
    style: {
      background: `linear-gradient(180deg, ${agent.room} 0 72%, #f8e7c8 72% 100%)`,
      zIndex: hovered ? 30 : 1
    },
    "aria-label": `${agent.name}, ${agent.role}. ${st.status}`
  }, React.createElement("div", {
    className: `pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] ${st.busy ? "" : "opacity-80 saturate-50"}`
  }, React.createElement("div", {
    className: "absolute inset-x-0 bottom-0 h-[28%] opacity-50",
    style: {
      backgroundImage: "repeating-linear-gradient(90deg, #e9cf9f 0 22px, #f3dfb8 22px 44px)"
    }
  }), React.createElement(Scene, {
    agent: agent,
    busy: st.busy
  })), React.createElement("div", {
    className: `absolute bottom-6 left-1/2 -translate-x-1/2 ${walking ? "ao-walk" : ""}`
  }, React.createElement(Critter, {
    id: agent.id,
    size: 96
  })), !st.busy && React.createElement("div", {
    className: "ao-zzz pointer-events-none absolute bottom-28 left-[58%] text-sm font-black text-slate-400",
    "aria-hidden": "true"
  }, "z", React.createElement("span", {
    className: "text-xs"
  }, "z")), React.createElement("div", {
    className: "absolute left-3 top-[-14px] flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-md"
  }, React.createElement("span", {
    className: "relative flex h-2.5 w-2.5"
  }, st.tone === "run" && React.createElement("span", {
    className: "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
    style: {
      background: dot
    }
  }), React.createElement("span", {
    className: "relative inline-flex h-2.5 w-2.5 rounded-full",
    style: {
      background: dot
    }
  })), React.createElement("span", {
    className: "text-[11px] font-black tracking-wide text-[#2b2140]"
  }, agent.role)), st.tone === "fail" && React.createElement("div", {
    className: "absolute right-3 top-4 z-10 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black text-white shadow-md"
  }, "Perlu perhatian"), React.createElement("div", {
    className: "absolute inset-x-3 bottom-[-12px] truncate rounded-full bg-white/95 px-3 py-1 text-center text-[10px] font-bold text-slate-600 shadow"
  }, st.status), React.createElement(AnimatePresence, null, hovered && React.createElement(motion.div, {
    initial: {
      opacity: 0,
      y: 8,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: 6,
      scale: 0.95
    },
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 26
    },
    className: "pointer-events-none absolute left-1/2 top-10 z-20 w-60 -translate-x-1/2 rounded-2xl bg-[#2b2140] p-3 text-white shadow-xl"
  }, React.createElement("div", {
    className: "text-sm font-black"
  }, agent.name), React.createElement("div", {
    className: "text-[11px] font-semibold text-white/70"
  }, agent.role, " \xB7 ", TONE[st.tone].label), React.createElement("div", {
    className: "mt-2 flex items-start gap-2 rounded-xl bg-white/10 px-2 py-1.5 text-xs"
  }, React.createElement("span", {
    className: "mt-1 h-2 w-2 shrink-0 rounded-full",
    style: {
      background: dot
    }
  }), React.createElement("span", null, st.status)), React.createElement("div", {
    className: "mt-1.5 text-[10px] text-white/60"
  }, "Klik untuk butiran"))));
}
function AgentModal({
  agent,
  st,
  now,
  onClose
}) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const bar = TONE[st.tone].bar || agent.accent;
  return React.createElement(motion.div, {
    className: "fixed inset-0 z-50 grid place-items-center bg-[#2b2140]/50 p-4 backdrop-blur-sm",
    initial: {
      opacity: 0
    },
    animate: {
      opacity: 1
    },
    exit: {
      opacity: 0
    },
    onClick: onClose
  }, React.createElement(motion.div, {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": agent.name,
    initial: {
      y: 40,
      scale: 0.9,
      opacity: 0
    },
    animate: {
      y: 0,
      scale: 1,
      opacity: 1
    },
    exit: {
      y: 30,
      scale: 0.95,
      opacity: 0
    },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    },
    onClick: e => e.stopPropagation(),
    className: "relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border-4 border-white bg-white shadow-2xl"
  }, React.createElement("div", {
    className: "relative flex h-40 items-end justify-center",
    style: {
      background: `radial-gradient(circle at 50% 120%, ${agent.accent}55, ${agent.room} 70%)`
    }
  }, React.createElement(Critter, {
    id: agent.id,
    size: 110
  }), React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-black text-[#2b2140] shadow hover:scale-105 focus-visible:ring-4 focus-visible:ring-violet-400",
    "aria-label": "Tutup"
  }, "\xD7")), React.createElement("div", {
    className: "space-y-4 p-5"
  }, React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-black uppercase tracking-[0.15em]",
    style: {
      color: agent.accent
    }
  }, agent.role), React.createElement("h2", {
    className: "text-2xl font-black text-[#2b2140]"
  }, agent.name), React.createElement("div", {
    className: "text-sm font-semibold text-slate-500"
  }, agent.sumber)), React.createElement("div", {
    className: "rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
  }, React.createElement("div", {
    className: "mb-2 flex items-center justify-between text-xs font-bold text-slate-500"
  }, React.createElement("span", null, "Status sebenar \xB7 ", TONE[st.tone].label), st.tone !== "fail" && st.tone !== "rehat" && React.createElement("span", {
    className: "tabular-nums"
  }, Math.round(st.progress), "%")), React.createElement("div", {
    className: "mb-2 text-sm font-bold text-[#2b2140]"
  }, st.status), React.createElement("div", {
    className: "h-2.5 overflow-hidden rounded-full bg-slate-200"
  }, React.createElement(motion.div, {
    className: "h-full rounded-full",
    style: {
      background: bar
    },
    animate: {
      width: `${st.progress}%`
    },
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20
    }
  }))), React.createElement("div", null, React.createElement("div", {
    className: "mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400"
  }, "Kerja terkini"), React.createElement("ul", {
    className: "space-y-1 text-xs text-slate-600"
  }, st.items.length === 0 && React.createElement("li", null, "Tiada rekod terkini daripada sumber ini."), st.items.map(it => React.createElement("li", {
    key: it.key
  }, React.createElement(ItemLink, {
    item: it,
    now: now,
    accent: agent.accent
  }))))))));
}
function Paw() {
  return React.createElement("svg", {
    viewBox: "0 0 24 24",
    className: "h-7 w-7",
    "aria-hidden": "true",
    fill: "#fff"
  }, React.createElement("ellipse", {
    cx: "12",
    cy: "16",
    rx: "5",
    ry: "4"
  }), React.createElement("circle", {
    cx: "6",
    cy: "10",
    r: "2.2"
  }), React.createElement("circle", {
    cx: "18",
    cy: "10",
    r: "2.2"
  }), React.createElement("circle", {
    cx: "9.5",
    cy: "6.5",
    r: "2.2"
  }), React.createElement("circle", {
    cx: "14.5",
    cy: "6.5",
    r: "2.2"
  }));
}
const jam = t => new Date(t).toLocaleTimeString("ms-MY", {
  hour: "2-digit",
  minute: "2-digit"
});
function Office() {
  const [gh, setGh] = useState({
    data: null,
    at: 0,
    error: ""
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [openId, setOpenId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const refresh = async force => {
    setLoading(true);
    setGh(await loadGithub(fetch, force));
    setNow(Date.now());
    setLoading(false);
  };
  useEffect(() => {
    refresh(false);
    const slow = setInterval(() => refresh(false), FRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(slow);
      clearInterval(tick);
    };
  }, []);
  const {
    state,
    feed,
    stats
  } = useMemo(() => deriveAgents(gh.data, now), [gh.data, now]);
  const open = AGENTS.find(a => a.id === openId);
  const working = AGENTS.filter(a => state[a.id].busy).length;
  return React.createElement("div", {
    className: "ao-root min-h-full bg-[#fff7e8] px-4 py-5 font-[ui-rounded,system-ui,sans-serif] text-[#2b2140] sm:px-6"
  }, React.createElement("div", {
    className: "mx-auto max-w-7xl space-y-5"
  }, React.createElement("header", {
    className: "flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#2b2140] px-5 py-4 text-white shadow-[0_8px_0_rgba(43,33,64,0.25)]"
  }, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("div", {
    className: "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 via-pink-400 to-sky-400 shadow-inner"
  }, React.createElement(Paw, null)), React.createElement("div", null, React.createElement("h1", {
    className: "font-[ui-rounded,system-ui,sans-serif] text-2xl font-bold leading-none sm:text-3xl"
  }, "Pejabat AI Agent"), React.createElement("p", {
    className: "text-xs font-semibold text-white/60"
  }, "Kerja sebenar bijaklabur.my daripada GitHub", gh.at ? ` · dikemas kini ${jam(gh.at)}` : ""))), React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, [["Sedang bekerja", `${working}/8`], ["PR menunggu anda", stats.openPRs], ["Siap hari ini", stats.doneToday], ["Kadar lulus", stats.passRate == null ? "–" : `${stats.passRate}%`]].map(([k, v]) => React.createElement("div", {
    key: k,
    className: "rounded-2xl bg-white/10 px-3 py-1.5"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-wider text-white/50"
  }, k), React.createElement("div", {
    className: "text-lg font-black tabular-nums leading-tight"
  }, v))), React.createElement("button", {
    type: "button",
    onClick: () => refresh(true),
    disabled: loading,
    className: "rounded-2xl bg-[#ffd23f] px-4 py-3 text-sm font-black text-[#2b2140] shadow-[0_4px_0_#c99a00] transition active:translate-y-1 active:shadow-none disabled:opacity-60 focus-visible:ring-4 focus-visible:ring-white"
  }, loading ? "Menyemak..." : "Muat semula"))), gh.error && React.createElement("div", {
    role: "status",
    className: "rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-300"
  }, gh.error), stats.openIssues > 0 && React.createElement("div", {
    role: "status",
    className: "rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-200"
  }, "Pemantau menemui ", stats.openIssues, " masalah yang belum selesai. Klik Penyemak Fakta untuk butiran."), React.createElement("div", {
    className: "grid gap-5 lg:grid-cols-[1fr_320px]"
  }, React.createElement("section", {
    "aria-label": "Lantai pejabat",
    className: "relative min-w-0 self-start overflow-hidden rounded-[32px] border-4 border-white p-4 pt-6 shadow-[0_8px_0_rgba(43,33,64,0.12)] sm:p-6 sm:pt-8",
    style: {
      background: "linear-gradient(180deg,#7dd3fc 0%,#bae6fd 38%,#fde68a 38.2%,#fde68a 39%,#fff1d6 39%)"
    }
  }, React.createElement("div", {
    className: "pointer-events-none absolute inset-x-0 top-0 h-[38%] overflow-hidden",
    "aria-hidden": "true"
  }, React.createElement("div", {
    className: "ao-cloud absolute left-[8%] top-4 h-6 w-20 rounded-full bg-white/80"
  }), React.createElement("div", {
    className: "ao-cloud absolute left-[55%] top-10 h-5 w-14 rounded-full bg-white/70",
    style: {
      animationDelay: "-12s"
    }
  }), React.createElement("div", {
    className: "absolute bottom-0 flex w-full items-end gap-1.5 px-2 opacity-70"
  }, [46, 70, 38, 90, 56, 110, 64, 42, 84, 52, 100, 60, 44, 76].map((h, i) => React.createElement("div", {
    key: i,
    className: "flex-1 rounded-t-lg",
    style: {
      height: h,
      background: ["#a78bfa", "#f472b6", "#60a5fa", "#34d399", "#fbbf24"][i % 5]
    }
  }, React.createElement("div", {
    className: "mx-auto mt-2 grid w-3/5 grid-cols-2 gap-1"
  }, Array.from({
    length: Math.floor(h / 22) * 2
  }).map((_, j) => React.createElement("div", {
    key: j,
    className: "h-1.5 rounded-sm bg-white/50"
  }))))))), React.createElement("div", {
    className: "relative grid grid-cols-1 gap-x-4 gap-y-10 pt-[12%] sm:grid-cols-2 xl:grid-cols-4"
  }, AGENTS.map(a => React.createElement(Room, {
    key: a.id,
    agent: a,
    st: state[a.id],
    hovered: hoverId === a.id,
    onHover: setHoverId,
    onOpen: setOpenId
  })))), React.createElement("aside", {
    className: "flex min-w-0 flex-col gap-5 self-start"
  }, React.createElement("div", {
    className: "rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(43,33,64,0.12)]"
  }, React.createElement("h2", {
    className: "mb-3 text-sm font-black uppercase tracking-[0.12em] text-slate-400"
  }, "Pasukan"), React.createElement("ul", {
    className: "space-y-1"
  }, AGENTS.map(a => {
    const st = state[a.id];
    return React.createElement("li", {
      key: a.id
    }, React.createElement("button", {
      type: "button",
      onClick: () => setOpenId(a.id),
      onMouseEnter: () => setHoverId(a.id),
      onMouseLeave: () => setHoverId(null),
      className: "flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-violet-300"
    }, React.createElement("span", {
      className: "grid h-10 w-10 shrink-0 place-items-end overflow-hidden rounded-xl",
      style: {
        background: a.room
      }
    }, React.createElement(Critter, {
      id: a.id,
      size: 38
    })), React.createElement("span", {
      className: "min-w-0 flex-1"
    }, React.createElement("span", {
      className: "block text-sm font-black leading-tight"
    }, a.role), React.createElement("span", {
      className: "block truncate text-xs text-slate-500"
    }, st.status)), React.createElement("span", {
      className: "h-2.5 w-2.5 shrink-0 rounded-full",
      style: {
        background: TONE[st.tone].dot || a.accent
      },
      title: TONE[st.tone].label
    })));
  }))), React.createElement("div", {
    className: "rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(43,33,64,0.12)]"
  }, React.createElement("div", {
    className: "mb-3 flex items-center justify-between"
  }, React.createElement("h2", {
    className: "text-sm font-black uppercase tracking-[0.12em] text-slate-400"
  }, "Aktiviti sebenar"), React.createElement("span", {
    className: `rounded-full px-2 py-0.5 text-[10px] font-black ${gh.error ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`
  }, gh.error ? "TERTUNDA" : "LANGSUNG")), React.createElement("ul", {
    className: "max-h-96 space-y-1 overflow-y-auto pr-1 text-xs text-slate-600"
  }, !gh.data && React.createElement("li", {
    className: "text-slate-400"
  }, loading ? "Membaca GitHub..." : "Belum ada data."), feed.map(f => {
    const a = AGENTS.find(x => x.id === f.id);
    return React.createElement("li", {
      key: f.key + f.id
    }, React.createElement(ItemLink, {
      item: {
        ...f,
        text: `${a.role}: ${f.text}`
      },
      now: now,
      accent: a.accent
    }));
  })))))), React.createElement(AnimatePresence, null, open && React.createElement(AgentModal, {
    key: open.id,
    agent: open,
    st: state[open.id],
    now: now,
    onClose: () => setOpenId(null)
  })), React.createElement("style", null, CSS));
}
const read = (k, d) => {
  try {
    const v = localStorage.getItem("bl_" + k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem("bl_" + k, JSON.stringify(v));
  } catch {}
};
const NOTA_API = () => (read("nota_api", "") || "https://nota.bijaklabur.my").replace(/\/$/, "");
async function checkOwner(key, fetchFn = fetch) {
  if (!key) return false;
  try {
    const r = await fetchFn(NOTA_API() + "/admin/check", {
      headers: {
        Authorization: "Bearer " + key
      }
    });
    return r.ok;
  } catch {
    return null;
  }
}
function PejabatAgen() {
  const [state, setState] = useState("semak");
  const [err, setErr] = useState("");
  const [val, setVal] = useState("");
  useEffect(() => {
    checkOwner(read("nota_key", "")).then(ok => setState(ok ? "buka" : ok === null ? "luar" : "kunci"));
  }, []);
  async function login(e) {
    e.preventDefault();
    setErr("");
    const k = val.trim();
    const ok = await checkOwner(k);
    if (ok) {
      write("nota_key", k);
      setState("buka");
    } else setErr(ok === null ? "Tidak dapat menghubungi pelayan. Semak sambungan internet." : "Kunci pemilik salah.");
  }
  if (state === "buka") return React.createElement(Office, null);
  return React.createElement("div", {
    className: "grid min-h-full place-items-center bg-[#fff7e8] px-4 py-10 font-[ui-rounded,system-ui,sans-serif] text-[#2b2140]"
  }, React.createElement("div", {
    className: "w-full max-w-sm rounded-[28px] border-4 border-white bg-white p-6 text-center shadow-[0_8px_0_rgba(43,33,64,0.12)]"
  }, React.createElement("div", {
    className: "mx-auto mb-3 flex h-28 justify-center"
  }, React.createElement(Critter, {
    id: "lion",
    size: 90
  })), React.createElement("h1", {
    className: "text-xl font-black"
  }, "Pejabat AI Agent"), state === "semak" && React.createElement("p", {
    className: "mt-2 text-sm text-slate-500"
  }, "Menyemak kunci pemilik..."), state !== "semak" && React.createElement(React.Fragment, null, React.createElement("p", {
    className: "mt-2 text-sm text-slate-500"
  }, "Halaman ini hanya untuk pemilik Bijak Labur. Masukkan kunci pemilik (sama seperti Mod Pemilik)."), React.createElement("form", {
    onSubmit: login,
    className: "mt-4 space-y-3 text-left"
  }, React.createElement("label", {
    htmlFor: "pmKey",
    className: "block text-xs font-bold text-slate-500"
  }, "Kunci pemilik"), React.createElement("input", {
    id: "pmKey",
    type: "password",
    autoComplete: "current-password",
    required: true,
    minLength: 12,
    value: val,
    onChange: e => setVal(e.target.value),
    className: "w-full rounded-2xl border-2 border-slate-200 px-3 py-2.5 text-base outline-none focus:border-violet-400"
  }), (err || state === "luar") && React.createElement("p", {
    role: "alert",
    className: "text-sm font-semibold text-red-600"
  }, err || "Tidak dapat menghubungi pelayan. Semak sambungan internet."), React.createElement("button", {
    type: "submit",
    className: "w-full rounded-2xl bg-[#ffd23f] px-4 py-3 text-sm font-black shadow-[0_4px_0_#c99a00] active:translate-y-1 active:shadow-none"
  }, "Masuk")), React.createElement("a", {
    href: "./",
    className: "mt-4 inline-block text-sm font-bold text-violet-600 underline"
  }, "Kembali ke Bijak Labur"))));
}
const CSS = `
.ao-bob{animation:ao-bob 2.6s ease-in-out infinite;transform-box:fill-box}
@keyframes ao-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.ao-breathe{animation:ao-breathe 3.2s ease-in-out infinite}
@keyframes ao-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
.ao-blink{animation:ao-blink 4.5s infinite}
@keyframes ao-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.ao-wag{animation:ao-wag 1.4s ease-in-out infinite}
@keyframes ao-wag{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(8deg)}}
.ao-ear{animation:ao-ear 3s ease-in-out infinite}
@keyframes ao-ear{0%,100%{transform:rotate(0)}50%{transform:rotate(-10deg)}}
.ao-mane{animation:ao-mane 6s ease-in-out infinite}
@keyframes ao-mane{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(6deg) scale(1.03)}}
.ao-flap{animation:ao-flap .9s ease-in-out infinite}
@keyframes ao-flap{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}
.ao-walk{animation:ao-walk 7s ease-in-out infinite}
@keyframes ao-walk{0%,100%{transform:translateX(-80%)}45%{transform:translateX(-10%)}50%{transform:translateX(-10%) scaleX(-1)}95%{transform:translateX(-80%) scaleX(-1)}}
.ao-fly{animation:ao-fly 3.6s ease-in-out infinite;opacity:0}
@keyframes ao-fly{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:1}70%{transform:translate(70px,30px) scale(1);opacity:1}100%{transform:translate(80px,50px) scale(.4);opacity:0}}
.ao-type{animation:ao-type 4s steps(18) infinite;width:0}
@keyframes ao-type{0%{width:0}60%,100%{width:100%}}
.ao-rise{animation:ao-rise 3s ease-out infinite;opacity:0}
@keyframes ao-rise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-90px) rotate(-8deg);opacity:0}}
.ao-line{animation:ao-line 1.8s ease-in-out infinite;transform-origin:left}
@keyframes ao-line{0%{transform:scaleX(.1)}60%,100%{transform:scaleX(1)}}
.ao-keys{animation:ao-keys .18s steps(2) infinite}
@keyframes ao-keys{50%{transform:translate(-50%,1px)}}
.ao-matrix{animation:ao-matrix 2.2s linear infinite;opacity:0}
@keyframes ao-matrix{0%{transform:translateY(-10px);opacity:0}10%{opacity:1}100%{transform:translateY(230px);opacity:0}}
.ao-scroll{animation:ao-scroll 6s linear infinite}
@keyframes ao-scroll{to{transform:translateY(-50%)}}
.ao-caret{animation:ao-caret 1s steps(1) infinite}
@keyframes ao-caret{50%{opacity:0}}
.ao-shape1{animation:ao-s1 4s ease-in-out infinite}
@keyframes ao-s1{0%,100%{left:8px;top:8px}50%{left:64px;top:44px}}
.ao-shape2{animation:ao-s2 5s ease-in-out infinite}
@keyframes ao-s2{0%,100%{left:70px;top:10px;transform:rotate(0)}50%{left:14px;top:50px;transform:rotate(180deg)}}
.ao-shape3{animation:ao-s3 4.5s ease-in-out infinite}
@keyframes ao-s3{0%,100%{left:40px;top:30px}50%{left:60px;top:6px}}
.ao-draw{stroke-dasharray:140;animation:ao-draw 3s ease-in-out infinite}
@keyframes ao-draw{0%{stroke-dashoffset:140}60%,100%{stroke-dashoffset:0}}
.ao-progress{animation:ao-progress 6s ease-in-out infinite}
@keyframes ao-progress{0%{width:15%}100%{width:95%}}
.ao-point{animation:ao-point 1.2s ease-in-out infinite}
@keyframes ao-point{0%,100%{transform:translateX(0)}50%{transform:translateX(-8px)}}
.ao-magnify{animation:ao-magnify 4s ease-in-out infinite}
@keyframes ao-magnify{0%,100%{transform:translate(0,0)}25%{transform:translate(40px,14px)}50%{transform:translate(10px,40px)}75%{transform:translate(44px,52px)}}
.ao-stamp{animation:ao-stamp 4s ease-out infinite}
@keyframes ao-stamp{0%,70%{transform:scale(2);opacity:0}78%{transform:scale(1) rotate(-8deg);opacity:1}100%{transform:scale(1) rotate(-8deg);opacity:1}}
.ao-float{animation:ao-floaty 3s ease-in-out infinite}
@keyframes ao-floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ao-bar{animation:ao-bar 1.6s ease-in-out infinite alternate;transform-origin:bottom}
@keyframes ao-bar{0%{transform:scaleY(.35)}100%{transform:scaleY(1)}}
.ao-spin{animation:ao-spin 5s linear infinite}
@keyframes ao-spin{to{transform:rotate(360deg)}}
.ao-bubble{animation:ao-bubble 2.4s ease-out infinite;opacity:0}
@keyframes ao-bubble{0%{transform:scale(.4) translateX(10px);opacity:0}20%,70%{transform:scale(1);opacity:1}100%{transform:translateY(-8px);opacity:0}}
.ao-wave{height:30%;animation:ao-wave .8s ease-in-out infinite alternate}
@keyframes ao-wave{0%{height:20%}100%{height:100%}}
.ao-cloud{animation:ao-cloud 40s linear infinite}
@keyframes ao-cloud{0%{transform:translateX(-120px)}100%{transform:translateX(110vw)}}
.ao-zzz{animation:ao-zzz 3s ease-in-out infinite}
@keyframes ao-zzz{0%{transform:translate(0,6px);opacity:0}30%{opacity:1}100%{transform:translate(10px,-14px);opacity:0}}
@media (prefers-reduced-motion: reduce){.ao-root *{animation-duration:0s!important;animation-iteration-count:1!important}}
`;
ReactDOM.createRoot(document.getElementById("pejabat")).render(React.createElement(PejabatAgen, null));
})();
