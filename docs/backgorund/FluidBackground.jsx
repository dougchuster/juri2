import { useEffect, useRef } from 'react';
import './FluidBackground.css';

export function FluidBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const blobs = container.querySelectorAll('.blob');
    
    blobs.forEach((blob, index) => {
      let time = index * 2;
      
      const animate = () => {
        time += 0.008;
        
        const x = Math.sin(time * 0.7) * 15 + Math.cos(time * 0.3) * 10;
        const y = Math.cos(time * 0.5) * 12 + Math.sin(time * 0.4) * 8;
        const rotate = Math.sin(time * 0.2) * 5;
        const scale = 1 + Math.sin(time * 0.15) * 0.08;
        
        blob.style.transform = `translate(${x}%, ${y}%) rotate(${rotate}deg) scale(${scale})`;
        
        requestAnimationFrame(animate);
      };
      
      requestAnimationFrame(animate);
    });
  }, []);

  return (
    <div ref={containerRef} className="fluid-background">
      <div className="base-gradient" />
      
      <div 
        className="blob blob-1"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #FFD700 0%, #FF8C00 25%, #FF4500 50%, #DC143C 75%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-2"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #FF6347 0%, #FF4500 30%, #DC143C 60%, #8B0000 85%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-3"
        style={{
          background: 'radial-gradient(ellipse at 40% 60%, #FF1493 0%, #DC143C 25%, #8B008B 55%, #4B0082 80%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-4"
        style={{
          background: 'radial-gradient(ellipse at 60% 40%, #FFA500 0%, #FF6347 30%, #FF4500 60%, #B22222 85%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-5"
        style={{
          background: 'radial-gradient(ellipse at 50% 70%, #DA70D6 0%, #FF1493 25%, #8B008B 55%, #2F1B69 80%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-6"
        style={{
          background: 'radial-gradient(ellipse at 70% 30%, #1a1a4e 0%, #0d0d3d 40%, #050528 70%, transparent 100%)',
        }}
      />
      
      <div 
        className="blob blob-7"
        style={{
          background: 'radial-gradient(ellipse at 30% 80%, #4B0082 0%, #2F1B69 35%, #1a0f4a 65%, transparent 100%)',
        }}
      />
      
      <div className="noise-overlay" />
      <div className="vignette" />
    </div>
  );
}
