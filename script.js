/* ===========================================================================
   utkarshavardhana.github.io — vanilla JS
   - Magnetic cursor that snaps to [data-magnetic] elements
   - WebGL aurora hero (no library; raw shader)
   - Scroll-driven word-by-word reveal on the intro paragraph
   - Counters that count up when their stats scroll into view
   - Footer year auto-fill
   All effects bow out gracefully on prefers-reduced-motion / touch.
============================================================================ */

(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches

  // -------------------- Footer year --------------------
  const yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  // -------------------- Magnetic cursor --------------------
  // Two layers: a solid dot that tracks raw mouse position, and a ring that
  // lerps toward it (slight delay = elastic feel). Magnetic targets pull the
  // ring toward their centre on hover.
  if (!isTouch) {
    const cursor = document.querySelector('.cursor')
    const dot = cursor.querySelector('.cursor-dot')
    const ring = cursor.querySelector('.cursor-ring')

    let mx = innerWidth / 2, my = innerHeight / 2
    let rx = mx, ry = my
    let target = null     // currently magnetised element
    let tx = 0, ty = 0    // magnetic pull offset

    addEventListener('pointermove', (e) => {
      mx = e.clientX
      my = e.clientY
    })

    // Magnetism: when hovering a [data-magnetic], lerp the ring toward the
    // element's center (proportional to distance). When leaving, release.
    //
    // Two modes:
    //   default  → ring snaps AND element gets a small magnetic translate.
    //              Good for buttons / nav links / brand mark — small targets.
    //   snap-only → ring snaps but element stays put. Used on full-width
    //              rows (project cards, contact rows) where a translate
    //              reads as the row "drifting crooked" relative to its
    //              neighbours.
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const snapOnly = el.hasAttribute('data-magnet-snap')
      el.addEventListener('pointerenter', () => {
        target = el
        cursor.classList.add('is-magnet')
      })
      el.addEventListener('pointerleave', () => {
        if (target === el) target = null
        cursor.classList.remove('is-magnet')
        if (!snapOnly) el.style.transform = ''
      })
      if (!snapOnly) {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const dx = (e.clientX - cx) * 0.18
          const dy = (e.clientY - cy) * 0.18
          el.style.transform = `translate(${dx}px, ${dy}px)`
          tx = dx; ty = dy
        })
      }
    })

    const tick = () => {
      // Dot follows pointer instantly
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
      // Ring eases toward pointer (or pulled-element center)
      if (target) {
        const r = target.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        rx += (cx - rx) * 0.18
        ry += (cy - ry) * 0.18
      } else {
        rx += (mx - rx) * 0.16
        ry += (my - ry) * 0.16
      }
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // -------------------- WebGL aurora hero --------------------
  // Single full-canvas quad rendering a procedural "aurora" via fragment
  // shader. ~60 lines of GL with no library. Falls back to a static CSS
  // gradient if WebGL isn't available or motion is reduced.
  const canvas = document.getElementById('hero-canvas')
  if (canvas) {
    if (reduceMotion) {
      canvas.style.background =
        'radial-gradient(800px 500px at 70% 30%, rgba(249,115,22,0.18), transparent 60%),' +
        'radial-gradient(900px 600px at 20% 80%, rgba(244,236,220,0.05), transparent 70%),' +
        '#0b0b0c'
    } else {
      const ok = initShader(canvas)
      if (!ok) {
        canvas.style.background =
          'radial-gradient(800px 500px at 70% 30%, rgba(249,115,22,0.18), transparent 60%),' +
          'radial-gradient(900px 600px at 20% 80%, rgba(244,236,220,0.05), transparent 70%),' +
          '#0b0b0c'
      }
    }
  }

  // -------------------- Word-by-word intro reveal --------------------
  // Splits a paragraph into per-word spans, then lights them up as the user
  // scrolls — earlier words light first. Reads as the body waking up.
  document.querySelectorAll('[data-reveal-words]').forEach((el) => {
    const text = el.textContent
    el.textContent = ''
    const words = text.trim().split(/\s+/)
    // inline-block <span>s eat their own trailing whitespace, so we put the
    // space in a separate text node *between* the spans. Preserves natural
    // word spacing while letting each word be styled independently.
    const spans = words.map((w, i) => {
      const s = document.createElement('span')
      s.className = 'word'
      s.textContent = w
      el.appendChild(s)
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '))
      return s
    })

    if (reduceMotion) {
      spans.forEach((s) => s.classList.add('is-lit'))
      return
    }

    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const start = innerHeight * 0.85
      const end = innerHeight * 0.25
      // 0 when paragraph just enters viewport; 1 when it's fully passed the
      // mid-line. Map to "how many words should be lit".
      const t = clamp((start - r.top) / (start - end), 0, 1)
      const lit = Math.floor(t * spans.length)
      spans.forEach((s, i) => s.classList.toggle('is-lit', i < lit))
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  })

  // -------------------- Hero portrait parallax tilt --------------------
  // The photo's frame rotates a few degrees toward the cursor. Effect is
  // limited (max 6° on each axis) so it reads as alive, not gimmicky.
  // Touch + reduce-motion: skip — the breathing halo is already enough.
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll('[data-portrait]').forEach((figure) => {
      const max = 6 // degrees
      addEventListener('pointermove', (e) => {
        const r = figure.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        // Normalize cursor distance from center to [-1, 1] within ~600px
        const nx = clamp((e.clientX - cx) / 600, -1, 1)
        const ny = clamp((e.clientY - cy) / 600, -1, 1)
        figure.style.setProperty('--tx', (nx * max) + 'deg')
        figure.style.setProperty('--ty', (-ny * max) + 'deg')
      }, { passive: true })
      // Spring back when pointer leaves the window
      addEventListener('pointerleave', () => {
        figure.style.setProperty('--tx', '0deg')
        figure.style.setProperty('--ty', '0deg')
      })
    })
  }

  // -------------------- Stat counters --------------------
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const to = Number(el.dataset.countTo)
    const suffix = el.dataset.suffix || ''
    if (reduceMotion) { el.textContent = to + suffix; return }
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        animateCount(el, to, suffix)
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(el)
  })

  // -------------------- Helpers --------------------
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

  function animateCount(el, to, suffix) {
    const dur = 1400
    const start = performance.now()
    const tick = (now) => {
      const t = clamp((now - start) / dur, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const v = Math.floor(eased * to)
      el.textContent = v + suffix
      if (t < 1) requestAnimationFrame(tick)
      else el.textContent = to + suffix
    }
    requestAnimationFrame(tick)
  }

  // -------------------- WebGL shader init --------------------
  function initShader(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return false

    const vsSrc = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `
    // Domain-warped 2D noise → soft amber/cream gradient bands. The visual
    // is meant to read as "warm light leaking in", not bright UI noise.
    const fsSrc = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      // Simple 2D hash + value noise
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.05; a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);
        float t = u_time * 0.06;

        // Domain-warped FBM — gives the aurora ribbons their bend
        vec2 q = vec2(fbm(p + t), fbm(p + vec2(1.7, 9.2) - t));
        vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) + 0.15 * t),
                      fbm(p + 1.5 * q + vec2(8.3, 2.8) + 0.126 * t));
        float n = fbm(p + r);

        // Mouse-pulled hot spot
        float md = distance(uv, u_mouse);
        float mouseGlow = 0.10 / (md * md + 0.04);

        // Palette — base ink, warm amber highlight, cream secondary
        vec3 base = vec3(0.043, 0.043, 0.047);
        vec3 amber = vec3(0.976, 0.451, 0.086);
        vec3 cream = vec3(0.957, 0.925, 0.863);

        float band = smoothstep(0.30, 0.85, n + 0.4 * r.x);
        float hot = smoothstep(0.55, 1.10, n + 0.5 * mouseGlow);

        vec3 col = base;
        col = mix(col, amber * 0.55, band * 0.35);
        col = mix(col, cream * 0.18, hot * 0.45);

        // Vignette so edges fall to ink — keeps focus on type
        float vig = smoothstep(1.4, 0.4, length(p));
        col *= vig;

        // Subtle grain — hides banding on flat panels
        float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.025;
        col += grain;

        gl_FragColor = vec4(col, 1.0);
      }
    `

    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
    if (!vs || !fs) return false
    const prog = gl.createProgram()
    gl.attachShader(prog, vs); gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const a_pos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(a_pos)
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0)

    const u_res = gl.getUniformLocation(prog, 'u_res')
    const u_time = gl.getUniformLocation(prog, 'u_time')
    const u_mouse = gl.getUniformLocation(prog, 'u_mouse')

    let mouse = [0.7, 0.5]
    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect()
      mouse = [
        clamp((e.clientX - r.left) / r.width, 0, 1),
        clamp(1 - (e.clientY - r.top) / r.height, 0, 1),
      ]
    })

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.6) // cap DPR — perf
      const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0
      canvas.width = w * dpr; canvas.height = h * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    addEventListener('resize', resize)

    const start = performance.now()
    let visible = true
    document.addEventListener('visibilitychange', () => { visible = !document.hidden })

    const render = () => {
      if (visible) {
        gl.uniform2f(u_res, canvas.width, canvas.height)
        gl.uniform1f(u_time, (performance.now() - start) / 1000)
        gl.uniform2f(u_mouse, mouse[0], mouse[1])
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
    return true
  }

  function compile(gl, type, src) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('shader compile error:', gl.getShaderInfoLog(sh))
      return null
    }
    return sh
  }
})()
