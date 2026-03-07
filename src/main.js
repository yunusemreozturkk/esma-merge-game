import Phaser from "phaser";

const W = 480;
const H = 720;

// Kutu ölçüleri
const BOX = {
  x: 40,
  y: 120,
  w: W - 80,
  h: H - 170
};

const TIERS = [
  { key: "t0", r: 16, color: 0xffc2d1 },
  { key: "t1", r: 22, color: 0xffe066 },
  { key: "t2", r: 31, color: 0xb5f2ff },
  { key: "t3", r: 43, color: 0xcaffbf },
  { key: "t4", r: 58, color: 0xd0bfff },
  { key: "t5", r: 76, color: 0xffd6a5 },
  { key: "t6", r: 97, color: 0xffadad },
  { key: "t7", r: 121, color: 0xa0c4ff }
];

const CROSSWORD_WORDS = [
  {
    number: 1,
    clue: "birlikte izlediğimiz ikinci film",
    answer: "aftersun",
    display: "AFTERSUN",
    row: 1,
    col: 7,
    dir: "across"
  },
  {
    number: 2,
    clue: "htr312 dersi aldığımız hocanın ismi",
    answer: "hakkıbaşgüney",
    display: "HAKKIBAŞGÜNEY",
    row: 6,
    col: 2,
    dir: "across"
  },
  {
    number: 3,
    clue: "yazdığın şiirin ilk mısrasındaki eksik kelime (... temple remains intact as before)",
    answer: "solomons",
    display: "SOLOMONS",
    row: 8,
    col: 14,
    dir: "across"
  },
  {
    number: 4,
    clue: "charlie brown'daki toza bulanmış karakter (ipucu: linus değil)",
    answer: "pigpen",
    display: "PIGPEN",
    row: 11,
    col: 0,
    dir: "across"
  },
  {
    number: 5,
    clue: "kedili kafedeki kara kedinin adı",
    answer: "haydut",
    display: "HAYDUT",
    row: 13,
    col: 4,
    dir: "across"
  },
  {
    number: 6,
    clue: "sana ilk mesaj attığım tarih",
    answer: "onüçmayıs",
    display: "ONÜÇMAYIS",
    row: 0,
    col: 14,
    dir: "down"
  },
  {
    number: 7,
    clue: "bir türlü okumayı bitiremediğim kitap",
    answer: "küçükkadınlar",
    display: "KÜÇÜKKADINLAR",
    row: 2,
    col: 5,
    dir: "down"
  },
  {
    number: 8,
    clue: "manifest konserinde fotoğraf çekindiğimiz hayvan-1",
    answer: "goril",
    display: "GORİL",
    row: 6,
    col: 10,
    dir: "down"
  },
  {
    number: 9,
    clue: "dışarıdaki ilk dateimizde gittiğimiz plakçının adı (ipucu: magnum ....)",
    answer: "opus",
    display: "OPUS",
    row: 8,
    col: 17,
    dir: "down"
  },
  {
    number: 10,
    clue: "manifest konserinde fotoğraf çekindiğimiz hayvan-2",
    answer: "civciv",
    display: "CİVCİV",
    row: 7,
    col: 1,
    dir: "down"
  }
];

function normalizeAnswer(str) {
  return (str || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "")
    .replace(/['".,!?()\-]/g, "")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class CrosswordScene extends Phaser.Scene {
  constructor() {
    super("crossword");
    this.overlayEl = null;
    this.correctMap = new Map();
  }

  create() {

    this.add.text(W / 2, 74, "Tüm cevaplar doğru olunca oyuna geçebilirsin", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "14px",
      color: "#fff"
    }).setOrigin(0.5);

    this.buildOverlay();

    this.events.once("shutdown", () => {
      this.destroyOverlay();
    });
  }

  destroyOverlay() {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }

  buildOverlay() {
    const app = document.getElementById("app");
    if (!app) return;

    app.style.position = "relative";

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.pointerEvents = "auto";
    overlay.style.zIndex = "20";

    const panel = document.createElement("div");
    panel.style.width = "min(1100px, 94vw)";
    panel.style.height = "min(86vh, 900px)";
    panel.style.background = "rgba(80,120,160,0.55)";
    panel.style.borderRadius = "24px";
    panel.style.backdropFilter = "blur(4px)";
    panel.style.boxSizing = "border-box";
    panel.style.padding = "18px";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1.1fr 1fr";
    panel.style.gap = "18px";
    panel.style.color = "white";
    panel.style.fontFamily = "system-ui, -apple-system, sans-serif";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.alignItems = "center";
    left.style.justifyContent = "center";
    left.style.gap = "14px";

    const gridTitle = document.createElement("div");
    gridTitle.textContent = "Çengel bulmaca";
    gridTitle.style.fontSize = "18px";
    gridTitle.style.fontWeight = "700";
    left.appendChild(gridTitle);

    const rows = 15;
    const cols = 22;
    const gridWrap = document.createElement("div");
    gridWrap.style.display = "grid";
    gridWrap.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
    gridWrap.style.gridAutoRows = "28px";
    gridWrap.style.gap = "2px";
    gridWrap.style.padding = "10px";
    gridWrap.style.background = "rgba(255,255,255,0.06)";
    gridWrap.style.borderRadius = "16px";
    left.appendChild(gridWrap);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.minHeight = "0";

    const clueTitle = document.createElement("div");
    clueTitle.textContent = "Sorular";
    clueTitle.style.fontSize = "18px";
    clueTitle.style.fontWeight = "700";
    clueTitle.style.marginBottom = "10px";
    right.appendChild(clueTitle);

    const clueList = document.createElement("div");
    clueList.style.flex = "1";
    clueList.style.overflow = "auto";
    clueList.style.paddingRight = "6px";
    right.appendChild(clueList);

    const bottomBar = document.createElement("div");
    bottomBar.style.display = "flex";
    bottomBar.style.alignItems = "center";
    bottomBar.style.justifyContent = "space-between";
    bottomBar.style.gap = "12px";
    bottomBar.style.marginTop = "12px";
    right.appendChild(bottomBar);

    const statusText = document.createElement("div");
    statusText.textContent = "yunu açmak için cevapla esmaaa";
    statusText.style.fontSize = "14px";
    statusText.style.opacity = "0.9";
    bottomBar.appendChild(statusText);

    const startBtn = document.createElement("button");
    startBtn.textContent = "oyuna başla";
    startBtn.disabled = true;
    startBtn.style.border = "none";
    startBtn.style.padding = "12px 18px";
    startBtn.style.borderRadius = "999px";
    startBtn.style.background = "rgba(255,255,255,0.25)";
    startBtn.style.color = "white";
    startBtn.style.fontWeight = "700";
    startBtn.style.cursor = "not-allowed";
    startBtn.style.transition = "0.2s ease";
    bottomBar.appendChild(startBtn);

    const inputMap = new Map();

    for (const word of CROSSWORD_WORDS) {
      const row = document.createElement("div");
      row.style.background = "rgba(255,255,255,0.08)";
      row.style.border = "1px solid rgba(255,255,255,0.12)";
      row.style.borderRadius = "14px";
      row.style.padding = "10px";
      row.style.marginBottom = "10px";

      const clue = document.createElement("div");
      clue.textContent = `${word.number}) ${word.clue}`;
      clue.style.fontSize = "14px";
      clue.style.fontWeight = "600";
      clue.style.marginBottom = "8px";
      row.appendChild(clue);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "cevabı yaz...";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.style.width = "100%";
      input.style.boxSizing = "border-box";
      input.style.padding = "10px 12px";
      input.style.borderRadius = "10px";
      input.style.border = "2px solid rgba(255,255,255,0.12)";
      input.style.background = "rgba(255,255,255,0.12)";
      input.style.color = "white";
      input.style.outline = "none";
      input.style.fontSize = "14px";
      row.appendChild(input);

      inputMap.set(word.number, input);
      clueList.appendChild(row);
    }

  

    const occupied = new Map();
    const startCells = new Map();

    for (const word of CROSSWORD_WORDS) {
      startCells.set(`${word.row}-${word.col}`, word.number);

      for (let i = 0; i < word.display.length; i++) {
        const r = word.dir === "across" ? word.row : word.row + i;
        const c = word.dir === "across" ? word.col + i : word.col;

        if (!occupied.has(`${r}-${c}`)) occupied.set(`${r}-${c}`, []);
        occupied.get(`${r}-${c}`).push({ word, index: i });
      }
    }

    const renderGrid = () => {
      gridWrap.innerHTML = "";

      const revealedLetters = new Map();

      for (const word of CROSSWORD_WORDS) {
        if (this.correctMap.get(word.number)) {
          for (let i = 0; i < word.display.length; i++) {
            const r = word.dir === "across" ? word.row : word.row + i;
            const c = word.dir === "across" ? word.col + i : word.col;
            revealedLetters.set(`${r}-${c}`, word.display[i]);
          }
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const key = `${r}-${c}`;
          const cell = document.createElement("div");

          if (!occupied.has(key)) {
            cell.style.background = "transparent";
            gridWrap.appendChild(cell);
            continue;
          }

          cell.style.position = "relative";
          cell.style.width = "28px";
          cell.style.height = "28px";
          cell.style.background = "rgba(255,255,255,0.20)";
          cell.style.border = "1px solid rgba(255,255,255,0.28)";
          cell.style.borderRadius = "6px";
          cell.style.display = "flex";
          cell.style.alignItems = "center";
          cell.style.justifyContent = "center";
          cell.style.fontSize = "14px";
          cell.style.fontWeight = "700";
          cell.style.color = "white";
          cell.textContent = revealedLetters.get(key) || "";

          if (startCells.has(key)) {
            const n = document.createElement("div");
            n.textContent = startCells.get(key);
            n.style.position = "absolute";
            n.style.top = "1px";
            n.style.left = "3px";
            n.style.fontSize = "8px";
            n.style.opacity = "0.85";
            cell.appendChild(n);
          }

          gridWrap.appendChild(cell);
        }
      }
    };

    const refresh = () => {
      let allCorrect = true;

      for (const word of CROSSWORD_WORDS) {
        const input = inputMap.get(word.number);
        const correct = normalizeAnswer(input.value) === normalizeAnswer(word.answer);

        this.correctMap.set(word.number, correct);

        if (input.value.trim().length === 0) {
          input.style.borderColor = "rgba(255,255,255,0.12)";
          input.style.background = "rgba(255,255,255,0.12)";
        } else if (correct) {
          input.style.borderColor = "rgba(178, 255, 178, 0.95)";
          input.style.background = "rgba(110, 190, 110, 0.18)";
        } else {
          input.style.borderColor = "rgba(255, 170, 170, 0.95)";
          input.style.background = "rgba(190, 90, 90, 0.16)";
        }

        if (!correct) allCorrect = false;
      }

      renderGrid();

      if (allCorrect) {
        statusText.textContent = "bravo aşkım";
        startBtn.disabled = false;
        startBtn.style.cursor = "pointer";
        startBtn.style.background = "rgba(255,255,255,0.88)";
        startBtn.style.color = "#7a5634";
      } else {
        statusText.textContent = "oyunu açmak için cevapla esmaaa";
        startBtn.disabled = true;
        startBtn.style.cursor = "not-allowed";
        startBtn.style.background = "rgba(255,255,255,0.25)";
        startBtn.style.color = "white";
      }
    };

    for (const [, input] of inputMap) {
      input.addEventListener("input", refresh);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") refresh();
      });
    }

    startBtn.addEventListener("click", () => {
      if (startBtn.disabled) return;
      this.destroyOverlay();
      this.scene.start("game");
    });

    panel.appendChild(left);
    panel.appendChild(right);
    overlay.appendChild(panel);
    app.appendChild(overlay);

    this.overlayEl = overlay;
    refresh();
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
    this.nextTier = 0;
    this.holding = null;
    this.spawnLock = false;
    this.score = 0;
    this.mergeCooldown = new Set(); // aynı karede double-merge önlemek için id bazlı

    this.isGameOver = false;

    // ✅ EASTER EGG STATE
    this.easterPairs = new Set(); // aktif temas eden (t6,t7) çiftleri
    this.easterText = null;

    // ✅ MUSIC
    this.bgm = null;

    // ✅ VOLUME UI
    this.vol = 0.35;
    this._preMuteVol = 0.35;
    this.btnMute = null;
    this.btnMinus = null;
    this.btnPlus = null;
    this.volText = null;
  }

  preload() {
    // ✅ MUSIC (public/audio/music.mp3)
    this.load.audio("bgm", "/audio/music.mp3");
  }

  create() {
    // ✅ RESTART SONRASI STATE RESET (sadece bu eklendi)
    this.isGameOver = false;
    this.nextTier = 0;
    this.holding = null;
    this.spawnLock = false;
    this.score = 0;
    this.mergeCooldown = new Set();
    this._unsafeTime = 0;

    // ✅ EASTER EGG RESET
    this.easterPairs = new Set();
    this.easterText = null;

    // Arkaplan
    this.add.rectangle(W/2, H/2, W, H, 0xcfefff).setDepth(-10);

    // UI
    this.scoreText = this.add.text(18, 16, "Score: 0", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "18px",
      color: "#fff"
    });

    this.nextBubble = this.add.circle(W - 70, 32, 22, 0xffffff, 0.25);
    this.nextLabel = this.add.text(W - 92, 12, "Next", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "12px",
      color: "#fff"
    });

    // ✅ EASTER EGG YAZISI (başta gizli)
    this.easterText = this.add.text(W / 2, H - 28, "yunus ❤️ esma", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "22px",
      color: "#ffffff"
    }).setOrigin(0.5).setAlpha(0);

    // ✅ MUSIC (tek sefer oluştur, restart'ta tekrar yaratma)
    if (!this.bgm) {
      this.bgm = this.sound.add("bgm", { loop: true, volume: this.vol });

      // Tarayıcı autoplay engeli için ilk tıklamada başlat
      this.input.once("pointerdown", () => {
        if (this.bgm && !this.bgm.isPlaying) this.bgm.play();
      });
    } else {
      // restart sonrası: volume'u güncel tut
      this.bgm.setVolume(this.vol);

      // restart sonrası: eğer çalmıyorsa ilk tıklamada tekrar başlat
      this.input.once("pointerdown", () => {
        if (this.bgm && !this.bgm.isPlaying) this.bgm.play();
      });
    }

    // ✅ VOLUME BUTTONS (temaya uyumlu, küçük “pills”)
    this.createVolumeUI();

    // Matter physics
    this.matter.world.setBounds(0, 0, W, H);

    // Kutu duvarları (sadece belirli bölgede)
    this.createBoxWalls();

    // “Next” rastgele başlasın
    this.nextTier = this.randSpawnTier();

    // Next preview (küçük)
    this.nextPreview = this.add.container(W - 70, 32);
    this.drawPreview();

    // Üstte takip eden “tutulan” obje (mouse ile)
    this.input.on("pointermove", (p) => {
      if (!this.holding) return;
      const cx = clamp(p.x, BOX.x + 20, BOX.x + BOX.w - 20);
      // Holding fizik gövdesi yok; sadece çizim
      this.holding.x = cx;
    });

    this.input.on("pointerdown", (p) => {
      this.dropAt(p.x);
    });

    // İlk holding’i oluştur
    this.makeHolding();

    // Çarpışma yakalama (merge + easter egg)
    this.matter.world.on("collisionstart", (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA?.gameObject;
        const b = pair.bodyB?.gameObject;
        if (!a || !b) continue;

        if (a.isFruit && b.isFruit) {
          this.tryMerge(a, b);

          // ✅ EASTER EGG: t6 & t7 teması başladı mı?
          if (this.isEasterContact(a, b)) {
            const key = this.pairKey(pair.bodyA, pair.bodyB);
            this.easterPairs.add(key);
            this.updateEasterVisibility();
          }
        }
      }
    });

    // ✅ EASTER EGG: temas bittiğinde kaldır
    this.matter.world.on("collisionend", (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA?.gameObject;
        const b = pair.bodyB?.gameObject;
        if (!a || !b) continue;

        if (a.isFruit && b.isFruit) {
          if (this.isEasterContact(a, b)) {
            const key = this.pairKey(pair.bodyA, pair.bodyB);
            this.easterPairs.delete(key);
            this.updateEasterVisibility();
          }
        }
      }
    });

    // Basit “game over line” (taşma kontrolü)
    this.overLineY = BOX.y + 18;
    this.overLine = this.add.rectangle(
      BOX.x + BOX.w/2,
      this.overLineY,
      BOX.w,
      2,
      0xffffff,
      0.15
    );
  }

  update() {
    if (this.isGameOver) return;

    // ✅ EASTER EGG: destroy/merge gibi durumlarda collisionend gelmeyebilir;
    // aktif pair setini küçük bir temizlikten geçir.
    if (this.easterPairs.size > 0) {
      this.cleanupEasterPairs();
      this.updateEasterVisibility();
    }

    // Taşma: herhangi bir fruit topu uzun süre çizginin üstünde kalırsa game over
    // (şimdilik basit: anlık kontrol + küçük tolerans)
    const fruits = this.children.list.filter(o => o?.isFruit);
    const unsafe = fruits.some(f => f.y - f.radius < this.overLineY - 12);
    if (unsafe) {
      // Çok agresif olmasın diye 1.2 sn üst üste unsafe gerek
      this._unsafeTime = (this._unsafeTime ?? 0) + (this.game.loop.delta / 1000);
      if (this._unsafeTime > 1.2) {
        this.gameOver();
      }
    } else {
      this._unsafeTime = 0;
    }
  }

  // ✅ VOLUME UI helpers
  createVolumeUI() {
    // küçük panel: Score yazısının sağında
    const x = 160;
    const y = 16;

    const makePillButton = (x, y, label) => {
      const cont = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, 34, 28, 0xffffff, 0.16)
        .setStrokeStyle(2, 0xffffff, 0.22);

      const txt = this.add.text(0, 0, label, {
        fontFamily: "system-ui, -apple-system",
        fontSize: "14px",
        color: "#fff"
      }).setOrigin(0.5);

      cont.add([bg, txt]);
      cont.setSize(34, 28);
      cont.setInteractive({ useHandCursor: true });

      cont._bg = bg;
      cont._txt = txt;

      cont.on("pointerover", () => bg.setAlpha(0.24));
      cont.on("pointerout", () => bg.setAlpha(0.16));

      return cont;
    };

    this.btnMinus = makePillButton(x, y + 14, "−");
    this.btnMute  = makePillButton(x + 42, y + 14, "🔊");
    this.btnPlus  = makePillButton(x + 84, y + 14, "+");

    this.volText = this.add.text(x + 128, y + 6, "", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "12px",
      color: "#fff"
    }).setAlpha(0.85);

    this.refreshVolumeUI();

    this.btnMinus.on("pointerdown", (p, lx, ly, e) => {
      if (e?.stopPropagation) e.stopPropagation();
      this.setVolume(this.vol - 0.08);
    });

    this.btnPlus.on("pointerdown", (p, lx, ly, e) => {
      if (e?.stopPropagation) e.stopPropagation();
      this.setVolume(this.vol + 0.08);
    });

    this.btnMute.on("pointerdown", (p, lx, ly, e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (this.vol > 0) {
        this._preMuteVol = this.vol;
        this.setVolume(0);
      } else {
        this.setVolume(this._preMuteVol || 0.35);
      }
    });
  }

  setVolume(v) {
    this.vol = clamp(v, 0, 1);
    if (this.bgm) this.bgm.setVolume(this.vol);
    this.refreshVolumeUI();
  }

  refreshVolumeUI() {
    if (!this.btnMute || !this.volText) return;

    const isMuted = this.vol <= 0.001;
    this.btnMute._txt.setText(isMuted ? "🔇" : (this.vol < 0.45 ? "🔈" : "🔊"));

    // yüzde
    const pct = Math.round(this.vol * 100);
    this.volText.setText(`${pct}%`);
  }

  // ✅ EASTER EGG yardımcıları
  isEasterContact(a, b) {
    // 7. ve 8. seviye: tier 6 ve tier 7
    return (a.tier === 6 && b.tier === 7) || (a.tier === 7 && b.tier === 6);
  }

  pairKey(bodyA, bodyB) {
    const idA = bodyA?.id ?? 0;
    const idB = bodyB?.id ?? 0;
    const lo = Math.min(idA, idB);
    const hi = Math.max(idA, idB);
    return `${lo}-${hi}`;
  }

  cleanupEasterPairs() {
    // Eğer scene restart/objeler destroy olduysa, setin içi boş kalabilir
    // Burada kaba ama güvenli bir temizlik yapıyoruz:
    // t6/t7 temasını gerçekten "var mı" diye tekrar kontrol etmek yerine,
    // en basit şekilde: t6 ve t7 yoksa seti sıfırla.
    const fruits = this.children.list.filter(o => o?.isFruit);
    const hasT6 = fruits.some(f => f.tier === 6);
    const hasT7 = fruits.some(f => f.tier === 7);
    if (!hasT6 || !hasT7) {
      this.easterPairs.clear();
    }
  }

  updateEasterVisibility() {
    if (!this.easterText) return;
    this.easterText.setAlpha(this.easterPairs.size > 0 ? 1 : 0);
  }

  createBoxWalls() {
    // Görsel kutu
    this.add.rectangle(BOX.x + BOX.w/2, BOX.y + BOX.h/2, BOX.w, BOX.h, 0x000000, 0.08);
    this.add.rectangle(BOX.x + BOX.w/2, BOX.y + BOX.h/2, BOX.w, BOX.h, 0xffffff, 0.10).setStrokeStyle(6, 0xffffff, 0.18);

    const thickness = 30;
    const leftX = BOX.x - thickness/2;
    const rightX = BOX.x + BOX.w + thickness/2;
    const floorY = BOX.y + BOX.h + thickness/2;

    // Sol, sağ, zemin (tavan yok)
    this.matter.add.rectangle(leftX, BOX.y + BOX.h/2, thickness, BOX.h + thickness, { isStatic: true });
    this.matter.add.rectangle(rightX, BOX.y + BOX.h/2, thickness, BOX.h + thickness, { isStatic: true });
    this.matter.add.rectangle(BOX.x + BOX.w/2, floorY, BOX.w + thickness*2, thickness, { isStatic: true });
  }

  randSpawnTier() {
    // Başlangıçta küçük şeyler daha sık gelsin
    // (0-3 ağırlıklı)
    const r = Math.random();
    if (r < 0.35) return 0;   // %35
    if (r < 0.65) return 1;   // %30
    if (r < 0.85) return 2;   // %20
    return 3;                 // %15
  }

  makeHolding() {
    if (this.spawnLock) return;
    const tier = this.nextTier;
    const def = TIERS[tier];

    // Holding: sadece çizim (fizik yok)
    const x = W/2;
    const y = BOX.y - 30;

    const c = this.add.container(x, y);
    c.tier = tier;
    c.radius = def.r;
    c.isHolding = true;

    // gövde
    const body = this.add.circle(0, 0, def.r, def.color, 1);
    body.setStrokeStyle(4, 0xffffff, 0.35);
    // minik yüz
    const face = this.add.text(-def.r*0.55, -def.r*0.35, "•ᴗ•", {
      fontFamily: "system-ui, -apple-system",
      fontSize: Math.max(12, Math.floor(def.r * 0.9)) + "px",
      color: "#5b3b2e"
    });

    c.add([body, face]);

    this.holding = c;

    // Next’i güncelle
    this.nextTier = this.randSpawnTier();
    this.drawPreview();
  }

  drawPreview() {
    this.nextPreview.removeAll(true);
    const def = TIERS[this.nextTier];

    const body = this.add.circle(0, 0, 12, def.color, 1);
    body.setStrokeStyle(3, 0xffffff, 0.35);
    const face = this.add.text(-8, -8, "•ᴗ•", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "14px",
      color: "#5b3b2e"
    });

    this.nextPreview.add([body, face]);
  }

  dropAt(px) {
    if (!this.holding || this.spawnLock) return;

    const x = clamp(px, BOX.x + 20, BOX.x + BOX.w - 20);
    const tier = this.holding.tier;
    const def = TIERS[tier];

    // holding’i sil
    this.holding.destroy(true);
    this.holding = null;

    // Fizikli fruit oluştur
    const fruit = this.createFruit(x, BOX.y - 10, tier);

    // Küçük başlangıç hızını sıfırla
    fruit.body.velocity.x = 0;
    fruit.body.velocity.y = 0;

    // Spam drop engelle (çok kısa)
    this.spawnLock = true;
    this.time.delayedCall(220, () => {
      this.spawnLock = false;
      this.makeHolding();
    });
  }

  createFruit(x, y, tier) {
    const def = TIERS[tier];

    // container: çizim + yüz
    const c = this.add.container(x, y);
    c.tier = tier;
    c.radius = def.r;
    c.isFruit = true;

    const bodyG = this.add.circle(0, 0, def.r, def.color, 1);
    bodyG.setStrokeStyle(4, 0xffffff, 0.35);

    const face = this.add.text(-def.r*0.55, -def.r*0.35, "•ᴗ•", {
      fontFamily: "system-ui, -apple-system",
      fontSize: Math.max(12, Math.floor(def.r * 0.9)) + "px",
      color: "#5b3b2e"
    });

    c.add([bodyG, face]);

    // matter circle body ekle
    this.matter.add.gameObject(c, {
      shape: { type: "circle", radius: def.r },
      restitution: 0.05,
      friction: 0.15,
      frictionAir: 0.01,
      density: 0.002
    });

    // “aynı anda merge” bug’ını azaltmak için id
    c._id = Phaser.Math.RND.uuid();
    return c;
  }

  tryMerge(a, b) {
    // aynı tier değilse çık
    if (a.tier !== b.tier) return;

    // en üst tier merge olmasın
    if (a.tier >= TIERS.length - 1) return;

    // cooldown: aynı objeyi birkaç kez işleme alma
    if (this.mergeCooldown.has(a._id) || this.mergeCooldown.has(b._id)) return;

    this.mergeCooldown.add(a._id);
    this.mergeCooldown.add(b._id);

    // birleşme noktası
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    // iki objeyi kaldır
    a.destroy(true);
    b.destroy(true);

    // patlama efekti
    this.pop(mx, my);

    // yeni üst tier spawn
    const nextTier = a.tier + 1;
    const newFruit = this.createFruit(mx, my, nextTier);

    // ufak “zıplama” hissi
    newFruit.body.velocity.y = -2;

    // skor
    this.score += (nextTier + 1) * 10;
    this.scoreText.setText("Score: " + this.score);

    // cooldown temizle (kısa süre sonra)
    this.time.delayedCall(120, () => {
      this.mergeCooldown.delete(a._id);
      this.mergeCooldown.delete(b._id);
    });
  }

  pop(x, y) {
    // basit parçacık: küçük daireler fırlat
    const n = 10;
    for (let i = 0; i < n; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 6), 0xffffff, 0.7);
      const ang = Math.random() * Math.PI * 2;
      const sp = Phaser.Math.FloatBetween(2.5, 5.2);
      const vx = Math.cos(ang) * sp;
      const vy = Math.sin(ang) * sp;

      this.tweens.add({
        targets: p,
        x: x + vx * 18,
        y: y + vy * 18,
        alpha: 0,
        duration: 260,
        ease: "Quad.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Scene’i pause etmek yerine fiziği durdur (input çalışmaya devam etsin)
    this.matter.world.pause();
  
    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.35).setInteractive();
    const box = this.add.rectangle(W/2, H/2, 340, 180, 0xffffff, 0.18).setStrokeStyle(2, 0xffffff, 0.25);
  
    const t = this.add.text(W/2, H/2 - 25, "Game Over", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "42px",
      color: "#fff"
    }).setOrigin(0.5);
  
    const s = this.add.text(W/2, H/2 + 25, "Score: " + this.score + "\n(Click to Restart)", {
      fontFamily: "system-ui, -apple-system",
      fontSize: "18px",
      color: "#fff",
      align: "center"
    }).setOrigin(0.5);
  
    // Restart’ı overlay’in üstünden yakala (garanti)
    overlay.once("pointerdown", () => {
      overlay.destroy(); box.destroy(); t.destroy(); s.destroy();
  
      // fizik tekrar açılsın
      this.matter.world.resume();
  
      this.scene.restart();
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: W,
  height: H,
  backgroundColor: "#cfefff",
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 0.95 },
      debug: false
    }
  },
  scene: [CrosswordScene, GameScene]
});