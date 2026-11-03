/* ============================== RENDU WEBGL (style Néon 10) ==============================
   Deux petits contextes WebGL, tous deux facultatifs : sans WebGL, en qualité basse ou en style « classique »,
   le jeu garde son rendu Canvas 2D.
   - Décor : un shader animé par thème, calculé en basse résolution (le navigateur l'étire, le flou ne se voit pas
     sur un décor lointain) à 30 images/s. Il remplace le décor 2D et les particules d'ambiance : pas de calque en plus.
   - Halo : le calque de jeu est réduit au tiers, ses parties lumineuses floutées sur le GPU, puis ajoutées
     par-dessus en mode « screen ». On n'envoie jamais le calque de jeu en pleine résolution au GPU.
   Rien ici ne touche à l'état de la partie. */
const GLFX = {
  bg: null, bloom: null, last: 0,
  VS: 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}',
  HEAD: `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR;uniform float uT;uniform vec3 uA;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float stars(vec2 p,float d){vec2 g=p*d,i=floor(g);float r=h21(i);
  vec2 f=fract(g)-.5-(vec2(h21(i+3.1),h21(i+7.7))-.5)*.6;
  return smoothstep(.07,0.,length(f))*step(.88,r)*(.55+.45*sin(uT*(1.+r*3.)+r*40.));}
`,
  // un shader par thème ; p : coordonnées centrées (hauteur = 1), uv : 0..1
  SHADERS: {
    'theme-cyber': `void main(){vec2 uv=gl_FragCoord.xy/uR;float as=uR.x/uR.y;vec2 p=vec2((uv.x-.5)*as,uv.y);
  float hz=.34;vec3 c;
  if(uv.y>hz){float t=(uv.y-hz)/(1.-hz);
    c=mix(vec3(.42,.03,.36),vec3(.015,0.,.06),pow(t,.55));
    c+=stars(p+vec2(uT*.004,0.),70.)*smoothstep(.15,.6,t)*vec3(.85,.9,1.);
    vec2 sc=vec2(0.,hz+.19);float r=.21,d=length(p-sc),sy=(p.y-sc.y)/r;
    c+=vec3(1.,.15,.6)*.32*exp(-max(d-r,0.)*9.);
    float band=fract(sy*7.-uT*.22),gap=mix(.0,.6,clamp((.25-sy)/1.25,0.,1.));
    if(d<r&&!(sy<.25&&band<gap))c=mix(vec3(1.,.13,.62),vec3(1.,.9,.32),smoothstep(-.7,.85,sy));
    float m=hz+.018+.12*fbm(vec2(p.x*2.6+7.,1.3))*smoothstep(.08,.55,abs(p.x));
    if(uv.y<m){c=vec3(.035,0.,.075)+vec3(.12,0.,.2)*(m-uv.y)*6.;c+=uA*smoothstep(.006,0.,m-uv.y)*.9;}
  }else{float d=hz-uv.y,z=1./(d+.012);
    vec2 g=vec2(p.x*z*2.4,z*.9+uT*.8);vec2 e=.5-abs(fract(g)-.5);
    vec2 lw=min(vec2(1.6*z*2.4,1.6*z*z*.9)/uR.y,.5);
    float l=max(smoothstep(lw.x,0.,e.x),smoothstep(lw.y,0.,e.y))*exp(-z*.022)*(1.-max(lw.x,lw.y));
    c=vec3(.02,0.,.05)+mix(vec3(1.,.17,.84),uA,.35)*l*.85+vec3(1.,.2,.7)*exp(-d*22.)*.45;}
  gl_FragColor=vec4(c,1.);}`,
    'theme-matrix': `void main(){vec2 uv=gl_FragCoord.xy/uR;float cs=uR.y/34.;vec2 c=gl_FragCoord.xy/cs;
  vec2 id=floor(c),f=fract(c);float rows=uR.y/cs;
  float cr=h21(vec2(id.x,3.7)),sp=3.+cr*7.,len=8.+cr*16.;
  float hy=mod(uT*sp+cr*300.,rows+len+20.),dist=hy-(rows-id.y);
  float b=(dist>0.&&dist<len)?1.-dist/len:0.;
  float g=h21(id+floor(uT*(2.+cr*4.)+cr*9.)*.37);
  vec2 ip=floor(vec2(f.x*4.,f.y*6.));
  float bit=step(.45,h21(id*7.13+ip+g*13.))*step(.5,ip.x)*step(ip.x,2.5)*step(.5,ip.y)*step(ip.y,4.5);
  vec3 col=vec3(0.,.025,.008)+vec3(0.,.05,.02)*n2(uv*4.+uT*.05);
  col+=vec3(.05,1.,.35)*bit*b*.55*step(.25,cr);
  col+=vec3(.75,1.,.85)*bit*step(dist,1.)*step(0.,dist)*.8*step(.25,cr);
  col+=vec3(0.,.25,.08)*exp(-length(uv-.5)*2.5)*.35;
  gl_FragColor=vec4(col,1.);}`,
    'theme-crimson': `void main(){vec2 uv=gl_FragCoord.xy/uR;vec2 p=(gl_FragCoord.xy-.5*uR)/uR.y;
  float w=fbm(p*1.8-vec2(0.,uT*.04));float n=fbm(p*3.+vec2(w*1.4,-uT*.12));
  vec3 c=vec3(.035,0.,.008);float glow=smoothstep(.42,.85,n)*(1.15-uv.y*.8);
  c+=vec3(.75,.06,.04)*glow*.55+vec3(1.,.45,.08)*pow(glow,3.)*.45;
  float r=1.-abs(fbm(p*4.5+vec2(9.,uT*.03))*2.-1.);c+=vec3(1.,.18,.08)*pow(r,9.)*.45*(1.-uv.y*.6);
  c+=vec3(.8,.08,.02)*exp(-uv.y*2.6)*.4;
  vec2 q=vec2(p.x*9.,p.y*9.-uT*.9);vec2 i=floor(q);float h=h21(i);
  vec2 o=vec2(h21(i+.3),h21(i+.9))-.5;o.x+=sin(uT*1.3+h*20.)*.18;
  c+=vec3(1.,.55,.15)*smoothstep(.07,0.,length(fract(q)-.5-o*.6))*step(.82,h)*(.5+.5*sin(uT*5.+h*50.));
  gl_FragColor=vec4(c,1.);}`,
    'theme-void': `void main(){vec2 uv=gl_FragCoord.xy/uR;vec2 p=(gl_FragCoord.xy-.5*uR)/uR.y;float r=length(p);
  vec2 lp=p*(1.-.012/(r*r+.012));
  vec3 c=vec3(.008,0.,.025);float nb=fbm(lp*2.2+vec2(uT*.012,0.)+fbm(lp*1.4-uT*.01));
  c+=mix(vec3(.6,.22,1.),vec3(0.,.55,1.),fbm(lp*1.1+3.))*pow(nb,2.6)*.75;
  c+=stars(lp,110.)*.9;
  vec2 q=vec2(p.x*.96+p.y*.28,(p.y*.96-p.x*.28)/.3);float rq=length(q);
  float a=uT*.35+.22/(rq+.05),ca=cos(a),sa=sin(a);vec2 qr=vec2(ca*q.x-sa*q.y,sa*q.x+ca*q.y);
  float disk=smoothstep(.1,.15,rq)*smoothstep(.62,.18,rq),sw=fbm(qr*5.);
  c+=mix(vec3(1.,.45,1.),vec3(.35,.85,1.),sw)*disk*sw*1.5*(1.+.6*smoothstep(0.,-.1,q.y));
  c*=smoothstep(.07,.088,r);c+=vec3(1.,.72,1.)*exp(-abs(r-.092)*110.)*.75;
  gl_FragColor=vec4(c,1.);}`,
    'theme-solar': `void main(){vec2 uv=gl_FragCoord.xy/uR;vec2 p=(gl_FragCoord.xy-.5*uR)/uR.y;float as=uR.x/uR.y;
  vec2 sc=vec2(as*.36,.3);vec2 dp=p-sc;float d=length(dp),sr=.15;
  vec3 c=mix(vec3(.11,.04,0.),vec3(.015,.006,0.),uv.y);
  vec2 dir=dp/max(d,.001);float n=fbm(dir*2.5+vec2(d*5.-uT*.25,uT*.05));
  c+=vec3(1.,.42,0.)*exp(-max(d-sr,0.)*5.5)*(.45+n*.8);
  c+=vec3(1.,.75,.2)*exp(-max(d-sr,0.)*20.)*.6;
  if(d<sr){float g=fbm(p*28.+vec2(uT*.15,-uT*.1));float limb=sqrt(1.-d*d/(sr*sr));
    c=mix(vec3(1.,.35,0.),vec3(1.,.93,.6),limb*(.6+.5*g));}
  float hb=fbm(vec2(p.x*1.2-uT*.05,p.y*9.));c+=vec3(.9,.35,0.)*smoothstep(.55,.8,hb)*.12*(1.-uv.y);
  vec2 q=vec2(p.x*7.+uT*.6,p.y*7.-uT*.2);vec2 i=floor(q);float h=h21(i);
  c+=vec3(1.,.7,.25)*smoothstep(.06,0.,length(fract(q)-.5-(vec2(h21(i+.4),h21(i+.8))-.5)*.6))*step(.86,h)*.7;
  gl_FragColor=vec4(c,1.);}`
  },
  // halo : seuil + flou horizontal, puis flou vertical (9 prélèvements chacun)
  BLUR: `precision mediump float;uniform sampler2D uS;uniform vec2 uD;uniform float uK;uniform vec2 uR;
void main(){vec2 uv=gl_FragCoord.xy/uR;vec3 s=vec3(0.);
  float w[5];w[0]=.227;w[1]=.195;w[2]=.122;w[3]=.054;w[4]=.016;
  for(int i=-4;i<=4;i++){float k=float(i<0?-i:i);vec3 t=texture2D(uS,uv+uD*float(i)).rgb;
    if(uK>0.)t*=smoothstep(uK,uK+.45,max(t.r,max(t.g,t.b)));
    s+=t*(k==0.?w[0]:k==1.?w[1]:k==2.?w[2]:k==3.?w[3]:w[4]);}
  gl_FragColor=vec4(s*(uK>0.?1.:1.6),1.);}`,

  // style Néon 10 + qualité haute + WebGL disponible
  want() { return Store.s.gfx !== 'classic' && Render.hq; },
  active() { return !!(this.bg && this.bg.on); },
  init() {
    this.bg = this.ctx($('cv-glbg'));
    this.bloom = this.ctx($('cv-bloom'));
    if (this.bg) this.bg.progs = {};
    if (this.bloom) {
      const g = this.bloom.gl;
      this.bloom.p = this.prog(g, this.BLUR);
      this.bloom.src = document.createElement('canvas');
      this.bloom.sx = this.bloom.src.getContext('2d');
    }
  },
  // contexte + triangle plein écran ; perte de contexte : on retombe sur le rendu 2D jusqu'à sa restauration
  ctx(cv) {
    let gl = null;
    const o = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    try { gl = cv.getContext('webgl', o) || cv.getContext('experimental-webgl', o); } catch (e) { gl = null; }
    if (!gl) { cv.style.display = 'none'; return null; }
    const S = { gl, cv, on: false, lost: false };
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); S.lost = true; this.sync(); });
    cv.addEventListener('webglcontextrestored', () => {
      S.lost = false; this.geom(S);
      if (S.progs) S.progs = {};
      if (S.p) { S.p = this.prog(gl, this.BLUR); S.fbo = null; }
      this.sync();
    });
    this.geom(S);
    return S;
  },
  geom(S) {
    const gl = S.gl, b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  },
  prog(gl, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) console.warn('[GLFX]', gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, this.VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    const u = {};
    for (const k of ['uR', 'uT', 'uA', 'uS', 'uD', 'uK']) u[k] = gl.getUniformLocation(p, k);
    return { p, u };
  },
  // tous les shaders de décor sont compilés d'avance (une seule fois), pour qu'un changement de thème ne fige rien
  warm() {
    const S = this.bg; if (!S || S.lost || S.warm) return;
    S.warm = true;
    for (const k in this.SHADERS) if (!S.progs[k]) S.progs[k] = this.prog(S.gl, this.HEAD + this.SHADERS[k]);
  },
  // affiche ou masque les calques selon le style, la qualité et l'état des contextes
  sync() {
    const w = this.want();
    if (w) this.warm();
    const bgOn = !!(w && this.bg && !this.bg.lost && this.bg.progs[Render.themeKey]);
    const blOn = !!(w && bgOn && this.bloom && !this.bloom.lost && this.bloom.p);
    if (this.bg) { if (this.bg.on !== bgOn) Render.dirtyMap = true; this.bg.on = bgOn; this.bg.cv.style.display = bgOn ? 'block' : 'none'; }
    if (this.bloom) { this.bloom.on = blOn; this.bloom.cv.style.display = blOn ? 'block' : 'none'; }
    Render.cv.bg.style.display = bgOn ? 'none' : 'block';
    Render.cv.fx.style.display = !bgOn && Render.hq ? 'block' : 'none';
    this.resize();
  },
  resize() {
    const W = View.w, H = View.h;
    if (this.bg && this.bg.on) {
      // ~250 000 pixels au plus : le décor reste léger même sur un écran 4K ou un téléphone à DPR 3
      const f = Math.min(1, Math.sqrt(250000 / Math.max(1, W * H)));
      this.size(this.bg, Math.round(W * f), Math.round(H * f));
      this.last = 0;
    }
    if (this.bloom && this.bloom.on) {
      const f = Math.min(1 / 3, 560 / Math.max(1, W)), B = this.bloom;
      const bw = Math.max(16, Math.round(W * f)), bh = Math.max(16, Math.round(H * f));
      this.size(B, bw, bh);
      B.src.width = bw; B.src.height = bh;
      const gl = B.gl;
      if (!B.fbo) { B.tex = [gl.createTexture(), gl.createTexture()]; B.fbo = gl.createFramebuffer(); }
      for (const t of B.tex) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.bindTexture(gl.TEXTURE_2D, B.tex[1]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
  },
  size(S, w, h) {
    S.cv.width = w; S.cv.height = h;
    S.cv.style.width = View.w + 'px'; S.cv.style.height = View.h + 'px';
    S.gl.viewport(0, 0, w, h);
  },
  rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; },
  frame(now) {
    const S = this.bg;
    if (!S || !S.on || S.lost) return;
    if (now - this.last < 32) return;   // 30 images/s suffisent pour un décor lent
    this.last = now;
    const gl = S.gl, P = S.progs[Render.themeKey]; if (!P) return;
    gl.useProgram(P.p);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(P.u.uR, S.cv.width, S.cv.height);
    gl.uniform1f(P.u.uT, (now / 1000) % 3600);
    const a = this.rgb(Render.theme.accent); gl.uniform3f(P.u.uA, a[0], a[1], a[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  // halo : appelé juste après le dessin du calque de jeu
  glow() {
    const B = this.bloom;
    if (!B || !B.on || B.lost) return;
    const gl = B.gl, P = B.p, w = B.src.width, h = B.src.height;
    if (!G || !Render.cv.game.width || !Render.cv.game.height) { if (!B.blank) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); B.blank = true; } return; }
    B.blank = false;
    B.sx.clearRect(0, 0, w, h);
    B.sx.drawImage(Render.cv.game, 0, 0, w, h);
    gl.useProgram(P.p);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(P.u.uS, 0); gl.uniform2f(P.u.uR, w, h);
    // passe 1 : seuil + flou horizontal, vers la texture intermédiaire
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, B.tex[0]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // le canvas a son origine en haut, WebGL en bas
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, B.src);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, B.tex[1], 0);
    gl.uniform2f(P.u.uD, 1.5 / w, 0); gl.uniform1f(P.u.uK, .32);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // passe 2 : flou vertical, à l'écran
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, B.tex[1]);
    gl.uniform2f(P.u.uD, 0, 1.5 / h); gl.uniform1f(P.u.uK, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
};
