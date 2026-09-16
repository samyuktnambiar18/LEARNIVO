import React, { useEffect, useRef } from 'react';

export const LearningCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 420);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 420;
    };

    window.addEventListener('resize', handleResize);

    // Knowledge Nodes representing: Understand -> Practice -> Evaluate -> Improve
    const nodes = [
      { x: width * 0.2, y: height * 0.5, label: 'Understand', symbol: '∑x', color: '#C7FF4A' },
      { x: width * 0.4, y: height * 0.35, label: 'Practice', symbol: '</>', color: '#8B5CF6' },
      { x: width * 0.6, y: height * 0.65, label: 'Evaluate', symbol: 'f(x)', color: '#FF6B9D' },
      { x: width * 0.8, y: height * 0.5, label: 'Improve', symbol: 'Δy', color: '#C7FF4A' },
    ];

    // Ambient Floating Math/Code Particles
    const symbols = ['∫', 'λ', 'O(n log n)', '∇', 'π', 'A=UΣVᵀ', 'log₂(n)', '∀x∈ℝ'];
    const floating = symbols.map((text, i) => ({
      text,
      x: (width * (i + 1)) / (symbols.length + 1),
      y: Math.random() * height,
      speed: 0.2 + Math.random() * 0.3,
      opacity: 0.15 + Math.random() * 0.2,
    }));

    let pulse = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      pulse += 0.02;

      // Draw Connection Paths with flow animation
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.bezierCurveTo(width * 0.3, height * 0.2, width * 0.3, height * 0.4, nodes[1].x, nodes[1].y);
      ctx.bezierCurveTo(width * 0.5, height * 0.3, width * 0.5, height * 0.7, nodes[2].x, nodes[2].y);
      ctx.bezierCurveTo(width * 0.7, height * 0.6, width * 0.7, height * 0.4, nodes[3].x, nodes[3].y);
      ctx.stroke();

      // Pulse traveling node signal
      const signalProgress = (Math.sin(pulse * 0.8) + 1) / 2;
      const currentX = nodes[0].x + signalProgress * (nodes[3].x - nodes[0].x);
      const currentY = height * 0.5 + Math.sin(signalProgress * Math.PI * 2) * 40;

      ctx.beginPath();
      ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#C7FF4A';
      ctx.shadowColor = '#C7FF4A';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Floating Math Text
      floating.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;

        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(166, 161, 178, ${p.opacity})`;
        ctx.fillText(p.text, p.x, p.y);
      });

      // Draw Main Nodes
      nodes.forEach((node, index) => {
        const nodePulse = Math.sin(pulse + index) * 3;

        // Outer aura ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, 24 + nodePulse, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}0D`;
        ctx.strokeStyle = `${node.color}33`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#121118';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Symbol Inside
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = node.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.symbol, node.x, node.y);

        // Label Underneath
        ctx.font = '500 12px "Inter", sans-serif';
        ctx.fillStyle = '#F7F5FA';
        ctx.fillText(node.label, node.x, node.y + 34);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full relative flex items-center justify-center surface-card p-4 overflow-hidden border border-white/10 rounded-2xl bg-[#0B0A0F]/60">
      <canvas ref={canvasRef} className="w-full h-[420px]" />
    </div>
  );
};
