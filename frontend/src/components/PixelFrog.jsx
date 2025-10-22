import React from 'react';

// 像素风小动物（小青蛙）头像，风格鲜明，适配深色背景
// 使用矩形像素绘制并保证 crispEdges
const PixelFrog = ({ size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
    >
      {/* 脸部主体 */}
      <rect x="3" y="4" width="10" height="7" fill="#2FAE3E" />
      {/* 额头高光 */}
      <rect x="4" y="5" width="8" height="1" fill="#39C64B" />
      {/* 下巴与嘴部区域稍暗 */}
      <rect x="3" y="10" width="10" height="2" fill="#249536" />

      {/* 左右脸颊圆角加深 */}
      <rect x="3" y="6" width="1" height="3" fill="#249536" />
      <rect x="12" y="6" width="1" height="3" fill="#249536" />

      {/* 眼睛底色（浅绿） */}
      <rect x="4" y="6" width="3" height="2" fill="#9BE870" />
      <rect x="9" y="6" width="3" height="2" fill="#9BE870" />

      {/* 眼白 */}
      <rect x="5" y="6" width="2" height="2" fill="#FFFFFF" />
      <rect x="10" y="6" width="2" height="2" fill="#FFFFFF" />

      {/* 瞳孔 */}
      <rect x="6" y="7" width="1" height="1" fill="#1B1B1B" />
      <rect x="11" y="7" width="1" height="1" fill="#1B1B1B" />

      {/* 鼻孔（点状） */}
      <rect x="7" y="9" width="1" height="1" fill="#1B1B1B" />
      <rect x="8" y="9" width="1" height="1" fill="#1B1B1B" />

      {/* 嘴部线条（更暗） */}
      <rect x="5" y="11" width="6" height="1" fill="#1E7B2D" />

      {/* 身体（底座） */}
      <rect x="5" y="12" width="6" height="2" fill="#2FAE3E" />
      <rect x="6" y="12" width="4" height="1" fill="#39C64B" />

      {/* 微阴影，提升立体感 */}
      <rect x="3" y="13" width="10" height="1" fill="#1E7B2D" />
    </svg>
  );
};

export default PixelFrog;