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

// 8 obje: yarıçaplar (merge oldukça büyür)
const TIERS = [
  { key: "t0", r: 16, color: 0xffc2d1 },
  { key: "t1", r: 20, color: 0xffe066 },
  { key: "t2", r: 24, color: 0xb5f2ff },
  { key: "t3", r: 30, color: 0xcaffbf },
  { key: "t4", r: 36, color: 0xd0bfff },
  { key: "t5", r: 44, color: 0xffadad },
  { key: "t6", r: 54, color: 0xffd6a5 },
  { key: "t7", r: 66, color: 0xa0c4ff }
];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
    this.nextTier = 0;
    this.holding = null;
    this.spawnLock = false;
    this.score = 0;
    this.mergeCooldown = new Set(); // aynı karede double-merge önlemek için id bazlı
  }

  preload() {}

  create() {
    // Arkaplan
    this.add.rectangle(W/2, H/2, W, H, 0xd8a36a).setDepth(-10);

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

    // Çarpışma yakalama
    this.matter.world.on("collisionstart", (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA?.gameObject;
        const b = pair.bodyB?.gameObject;
        if (!a || !b) continue;

        if (a.isFruit && b.isFruit) {
          this.tryMerge(a, b);
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
    // (0-2 ağırlıklı)
    const r = Math.random();
    if (r < 0.55) return 0;
    if (r < 0.85) return 1;
    return 2;
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
    this.scene.pause();

    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.35);
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

    this.input.once("pointerdown", () => {
      overlay.destroy(); box.destroy(); t.destroy(); s.destroy();
      this.scene.restart();
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: W,
  height: H,
  backgroundColor: "#d8a36a",
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 0.95 },
      debug: false
    }
  },
  scene: [GameScene]
});