(() => {
  "use strict";

  function startGame() {
    const socket = window.io();

    const menu = document.getElementById("menu");
    const game = document.getElementById("game");
    const form = document.getElementById("joinForm");
    const nameInput = document.getElementById("name");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const leadersEl = document.getElementById("leaders");
    const joystick = document.getElementById("joystick");
    const stick = document.getElementById("stick");
    const exitBtn = document.getElementById("exit");

    let me = null;
    let world = 5000;

    let state = {
      players: [],
      bots: [],
      foods: []
    };

    let input = {
      x: 0,
      y: 0
    };

    let cam = {
      x: 2500,
      y: 2500
    };

    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resize);
    resize();

    // JÁTÉK GOMB
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const name =
        nameInput.value.trim().slice(0, 18) || "Játékos";

      socket.emit("join", name);

      menu.hidden = true;
      game.hidden = false;

      resize();
    });

    // Szerver kapcsolat
    socket.on("connect", function () {
      console.log("KOCKA.IO szerverhez csatlakozva:", socket.id);
    });

    socket.on("connect_error", function (error) {
      console.error("Socket.IO hiba:", error);
    });

    // Játék indítása
    socket.on("init", function (data) {
      me = data.id;
      world = data.world;

      console.log("Játék elindult:", me);
    });

    // Játékállapot
    socket.on("state", function (s) {
      state = s;

      const player = s.players.find(function (p) {
        return p.id === me;
      });

      if (player) {
        scoreEl.textContent =
          Math.round(player.size * player.size / 8);

        cam.x = player.x;
        cam.y = player.y;
      }

      const all = s.players
        .concat(s.bots)
        .sort(function (a, b) {
          return b.size - a.size;
        })
        .slice(0, 7);

      leadersEl.innerHTML = all
        .map(function (p, i) {
          return (
            "<div>" +
            (i + 1) +
            ". " +
            escapeHtml(p.name) +
            " <b>" +
            Math.round(p.size * p.size / 8) +
            "</b></div>"
          );
        })
        .join("");
    });

    function escapeHtml(value) {
      return String(value).replace(/[&<>"]/g, function (c) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;"
        }[c];
      });
    }

    // Mozgás küldése
    function sendInput() {
      if (socket.connected) {
        socket.emit("input", input);
      }
    }

    setInterval(sendInput, 50);

    // Világ -> képernyő
    function worldToScreen(x, y) {
      return {
        x: x - cam.x + window.innerWidth / 2,
        y: y - cam.y + window.innerHeight / 2
      };
    }

    // Rács
    function drawGrid() {
      const gap = 100;

      const startX =
        -(cam.x % gap) + window.innerWidth / 2;

      const startY =
        -(cam.y % gap) + window.innerHeight / 2;

      ctx.strokeStyle = "#ffffff08";
      ctx.lineWidth = 1;

      for (
        let x = startX;
        x < window.innerWidth;
        x += gap
      ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, window.innerHeight);
        ctx.stroke();
      }

      for (
        let y = startY;
        y < window.innerHeight;
        y += gap
      ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(window.innerWidth, y);
        ctx.stroke();
      }

      const topLeft = worldToScreen(0, 0);

      ctx.strokeStyle = "#ffffff22";
      ctx.lineWidth = 4;

      ctx.strokeRect(
        topLeft.x,
        topLeft.y,
        world,
        world
      );
    }

    // Kaja
    function drawFood(food) {
      const p = worldToScreen(food.x, food.y);
      const size = food.size;

      if (
        p.x < -20 ||
        p.x > window.innerWidth + 20 ||
        p.y < -20 ||
        p.y > window.innerHeight + 20
      ) {
        return;
      }

      ctx.fillStyle = "#e9edf5";

      ctx.fillRect(
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );
    }

    // Játékos / bot
    function drawEntity(player) {
      const p = worldToScreen(player.x, player.y);
      const size = player.size;

      if (
        p.x < -size ||
        p.x > window.innerWidth + size ||
        p.y < -size ||
        p.y > window.innerHeight + size
      ) {
        return;
      }

      ctx.fillStyle = player.color;

      ctx.fillRect(
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );

      ctx.strokeStyle = "#0005";
      ctx.lineWidth = 2;

      ctx.strokeRect(
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );

      ctx.textAlign = "center";

      ctx.font =
        "700 " +
        Math.max(
          11,
          Math.min(18, size * 0.38)
        ) +
        "px system-ui";

      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;

      ctx.fillText(
        player.name,
        p.x,
        p.y + 5
      );

      ctx.shadowBlur = 0;
    }

    // Rajzolás
    function render() {
      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      drawGrid();

      state.foods.forEach(drawFood);
      state.bots.forEach(drawEntity);
      state.players.forEach(drawEntity);

      requestAnimationFrame(render);
    }

    render();

    // JOYSTICK
    function setInputFromPoint(x, y) {
      const rect =
        joystick.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      let dx = x - centerX;
      let dy = y - centerY;

      const max = 39;

      const length = Math.hypot(dx, dy);

      if (length > max) {
        dx = (dx / length) * max;
        dy = (dy / length) * max;
      }

      input.x = dx / max;
      input.y = dy / max;

      stick.style.transform =
        "translate(" +
        dx +
        "px," +
        dy +
        "px)";
    }

    joystick.addEventListener(
      "pointerdown",
      function (e) {
        joystick.setPointerCapture(e.pointerId);

        setInputFromPoint(
          e.clientX,
          e.clientY
        );
      }
    );

    joystick.addEventListener(
      "pointermove",
      function (e) {
        if (e.buttons) {
          setInputFromPoint(
            e.clientX,
            e.clientY
          );
        }
      }
    );

    function stopJoystick() {
      input = {
        x: 0,
        y: 0
      };

      stick.style.transform =
        "translate(0,0)";
    }

    joystick.addEventListener(
      "pointerup",
      stopJoystick
    );

    joystick.addEventListener(
      "pointercancel",
      stopJoystick
    );

    // BILLENTYŰZET
    window.addEventListener(
      "keydown",
      function (e) {
        if (
          e.key === "w" ||
          e.key === "ArrowUp"
        ) {
          input.y = -1;
        }

        if (
          e.key === "s" ||
          e.key === "ArrowDown"
        ) {
          input.y = 1;
        }

        if (
          e.key === "a" ||
          e.key === "ArrowLeft"
        ) {
          input.x = -1;
        }

        if (
          e.key === "d" ||
          e.key === "ArrowRight"
        ) {
          input.x = 1;
        }
      }
    );

    window.addEventListener(
      "keyup",
      function (e) {
        if (
          [
            "w",
            "s",
            "ArrowUp",
            "ArrowDown"
          ].includes(e.key)
        ) {
          input.y = 0;
        }

        if (
          [
            "a",
            "d",
            "ArrowLeft",
            "ArrowRight"
          ].includes(e.key)
        ) {
          input.x = 0;
        }
      }
    );

    // KILÉPÉS
    exitBtn.addEventListener(
      "click",
      function () {
        location.reload();
      }
    );
  }

  // Megvárjuk, hogy az egész oldal betöltődjön
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startGame
    );
  } else {
    startGame();
  }
})();
