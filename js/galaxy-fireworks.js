(function () {

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  function resize() {
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  resize();
  window.addEventListener("resize", resize);

  /* =========================
     对象池
  ========================== */
  const particlePool = [];
  const activeParticles = [];

  function getParticle() {
    return particlePool.pop() || {};
  }

  function releaseParticle(p) {
    particlePool.push(p);
  }

  function randomHue() {
    return Math.floor(Math.random() * 360);
  }

  /* =========================
     爆炸（分帧生成）
  ========================== */

  let clickCooldown = 0;

  function explode(x, y) {

    if (clickCooldown > 0) return;
    clickCooldown = 0.12;

    const total = 60;
    const batch = 10;
    let created = 0;

    function spawn() {

      for (let i = 0; i < batch; i++) {

        if (created >= total) return;

        const p = getParticle();

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;

        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 1.2;
        p.maxLife = 1.2;
        p.size = Math.random() * 6 + 4;
        p.hue = randomHue();

        activeParticles.push(p);
        created++;
      }

      if (created < total) {
        requestAnimationFrame(spawn);
      }
    }

    spawn();
  }

  document.addEventListener("click", e => explode(e.clientX, e.clientY));

  document.addEventListener("mousemove", e => {
    if (Math.random() > 0.75) return;

    const p = getParticle();

    p.x = e.clientX;
    p.y = e.clientY;
    p.vx = (Math.random() - 0.5) * 1.5;
    p.vy = (Math.random() - 0.5) * 1.5;
    p.life = 0.5;
    p.maxLife = 0.5;
    p.size = Math.random() * 3 + 2;
    p.hue = randomHue();

    activeParticles.push(p);
  });

  /* =========================
     主循环
  ========================== */

  let last = performance.now();

  function animate(now) {

    const delta = (now - last) / 1000;
    last = now;

    clickCooldown -= delta;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ===== 粒子更新 ===== */

    for (let i = activeParticles.length - 1; i >= 0; i--) {

      const p = activeParticles[i];

      p.x += p.vx;
      p.y += p.vy;

      p.life -= delta;

      if (p.life <= 0) {
        releaseParticle(p);
        activeParticles.splice(i, 1);
        continue;
      }

      /* 自然消失曲线 */
      const t = p.life / p.maxLife;
      const alpha = t * t; // easeOut

      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * t), 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;

      ctx.shadowBlur = 20 * t;
      ctx.shadowColor = `hsl(${p.hue},100%,60%)`;
      ctx.fill();
    }

    /* ===== 电弧优化版（抽样 O(n)）===== */

    const linkDistance = 110;
    const maxLinksPerParticle = 2;

    for (let i = 0; i < activeParticles.length; i++) {

      const p1 = activeParticles[i];
      let links = 0;

      for (let j = i + 1; j < activeParticles.length; j++) {

        if (links >= maxLinksPerParticle) break;

        const p2 = activeParticles[j];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = dx * dx + dy * dy;

        if (dist < linkDistance * linkDistance) {

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          ctx.strokeStyle = `hsl(${p1.hue},100%,60%)`;
          ctx.globalAlpha = 0.25;

          ctx.lineWidth = 1;
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${p1.hue},100%,60%)`;

          ctx.stroke();

          links++;
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

})();