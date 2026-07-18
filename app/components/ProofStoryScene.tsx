"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ProofStoryScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.1, 6.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const green = new THREE.MeshBasicMaterial({ color: 0x1fcf9a });
    const ink = new THREE.MeshBasicMaterial({ color: 0x17231f });
    const white = new THREE.MeshBasicMaterial({ color: 0xf7fff9 });
    const red = new THREE.MeshBasicMaterial({ color: 0xd94b3d });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x35dba6, transparent: true, opacity: 0.62 });

    const receipt = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 0.08), white);
    receipt.position.set(-1.6, 0.1, 0);
    receipt.rotation.y = -0.28;
    group.add(receipt);

    const receiptStripe = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.09), green);
    receiptStripe.position.set(-1.6, 0.66, 0.06);
    receiptStripe.rotation.copy(receipt.rotation);
    group.add(receiptStripe);

    const badReceipt = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.92, 0.08), red);
    badReceipt.position.set(1.85, -0.78, -0.2);
    badReceipt.rotation.set(0.05, 0.36, 0.02);
    group.add(badReceipt);

    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i += 1) {
      const node = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.16), i === 7 ? green : ink);
      const x = -0.6 + i * 0.36;
      const y = -1.05 + i * 0.3;
      const z = Math.sin(i * 0.8) * 0.22;
      node.position.set(x, y, z);
      node.rotation.set(0.12, -0.35 + i * 0.05, 0.05);
      group.add(node);
      nodes.push(node.position.clone());
    }

    for (let i = 0; i < nodes.length - 1; i += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([nodes[i], nodes[i + 1]]);
      group.add(new THREE.Line(geometry, lineMaterial));
    }

    const root = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.22), green);
    root.position.set(2.2, 1.05, 0.1);
    root.rotation.set(0.02, 0.35, 0);
    group.add(root);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.06), ink);
    screen.position.set(0.25, -0.28, -0.55);
    screen.rotation.set(-0.03, 0.1, -0.02);
    group.add(screen);

    const screenLine = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.08), green);
    screenLine.position.set(0.25, -0.02, -0.49);
    screenLine.rotation.copy(screen.rotation);
    group.add(screenLine);

    const resize = () => {
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(320, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.01;
      group.rotation.y = Math.sin(frame) * 0.08;
      group.rotation.x = Math.sin(frame * 0.7) * 0.025;
      receiptStripe.scale.x = 0.72 + Math.sin(frame * 2.2) * 0.08;
      root.scale.x = 0.9 + Math.sin(frame * 1.8) * 0.08;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="proof-story-scene" ref={hostRef} aria-hidden="true">
      <div className="scene-label scene-label-left">receipt proof</div>
      <div className="scene-label scene-label-root">daily root PDA</div>
      <div className="scene-label scene-label-bad">tamper rejected</div>
    </div>
  );
}
