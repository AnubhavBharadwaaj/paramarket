"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import * as THREE from "three";

const phases = [
  "1-1: one goal away",
  "Shot on goal",
  "Goal: 1-2",
  "Over 2.5 locks",
  "Proof verifies",
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function makePlayer(color: number) {
  const player = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.34, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.62 }),
  );
  body.position.y = 0.28;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xf5f7ef, roughness: 0.55 }),
  );
  head.position.y = 0.62;
  player.add(body, head);
  return player;
}

export function ProofStoryScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(0);
  const [phase, setPhase] = useState(phases[0]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 4.4, 5.9);
    camera.lookAt(0.25, 0.05, -0.25);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-2.5, 5, 3.2);
    scene.add(ambient, key);

    const field = new THREE.Group();
    field.rotation.x = -0.58;
    field.position.y = -0.9;
    scene.add(field);

    const turf = new THREE.Mesh(
      new THREE.PlaneGeometry(5.7, 3.3),
      new THREE.MeshStandardMaterial({ color: 0x0d2b20, roughness: 0.82 }),
    );
    field.add(turf);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2ed6a2, transparent: true, opacity: 0.48 });
    const whiteLine = new THREE.LineBasicMaterial({ color: 0xf5fff9, transparent: true, opacity: 0.7 });

    const pitchLines = [
      [new THREE.Vector3(-2.65, -1.45, 0.02), new THREE.Vector3(2.65, -1.45, 0.02), new THREE.Vector3(2.65, 1.45, 0.02), new THREE.Vector3(-2.65, 1.45, 0.02), new THREE.Vector3(-2.65, -1.45, 0.02)],
      [new THREE.Vector3(0, -1.45, 0.03), new THREE.Vector3(0, 1.45, 0.03)],
      [new THREE.Vector3(1.78, -0.58, 0.04), new THREE.Vector3(2.65, -0.58, 0.04), new THREE.Vector3(2.65, 0.58, 0.04), new THREE.Vector3(1.78, 0.58, 0.04)],
    ];
    pitchLines.forEach((points, index) => field.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), index === 0 ? whiteLine : lineMaterial)));

    const goal = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf7fff9, roughness: 0.45 });
    const netMaterial = new THREE.LineBasicMaterial({ color: 0x8fb4a8, transparent: true, opacity: 0.42 });
    const postGeometry = new THREE.BoxGeometry(0.05, 0.78, 0.05);
    const crossGeometry = new THREE.BoxGeometry(0.05, 1.16, 0.05);
    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
    const cross = new THREE.Mesh(crossGeometry, postMaterial);
    leftPost.position.set(2.68, 0.4, -0.58);
    rightPost.position.set(2.68, 0.4, 0.58);
    cross.position.set(2.68, 0.78, 0);
    cross.rotation.x = Math.PI / 2;
    goal.add(leftPost, rightPost, cross);
    for (let i = 0; i < 5; i += 1) {
      const z = -0.5 + i * 0.25;
      goal.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(2.7, 0.05, z), new THREE.Vector3(2.98, 0.7, z)]), netMaterial));
    }
    scene.add(goal);

    const attacker = makePlayer(0x29d69f);
    const defender = makePlayer(0x28333e);
    const keeper = makePlayer(0x64707b);
    attacker.position.set(-1.45, -0.58, 0.7);
    defender.position.set(0.2, -0.5, 0.15);
    keeper.position.set(2.35, -0.5, -0.18);
    scene.add(attacker, defender, keeper);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38 }),
    );
    ball.position.set(-1.05, -0.46, 0.62);
    scene.add(ball);

    const board = new THREE.Group();
    board.position.set(-1.1, 1.42, -1.2);
    board.rotation.x = -0.08;
    const boardBg = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.72, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x101816, roughness: 0.55 }),
    );
    const boardBarBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x26372f, roughness: 0.5 }),
    );
    const boardBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.08, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x35dba6, roughness: 0.42 }),
    );
    boardBarBack.position.set(0, -0.16, 0.04);
    boardBar.position.set(-0.47, -0.16, 0.08);
    boardBar.scale.x = 0.28;
    board.add(boardBg, boardBarBack, boardBar);
    scene.add(board);

    const receipt = new THREE.Group();
    receipt.position.set(1.32, 1.28, -1.1);
    receipt.rotation.y = -0.2;
    const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf6fff9, roughness: 0.62, transparent: true, opacity: 0 });
    const stampMaterial = new THREE.MeshStandardMaterial({ color: 0x35dba6, roughness: 0.45, transparent: true, opacity: 0 });
    const paper = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.82, 0.04), paperMaterial);
    const stamp = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 10, 32), stampMaterial);
    const checkA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.05), stampMaterial);
    const checkB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.05), stampMaterial);
    stamp.position.set(0.18, -0.02, 0.05);
    checkA.position.set(0.1, -0.02, 0.1);
    checkA.rotation.z = -0.75;
    checkB.position.set(0.24, 0.06, 0.1);
    checkB.rotation.z = 0.68;
    receipt.add(paper, stamp, checkA, checkB);
    scene.add(receipt);

    const resize = () => {
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(300, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    startRef.current = performance.now();
    let raf = 0;
    let lastPhase = "";
    const animate = (now: number) => {
      const elapsed = ((now - startRef.current) % 6600) / 6600;
      const shot = THREE.MathUtils.smoothstep(Math.min(Math.max((elapsed - 0.18) / 0.38, 0), 1), 0, 1);
      const lock = THREE.MathUtils.smoothstep(Math.min(Math.max((elapsed - 0.54) / 0.18, 0), 1), 0, 1);
      const proof = THREE.MathUtils.smoothstep(Math.min(Math.max((elapsed - 0.72) / 0.16, 0), 1), 0, 1);

      ball.position.x = lerp(-1.05, 2.62, shot);
      ball.position.z = lerp(0.62, -0.1, shot);
      ball.position.y = -0.46 + Math.sin(shot * Math.PI) * 0.58;
      ball.rotation.x += 0.08;
      ball.rotation.z -= 0.04;
      attacker.position.x = lerp(-1.45, -0.38, shot * 0.72);
      defender.position.x = lerp(0.2, 0.66, shot * 0.45);
      keeper.position.z = lerp(-0.18, -0.48, shot);
      keeper.rotation.z = -shot * 0.28;

      boardBar.scale.x = 0.28 + lock * 0.68;
      boardBar.position.x = -0.55 + lock * 0.26;
      board.scale.setScalar(1 + lock * 0.06);
      paperMaterial.opacity = proof;
      stampMaterial.opacity = proof;
      receipt.scale.setScalar(0.86 + proof * 0.14);

      const nextPhase = elapsed < 0.22 ? phases[0] : elapsed < 0.48 ? phases[1] : elapsed < 0.62 ? phases[2] : elapsed < 0.78 ? phases[3] : phases[4];
      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase;
        setPhase(nextPhase);
      }

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  function replay() {
    startRef.current = performance.now();
    setPhase(phases[0]);
  }

  return (
    <div className="football-proof-scene" aria-label="Football match event becomes an on-chain proof">
      <div className="scene-viewport" ref={hostRef} />
      <div className="match-scorecard">
        <span>Replay</span>
        <strong>Vietnam 1-2 Myanmar</strong>
        <em>{phase}</em>
      </div>
      <div className="scene-proof-card">
        <span>Over 2.5</span>
        <strong>{phase === phases[4] ? "verified true" : phase === phases[3] ? "locked" : "live"}</strong>
      </div>
      <button className="scene-replay-button" type="button" onClick={replay}>
        <RotateCcw size={15} />
        Replay moment
      </button>
    </div>
  );
}
