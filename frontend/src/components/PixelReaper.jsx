import React from 'react';

// 简易像素风小死神（携带镰刀）SVG
// 采用16x16像素网格，使用矩形绘制，保证像素质感
const PixelReaper = ({ size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
    >
      {/* 背景透明 */}
      {/* 头部与斗篷主体（深灰/黑） */}
      <rect x="5" y="2" width="6" height="2" fill="#1a1a1a" />
      <rect x="4" y="4" width="8" height="6" fill="#222" />
      <rect x="5" y="10" width="6" height="3" fill="#222" />
      {/* 脸部（更亮） */}
      <rect x="6" y="5" width="4" height="3" fill="#3c3c3c" />
      {/* 眼睛 */}
      <rect x="6" y="6" width="1" height="1" fill="#ffffff" />
      <rect x="9" y="6" width="1" height="1" fill="#ffffff" />

      {/* 身体下摆阴影 */}
      <rect x="4" y="13" width="8" height="1" fill="#0d0d0d" />

      {/* 镰刀杆（木色） */}
      <rect x="2" y="3" width="1" height="10" fill="#8B5A2B" />
      {/* 镰刀横杆连接到刀刃 */}
      <rect x="3" y="3" width="5" height="1" fill="#8B5A2B" />
      {/* 刀刃（银灰） */}
      <rect x="8" y="2" width="5" height="1" fill="#C0C0C0" />
      <rect x="12" y="2" width="1" height="2" fill="#C0C0C0" />

      {/* 手（握杆，略亮） */}
      <rect x="5" y="8" width="1" height="1" fill="#555" />
    </svg>
  );
};

export default PixelReaper;