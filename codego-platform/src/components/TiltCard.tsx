import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  tiltMaxAngle?: number;
  glowColor?: string;
  delay?: number;
}

export default function TiltCard({
  children, className = '', style = {}, onClick, disabled,
  tiltMaxAngle = 8, glowColor, delay = 0,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay }}
    >
      <Tilt
        tiltMaxAngleX={tiltMaxAngle}
        tiltMaxAngleY={tiltMaxAngle}
        scale={1.015}
        transitionSpeed={600}
        tiltEnable={!disabled}
        glareEnable={glowColor ? true : false}
        glareMaxOpacity={0.08}
        glareColor={glowColor || '#6366f1'}
        glarePosition="all"
        style={{ height: '100%' }}
      >
        <div
          className={className}
          style={style}
          onClick={onClick}
        >
          {children}
        </div>
      </Tilt>
    </motion.div>
  );
}
