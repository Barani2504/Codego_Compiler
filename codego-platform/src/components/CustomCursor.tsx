import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { PenTool, Hand, MousePointer2 } from 'lucide-react';

export default function CustomCursor() {
  const [cursorVariant, setCursorVariant] = useState('default');
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for the outer ring
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(mouseX, springConfig);
  const cursorYSpring = useSpring(mouseY, springConfig);

  useEffect(() => {
    const mouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement;
      
      const isText = target.closest('input[type="text"], input[type="password"], input[type="email"], textarea, [contenteditable="true"], .monaco-editor, .view-lines');
      const isPointer = target.closest('a, button, [role="button"], .card-glass, .stat-card, select, input[type="radio"], input[type="checkbox"], .hover-lift');

      if (isText) setCursorVariant('text');
      else if (isPointer) setCursorVariant('pointer');
      else setCursorVariant('default');
    };

    const mouseLeave = () => setIsVisible(false);
    const mouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseleave', mouseLeave);
    document.addEventListener('mouseenter', mouseEnter);

    return () => {
      window.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseleave', mouseLeave);
      document.removeEventListener('mouseenter', mouseEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  if (!isVisible) return null;

  const getRingSize = () => cursorVariant === 'pointer' ? 32 : cursorVariant === 'text' ? 28 : 24;
  const getRingOffset = () => getRingSize() / 2;

  const variants = {
    default: {
      scale: 1,
      opacity: 1,
      backgroundColor: 'transparent',
      borderColor: 'rgba(129, 140, 248, 0.6)',
      transition: { duration: 0.2 }
    },
    pointer: {
      scale: 1.2,
      opacity: 1,
      backgroundColor: 'rgba(167, 139, 250, 0.2)',
      borderColor: 'var(--accent)',
      transition: { duration: 0.2 }
    },
    text: {
      scale: 1.1,
      opacity: 1,
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      borderColor: 'var(--neon-cyan)',
      transition: { duration: 0.2 }
    }
  };

  const iconVariants = {
    default: { rotate: 0, scale: 1 },
    pointer: { rotate: -15, scale: 1.1 },
    text: { rotate: -45, scale: 1.1 }
  };

  return (
    <>
      {/* Outer animated circle */}
      <motion.div
        variants={variants}
        animate={cursorVariant}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
          width: getRingSize(),
          height: getRingSize(),
          borderRadius: '50%',
          border: '2px solid',
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}
      >
        <motion.div variants={iconVariants} animate={cursorVariant} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cursorVariant === 'pointer' && <Hand size={14} color="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />}
          {cursorVariant === 'text' && <PenTool size={12} color="var(--neon-cyan)" />}
          {cursorVariant === 'default' && <MousePointer2 size={10} color="var(--text-1)" />}
        </motion.div>
      </motion.div>
      
      {/* Inner dot (instant follow) */}
      <motion.div
        animate={{ scale: cursorVariant === 'default' ? 1 : 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
          width: 8, height: 8,
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 0 8px var(--accent-glow)'
        }}
      />
    </>
  );
}
