import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  useEffect(() => {
    // Initialize Three.js shader on mount
    const script = document.createElement('script');
    script.type = 'module';
    script.innerHTML = `
      import * as THREE from "https://cdn.skypack.dev/three@0.136.0";

      let scene, camera, renderer, material, uniforms;
      
      function init() {
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '0';
        document.body.appendChild(renderer.domElement);

        const geometry = new THREE.PlaneGeometry(2, 2);

        uniforms = {
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2() },
          grainStrength: { value: 0.03 },
          intensity: { value: 0.91 }
        };

        material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: \`
            void main() {
              gl_Position = vec4(position, 1.0);
            }
          \`,
          fragmentShader: \`
            uniform float iTime;
            uniform vec2 iResolution;
            uniform float grainStrength;
            uniform float intensity;

            #define AA 1.0

            float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            vec3 background(vec3 d) {
              float light = dot(d, sqrt(vec3(0.3, 0.5, 0.2)));
              return vec3(max(light * 0.5 + 0.5, 0.0));
            }

            float smin(float d1, float d2) {
              const float e = -6.0;
              return log(exp(d1 * e) + exp(d2 * e)) / e;
            }

            float dist(vec3 p) {
              float l = pow(dot(p.xz, p.xz), 0.8);
              float ripple = p.y + 0.8 + 0.4 * sin(l * 3.0 - iTime + 0.5) / (1.0 + l);

              float h1 = -sin(iTime);
              float h2 = cos(iTime + 0.1);
              float drop = length(p + vec3(0.0, 1.2, 0.0) * h1) - 0.4;
              drop = smin(drop, length(p + vec3(0.1, 0.8, 0.0) * h2) - 0.2);

              return smin(ripple, drop);
            }

            vec3 normal(vec3 p) {
              vec2 e = vec2(1.0, -1.0) * 0.01;
              return normalize(
                dist(p - e.yxx) * e.yxx +
                dist(p - e.xyx) * e.xyx +
                dist(p - e.xxy) * e.xxy +
                dist(p - e.y) * e.y
              );
            }

            vec4 march(vec3 p, vec3 d) {
              vec4 m = vec4(p, 0.0);
              for (int i = 0; i < 50; i++) {
                float s = dist(m.xyz);
                m += vec4(d, 1.0) * s;
                if (s < 0.01 || m.w > 10.0) break;
              }
              return m;
            }

            void main() {
              vec2 fragCoord = gl_FragCoord.xy;
              vec2 res = iResolution.xy;
              vec3 col = vec3(0.0);

              vec3 pos = vec3(0.05 * cos(iTime), 0.1 * sin(iTime), -4.0);
              vec3 lig = sqrt(vec3(0.3, 0.5, 0.2));

              for (float x = 0.0; x < AA; x++)
              for (float y = 0.0; y < AA; y++) {
                vec3 ray = normalize(vec3(fragCoord - res / 2.0 + vec2(x, y) / AA, res.y));
                vec4 mar = march(pos, ray);
                vec3 nor = normal(mar.xyz);
                vec3 ref = refract(ray, nor, 0.75);
                float r = smoothstep(0.8, 1.0, dot(reflect(ray, nor), lig));
                float l = 1.0 - dot(ray, nor);
                vec3 wat = background(ref) + 0.3 * r * l * l;
                vec3 bac = background(ray) * 0.5 + 0.5;
                float fade = pow(min(mar.w / 10.0, 1.0), 0.3);
                col += mix(wat, bac, fade);
              }
              col /= AA * AA;

              vec2 uv = fragCoord / res;
              float grain = random(uv + iTime) * grainStrength;
              col += vec3(grain);

              col *= intensity;

              gl_FragColor = vec4(col * col, 1.0);
            }
          \`
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        onWindowResize();
        window.addEventListener("resize", onWindowResize, false);
        animate();
      }

      function onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

        uniforms.iResolution.value.set(width, height);
      }

      function animate() {
        requestAnimationFrame(animate);
        uniforms.iTime.value += 0.01;
        renderer.render(scene, camera);
      }

      init();
    `;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.remove();
      script.remove();
    };
  }, []);

  return (
    <div className="layout">
      <div className="layout__middle">
        <p className="layout__middle-text layout__middle-text--left">|</p>
        <p className="layout__middle-text layout__middle-text--right">Privacy Protocol:<br/> Powered by ICP ✶</p>
      </div>

      <div className="layout__label layout__label--top-left">
        <span className="layout__label-text">Protocol<br/>Particle Funds</span>
      </div>
      <div className="layout__label layout__label--top-right">
        <span className="layout__label-text">Mission<br/>Anonymous Transfers</span>
      </div>
      <div className="layout__label layout__label--bottom-left">
        <div className="social-icons">
          <a href="#" className="social-icon" aria-label="Twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="#" className="social-icon" aria-label="Telegram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </a>
        </div>
      </div>
      <div className="layout__label layout__label--bottom-right">
        <Link to="/pools" className="learn-more-btn">Learn More</Link>
      </div>

      <div className="layout__text-wrapper">
        <h1>PARTICLE<span>FUNDS</span></h1>
        <h2>WHERE PRIVACY MEETS INTEROPERABILITY</h2>
        
        <div className="home-nav-buttons">
          <Link to="/deposit" className="home-nav-btn">Enter Protocol</Link>
          <a href="/pools" className="home-nav-btn home-nav-btn--secondary">View Pools</a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;